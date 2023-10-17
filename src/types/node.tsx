export enum NodeType {
  // Data that is being pulled from:
  // - An integration
  // - A URL
  // - A file
  // - or just a static text blob.
  DataSource = "DataSource",
  Extract = "Extract",
  Template = "Template",
  Summarize = "Summarize",
  Loop = "Loop",
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

export interface ParentDataDef {
  actions: NodeDef[];
}

export type NodeDataTypes =
  | ExtractNodeDef
  | DataNodeDef
  | TemplateNodeDef
  | SummaryDataDef
  | ParentDataDef
  | ObjectResult;

export type NodeDataResultTypes =
  | StringContentResult
  | LoopNodeDataResult
  | ExtractResponse
  | MultiNodeDataResult
  | SummaryDataDef
  | any[];

export type MultiNodeDataResult = NodeResult[];

export interface LoopNodeDataResult {
  loopResults: MultiNodeDataResult[];
}

export interface ExtractResponse {
  extractedData: any;
  schema?: object;
}

export interface StringContentResult {
  content: string;
  type: "string";
}

export interface ObjectResult {
  [key: string]: any;
}

export interface NodeDef {
  uuid: string;
  label: string;
  nodeType: NodeType;
  data: NodeDataTypes;
  parentNode: boolean;
  mapping?: NodeInputMapping[];
}

export interface NodeInputMapping {
  from: string;
  to?: string;
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

export enum NodeResultStatus {
  Ok = "ok",
  Error = "error",
}

export interface NodeResult {
  status: NodeResultStatus;
  data?: NodeDataResultTypes;
  error?: string;
}

export interface ObjectTypeDefinition {
  [key: string]: NodePropertyDefinition;
}

export interface NodePropertyDefinition {
  type: PropertyType;
  objectDef?: ObjectTypeDefinition;
  enumDef?: string[];
  arrayType?: PropertyType;
}

export enum PropertyType {
  Array = "Array",
  Object = "Object",
  Number = "Number",
  String = "String",
  Enum = "Enum",
  None = "None",
}
