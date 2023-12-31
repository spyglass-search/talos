import { useEffect, useState } from "react";
import { NodeBodyProps } from "../../nodes";
import {
  ConnectionDataDef,
  DataConnectionType,
  DataNodeDef,
  NodeDataTypes,
} from "../../../types/node";
import { UserCircleIcon } from "@heroicons/react/20/solid";
import { listUserConnections } from "../../../workflows/task-executor";
import { GoogleSheetConfig } from "./connectionConfig/googleSheetConfig";
import { HubspotConfig } from "./connectionConfig/hubspotConfig";

import { SiGooglesheets, SiHubspot } from "@icons-pack/react-simple-icons";

export interface UserConnection {
  id: string;
  apiId: string;
  account: string;
}

export interface ConnectionConfig {
  data: NodeDataTypes;
  updateNodeData: (newData: Partial<ConnectionDataDef>) => void;
}

export function ConnectionDataNode({
  data,
  onUpdateData = () => {},
  getAuthToken,
}: NodeBodyProps) {
  let nodeData = data as DataNodeDef;
  let [type, setType] = useState(nodeData.type);

  let [userConns, setUserConns] = useState<UserConnection[]>([]);
  let [connectionId, setConnectionId] = useState<string | undefined>();
  let [connectionType, setConnectionType] = useState<DataConnectionType | null>(
    null,
  );

  useEffect(() => {
    if (getAuthToken) {
      getAuthToken()
        .then((token) => listUserConnections(token))
        .then((conns) => setUserConns(conns));
    } else {
      listUserConnections().then((conns) => {
        setUserConns(conns);
      });
    }
  }, [getAuthToken]);

  useEffect(() => {
    setType(nodeData.type);
    if (nodeData.connectionData) {
      let data = nodeData.connectionData;
      setConnectionType(data.connectionType ?? null);
      setConnectionId(data.connectionId);
    }
  }, [nodeData]);

  let updateNodeData = (newData: Partial<ConnectionDataDef>) => {
    let update: NodeDataTypes = {
      connectionData: {
        connectionId: newData.connectionId ?? connectionId,
        connectionType: newData.connectionType ?? connectionType,
      },
      type,
    };

    for (const key in nodeData.connectionData) {
      update.connectionData[key] = nodeData.connectionData[key];
    }

    for (const key in newData) {
      update.connectionData[key] = newData[key];
    }

    if (newData.connectionId) {
      const connection = userConns.find((connection) => {
        return connection.id === newData.connectionId;
      });
      let connectionType;
      if (connection?.apiId === "hubspot.com") {
        connectionType = DataConnectionType.Hubspot;
      } else if (connection?.apiId === "sheets.google.com") {
        connectionType = DataConnectionType.GSheets;
      } else {
        // Default ATM
        connectionType = DataConnectionType.GSheets;
      }

      setConnectionType(connectionType);
      update.connectionData.connectionType = connectionType;
    }

    onUpdateData(update);
  };

  let icon = <UserCircleIcon className="w-4" />;
  if (connectionType === DataConnectionType.GSheets) {
    icon = <SiGooglesheets className="join-item w-8 h-8 text-[#34A853]" />;
  } else if (connectionType === DataConnectionType.Hubspot) {
    icon = <SiHubspot className="join-item w-8 h-8 text-[#FF7A59]" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="join items-center bg-base-100">
        <div className="join-item pl-4">{icon}</div>
        <select
          className="input join-item w-full placeholder:text-gray-700"
          onChange={(event) => {
            let connectionId = event.target.value;
            if (connectionId) {
              setConnectionId(connectionId);
              updateNodeData({ connectionId });
            } else {
              setConnectionId(undefined);
              setConnectionType(null);
            }
          }}
          value={connectionId}
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
      {connectionType === DataConnectionType.GSheets ? (
        <GoogleSheetConfig data={data} updateNodeData={updateNodeData} />
      ) : null}
      {connectionType === DataConnectionType.Hubspot ? (
        <HubspotConfig data={data} updateNodeData={updateNodeData} />
      ) : null}
    </div>
  );
}
