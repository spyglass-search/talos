import { MutableRefObject, useState } from "react";
import Modal from ".";
import { NodeIcon } from "../nodes";
import { DataNodeType, NodeDef, NodeType } from "../../types/node";

interface AddNodeModalProps {
  lastNode: NodeDef | null;
  modalRef: MutableRefObject<null>;
  onClick?: (nodeType: NodeType, subType: DataNodeType | null) => void;
}

function nodeTypeLabel(nType: NodeType, subType: DataNodeType | null): string {
  switch (nType) {
    case NodeType.DataSource:
      switch (subType) {
        case DataNodeType.Connection:
          return "Connection";
        case DataNodeType.File:
          return "File Upload";
        case DataNodeType.Url:
          return "URL";
        case DataNodeType.Text:
          return "Raw text";
        default:
          return "Unknown";
      }
    case NodeType.Extract:
      return "Extract";
    case NodeType.Summarize:
      return "Summarize";
    case NodeType.Template:
      return "Template";
    case NodeType.DataDestination:
      return "Connection"
    default:
      return "Unknown";
  }
}

export default function AddNodeModal({
  lastNode,
  modalRef,
  onClick = () => {},
}: AddNodeModalProps) {
  let [activeTab, setActiveTab] = useState<number>(0);

  // todo: validate which nodes can be used based on the last node.
  let nodeList = [
    {
      name: "Data Sources",
      nodes: [
        { nodeType: NodeType.DataSource, subType: DataNodeType.Connection },
        { nodeType: NodeType.DataSource, subType: DataNodeType.File },
        { nodeType: NodeType.DataSource, subType: DataNodeType.Text },
        { nodeType: NodeType.DataSource, subType: DataNodeType.Url },
      ],
    },
    {
      name: "Actions",
      nodes: [
        { nodeType: NodeType.Extract, subType: null },
        { nodeType: NodeType.Summarize, subType: null },
        { nodeType: NodeType.Template, subType: null },
      ],
    },
    {
      name: "Destinations",
      nodes: [
        { nodeType: NodeType.DataDestination, subType: null },
      ],
    },
  ];

  return (
    <Modal modalRef={modalRef}>
      <div className="tabs tabs-boxed">
        {nodeList.map((nodeType, idx) => (
          <div
            className={`tab tab-lifted ${
              activeTab === idx ? "tab-active" : ""
            }`}
            key={nodeType.name}
            onClick={(e) => setActiveTab(idx)}
          >
            {nodeType.name}
          </div>
        ))}
      </div>
      <div className="p-4">
        {nodeList.map((nodeType, idx) => {
          let activeClass = activeTab === idx ? "grid" : "hidden";
          return (
            <div
              className={`${activeClass} grid-cols-2 gap-4`}
              key={`nodetab-${idx}`}
            >
              {nodeType.nodes.map((node, idx) => {
                let { nodeType, subType } = node;
                return (
                  <button
                    key={`nodetype-${idx}`}
                    className="btn btn-neutral flex flex-row items-center gap-2"
                    onClick={() => onClick(nodeType, subType)}
                  >
                    <NodeIcon
                      nodeType={nodeType}
                      subType={subType}
                      className="w-6"
                    />
                    <div>{nodeTypeLabel(nodeType, subType)}</div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
