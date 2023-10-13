import {
  ExtractResponse,
  LoopNodeDataResult,
  NodeDataResultTypes,
  StringContentResult,
  SummaryDataDef,
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

export function isSummaryResult(
  result: NodeDataResultTypes,
): result is SummaryDataDef {
  return (
    Object.hasOwn(result, "summary") || Object.hasOwn(result, "bulletSummary")
  );
}

export function getValue(data: NodeDataResultTypes): any {
  if (isStringResult(data)) {
    return data.content;
  } else if (isLoopDataResult(data)) {
    return data.loopResults;
  } else if (isExtractResult(data)) {
    return data.extractedData;
  } else if (isSummaryResult(data)) {
    return data;
  } else if (Array.isArray(data)) {
    return data;
  }
}
