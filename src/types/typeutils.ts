import { executeGSheetsHeaderRequest } from "../workflows/task-executor";
import {
  ConnectionDataDef,
  DataConnectionType,
  DataNodeDef,
  DataNodeType,
  ExtractNodeDef,
  ExtractResponse,
  InputDataType,
  LoopNodeDataResult,
  NodeDataResultTypes,
  NodeDef,
  NodeInputMapping,
  NodePropertyDefinition,
  NodeResultStatus,
  NodeType,
  ObjectTypeDefinition,
  OutputDataType,
  ParentDataDef,
  PropertyType,
  StringContentResult,
  SummaryDataDef,
  TableDataResult,
} from "./node";

export function isStringResult(
  result: NodeDataResultTypes,
): result is StringContentResult {
  return (result as StringContentResult).type === "string";
}

export function isLoopDataResult(
  result: NodeDataResultTypes,
): result is LoopNodeDataResult {
  return Object.hasOwn(result, "loopResults");
}

export function isExtractResult(
  result: NodeDataResultTypes,
): result is ExtractResponse {
  return Object.hasOwn(result, "extractedData");
}

export function isTableResult(
  result: NodeDataResultTypes,
): result is TableDataResult {
  return Object.hasOwn(result, "rows");
}

export function isSummaryResult(
  result: NodeDataResultTypes,
): result is SummaryDataDef {
  return (
    Object.hasOwn(result, "summary") || Object.hasOwn(result, "bulletSummary")
  );
}

export function getTableRowIndex(row: any): string | undefined {
  return row["_idx"];
}

export function getValue(data: NodeDataResultTypes): any {
  if (isStringResult(data)) {
    return data.content;
  } else if (isLoopDataResult(data)) {
    return data.loopResults.flatMap((multiNodeResult) => {
      const result = multiNodeResult[multiNodeResult.length - 1];
      if (result && result.data) {
        return [getValue(result.data)];
      }
      return [];
    });
  } else if (isExtractResult(data)) {
    return data.extractedData;
  } else if (isSummaryResult(data)) {
    return data;
  } else if (Array.isArray(data)) {
    return data;
  } else {
    return data;
  }
}

export function getOutputType(node: NodeDef): OutputDataType | undefined {
  if (node.nodeType === NodeType.DataSource) {
    let dataNode = node.data as DataNodeDef;
    if (
      dataNode.type === DataNodeType.Text ||
      dataNode.type === DataNodeType.File ||
      dataNode.type === DataNodeType.Url
    ) {
      return OutputDataType.StringContent;
    } else if (dataNode.type === DataNodeType.Connection) {
      return OutputDataType.TableResult;
    }
  } else if (node.nodeType === NodeType.Extract) {
    return OutputDataType.ExtractResult;
  } else if (node.nodeType === NodeType.Loop) {
    return OutputDataType.LoopResult;
  } else if (node.nodeType === NodeType.Summarize) {
    return OutputDataType.SummaryResult;
  } else if (node.nodeType === NodeType.Template) {
    return OutputDataType.StringContent;
  }
}

export function getInputType(node: NodeDef): InputDataType | undefined {
  if (node.nodeType === NodeType.DataSource) {
    let dataNode = node.data as DataNodeDef;
    if (
      dataNode.type === DataNodeType.Text ||
      dataNode.type === DataNodeType.File ||
      dataNode.type === DataNodeType.Url
    ) {
      return InputDataType.None;
    } else if (dataNode.type === DataNodeType.Connection) {
      return InputDataType.None;
    }
  } else if (node.nodeType === NodeType.Extract) {
    return InputDataType.StringContent;
  } else if (node.nodeType === NodeType.Loop) {
    return InputDataType.Iterable;
  } else if (node.nodeType === NodeType.Summarize) {
    return InputDataType.StringContent;
  } else if (node.nodeType === NodeType.Template) {
    return InputDataType.Object;
  }
}

export function canConfigureMappings(
  dataTypes: InputOutputDefinition[],
  from: NodeDef,
  to: NodeDef,
): boolean {
  let fromDef = dataTypes.find((definition) => definition.uuid === from.uuid);
  let toDef = dataTypes.find((definition) => definition.uuid === to.uuid);

  // Don't have enough information to allow mappings
  if (!fromDef || !toDef || !toDef.inputType || !fromDef.outputType) {
    return false;
  }

  let outputType = fromDef.outputType;
  let inputType = toDef.inputType;

  // 1. Does not take input so no point in mapping,
  // 2. Input type and output type are the same.
  // 2. Takes an object and is being provided a string. Probably not much we can do with that so ignoring for now (text input to template)
  // 3. Takes an iterable object and is provided a list, nothing to do there in terms of mapping
  // 4. Output is a table, but we expect anything but a loop. We don't have any mappings for that at the moment
  // 5. Output is a String and input expects a loop, currently don't have a way to convert a string into a list
  if (
    inputType === InputDataType.None ||
    (inputType === InputDataType.StringContent &&
      outputType === OutputDataType.StringContent) ||
    (inputType === InputDataType.Object &&
      outputType === OutputDataType.StringContent) ||
    (inputType === InputDataType.Iterable &&
      (outputType === OutputDataType.MultiNodeResult ||
        outputType === OutputDataType.LoopResult ||
        outputType === OutputDataType.TableResult)) ||
    (inputType !== InputDataType.Iterable &&
      outputType === OutputDataType.TableResult) ||
    (inputType === InputDataType.Iterable &&
      outputType === OutputDataType.StringContent)
  ) {
    return false;
  }

  return true;
}

export interface InputOutputDefinition {
  uuid: string;
  inputType?: InputDataType;
  outputType?: OutputDataType;
  outputSchema?: NodePropertyDefinition;
  outputSchemaWithMapping?: NodePropertyDefinition;
}

export async function generateInputOutputTypes(
  nodes: NodeDef[],
  cache: { [key: string]: InputOutputDefinition },
  getAuthToken: () => Promise<string>,
): Promise<InputOutputDefinition[]> {
  const definitions: InputOutputDefinition[] = [];
  let previousNode;
  const length = nodes.length;
  for (let i = 0; i < length; i++) {
    const node = nodes[i];
    let inputType = getInputType(node);
    let outputType = getOutputType(node);
    let objectDefPre;
    let objectDefPost;
    if (node.nodeType === NodeType.Loop && previousNode) {
      objectDefPre = await getFlowControlObjectDefinition(
        previousNode,
        node,
        false,
        cache,
        getAuthToken,
      );
      objectDefPost = await getFlowControlObjectDefinition(
        previousNode,
        node,
        true,
        cache,
        getAuthToken,
      );
    } else {
      objectDefPre = await getObjectDefinition(
        node,
        false,
        cache,
        getAuthToken,
      );
      objectDefPost = await getObjectDefinition(
        node,
        true,
        cache,
        getAuthToken,
      );
    }

    previousNode = node;
    let inputOutputDef: InputOutputDefinition = {
      uuid: node.uuid,
      inputType,
      outputType,
    };

    if (objectDefPre) {
      inputOutputDef.outputSchema = objectDefPre;
    }

    if (objectDefPost) {
      inputOutputDef.outputSchemaWithMapping = objectDefPost;
    }

    definitions.push(inputOutputDef);

    if (node.parentNode) {
      const parentNode = node.data as ParentDataDef;
      const types = await generateInputOutputTypes(
        parentNode.actions,
        cache,
        getAuthToken,
      );
      definitions.push(...types);
    }
  }

  return definitions;
}

async function getFlowControlObjectDefinition(
  inputNode: NodeDef,
  flowControlNode: NodeDef,
  processNodeMappings: boolean,
  cache: { [key: string]: InputOutputDefinition },
  getAuthToken: () => Promise<string>,
): Promise<NodePropertyDefinition | null> {
  if (flowControlNode.nodeType === NodeType.Loop) {
    let inputDefinition = await getObjectDefinition(
      inputNode,
      true,
      cache,
      getAuthToken,
    );
    if (
      inputDefinition &&
      inputDefinition.type === PropertyType.Array &&
      inputDefinition.items
    ) {
      if (processNodeMappings && flowControlNode.mapping) {
        return processMappings(inputDefinition.items, flowControlNode.mapping);
      } else {
        return inputDefinition.items;
      }
    }
  }

  return null;
}

async function getObjectDefinition(
  node: NodeDef,
  processNodeMappings: boolean,
  cache: { [key: string]: InputOutputDefinition },
  getAuthToken: () => Promise<string>,
): Promise<NodePropertyDefinition | null> {
  if (node.nodeType === NodeType.Extract) {
    let schema = (node.data as ExtractNodeDef).schema;
    if (processNodeMappings && node.mapping) {
      return processMappings(schema as NodePropertyDefinition, node.mapping);
    } else {
      return schema as NodePropertyDefinition;
    }
  } else if (node.nodeType === NodeType.DataSource) {
    const dataNode = node.data as DataNodeDef;
    if (
      dataNode &&
      dataNode.type === DataNodeType.Connection &&
      dataNode.connectionData
    ) {
      if (
        dataNode.connectionData.connectionType === DataConnectionType.GSheets
      ) {
        const cachedValue = cache[node.uuid];
        if (cachedValue) {
          if (processNodeMappings && cachedValue.outputSchemaWithMapping) {
            return cachedValue.outputSchemaWithMapping;
          } else if (cachedValue.outputSchema) {
            return cachedValue.outputSchema;
          }
        }
        let token = await getAuthToken();
        const rowResponse = await executeGSheetsHeaderRequest(
          dataNode.connectionData,
          token,
        );

        if (rowResponse.status === NodeResultStatus.Ok && rowResponse.data) {
          let tableData = rowResponse.data as TableDataResult;
          let properties: ObjectTypeDefinition = {};
          for (const key in tableData.headerRow) {
            properties[key] = {
              type: PropertyType.String,
            };
          }

          return {
            type: PropertyType.Array,
            items: {
              type: PropertyType.Object,
              properties: properties,
            },
          };
        } else {
          return null;
        }
      } else if (
        dataNode.connectionData.connectionType === DataConnectionType.Hubspot
      ) {
        let objectType = dataNode.connectionData.objectType;
        let action = dataNode.connectionData.action;
        if (objectType && action) {
          return get_hubspot_type_definition(
            objectType,
            action,
            dataNode.connectionData,
          );
        }
      }
    }
  } else if (node.nodeType === NodeType.Summarize) {
    return {
      type: PropertyType.Object,
      properties: {
        summary: {
          type: PropertyType.String,
        },
        bulletSummary: {
          type: PropertyType.String,
        },
      },
    };
  }
  return null;
}

function processMappings(
  schema: NodePropertyDefinition,
  mappings: NodeInputMapping[],
): NodePropertyDefinition {
  let extracted = mappings.find((mapping) => mapping.extract);
  if (extracted && schema.properties) {
    return schema.properties[extracted.from];
  }
  return schema;
}

function get_hubspot_type_definition(
  objectType: string,
  action: string,
  dataNode: ConnectionDataDef,
) {
  if (action == "singleObject") {
    return {
      type: PropertyType.Object,
      properties: {
        id: {
          type: PropertyType.String,
        },
        created_at: {
          type: PropertyType.String,
        },
        updated_at: {
          type: PropertyType.String,
        },
        archived: {
          type: PropertyType.Boolean,
        },
        archived_at: {
          type: PropertyType.String,
        },
        properties: {
          type: PropertyType.Object,
        },
      },
    };
  } else if (action == "relatedObjects" || action === "all") {
    return {
      type: PropertyType.Array,
      items: {
        type: PropertyType.Object,
        properties: {
          id: {
            type: PropertyType.String,
          },
          created_at: {
            type: PropertyType.String,
          },
          updated_at: {
            type: PropertyType.String,
          },
          archived: {
            type: PropertyType.Boolean,
          },
          archived_at: {
            type: PropertyType.String,
          },
          properties: {
            type: PropertyType.Object,
          },
        },
      },
    };
  } else {
    return {
      type: PropertyType.Object,
    };
  }
}
