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

export function createNodeDefFromType(
  nodeType: NodeType,
  subType: DataNodeType | null,
): NodeDef | undefined {
  let nodeData: NodeDataTypes;
  if (nodeType === NodeType.DataSource && subType) {
    nodeData = { type: subType } as DataNodeDef;
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
    label: getDefaultLabel(nodeType, subType),
    nodeType: nodeType,
    data: nodeData,
    parentNode: nodeType === NodeType.Loop,
  };
  return newNode;
}

export function getDefaultLabel(
  nodeType: NodeType,
  subType: DataNodeType | null,
): string {
  if (nodeType === NodeType.DataSource && subType) {
    if (subType === DataNodeType.File) {
      return "Extract Text From File";
    } else if (subType === DataNodeType.Text) {
      return "Text Input";
    } else if (subType === DataNodeType.Url) {
      return "Extract Text From URL";
    } else if (subType === DataNodeType.Connection) {
      return "Pull Content From Connection";
    }
  } else if (nodeType === NodeType.Extract) {
    return "Extract Structured Data From Text";
  } else if (nodeType === NodeType.Summarize) {
    return "Summarize";
  } else if (nodeType === NodeType.Template) {
    return "Expand Template";
  } else if (nodeType === NodeType.Loop) {
    return "Loop Over Each Value";
  }

  return "Untitled Step";
}
