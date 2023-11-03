import { DocumentIcon, TableCellsIcon } from "@heroicons/react/20/solid";
import { useState, useEffect } from "react";
import { DataNodeDef } from "../../../../types/node";
import { ConnectionConfig } from "../connection";
import { SiGooglesheets } from "@icons-pack/react-simple-icons";

export function GoogleSheetConfig({ data, updateNodeData }: ConnectionConfig) {
  let nodeData = data as DataNodeDef;

  let [spreadsheetId, setSpreadsheetID] = useState<string | null>(null);
  let [sheetId, setSheetId] = useState<string | null>(null);
  let [numRows, setNumRows] = useState<number | null>(null);

  useEffect(() => {
    if (nodeData.connectionData) {
      setSpreadsheetID(nodeData.connectionData.spreadsheetId ?? null);
      setSheetId(nodeData.connectionData.sheetId ?? null);
      setNumRows(nodeData.connectionData.numRows ?? null);
    }
  }, [nodeData]);

  return (
    <div className="flex flex-col gap-2 rounded-box">
      <div className="flex flex-row gap-2 justify-center items-center rounded-box py-3">
        <SiGooglesheets className="w-8 h-8 text-[#34A853]" />
        <span className="text-lg">Google Sheets</span>
      </div>
      <div className="join items-center bg-base-100">
        <div className="join-item pl-4">
          <TableCellsIcon className="w-4" />
        </div>
        <input
          className="input join-item w-full placeholder:text-gray-700"
          placeholder="Spreadsheet ID"
          value={spreadsheetId || ""}
          onChange={(event) => {
            let spreadsheetId = event.target.value ?? "";
            setSpreadsheetID(spreadsheetId);
            updateNodeData({ spreadsheetId });
          }}
        />
      </div>

      <div className="join items-center bg-base-100">
        <div className="join-item pl-4">
          <DocumentIcon className="w-4" />
        </div>
        <input
          className="input join-item w-full placeholder:text-gray-700"
          placeholder="Sheet title, defaults to first sheet if blank"
          value={sheetId || ""}
          onChange={(event) => {
            let sheetId = event.target.value ?? "";
            setSheetId(sheetId);
            updateNodeData({ sheetId });
          }}
        />
      </div>

      <div className="join items-center bg-base-100">
        <div className="join-item pl-4">
          <DocumentIcon className="w-4" />
        </div>
        <input
          className="input join-item w-full placeholder:text-gray-700"
          placeholder="Number of rows to read, leave blank for all rows"
          value={numRows || ""}
          onChange={(event) => {
            let numRows = parseInt(event.target.value ?? "");
            setNumRows(numRows ?? null);
            updateNodeData({ numRows });
          }}
        />
      </div>
    </div>
  );
}
