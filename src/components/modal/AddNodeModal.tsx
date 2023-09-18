import { MutableRefObject } from "react";
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
    case NodeType.Data:
      return "Data Source";
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
  let allowedList = [];
  if (!lastNode) {
    allowedList.push(
      NodeType.Data,
      NodeType.Extract,
      NodeType.Summarize,
      NodeType.Template,
    );
  } else if (lastNode) {
  }

  return (
    <Modal modalRef={modalRef}>
      <h2 className="text-xl font-bold mb-4">Add Action</h2>
      <div className="grid grid-cols-2 gap-4">
        {allowedList.map((nodeType) => {
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
    </Modal>
  );
}
