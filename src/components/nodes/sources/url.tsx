import { ChangeEvent, useEffect, useState } from "react";
import { DataNodeDef, DataNodeType } from "../../../types/node";
import { NodeBodyProps } from "../../nodes";
import { GlobeAltIcon } from "@heroicons/react/20/solid";

export function UrlDataNode({ data, onUpdateData = () => {} }: NodeBodyProps) {
  let nodeData = data as DataNodeDef;
  let [type, setType] = useState(nodeData.type);
  let [dataValue, setDataValue] = useState<string>("");

  useEffect(() => {
    setType(nodeData.type);
    setDataValue(nodeData.url ?? "");
  }, [nodeData]);


  let handleOnChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDataValue(event.target.value ?? '');
    onUpdateData({
      url: event.target.value,
      content: nodeData.content,
      file: nodeData.file,
      type,
    } as DataNodeDef);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="join items-center bg-base-100">
        <div className="join-item pl-4">
          <GlobeAltIcon className="w-4" />
        </div>
        <input
          className="input join-item w-full placeholder:text-gray-700"
          value={dataValue}
          placeholder="http://example.com"
          onChange={handleOnChange}
        />
      </div>
    </div>
  );
}
