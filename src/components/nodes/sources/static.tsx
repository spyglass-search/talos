import { useEffect, useRef, useState } from "react";
import { DataNodeDef } from "../../../types/node";
import { NodeBodyProps } from "../../nodes";
import { EditableTextarea } from "../../editable";

export function StaticDataNode({
  data,
  onUpdateData = () => {},
}: NodeBodyProps) {
  let nodeData = data as DataNodeDef;
  let [type, setType] = useState(nodeData.type);
  let [dataValue, setDataValue] = useState<string>("");

  useEffect(() => {
    setType(nodeData.type);
    setDataValue(nodeData.content ?? "");
  }, [nodeData]);

  let updateData = (newValue: string) => {
    onUpdateData({
      content: newValue,
      url: nodeData.url,
      file: nodeData.file,
      type,
    } as DataNodeDef);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <EditableTextarea
          data={dataValue}
          label="Data"
          onChange={(value) => updateData(value)}
        />
      </div>
    </div>
  );
}
