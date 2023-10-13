import { MutableRefObject, useState } from "react";
import Modal from ".";
import { NodeIcon } from "../nodes";
import { NodeDef, NodeType } from "../../types/node";

interface AddNodeModalProps {
  lastNode: NodeDef | null;
  modalRef: MutableRefObject<null>;
  onClick?: (nodeType: NodeType) => void;
}

function nodeTypeLabel(nType: NodeType): string {
  switch (nType) {
    case NodeType.DataConnection:
      return "Connection";
      case NodeType.DataFetched:
        return "URL or File";
    case NodeType.DataStatic:
      return "Raw text";
    case NodeType.Extract:
      return "Extract";
    case NodeType.Summarize:
      return "Summarize";
    case NodeType.Template:
      return "Template";
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
    { name: "Data Source", nodes: [
        NodeType.DataConnection,
        NodeType.DataFetched,
        NodeType.DataStatic
    ] },
    {
      name: "Actions",
      nodes: [NodeType.Extract, NodeType.Summarize],
    },
    {
      name: "Destination",
      nodes: [NodeType.Template],
    },
  ];

  return (
    <Modal modalRef={modalRef}>
      <div className="tabs tabs-boxed">
        {nodeList.map((nodeType, idx) => (
          <a
            className={`tab tab-lifted ${
              activeTab === idx ? "tab-active" : ""
            }`}
            key={nodeType.name}
            onClick={() => setActiveTab(idx)}
          >
            {nodeType.name}
          </a>
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
              {nodeType.nodes.map((nodeType) => {
                return (
                  <button
                    key={nodeType}
                    className="btn btn-neutral flex flex-row items-center gap-2"
                    onClick={() => onClick(nodeType)}
                  >
                    <NodeIcon nodeType={nodeType} className="w-6" />
                    <div>{nodeTypeLabel(nodeType)}</div>
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
