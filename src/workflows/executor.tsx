import Handlebars from "handlebars";
import axios, { AxiosRequestConfig, AxiosError } from "axios";
import {
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
  ParentDataDef,
  RenameInput,
  StringContentResult,
  StringToListConversion,
  TemplateNodeDef,
} from "../types/node";
import { WorkflowContext } from "./workflowinstance";
import { MappedTypeNode } from "typescript";
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

async function _handleDataNode(node: NodeDef): Promise<NodeResult> {
  let data = node.data as DataNodeDef;
  if (data.type === DataNodeType.File && data.file) {
    return await executeParseFile(data.file);
  } else if (data.type === DataNodeType.Url && data.url) {
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
): Promise<NodeResult> {
  const controller = new AbortController();
  let subscription = cancelListener.subscribe(() => {
    controller.abort();
  });

  let config: AxiosRequestConfig = {
    headers: { Authorization: `Bearer ${API_TOKEN}` },
    signal: controller.signal,
  };

  console.log("input: ", input);
  let nodeData = node.data as ExtractNodeDef;

  let text = "";
  if (input && input.data) {
    if ("content" in input.data) {
      text = input.data.content ?? "";
    } else {
      text = JSON.stringify(input.data);
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

async function _handleSummarizeNode(node: NodeDef, input: NodeResult | null) {
  const controller = new AbortController();
  let subscription = cancelListener.subscribe(() => controller.abort());
  let response = await executeSummarizeTask(input, controller, cancelListener);
  subscription.unsubscribe();
  return response;
}

async function _handleLoopNode(
  node: NodeDef,
  input: NodeResult | null,
  executeContext: WorkflowContext,
): Promise<NodeResult> {
  if (input) {
    const loopResult = {
      loopResults: [],
    } as LoopNodeDataResult;

    if (Array.isArray(input.data)) {
      for (const item of input.data as any[]) {
        let inputData = {
          status: NodeResultStatus.Ok,
          data: item,
        };
        await _executeLoop(node, inputData, executeContext, loopResult);
      }
    } else if (typeof input.data === "object") {
      for (const [key, value] of Object.entries(input.data)) {
        let data: { [key: string]: any } = {};
        data[key] = value;
        let inputData = {
          status: NodeResultStatus.Ok,
          data: {
            extractedData: data,
          } as ExtractResponse,
        };

        await _executeLoop(node, inputData, executeContext, loopResult);
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
    executeContext.updateNode(node.uuid, new Date(), lastResult);
    if (lastResult.data) {
      multiResult.push(lastResult.data);
    }
  }

  loopResult.loopResults.push(multiResult);
}

export function _handleTemplateNode(node: NodeDef, input: NodeResult | null) {
  let context: any = {};
  let templateData = node.data as TemplateNodeDef;
  console.error("input data ", input);
  if (input?.data) {
    Object.keys(templateData.varMapping).forEach((key) => {
      let value = templateData.varMapping[key as keyof object];
      if (input.data && input.data[value as keyof object]) {
        let data: any = input.data[value as keyof object];

        // Use SafeString here so that html is correctly embedded.
        if ("content" in input.data) {
          context[key] = new Handlebars.SafeString(data);
        } else {
          context[key] = data;
        }

        console.error(" context ", context);
      }
    });

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
  let updatedInput = input;
  if (node.mapping) {
    updatedInput = mapInput(node, input);
  }
  console.log("input: ", updatedInput);

  if (node.nodeType === NodeType.Data) {
    return _handleDataNode(node);
  } else if (node.nodeType === NodeType.Extract) {
    return _handleExtractNode(node, input);
  } else if (node.nodeType === NodeType.Summarize) {
    return _handleSummarizeNode(node, updatedInput);
  } else if (node.nodeType === NodeType.Template) {
    return _handleTemplateNode(node, input);
  } else if (node.nodeType === NodeType.Loop) {
    return _handleLoopNode(node, updatedInput, executeContext);
  }

  return {
    status: NodeResultStatus.Error,
    error: "Invalid node type",
  };
}

function mapInput(node: NodeDef, input: NodeResult | null): NodeResult | null {
  if (input && node.mapping && !input.error) {
    let newInput = {
      error: input.error,
      status: input.status,
      data: {} as any,
    };

    if (input.data) {
      for (let mapping of node.mapping) {
        let newData;
        if (isStringToListConversion(mapping.conversion)) {
          let data = input.data[mapping.from as keyof object] as string;
          newData = data.split(mapping.conversion.delimiter).map((value) => {
            return {
              content: value,
              type: "string",
            } as StringContentResult;
          });
        } else if (isRename(mapping)) {
          newData = input.data[mapping.from as keyof object];
        }

        if (mapping.to) {
          newInput.data[mapping.to] = newData;
        } else {
          newInput.data = newData;
        }
      }
    }

    return newInput;
  }
  return input;
}
