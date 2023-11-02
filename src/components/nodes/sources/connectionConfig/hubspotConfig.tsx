import { DocumentIcon, CubeIcon } from "@heroicons/react/20/solid";
import { useState, useEffect } from "react";
import { DataNodeDef } from "../../../../types/node";
import { ConnectionConfig } from "../connection";
import { SiHubspot } from "@icons-pack/react-simple-icons";

export function HubspotConfig({ data, updateNodeData }: ConnectionConfig) {
  let nodeData = data as DataNodeDef;

  let [objectType, setObjectType] = useState<string | undefined>(undefined);
  let [relatedObjectType, setRelatedObjectType] = useState<string | undefined>(
    undefined,
  );
  let [objectId, setObjectId] = useState<string | null>(null);
  let [action, setAction] = useState<string>("singleObject");

  useEffect(() => {
    if (nodeData.connectionData) {
      if (nodeData.connectionData.objectType) {
        setObjectType(nodeData.connectionData.objectType);
      }

      if (nodeData.connectionData.objectId) {
        setObjectId(nodeData.connectionData.objectId);
      }

      if (nodeData.connectionData.action) {
        setAction(nodeData.connectionData.action);
      } else {
        updateNodeData({ action: "singleObject" });
      }

      if (nodeData.connectionData.relatedObjectType) {
        setRelatedObjectType(nodeData.connectionData.relatedObjectType);
      }
    }
  }, [nodeData]);

  const updateAction = (newAction: string) => {
    setAction(newAction);
    updateNodeData({ action: newAction });
  };

  return (
    <div className="flex flex-col gap-2 bg-base-200 rounded-box">
      <div className="flex flex-row gap-2 justify-center items-center bg-base-200 rounded-box py-3">
        <SiHubspot className="w-8 h-8 text-[#FF7A59]"></SiHubspot>
        <span className="text-lg">HubSpot</span>
      </div>
      <div className="join items-center bg-base-100">
        <div className="join-item pl-4">
          <CubeIcon className="w-4" />
        </div>
        <select
          className="input join-item w-full placeholder:text-gray-700"
          onChange={(event) => {
            let objectType = event.target.value;
            if (objectType) {
              setObjectType(objectType);
              updateNodeData({ objectType });
            }
          }}
          value={objectType}
          defaultValue={objectType || ""}
        >
          <option>Select an object type</option>
          <option value="contacts">Contacts</option>
          <option value="calls">Calls</option>
          <option value="emails">Emails</option>
          <option value="meetings">Meetings</option>
          <option value="notes">Notes</option>
          <option value="tasks">Tasks</option>
        </select>
      </div>
      {action === "singleObject" || action === "relatedObjects" ? (
        <div className="join items-center bg-base-100">
          <div className="join-item pl-4">
            <DocumentIcon className="w-4" />
          </div>
          <input
            className="input join-item w-full placeholder:text-gray-700"
            placeholder="Record Id for the HubSpot object"
            value={objectId || ""}
            onChange={(event) => {
              let objectId = event.target.value ?? "";
              setObjectId(objectId);
              updateNodeData({ objectId });
            }}
          />
        </div>
      ) : null}
      <div>
        <div className="join items-center bg-base-100">
          <input
            className="join-item btn"
            type="radio"
            name="options"
            aria-label="Get One"
            checked={action === "singleObject"}
            onClick={() => updateAction("singleObject")}
          />
          <input
            className="join-item btn"
            type="radio"
            name="options"
            aria-label="Get Related"
            checked={action === "relatedObjects"}
            onClick={() => updateAction("relatedObjects")}
          />
          <input
            className="join-item btn"
            type="radio"
            name="options"
            aria-label="Get All"
            checked={action === "all"}
            onClick={() => updateAction("all")}
          />
          {/* <input
            className="join-item btn"
            type="radio"
            name="options"
            aria-label="Matching"
            checked={action === "matching"}
            onClick={() => updateAction("matching")}
          /> */}
        </div>
      </div>
      {action === "relatedObjects" ? (
        <div className="join items-center bg-base-100">
          <div className="join-item pl-4">
            <CubeIcon className="w-4" />
          </div>
          <select
            className="input join-item w-full placeholder:text-gray-700"
            onChange={(event) => {
              let relatedObjectType = event.target.value;
              if (relatedObjectType) {
                setRelatedObjectType(relatedObjectType);
                updateNodeData({ relatedObjectType });
              }
            }}
            value={relatedObjectType}
            defaultValue={relatedObjectType || ""}
          >
            <option>Select related objects to access</option>
            <option value="contacts">Contacts</option>
            <option value="calls">Calls</option>
            <option value="emails">Emails</option>
            <option value="meetings">Meetings</option>
            <option value="notes">Notes</option>
            <option value="tasks">Tasks</option>
          </select>
        </div>
      ) : null}
    </div>
  );
}
