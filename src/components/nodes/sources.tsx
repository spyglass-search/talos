import { useEffect, useState } from "react";
import { DataNodeDef, DataNodeType } from "../../types/node";
import { NodeBodyProps } from "../nodes";
import { DocumentTextIcon, GlobeAltIcon } from "@heroicons/react/20/solid";
import { EditableTextarea, EditableText } from "../editable";

export function DataNode({ data, onUpdateData = () => {} }: NodeBodyProps) {
  let nodeData = data as DataNodeDef;
  let [type, setType] = useState(nodeData.type);
  let [dataValue, setDataValue] = useState<string>("");

  useEffect(() => {
    if (nodeData.type === DataNodeType.Text) {
      setDataValue(nodeData.content ?? "");
    } else if (nodeData.type === DataNodeType.Url) {
      setDataValue(nodeData.url ?? "");
    }
  }, [nodeData]);

  let dataIcons = {
    [DataNodeType.Text]: <DocumentTextIcon className="w-4" />,
    [DataNodeType.Url]: <GlobeAltIcon className="w-4" />,
  };

  let onSelectType = (nodeType: DataNodeType) => {
    setType(nodeType);
    if (nodeType === DataNodeType.Text) {
      setDataValue(nodeData.content ?? "");
    } else if (nodeType === DataNodeType.Url) {
      setDataValue(nodeData.url ?? "");
    }
  };

  let updateData = (newValue: string) => {
    if (type === DataNodeType.Text) {
      onUpdateData({
        content: newValue,
        url: nodeData.url,
        type,
      } as DataNodeDef);
    } else {
      onUpdateData({
        url: newValue,
        content: nodeData.content,
        type,
      } as DataNodeDef);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-xs uppercase font-semibold pb-2">Data Source</div>
        <div className="join">
          {[DataNodeType.Text, DataNodeType.Url].map((nodeType) => {
            let btnClass = type === nodeType ? "btn-accent" : "";
            return (
              <button
                key={nodeType}
                className={`btn btn-sm join-item ${btnClass}`}
                onClick={() => onSelectType(nodeType)}
              >
                {dataIcons[nodeType]}
                {nodeType}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        {type === DataNodeType.Text ? (
          <EditableTextarea
            data={dataValue}
            label="Data"
            onChange={(value) => updateData(value)}
          />
        ) : (
          <EditableText
            className="w-full rounded-lg"
            data={dataValue}
            label="Url"
            onChange={(value) => updateData(value)}
          />
        )}
      </div>
    </div>
  );
}
