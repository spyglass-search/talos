import Ajv from "ajv/dist/2020";
import { ExtractNodeDef } from "../../types/node";
import { NodeBodyProps } from "../nodes";
import React, { useEffect, useState } from "react";
import { JSONSchema7, JSONSchema7Definition } from "json-schema";
import { EditableText, EditableTextarea } from "../editable";

interface FieldDef {
  label: string;
  type: string;
}

// Not the smartest way of doing this and makes some assumptions about the schema
// being passed in.
function extractProps(
  schema: boolean | JSONSchema7 | JSONSchema7Definition[],
): Array<FieldDef> {
  if (schema instanceof Object) {
    const keys = Object.keys(schema);
    const values = Object.values(schema);

    return keys.map((key, idx) => {
      let value = values[idx] as JSONSchema7;
      return {
        label: key,
        type: value.type?.toString() ?? "unknown",
      };
    });
  }

  return [];
}

export default function ExtractNode({
  data,
  onUpdateData = () => {},
}: NodeBodyProps) {
  let [schemaError, setSchemaError] = useState<string | null>(null);
  let [fields, setFields] = useState<Array<FieldDef>>([]);

  let actionData = data as ExtractNodeDef;
  let schema = actionData.schema as JSONSchema7;

  useEffect(() => {
    let ajv = new Ajv();
    // todo: figure out a way to validate the schema itself?
    // or maybe a UI way to add/remove fields
    if (actionData.schema) {
      try {
        ajv.compile(actionData.schema);
      } catch (err) {
        let error = err as Error;
        setSchemaError(error.toString());
      }

      // parse schema
      if (!schemaError && schema.type) {
        if (schema.type === "object" && schema.properties) {
          setFields(extractProps(schema.properties));
        } else if (schema.type === "array" && schema.items) {
          setFields(extractProps(schema.items));
        }
      }
    }
  }, [actionData, schema, schemaError]);

  let updateQuery = (newQuery: string) => {
    onUpdateData({ ...actionData, query: newQuery } as ExtractNodeDef);
  };

  let updateSchema = (newSchema: string) => {
    try {
      onUpdateData({
        ...actionData,
        schema: JSON.parse(newSchema),
      } as ExtractNodeDef);
    } catch (err) {
      // todo: report JSON errors
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <EditableText
        label="Query"
        data={actionData.query}
        onChange={(newValue) => updateQuery(newValue)}
        className="bg-base-100 p-2 rounded text-sm w-full"
      />
      <EditableTextarea
        label="Response Schema"
        isCode
        data={JSON.stringify(actionData.schema, null, 2)}
        onChange={(newValue) => updateSchema(newValue)}
      />
      <div>
        {schemaError ? (
          <div className="text-error p-2">{schemaError}</div>
        ) : null}
        <table className="table table-auto w-full table-zebra table-sm">
          <thead className="text-secondary">
            <tr>
              <th>Field Name</th>
              <th>Field Type</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, idx) => (
              <tr key={idx}>
                <td>{field.label}</td>
                <td>{field.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
