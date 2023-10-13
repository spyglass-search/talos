import { useEffect, useRef, useState } from "react";
import { DataNodeDef, DataNodeType } from "../../../types/node";
import { NodeBodyProps } from "../../nodes";
import {
  ArrowUpCircleIcon,
  ArrowUpOnSquareIcon,
  GlobeAltIcon,
} from "@heroicons/react/20/solid";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { EditableTextarea, EditableText } from "../../editable";

export function FetchedDataNode({ data, onUpdateData = () => {} }: NodeBodyProps) {
  let nodeData = data as DataNodeDef;
  let [type, setType] = useState(nodeData.type);
  let [dataValue, setDataValue] = useState<string>("");
  let fileInput = useRef(null);

  useEffect(() => {
    setType(nodeData.type);
    if (nodeData.type === DataNodeType.Url) {
      setDataValue(nodeData.url ?? "");
    } else if (nodeData.type === DataNodeType.File) {
      setDataValue(nodeData.file?.name ?? "");
    }
  }, [nodeData]);

  let dataIcons = {
    [DataNodeType.File]: <ArrowUpOnSquareIcon className="w-4" />,
    [DataNodeType.Url]: <GlobeAltIcon className="w-4" />,
  };

  let onSelectType = (nodeType: DataNodeType) => {
    setType(nodeType);
    if (nodeType === DataNodeType.Text) {
      setDataValue(nodeData.content ?? "");
    } else if (nodeType === DataNodeType.Url) {
      setDataValue(nodeData.url ?? "");
    } else if (nodeType === DataNodeType.File) {
      setDataValue(nodeData.file?.name ?? "");
    }
  };

  let updateData = (newValue: string | File) => {
    if (type === DataNodeType.Url) {
      onUpdateData({
        url: newValue,
        content: nodeData.content,
        file: nodeData.file,
        type,
      } as DataNodeDef);
    } else if (type === DataNodeType.File) {
      onUpdateData({
        file: newValue,
        content: nodeData.content,
        url: nodeData.url,
        type,
      } as DataNodeDef);
    }
  };

  let rendered = null;
  if (type === DataNodeType.File) {
    rendered = (
      <div>
        <div className="my-4">
          {dataValue ? (
            <div className="p-4 border border-gray-500 rounded flex flex-row items-center gap-4">
              <DocumentTextIcon className="w-14 h-14 stroke-1" />
              {dataValue}
            </div>
          ) : (
            "Choose a file to upload"
          )}
        </div>
        <button
          className="btn w-full"
          onClick={async () => {
            if (fileInput.current) {
              (fileInput.current as HTMLInputElement).click();
            }
          }}
        >
          <ArrowUpCircleIcon className="w-4" />
          Choose File
          <input
            ref={fileInput}
            type="file"
            className="join-item input form-input bg-neutral hidden"
            accept=".pdf"
            onChange={async () => {
              if (fileInput.current) {
                let current = fileInput.current as HTMLInputElement;
                if (current.files && current.files.length > 0) {
                  console.log(current.files[0]);
                  updateData(current.files[0]);
                }
              }
            }}
          />
        </button>
      </div>
    );
  } else if (type === DataNodeType.Url) {
    rendered = (
      <EditableText
        className="w-full rounded-lg"
        data={dataValue}
        label="Url"
        onChange={(value) => updateData(value)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-xs uppercase font-semibold pb-2">
          Choose a Data Source
        </div>
        <div className="join join-horizontal">
          {[DataNodeType.Text, DataNodeType.Url, DataNodeType.File].map(
            (nodeType) => {
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
            },
          )}
        </div>
      </div>
      <div>{rendered}</div>
    </div>
  );
}
