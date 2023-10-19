import {
  DataNodeDef,
  DataNodeType,
  InputDataType,
  NodeDef,
  NodeType,
  OutputDataType,
  PropertyType,
} from "../types/node";
import { InputOutputDefinition } from "../types/typeutils";

export interface WorkflowValidationResult {
  result: ValidationStatus;
  validationErrors?: ValidationError[];
}

export interface ValidationError {
  uuid: string;
  error: string;
}

export enum ValidationStatus {
  Success,
  Failure,
}

export function validateWorkflow(
  dataTypes: InputOutputDefinition[],
): WorkflowValidationResult {
  let previous;
  const errors: ValidationError[] = [];
  for (const dataType of dataTypes) {
    if (
      dataType.outputType === OutputDataType.TableResult ||
      dataType.outputType === OutputDataType.ExtractResult ||
      dataType.outputType === OutputDataType.SummaryResult
    ) {
      if (!dataType.outputSchema) {
        errors.push({
          uuid: dataType.uuid,
          error:
            "Unable to identify data types, please verify node is fully configured",
        });
      } else if (!dataType.outputSchemaWithMapping) {
        errors.push({
          uuid: dataType.uuid,
          error: "Mapping produce invalid output, please update your mapping",
        });
      }
    }

    if (dataType.inputType !== InputDataType.None && !previous) {
      errors.push({
        uuid: dataType.uuid,
        error:
          "Invalid start of the workflow. Workflow should start with an input",
      });
    } else if (
      previous &&
      dataType.inputType === InputDataType.Iterable &&
      previous.outputSchemaWithMapping?.type !== PropertyType.Array
    ) {
      errors.push({
        uuid: dataType.uuid,
        error:
          "Input expects an array, but previous node does not output an array",
      });
    }

    previous = dataType;
  }

  if (errors.length === 0) {
    return {
      result: ValidationStatus.Success,
      validationErrors: [],
    };
  } else {
    return {
      result: ValidationStatus.Failure,
      validationErrors: errors,
    };
  }
}
