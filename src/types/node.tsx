export enum NodeType {
  // Data that is being pulled from an integration
  DataConnection = "DataConnection",
  // Data fetched from a URL.
  DataURL = "DataURL",
  // Data read/parsed from a file.
  DataFile = "DataFile",
  // Static data, provided by a the user, i.e. a text blob
  DataStatic = "DataStatic",
  Extract = "Extract",
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
  file?: File;
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
  File = "File",
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
