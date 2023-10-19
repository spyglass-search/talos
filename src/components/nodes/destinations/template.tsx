import React, { useEffect, useState } from "react";
import { TemplateNodeDef } from "../../../types/node";
import { NodeBodyProps } from "../../nodes";
import { parse } from "@handlebars/parser";
import {
  BlockStatement,
  MustacheStatement,
  PathExpression,
  Program,
} from "@handlebars/parser/types/ast";
import { EditableText, EditableTextarea } from "../../editable";

function checkTemplate(ast: Program, vars: Array<string>) {
  ast.body.forEach((item) => {
    if (item.type === "MustacheStatement") {
      let stmt = item as MustacheStatement;
      if (stmt.path.type === "PathExpression") {
        let path = stmt.path as PathExpression;
        vars.push(path.original);
      }
    } else if (item.type === "BlockStatement") {
      let stmt = item as BlockStatement;
      stmt.params.forEach((param) => {
        if (param.type === "PathExpression") {
          let path = param as PathExpression;
          vars.push(path.original);
        }
      });
    }
  });
}

export default function TemplateNode({
  data,
  onUpdateData = () => {},
}: NodeBodyProps) {
  let [templateErrors] = useState<string | null>(null);
  let [templateVars, setTemplateVars] = useState<Array<string>>([]);

  let templateData = data as TemplateNodeDef;
  let varMapping = templateData.varMapping;

  useEffect(() => {
    let ast = parse(templateData.template);
    let vars: Array<string> = [];
    checkTemplate(ast, vars);
    setTemplateVars(vars);
  }, [templateData]);

  let updateMapping = (varName: string, newValue: any) => {
    let newMapping = {
      ...varMapping,
      [varName]: newValue,
    };
    onUpdateData({
      ...templateData,
      varMapping: newMapping,
    } as TemplateNodeDef);
  };

  return (
    <div className="flex flex-col gap-2">
      <EditableTextarea
        label="Template"
        data={templateData.template}
        onChange={(newTemplate) =>
          onUpdateData({ template: newTemplate, varMapping } as TemplateNodeDef)
        }
      />
      <div>
        <div className="text-sm text-error">{templateErrors}</div>
      </div>
      <div>
        <table className="table table-fixed w-full table-zebra table-sm">
          <thead className="text-secondary">
            <tr>
              <th>Template Variable</th>
              <th>Input Mapping</th>
            </tr>
          </thead>
          <tbody>
            {templateVars.map((varName) => (
              <tr key={varName}>
                <td>{varName}</td>
                <td>
                  <EditableText
                    data={varMapping[varName as keyof object]}
                    onChange={(mapping) => updateMapping(varName, mapping)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
