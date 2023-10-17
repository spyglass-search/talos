import React, { useEffect, useState } from "react";
import { ConnectionDataDef, DataNodeDef } from "../../../types/node";
import { NodeBodyProps } from "../../nodes";
import {
  GlobeAltIcon,
  TableCellsIcon,
  UserCircleIcon,
} from "@heroicons/react/20/solid";
import { UserConnection } from "../sources/connection";
import { listUserConnections } from "../../../workflows/task-executor";

export default function DataDestinationNode({
  data,
  onUpdateData = () => {},
}: NodeBodyProps) {
  let nodeData = data as DataNodeDef;
  let [userConns, setUserConns] = useState<UserConnection[]>([]);
  let [connectionId, setConnectionId] = useState<number | null>(null);
  let [spreadsheetId, setSpreadsheetID] = useState<string | null>(null);
  let [sheetId, setSheetId] = useState<string | null>(null);

  useEffect(() => {
    listUserConnections().then((conns) => setUserConns(conns));
  }, []);

  useEffect(() => {
    if (nodeData.connectionData) {
      let data = nodeData.connectionData;
      setSpreadsheetID(data.spreadsheetId ?? null);
      setSheetId(data.sheetId ?? null);
    }
  }, [nodeData]);

  let updateNodeData = (newData: ConnectionDataDef) => {
    onUpdateData({
      connectionData: {
        connectionId: newData.connectionId ?? connectionId,
        spreadsheetId: newData.spreadsheetId ?? spreadsheetId,
        sheetId: newData.sheetId ?? sheetId,
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>Appends rows to the sheet specified.</div>
      <div className="join items-center bg-base-100">
        <div className="join-item pl-4">
          <UserCircleIcon className="w-4" />
        </div>
        <select
          className="input join-item w-full placeholder:text-gray-700"
          onChange={(event) => {
            let connectionId = Number.parseInt(event.target.value);
            if (connectionId) {
              setConnectionId(connectionId);
              updateNodeData({ connectionId });
            }
          }}
          defaultValue={connectionId || ""}
        >
          <option>Select an account</option>
          {userConns.map((conn, idx) => (
            <option key={`conn-${idx}`} value={conn.id}>
              {conn.account}
            </option>
          ))}
        </select>
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
          <GlobeAltIcon className="w-4" />
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
