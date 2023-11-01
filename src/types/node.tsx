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
  connectionType: DataConnectionType;
}

export enum DataConnectionType {
  GSheets = "GSheets",
  GDocs = "GDocs",
  GSlides = "GSlides",
  GForms = "GForms",
  Hubspot = "Hubspot",
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
  | DataDestinationDef;

export type NodeDataResultTypes =
  | StringContentResult
  | LoopNodeDataResult
  | ExtractResponse
  | MultiNodeDataResult
  | SummaryDataDef
  | TableDataResult
  | ObjectResult
  | any[];

export enum OutputDataType {
  StringContent = "StringContent",
  LoopResult = "LoopResult",
  ExtractResult = "ExtractResult",
  MultiNodeResult = "MultiNodeResult",
  SummaryResult = "SummaryResult",
  TableResult = "TableResult",
}

export enum InputDataType {
  StringContent = "StringContent",
  Iterable = "Iterable",
  Object = "Object",
  None = "None",
}

export interface DataDestinationDef {
  [key: string]: any;
}

export type MultiNodeDataResult = NodeResult[];

export interface LoopNodeDataResult {
  loopResults: MultiNodeDataResult[];
}

export interface TableDataResult {
  rows: any[];
  headerRow: { [key: string]: string };
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
  skip?: boolean;
  extract?: boolean;
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
  mapping?: NodeInputMapping[];
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

export interface NodeState {
  expanded: boolean;
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
  properties?: ObjectTypeDefinition;
  enum?: string[];
  items?: NodePropertyDefinition;
}

export enum PropertyType {
  Array = "array",
  Object = "object",
  Number = "number",
  String = "string",
  Enum = "enum",
  None = "none",
  Boolean = "boolean",
}
