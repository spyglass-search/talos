import {
  DataNodeDef,
  DataNodeType,
  ExtractNodeDef,
  ParentDataDef,
  NodeDataTypes,
  NodeDef,
  NodeType,
  SummaryDataDef,
  TemplateNodeDef,
} from "../types/node";

export function createNodeDefFromType(nodeType: NodeType): NodeDef | undefined {
  let nodeData: NodeDataTypes;
  if (nodeType === NodeType.Data) {
    nodeData = { type: DataNodeType.Text } as DataNodeDef;
  } else if (nodeType === NodeType.Extract) {
    nodeData = { query: "", schema: {} } as ExtractNodeDef;
  } else if (nodeType === NodeType.Summarize) {
    nodeData = { summary: "", bulletSummary: "" } as SummaryDataDef;
  } else if (nodeType === NodeType.Template) {
    nodeData = { template: "", varMapping: {} } as TemplateNodeDef;
  } else if (nodeType === NodeType.Loop) {
    nodeData = { actions: [] } as ParentDataDef;
  } else {
    return undefined;
  }

  let newNode: NodeDef = {
    uuid: crypto.randomUUID(),
    label: `${nodeType} node`,
    nodeType: nodeType,
    data: nodeData,
    parentNode: nodeType === NodeType.Loop,
  };
  return newNode;
}
