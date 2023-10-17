import {useEffect, useState} from 'react';
import {NodeBodyProps} from '../../nodes';
import {ConnectionDataDef, DataNodeDef} from '../../../types/node';
import {
  GlobeAltIcon,
  TableCellsIcon,
  UserCircleIcon,
} from '@heroicons/react/20/solid';
import {listUserConnections} from '../../../workflows/task-executor';

export interface UserConnection {
  id: number;
  apiId: string;
  account: string;
}

export function ConnectionDataNode({
  data,
  onUpdateData = () => {},
  getAuthToken,
}: NodeBodyProps) {
  let nodeData = data as DataNodeDef;
  let [type, setType] = useState(nodeData.type);

  let [userConns, setUserConns] = useState<UserConnection[]>([]);
  let [connectionId, setConnectionId] = useState<number | null>(null);
  let [spreadsheetId, setSpreadsheetID] = useState<string | null>(null);
  let [sheetId, setSheetId] = useState<string | null>(null);

  useEffect(() => {
    if (getAuthToken) {
      getAuthToken().then(token => {
        listUserConnections(token).then(conns => setUserConns(conns));
      });
    } else {
      listUserConnections().then(conns => setUserConns(conns));
    }
  }, []);

  useEffect(() => {
    setType(nodeData.type);
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
      type,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="join items-center bg-base-100">
        <div className="join-item pl-4">
          <UserCircleIcon className="w-4" />
        </div>
        <select
          className="input join-item w-full placeholder:text-gray-700"
          onChange={event => {
            let connectionId = Number.parseInt(event.target.value);
            if (connectionId) {
              setConnectionId(connectionId);
              updateNodeData({connectionId});
            }
          }}
          defaultValue={connectionId || ''}
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
          value={spreadsheetId || ''}
          onChange={event => {
            let spreadsheetId = event.target.value ?? '';
            if (spreadsheetId) {
              setSpreadsheetID(spreadsheetId);
              updateNodeData({spreadsheetId});
            }
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
          value={sheetId || ''}
          onChange={event => {
            let sheetId = event.target.value ?? '';
            if (sheetId) {
              setSheetId(event.target.value ?? '');
              updateNodeData({sheetId});
            }
          }}
        />
      </div>
    </div>
  );
}
