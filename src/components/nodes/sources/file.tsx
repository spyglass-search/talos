import { useEffect, useRef, useState } from "react";
import { DataNodeDef } from "../../../types/node";
import { NodeBodyProps } from "../../nodes";
import { ArrowUpCircleIcon } from "@heroicons/react/20/solid";
import { DocumentTextIcon } from "@heroicons/react/24/outline";

export function FileDataNode({ data, onUpdateData = () => {} }: NodeBodyProps) {
  let nodeData = data as DataNodeDef;
  let [type, setType] = useState(nodeData.type);
  let [dataValue, setDataValue] = useState<string>("");
  let fileInput = useRef(null);

  useEffect(() => {
    setType(nodeData.type);
    setDataValue(nodeData.file?.name ?? "");
  }, [nodeData]);

  let updateData = (newValue: string | File) => {
    onUpdateData({
      file: newValue,
      content: nodeData.content,
      url: nodeData.url,
      type,
    } as DataNodeDef);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
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
}
