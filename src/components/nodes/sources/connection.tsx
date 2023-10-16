import { ChangeEvent, useEffect, useState } from "react";
import { NodeBodyProps } from "../../nodes";
import { DataNodeDef } from "../../../types/node";
import { GlobeAltIcon, TableCellsIcon } from "@heroicons/react/20/solid";

export function ConnectionDataNode({ data, onUpdateData = () => {} }: NodeBodyProps) {
  let nodeData = data as DataNodeDef;
  let [type, setType] = useState(nodeData.type);

  let [spreadsheetId, setSpreadsheetID] = useState<string | null>(null);
  let [sheetId, setSheetId] = useState<string | null>(null);

  useEffect(() => {
    setType(nodeData.type);
    if (nodeData.connectionData) {
      let data = nodeData.connectionData;
      setSpreadsheetID(data.spreadsheetId ?? null);
      setSheetId(data.sheetId ?? null);
    }
  }, [nodeData])


  let handleOnChange = (event: ChangeEvent<HTMLInputElement>) => {
    onUpdateData({
      connectionData: {
        spreadsheetId,
        sheetId
      },
      type,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="items-center bg-base-100">
        <div>{nodeData.connectionData && nodeData.connectionData.toString()}</div>
      </div>

      <div className="join items-center bg-base-100">
        <div className="join-item pl-4">
          <TableCellsIcon className="w-4" />
        </div>
        <input
          className="input join-item w-full placeholder:text-gray-700"
          placeholder="Spreadsheet ID"
          value={spreadsheetId || ""}
          onChange={handleOnChange}
        />
      </div>

      <div className="join items-center bg-base-100">
        <div className="join-item pl-4">
          <GlobeAltIcon className="w-4" />
        </div>
        <input
          className="input join-item w-full placeholder:text-gray-700"
          placeholder="Sheet title, defaults to first sheet if blank"
          value={sheetId || ""}
          onChange={handleOnChange}
        />
      </div>
    </div>
  );
}
