import Handlebars from "handlebars";
import axios, { AxiosRequestConfig, AxiosError } from "axios";
import {
  executeConnectionRequest,
  executeFetchUrl,
  executeParseFile,
  executeSummarizeTask,
} from "./task-executor";
import { Subject, last } from "rxjs";
import {
  DataNodeDef,
  DataNodeType,
  ExtractNodeDef,
  ExtractResponse,
  LoopNodeDataResult,
  MultiNodeDataResult,
  NodeDef,
  NodeInputConversion,
  NodeInputMapping,
  NodeResult,
  NodeResultStatus,
  NodeType,
  ObjectResult,
  ParentDataDef,
  RenameInput,
  StringContentResult,
  StringToListConversion,
  TemplateNodeDef,
} from "../types/node";
import { WorkflowContext } from "./workflowinstance";
import { MappedTypeNode } from "typescript";
import {
  getValue,
  isExtractResult,
  isStringResult,
  isSummaryResult,
  isTableResult,
} from "../types/typeutils";
const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;
const API_TOKEN = process.env.REACT_APP_API_TOKEN;

const cancelListener = new Subject<boolean>();

interface JsonResponse {
  jsonResponse: object;
}

interface AskApiResult {
  time: number;
  status: string;
  result: JsonResponse;
}

export function isStringToListConversion(
  object: NodeInputConversion | undefined,
): object is StringToListConversion {
  return object ? object.type === "StringToListConversion" : false;
}

export function isRename(object: any): object is RenameInput {
  return object.type === "Rename";
}

export function cancelExecution() {
  cancelListener.next(true);
}

async function _handleDataNode(
  node: NodeDef,
  executeContext: WorkflowContext,
): Promise<NodeResult> {
  let data = node.data as DataNodeDef;
  console.debug(`Handling data node type: ${data.type}`);
  if (data.type === DataNodeType.Connection && data.connectionData) {
    if (executeContext.getAuthToken) {
      const connectionData = data.connectionData;
      return await executeContext.getAuthToken().then((token) => {
        return executeConnectionRequest(connectionData, token);
      });
    } else {
      return await executeConnectionRequest(data.connectionData);
    }
  } else if (data.type === DataNodeType.File) {
    return await executeParseFile(data.file);
  } else if (data.type === DataNodeType.Url) {
    return await executeFetchUrl(data.url);
  } else if (data.type === DataNodeType.Text) {
    return {
      status: NodeResultStatus.Ok,
      data: {
        content: data.content ?? "",
        type: "string",
      } as StringContentResult,
    };
  }

  return {
    status: NodeResultStatus.Ok,
    data: {
      content: data.content,
      type: "string",
    } as StringContentResult,
  };
}

async function _handleExtractNode(
  node: NodeDef,
  input: NodeResult | null,
  executeContext: WorkflowContext,
): Promise<NodeResult> {
  const controller = new AbortController();
  let subscription = cancelListener.subscribe(() => {
    controller.abort();
  });

  let config: AxiosRequestConfig = {
    headers: { Authorization: `Bearer ${API_TOKEN}` },
    signal: controller.signal,
  };

  if (executeContext.getAuthToken) {
    const token = await executeContext.getAuthToken();
    config.headers = { Authorization: `Bearer ${token}` };
  }

  console.log("input: ", input);
  let nodeData = node.data as ExtractNodeDef;

  let text = "";
  if (input && input.data) {
    let rawValue = getValue(input.data);
    if (typeof rawValue === "string") {
      text = rawValue;
    } else {
      text = JSON.stringify(rawValue);
    }
  }

  let data = {
    query: nodeData.query,
    text,
    jsonSchema: nodeData.schema,
  };

  const response = await axios
    .post<AskApiResult>(`${API_ENDPOINT}/action/ask`, data, config)
    .then((resp) => {
      let response = resp.data;
      return {
        status: response.status,
        data: {
          extractedData: response.result.jsonResponse,
          schema: nodeData.schema,
        },
      } as NodeResult;
    })
    .catch((err: AxiosError) => {
      return {
        status: NodeResultStatus.Error,
        error: err.message,
      } as NodeResult;
    })
    .catch((err) => {
      return {
        status: NodeResultStatus.Error,
        error: err.toString(),
      } as NodeResult;
    });

  subscription.unsubscribe();
  return response;
}

async function _handleSummarizeNode(
  node: NodeDef,
  input: NodeResult | null,
  executeContext: WorkflowContext,
) {
  const controller = new AbortController();
  let subscription = cancelListener.subscribe(() => controller.abort());
  let response = await executeSummarizeTask(
    input,
    controller,
    cancelListener,
    executeContext,
  );
  subscription.unsubscribe();
  return response;
}

async function _handleLoopNode(
  node: NodeDef,
  input: NodeResult | null,
  executeContext: WorkflowContext,
): Promise<NodeResult> {
  if (input && input.data) {
    const loopResult = {
      loopResults: [],
    } as LoopNodeDataResult;

    const data = input.data;
    if (isTableResult(data)) {
      for (const item of data.rows) {
        let inputData = {
          status: NodeResultStatus.Ok,
          data: item as ObjectResult,
        };
        const newInput = mapInput(node, inputData);
        await _executeLoop(node, newInput, executeContext, loopResult);
      }
    } else if (Array.isArray(input.data)) {
      for (const item of input.data as any[]) {
        let inputData = {
          status: NodeResultStatus.Ok,
          data: item as ObjectResult,
        };
        const newInput = mapInput(node, inputData);
        await _executeLoop(node, newInput, executeContext, loopResult);
      }
    }

    return {
      status: NodeResultStatus.Ok,
      data: loopResult,
    };
  }

  return {
    status: NodeResultStatus.Error,
    error: "Invalid template node input",
  };
}

async function _executeLoop(
  node: NodeDef,
  lastResult: NodeResult | null,
  executeContext: WorkflowContext,
  loopResult: LoopNodeDataResult,
) {
  let length = (node.data as ParentDataDef).actions.length;
  const multiResult = [] as MultiNodeDataResult;
  for (let i = 0; i < length; i++) {
    let subNode = (node.data as ParentDataDef).actions[i];
    lastResult = await executeContext.runNode(subNode, lastResult);
    multiResult.push(lastResult);
  }

  loopResult.loopResults.push(multiResult);
}

async function _handleTemplateNode(node: NodeDef, input: NodeResult | null) {
  let context: any = {};
  let templateData = node.data as TemplateNodeDef;

  if (input?.data) {
    const inputValue = getValue(input?.data);

    if (isStringResult(input.data) || Array.isArray(inputValue)) {
      context["content"] = inputValue;
    } else {
      Object.keys(templateData.varMapping).forEach((key) => {
        let value = templateData.varMapping[key as keyof object];
        if (inputValue && inputValue[value as keyof object]) {
          let data: any = inputValue[value as keyof object];

          // Use SafeString here so that html is correctly embedded.
          if ("content" in inputValue) {
            context[key] = new Handlebars.SafeString(data);
          } else {
            context[key] = data;
          }
        }
      });
    }

    let template = Handlebars.compile(templateData.template);
    return {
      status: NodeResultStatus.Ok,
      data: {
        content: template(context),
        type: "string",
      } as StringContentResult,
    } as NodeResult;
  }

  return {
    status: NodeResultStatus.Error,
    error: "Invalid template node input",
  };
}

export async function executeNode(
  input: NodeResult | null,
  node: NodeDef,
  executeContext: WorkflowContext,
): Promise<NodeResult> {
  console.log("input: ", input);

  let result;
  if (node.nodeType === NodeType.DataSource) {
    result = _handleDataNode(node, executeContext);
  } else if (node.nodeType === NodeType.Extract) {
    result = _handleExtractNode(node, input, executeContext);
  } else if (node.nodeType === NodeType.Summarize) {
    result = _handleSummarizeNode(node, input, executeContext);
  } else if (node.nodeType === NodeType.Template) {
    result = _handleTemplateNode(node, input);
  } else if (node.nodeType === NodeType.Loop) {
    result = _handleLoopNode(node, input, executeContext);
  }

  if (result) {
    return result.then((nodeResult) => {
      if (node.mapping && node.nodeType !== NodeType.Loop) {
        return mapInput(node, nodeResult);
      } else {
        return nodeResult;
      }
    });
  }

  return {
    status: NodeResultStatus.Error,
    error: "Invalid node type",
  };
}

function mapInput(node: NodeDef, input: NodeResult): NodeResult {
  if (input && node.mapping && !input.error) {
    let newInput = {
      error: input.error,
      status: input.status,
      data: {} as ObjectResult,
    };

    const data = input.data;
    if (data) {
      let objectData: any;
      if (isExtractResult(data)) {
        objectData = data.extractedData;
      } else {
        objectData = data;
      }

      console.error("Mapping object data", objectData);

      let newData = {} as { [key: string]: any };

      for (let key in objectData) {
        let mapping = node.mapping.find((mapping) => mapping.from === key);
        if (mapping) {
          if (mapping.skip) {
            continue;
          } else if (mapping.to) {
            newData[mapping.to] = objectData[key];
          } else if (mapping.extract) {
            newData = objectData[key];
            break;
          }
        } else {
          newData[key] = objectData[key];
        }
      }

      return {
        status: input.status,
        data: newData as ObjectResult,
      };
    }
  }
  return input;
}
