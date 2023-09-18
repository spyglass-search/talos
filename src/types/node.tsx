export enum NodeType {
  Extract = "Extract",
  Data = "Data",
  Template = "Template",
  Summarize = "Summarize",
}

export interface ExtractNodeDef {
  query: string;
  schema: object;
}

export interface DataNodeDef {
  content?: string;
  url?: string;
  type: DataNodeType;
}

export interface TemplateNodeDef {
  template: string;
  varMapping: object;
}

export interface SummaryDataDef {
  summary: string;
  bulletSummary: string;
}

export type NodeDataTypes =
  | ExtractNodeDef
  | DataNodeDef
  | TemplateNodeDef
  | SummaryDataDef;

export enum DataNodeType {
  Text = "Text",
  Url = "Url",
}

export interface NodeDef {
  uuid: string;
  label: string;
  nodeType: NodeType;
  data: NodeDataTypes;
  mapping?: NodeInputMapping[];
}

export interface NodeInputMapping {
  from: string;
  to: string;
  conversion: NodeInputConversion;
}

export interface NodeInputConversion {
  type: string;
}

export interface StringToListConversion extends NodeInputConversion {
  type: "StringToListConversion";
  delimiter: string;
}

export interface RenameInput extends NodeInputConversion {
  type: "Rename";
}

export interface NodeUpdates {
  label?: string;
  data?: NodeDataTypes;
}

export interface LastRunDetails {
  startTimestamp: Date;
  endTimestamp: Date;
  nodeResult: NodeResult;
}

export interface NodeResult {
  status: string;
  data?: NodeDataTypes;
  error?: string;
}
