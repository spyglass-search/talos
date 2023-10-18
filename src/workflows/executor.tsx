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
    const cdata = data.connectionData;
    let request = {
      Sheets: {
        action: "ReadRows",
        request: {
          spreadsheetId: cdata.spreadsheetId ?? "",
          sheetId: cdata.sheetId ?? "",
          // note: starts on the second row, assuming the first one are the
          // column headers.
          range: {
            start: 2,
            numRows: 100
          }
        },
      },
    };

    return await executeConnectionRequest(
      cdata,
      request,
      await executeContext.getAuthToken(),
    );
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

async function _handleDestinationNode(
  node: NodeDef,
  input: NodeResult | null,
  executeContext: WorkflowContext,
): Promise<NodeResult> {
  let ndata = node.data as DataNodeDef;
  if (!ndata.connectionData) {
    return {
      status: "error",
      error: "Connection not setup",
    } as NodeResult;
  }

  // Do some light data validation
  let data = ndata.connectionData;
  if (!data.connectionId) {
    return {
      status: NodeResultStatus.Error,
      error: "Please choose a valid connection.",
    };
  } else if (!data.spreadsheetId) {
    return {
      status: NodeResultStatus.Error,
      error: "Please set a valid spreadsheet id.",
    };
  }

  // Check if the input data is a valid array.
  if (!input || !input.data || !Array.isArray(input.data)) {
    return {
      status: "ok",
      content: "Added 0 rows",
    } as NodeResult;
  }

  let action = "AppendRows";
  if (data.action && data.action == "update") {
    action = "UpdateRows";
  }

  let request = {
    Sheets: {
      action,
      request: {
        spreadsheetId: data.spreadsheetId ?? "",
        sheetId: data.sheetId ?? "",
        data: input.data,
      },
    },
  };

  await executeConnectionRequest(
    data,
    request,
    await executeContext.getAuthToken(),
  );
  return {
    status: "ok",
    data: {
      content: `Added ${input.data.length} rows`,
      type: "string",
    } as StringContentResult,
  } as NodeResult;
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

  const token = await executeContext.getAuthToken();
  config.headers = { Authorization: `Bearer ${token}` };

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
    multiResult.push(lastResult);
  }

  loopResult.loopResults.push(multiResult);
}

export function _handleTemplateNode(node: NodeDef, input: NodeResult | null) {
  let context: any = {};
  let templateData = node.data as TemplateNodeDef;
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

  if (node.nodeType === NodeType.DataSource) {
    return _handleDataNode(node, executeContext);
  } else if (node.nodeType === NodeType.Extract) {
    return _handleExtractNode(node, input, executeContext);
  } else if (node.nodeType === NodeType.Summarize) {
    return _handleSummarizeNode(node, updatedInput, executeContext);
  } else if (node.nodeType === NodeType.Template) {
    return _handleTemplateNode(node, input);
  } else if (node.nodeType === NodeType.DataDestination) {
    return _handleDestinationNode(node, input, executeContext);
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
