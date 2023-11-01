import { DocumentIcon, TableCellsIcon } from "@heroicons/react/20/solid";
import { useState, useEffect } from "react";
import { DataNodeDef } from "../../../../types/node";
import { ConnectionConfig } from "../connection";
import { SiGooglesheets } from "@icons-pack/react-simple-icons";

export function GoogleSheetConfig({ data, updateNodeData }: ConnectionConfig) {
  let nodeData = data as DataNodeDef;

  let [spreadsheetId, setSpreadsheetID] = useState<string | null>(null);
  let [sheetId, setSheetId] = useState<string | null>(null);

  useEffect(() => {
    if (nodeData.connectionData) {
      if (nodeData.connectionData.spreadsheetId) {
        setSpreadsheetID(nodeData.connectionData.spreadsheetId);
      }

      if (nodeData.connectionData.sheetId) {
        setSheetId(nodeData.connectionData.sheetId);
      }
    }
  }, [nodeData]);

  return (
    <div className="flex flex-col gap-2 bg-base-200 rounded-box">
      <div className="flex flex-row gap-2 justify-center items-center bg-base-200 rounded-box py-3">
        <SiGooglesheets className="w-8 h-8 text-[#34A853]"></SiGooglesheets>
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
    </div>
  );
}
