import Handlebars from "handlebars";
import axios, { AxiosRequestConfig } from "axios";
import { executeSummarizeTask } from "./task-executor";
import { Subject } from "rxjs";
import {
  DataNodeDef,
  DataNodeType,
  ExtractNodeDef,
  NodeDef,
  NodeResult,
  NodeType,
  RenameInput,
  StringToListConversion,
  TemplateNodeDef,
} from "../types/node";
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
  object: any,
): object is StringToListConversion {
  return object.type === "StringToListConversion";
}

export function isRename(object: any): object is RenameInput {
  return object.type === "Rename";
}

export function cancelExecution() {
  cancelListener.next(true);
}

async function _handleDataNode(node: NodeDef): Promise<NodeResult> {
  let data = node.data as DataNodeDef;
  if (data.type) {
    if (data.type === DataNodeType.Url && data.url) {
      return await axios
        .get(data.url)
        .then((resp) => {
          let response = resp.data;
          return {
            status: "Ok",
            data: {
              content: response as string,
            } as DataNodeDef,
          } as NodeResult;
        })
        .catch((err) => {
          return {
            status: "error",
            error: err.toString(),
          };
        });
    }
  }

  return {
    status: "Ok",
    data: node.data,
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
        data: response.result.jsonResponse,
      } as NodeResult;
    })
    .catch((err) => {
      return {
        status: "error",
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

export function _handleTemplateNode(node: NodeDef, input: NodeResult | null) {
  let context: HandlebarsTemplates = {};
  let templateData = node.data as TemplateNodeDef;
  if (input?.data) {
    Object.keys(templateData.varMapping).forEach((key) => {
      let value = templateData.varMapping[key as keyof object];
      if (input.data && input.data[value as keyof object]) {
        context[key] = input.data[value as keyof object];
      }
    });

    let template = Handlebars.compile(templateData.template);
    return {
      status: "Ok",
      data: {
        content: template(context),
      } as DataNodeDef,
    } as NodeResult;
  }

  return {
    status: "error",
    error: "Invalid template node input",
  };
}

export async function executeNode(
  input: NodeResult | null,
  node: NodeDef,
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
  }

  return {
    status: "error",
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
        if (isStringToListConversion(mapping)) {
          let data = input.data[mapping.from as keyof object] as string;
          newInput.data[mapping.to] = data.split(mapping.delimiter);
        } else if (isRename(mapping)) {
          newInput.data[mapping.to] = input.data[mapping.from as keyof object];
        }
      }
    }
    return newInput;
  }
  return input;
}