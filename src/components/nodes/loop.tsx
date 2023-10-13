import { PlusCircleIcon } from "@heroicons/react/20/solid";
import AddNodeModal from "../modal/AddNodeModal";
import { NodeBodyProps } from "../nodes";
import { ParentDataDef, NodeType } from "../../types/node";
import { useRef } from "react";
import { ModalType } from "../../types";
import { createNodeDefFromType } from "../../utils/nodeUtils";

export default function Loop({ data, onUpdateData }: NodeBodyProps) {
  let addNodeModal = useRef(null);
  const onAddNode = (type: NodeType) => {
    let newNode = createNodeDefFromType(type);
    let loopData = data as ParentDataDef;
    if (newNode) {
      let newActions = [...loopData.actions, newNode];
      if (onUpdateData) {
        onUpdateData({
          actions: newActions,
        });
      }
    }
  };
  return (
    <>
      <div className="mx-auto">
        <button
          className="btn btn-outline"
          onClick={() => {
            addNodeModal.current &&
              (addNodeModal.current as ModalType).showModal();
          }}
        >
          <PlusCircleIcon className="w-8 h-auto" />
          Add Sub Action
        </button>
      </div>
      <AddNodeModal
        modalRef={addNodeModal}
        lastNode={null}
        onClick={onAddNode}
      />
    </>
  );
}
