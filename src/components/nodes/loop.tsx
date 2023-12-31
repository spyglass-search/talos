import {
  ArrowDownIcon,
  BoltIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlusCircleIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";
import AddNodeModal from "../modal/AddNodeModal";
import { NodeBodyProps, NodeComponent, ShowNodeResult } from "../nodes";
import {
  ParentDataDef,
  NodeType,
  NodeDef,
  NodeUpdates,
} from "../../types/node";
import { useEffect, useRef, useState } from "react";
import { ModalType } from "../../types";
import { createNodeDefFromType } from "../../utils/nodeUtils";
import { EditableText } from "../editable";
import { DropArea } from "./dropArea";

interface LoopNodeProps extends NodeBodyProps {
  parentUUID: string;
  label: string;
  onUpdateLabel: (label: string) => void;
  onDelete: () => void;
  onDragUpdate: (uuid: string) => void;
}

export default function Loop({
  label,
  data,
  currentNodeRunning,
  onDelete,
  onDragUpdate,
  onUpdateData = () => {},
  onUpdateLabel,
}: LoopNodeProps) {
  let [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  let [actions, setActions] = useState<NodeDef[]>([]);
  useEffect(() => {
    setActions((data as ParentDataDef).actions);
  }, [data]);

  let addNodeModal = useRef(null);
  const onAddNode = (type: NodeType) => {
    let newNode = createNodeDefFromType(type, null);
    let loopData = data as ParentDataDef;
    if (newNode) {
      let newActions = [...loopData.actions, newNode];
      onUpdateData({
        actions: newActions,
      });
    }
  };

  const onDeleteChild = (childUUID: string) => {
    let actions = [];
    let loopData = data as ParentDataDef;
    for (var i = 0; i < loopData.actions.length; i++) {
      let node = loopData.actions[i];
      if (node.uuid !== childUUID) {
        actions.push(node);
      }
    }
    onUpdateData({ actions });
  };

  const onUpdateChild = (childUUID: string, updates: NodeUpdates) => {
    let loopData = data as ParentDataDef;
    const actions = loopData.actions.map((node) => {
      if (node.uuid === childUUID) {
        return {
          ...node,
          label: updates.label ?? node.label,
          data: updates.data ?? node.data,
          mapping: updates.mapping ?? node.mapping,
        };
      } else {
        return node;
      }
    });
    onUpdateData({ actions });
  };

  return (
    <div className="flex flex-col gap-4 rounded w-full">
      <div className="card shadow-xl w-full md:w-[480px] lg:w-[640px] bg-primary mx-auto">
        <div className="card-body px-6 py-4 flex-row justify-between items-center">
          <div className="text-xl font-bold flex flex-row gap-4 items-center">
            <button
              className="btn btn-circle btn-xs btn-neutral btn-outline"
              onClick={() => setIsCollapsed((curState) => !curState)}
            >
              {isCollapsed ? (
                <ChevronDownIcon className="w-4 text-white" />
              ) : (
                <ChevronUpIcon className="w-4 text-white" />
              )}
            </button>
            <div className="text-white">
              <EditableText data={label} onChange={onUpdateLabel} />
            </div>
          </div>
          <div className="text-base flex flex-row gap-2">
            <div className="flex flex-row">
              <div>{actions.length}</div>
              <BoltIcon className="w-4" />
            </div>
            <button
              className="btn btn-circle btn-xs btn-error btn-outline"
              onClick={() => onDelete()}
            >
              <XMarkIcon className="w-4 text-gray" />
            </button>
          </div>
        </div>
      </div>
      {!isCollapsed && (
        <>
          <div className="items-center flex flex-col gap-4 z-0 w-full">
            {actions.map((childNode, idx) => {
              return (
                <div key={`loop-node-${idx}`} className="flex flex-col gap-4">
                  <NodeComponent
                    key={`node-${idx}`}
                    {...childNode}
                    currentNodeRunning={currentNodeRunning ?? ""}
                    onDelete={() => onDeleteChild(childNode.uuid)}
                    onUpdate={(updates) =>
                      onUpdateChild(childNode.uuid, updates)
                    }
                    onDragUpdate={() => onDragUpdate(childNode.uuid)}
                  />
                  {idx < actions.length - 1 ? (
                    <ShowNodeResult
                      node={childNode}
                      result={undefined}
                      onMappingConfigure={() => {}}
                      canShowMapping={false}
                    />
                  ) : (
                    <ArrowDownIcon className="w-4 mx-auto" />
                  )}
                </div>
              );
            })}
            <div className="mx-auto">
              <button
                className="btn"
                onClick={() => {
                  addNodeModal.current &&
                    (addNodeModal.current as ModalType).showModal();
                }}
              >
                <PlusCircleIcon className="w-6 h-6" />
                Add Loop Step
              </button>
            </div>
          </div>
          <div className="card shadow-xl w-full md:w-[480px] lg:w-[640px] bg-primary mx-auto">
            <div className="card-body px-6 py-4 text-xl font-bold">
              End Loop
            </div>
          </div>
        </>
      )}
      <AddNodeModal
        modalRef={addNodeModal}
        lastNode={null}
        onClick={onAddNode}
        inLoop={true}
      />
    </div>
  );
}
