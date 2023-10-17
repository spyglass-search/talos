export enum NodeType {
  // Take a generated output and save it somewhere
  DataDestination = "DataDestination",
  // Data that is being pulled from:
  // - An integration
  // - A URL
  // - A file
  // - or just a static text blob.
  DataSource = "DataSource",
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
  connectionData?: ConnectionDataDef;
  type: DataNodeType;
}

export enum DataNodeType {
  Connection = "Connection",
  File = "File",
  Text = "Text",
  Url = "Url",
}

export interface ConnectionDataDef {
  [key: string]: any;
}

export interface TemplateNodeDef {
  template: string;
  varMapping: object;
}

export interface SummaryDataDef {
  summary: string;
  bulletSummary: string;
}

// todo: separate NodeResult data types
export type NodeDataTypes =
  | ExtractNodeDef
  | DataNodeDef
  | TemplateNodeDef
  | SummaryDataDef
  | { [key: string]: any }
  | any[];

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
