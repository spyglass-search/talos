import Handlebars from "handlebars";
import axios, { AxiosRequestConfig, AxiosError } from "axios";
import {
  executeConnectionRequest,
  executeFetchUrl,
  executeParseFile,
  executeSummarizeTask,
} from "./task-executor";
import { Subject } from "rxjs";
import {
  ConnectionDataDef,
  DataConnectionType,
  DataNodeDef,
  DataNodeType,
  ExtractNodeDef,
  HubSpotActions,
  LoopNodeDataResult,
  MultiNodeDataResult,
  NodeDef,
  NodeInputConversion,
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
import { LoopContext, WorkflowContext } from "./workflowinstance";
import {
  getTableRowIndex,
  getValue,
  isExtractResult,
  isStringResult,
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
    const cdata = data.connectionData;

    let request;
    if (cdata.connectionType === DataConnectionType.GSheets) {
      request = _buildGSheetsRequest(cdata);
    } else {
      request = _buildHubSpotRequest(cdata);
    }

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

function _buildGSheetsRequest(cdata: ConnectionDataDef): ObjectResult {
  return {
    Sheets: {
      action: "ReadRows",
      request: {
        spreadsheetId: cdata.spreadsheetId ?? "",
        sheetId: cdata.sheetId ?? "",
        // note: starts on the second row, assuming the first one are the
        // column headers.
        range: {
          start: 2,
          numRows: 100,
        },
      },
    },
  };
}

function _buildHubSpotRequest(cdata: ConnectionDataDef): ObjectResult {
  const request: any = {
    objectType: cdata.objectType ?? "",
  };

  let action;
  if (cdata.action === HubSpotActions.GetOne) {
    action = "ReadObject";
    request.objectId = cdata.objectId ?? "";
  } else if (cdata.action === HubSpotActions.GetRelatedObjects) {
    action = "GetRelated";
    request.objectId = cdata.objectId ?? "";
    request.relatedObjectType = cdata.relatedObjectType ?? "";
  } else if (cdata.action === HubSpotActions.GetAll) {
    action = "ReadAll";
  } else {
    action = "ReadObject";
    request.objectId = cdata.objectId ?? "";
  }
  return {
    HubSpot: {
      action: action,
      request: request,
    },
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

  let value;
  if (input && input.data) {
    value = getValue(input.data);
  }

  if (!Array.isArray(value) && typeof value === "object") {
    const loopContext = executeContext.getLoopContext();
    const index = getTableRowIndex(value);
    if (!index && loopContext && loopContext.isInLoop && loopContext.rowUuid) {
      value["_idx"] = loopContext.rowUuid;
    }
    value = [value];
  }

  // Check if the input data is a valid array.
  if (!input || !input.data || !Array.isArray(value)) {
    return {
      status: "ok",
      content: "Added 0 rows",
    } as NodeResult;
  }

  let action = "AppendRows";
  if (data.action && data.action === "update") {
    action = "UpdateRows";
  }

  value = value.filter((update) => update !== undefined && update !== null);

  let request = {
    Sheets: {
      action,
      request: {
        spreadsheetId: data.spreadsheetId ?? "",
        sheetId: data.sheetId ?? "",
        data: value,
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
      content: `Added ${value.length} rows`,
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
  let status = {
    canceled: false,
  };
  let subscription = cancelListener.subscribe(() => {
    status.canceled = true;
  });
  if (input && input.data) {
    const loopResult = {
      loopResults: [],
    } as LoopNodeDataResult;

    const data = input.data;
    if (isTableResult(data)) {
      let rowCount = data.rows.length;
      for (let i = 0; i < rowCount; i++) {
        const item = data.rows[i];
        const loopContext: LoopContext = {
          isInLoop: true,
          loopIndex: i,
          rowUuid: getTableRowIndex(item),
        };

        if (status.canceled) {
          executeContext.setLoopContext(undefined);
          subscription.unsubscribe();
          return {
            status: NodeResultStatus.Error,
            error: "User Canceled",
            data: loopResult,
          };
        }
        let inputData = {
          status: NodeResultStatus.Ok,
          data: item as ObjectResult,
        };

        executeContext.setLoopContext(loopContext);
        const newInput = mapInput(node, inputData);
        await _executeLoop(node, newInput, executeContext, loopResult);
      }
    } else if (Array.isArray(input.data)) {
      const rows: any[] = input.data as any[];
      let rowCount = rows.length;
      for (let i = 0; i < rowCount; i++) {
        const item = rows[i];
        if (status.canceled) {
          executeContext.setLoopContext(undefined);
          subscription.unsubscribe();
          return {
            status: NodeResultStatus.Error,
            error: "User Canceled",
            data: loopResult,
          };
        }
        let inputData = {
          status: NodeResultStatus.Ok,
          data: item as ObjectResult,
        };

        const loopContext: LoopContext = {
          isInLoop: true,
          loopIndex: i,
        };
        executeContext.setLoopContext(loopContext);
        const newInput = mapInput(node, inputData);
        await _executeLoop(node, newInput, executeContext, loopResult);
      }
    }

    executeContext.setLoopContext(undefined);
    return {
      status: NodeResultStatus.Ok,
      data: loopResult,
    };
  }

  subscription.unsubscribe();

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
    return _handleTemplateNode(node, input);
  } else if (node.nodeType === NodeType.DataDestination) {
    return _handleDestinationNode(node, input, executeContext);
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
    const data = input.data;
    if (data) {
      let objectData: any;
      if (isExtractResult(data)) {
        objectData = data.extractedData;
      } else {
        objectData = data;
      }

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
