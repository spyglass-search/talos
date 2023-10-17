import React, { useRef } from "react";
import axios from "axios";
import {
  ArrowDownIcon,
  ArrowUpCircleIcon,
  DocumentArrowDownIcon,
  PlayIcon,
  PlusCircleIcon,
  TrashIcon,
} from "@heroicons/react/20/solid";
import {
  NodeDef,
  NodeResult,
  LastRunDetails,
  NodeUpdates,
  NodeType,
  DataNodeType,
  ParentDataDef,
} from "./types/node";
import {
  NodeComponent,
  ShowNodeResult,
  WorkflowResult,
} from "./components/nodes";
import { useState } from "react";
import {
  insertNode,
  loadWorkflow,
  nodeComesAfter,
  removeNode,
  saveWorkflow,
} from "./workflows/utils";
import { cancelExecution } from "./workflows/executor";
import { ModalType } from "./types";
import AddNodeModal from "./components/modal/AddNodeModal";
import { runWorkflow } from "./workflows";
import { createNodeDefFromType } from "./utils/nodeUtils";
import { ConfigureMappingModal } from "./components/modal/ConfigureMappingModal";
import { API_TOKEN } from "./workflows/task-executor";

function AddAction({ onAdd = () => {} }: { onAdd: () => void }) {
  return (
    <div className="mx-auto">
      <button className="btn" onClick={onAdd}>
        <PlusCircleIcon className="w-8 h-auto" />
        Add Step
      </button>
    </div>
  );
}

function App() {
  // Is a workflow currently running?
  let [workflow, setWorkflow] = useState<Array<NodeDef>>([]);
  let [nodeResults, setNodeResults] = useState<Map<string, LastRunDetails>>(
    new Map(),
  );
  let [dragNDropAfter, setDragNDropAfter] = useState<boolean>(true);
  let [isRunning, setIsRunning] = useState<boolean>(false);
  let [isLoading, setIsLoading] = useState<boolean>(false);
  let [currentNodeRunning, setCurrentNodeRunning] = useState<string | null>(
    null,
  );
  let [endResult, setEndResult] = useState<NodeResult | null>(null);
  let [dragOverUuid, setDragOverUuid] = useState<string | null>(null);
  let [draggedNode, setDraggedNode] = useState<string | null>(null);
  let [inputNode, setInputNode] = useState<NodeDef | null>(null);
  let [outputNode, setOutputNode] = useState<NodeDef | null>(null);
  let configureMappingModal = useRef<HTMLDialogElement>(null);
  let fileInput = useRef(null);
  let exampleSelection = useRef(null);
  let addNodeModal = useRef(null);

  let loadExample = async () => {
    if (exampleSelection.current) {
      let value = (exampleSelection.current as HTMLSelectElement).value;
      if (value && value.length > 0 && value.endsWith(".json")) {
        await axios
          .get<Array<NodeDef>>(
            `${process.env.PUBLIC_URL}/workflow-examples/${value}`,
          )
          .then((resp) => resp.data)
          .then((workflow) => setWorkflow(workflow as Array<NodeDef>));
      }
    }
  };

  let handleRunWorkflow = async () => {
    setIsRunning(true);
    setEndResult(null);

    let lastResult = await runWorkflow(
      workflow,
      (uuid) => {
        setCurrentNodeRunning(uuid);
      },
      (currentResults) => {
        setNodeResults(currentResults);
      },
      async () => {
        return API_TOKEN ?? "";
      },
    );

    setEndResult(lastResult);
    setIsRunning(false);
    setCurrentNodeRunning(null);
  };

  let deleteWorkflowNode = (uuid: string) => {
    setWorkflow(
      workflow.flatMap((node) => {
        if (node.parentNode) {
          (node.data as ParentDataDef).actions = (
            node.data as ParentDataDef
          ).actions.flatMap((node) => {
            if (node.uuid === uuid) {
              return [];
            } else {
              return node;
            }
          });
        }
        if (node.uuid === uuid) {
          return [];
        } else {
          return node;
        }
      }),
    );
  };

  let updateWorkflow = (uuid: string, updates: NodeUpdates) => {
    setWorkflow(
      workflow.map((node) => {
        if (node.parentNode) {
          (node.data as ParentDataDef).actions = (
            node.data as ParentDataDef
          ).actions.flatMap((node) => {
            if (node.uuid === uuid) {
              return {
                ...node,
                label: updates.label ?? node.label,
                data: updates.data ?? node.data,
              };
            } else {
              return node;
            }
          });
        }
        if (node.uuid === uuid) {
          return {
            ...node,
            label: updates.label ?? node.label,
            data: updates.data ?? node.data,
          };
        } else {
          return node;
        }
      }),
    );
  };

  let clearWorkflow = () => {
    setNodeResults(new Map());
    setEndResult(null);
    setWorkflow(
      workflow.map((node) => {
        return { ...node, lastRun: undefined };
      }),
    );
  };

  let cancelWorkflow = () => {
    setIsRunning(false);
    setCurrentNodeRunning(null);
    cancelExecution();
  };

  let onAddNode = (nodeType: NodeType, subType: DataNodeType | null) => {
    let newNode = createNodeDefFromType(nodeType, subType);

    if (newNode) {
      let newWorkflow = [...workflow, newNode];
      setWorkflow(newWorkflow);
    }
  };

  const nodeDropped = (after: boolean, dropUUID: string) => {
    if (!draggedNode) {
      return;
    }
    const newWorkflow = [...workflow];
    const dragNode = removeNode(newWorkflow, draggedNode);
    if (dragNode) {
      insertNode(newWorkflow, after, dropUUID, dragNode);
    }

    setDragOverUuid(null);
    setDraggedNode(null);
    setWorkflow(newWorkflow);
  };

  const isValidDropSpot = (dropAfter: boolean, spotUUID: string) => {
    if (!draggedNode) {
      return false;
    }

    return (
      spotUUID === dragOverUuid &&
      dropAfter === dragNDropAfter &&
      spotUUID !== draggedNode &&
      (!dropAfter ||
        (dropAfter && !nodeComesAfter(workflow, spotUUID, draggedNode)))
    );
  };

  const configureMappings = (inputNode: NodeDef, outputNode: NodeDef) => {
    setInputNode(inputNode);
    setOutputNode(outputNode);
    if (configureMappingModal.current) {
      configureMappingModal.current.showModal();
    }
  };

  return (
    <main className="flex w-screen min-h-screen flex-col gap-8 items-center md:py-8">
      <div className="navbar md:w-fit mx-auto lg:fixed bg-base-200 p-4 rounded-lg z-10 shadow-lg pb-8 md:pb-4">
        <div className="navbar-center flex flex-col lg:flex-row gap-2 place-content-center items-center w-full">
          <img
            src={`${process.env.PUBLIC_URL}/logo@2x.png`}
            className="w-14 ml-6"
            alt="Spyglass Logo"
          />
          <div className="divider divider-horizontal"></div>
          <div className="flex flex-row gap-2">
            <button
              className="btn btn-primary"
              disabled={isRunning}
              onClick={() => handleRunWorkflow()}
            >
              <PlayIcon className="w-4" />
              Run Workflow
            </button>
            <button
              className="btn btn-neutral"
              disabled={isRunning}
              onClick={() => clearWorkflow()}
            >
              <TrashIcon className="w-4" />
              Clear
            </button>
            <button
              className="btn btn-error"
              disabled={!isRunning}
              onClick={() => cancelWorkflow()}
            >
              Cancel
            </button>
          </div>
          <div className="divider lg:divider-horizontal"></div>
          <div className="flex flex-row gap-2">
            <button
              className="btn btn-accent"
              disabled={isRunning}
              onClick={() => saveWorkflow(workflow)}
            >
              <DocumentArrowDownIcon className="w-4" />
              Save
            </button>
            <button
              className="btn btn-neutral"
              disabled={isRunning || isLoading}
              onClick={async () => {
                if (fileInput.current) {
                  (fileInput.current as HTMLInputElement).click();
                }
              }}
            >
              {isLoading ? (
                <div className="loading loading-spinner text-info"></div>
              ) : (
                <ArrowUpCircleIcon className="w-4" />
              )}
              Load
              <input
                ref={fileInput}
                type="file"
                className="join-item input form-input bg-neutral hidden"
                accept=".json"
                onChange={async () => {
                  if (fileInput.current) {
                    setIsLoading(true);
                    return await loadWorkflow(
                      fileInput.current as HTMLInputElement,
                    ).then((workflow) => {
                      setWorkflow(workflow);
                      setIsLoading(false);
                      setNodeResults(new Map());
                      setEndResult(null);
                    });
                  }
                }}
              />
            </button>
            <select
              ref={exampleSelection}
              className="select w-48"
              onChange={loadExample}
            >
              <option>Load Example</option>
              <option disabled>────────────</option>
              <option value="webpage-parsing.json">Webpage Analysis</option>
              <option value="sentiment-analysis.json">
                Yelp Review - Sentiment Analysis
              </option>
            </select>
          </div>
        </div>
      </div>
      <div className="w-full lg:my-32 px-8">
        <div className="items-center flex flex-col">
          {workflow.length > 0 ? (
            <DropArea
              uuid={workflow[0].uuid}
              dropAfter={false}
              isValidDropSpot={isValidDropSpot}
              setDragOverUuid={setDragOverUuid}
              setDragNDropAfter={setDragNDropAfter}
              nodeDropped={nodeDropped}
            ></DropArea>
          ) : null}
        </div>
        <div className="items-center flex flex-col gap-4 z-0">
          {workflow.map((node, idx) => {
            return (
              <>
                <div key={`node-${idx}`} className="flex flex-col gap-4">
                  <NodeComponent
                    {...node}
                    isRunning={node.uuid === currentNodeRunning}
                    lastRun={nodeResults.get(node.uuid)}
                    onDelete={() => deleteWorkflowNode(node.uuid)}
                    onUpdate={(updates) => updateWorkflow(node.uuid, updates)}
                    dragUpdate={(uuid) => setDraggedNode(uuid)}
                  />
                  <DropArea
                    uuid={node.uuid}
                    dropAfter={true}
                    isValidDropSpot={isValidDropSpot}
                    setDragOverUuid={setDragOverUuid}
                    setDragNDropAfter={setDragNDropAfter}
                    nodeDropped={nodeDropped}
                  >
                    {idx < workflow.length - 1 ? (
                      <ShowNodeResult
                        result={nodeResults.get(node.uuid)}
                        onMappingConfigure={() =>
                          configureMappings(node, workflow[idx + 1])
                        }
                      />
                    ) : (
                      <ArrowDownIcon className="mt-4 w-4 mx-auto" />
                    )}
                  </DropArea>
                </div>

                {node.parentNode
                  ? (node.data as ParentDataDef).actions.map(
                      (childNode, childIdx) => {
                        return (
                          <div className="ml-16">
                            {childIdx === 0 ? (
                              <DropArea
                                uuid={childNode.uuid}
                                dropAfter={false}
                                isValidDropSpot={isValidDropSpot}
                                setDragOverUuid={setDragOverUuid}
                                setDragNDropAfter={setDragNDropAfter}
                                nodeDropped={nodeDropped}
                              ></DropArea>
                            ) : null}
                            <NodeComponent
                              key={`node-${idx}-${childIdx}`}
                              {...childNode}
                              isRunning={childNode.uuid === currentNodeRunning}
                              lastRun={nodeResults.get(childNode.uuid)}
                              onDelete={() =>
                                deleteWorkflowNode(childNode.uuid)
                              }
                              onUpdate={(updates) =>
                                updateWorkflow(childNode.uuid, updates)
                              }
                              dragUpdate={(uuid) => setDraggedNode(uuid)}
                            />
                            <DropArea
                              uuid={childNode.uuid}
                              dropAfter={true}
                              isValidDropSpot={isValidDropSpot}
                              setDragOverUuid={setDragOverUuid}
                              setDragNDropAfter={setDragNDropAfter}
                              nodeDropped={nodeDropped}
                            >
                              <div className="mt-6">
                                <ShowNodeResult
                                  result={nodeResults.get(childNode.uuid)}
                                  onMappingConfigure={() =>
                                    configureMappings(node, workflow[idx + 1])
                                  }
                                />
                              </div>
                            </DropArea>
                          </div>
                        );
                      },
                    )
                  : null}
              </>
            );
          })}
          <AddAction
            onAdd={() =>
              addNodeModal.current &&
              (addNodeModal.current as ModalType).showModal()
            }
          />
        </div>
        {endResult ? (
          <div className="flex flex-col gap-4 items-center mt-4">
            <ArrowDownIcon className="w-4 mx-auto" />
            <WorkflowResult
              result={endResult}
              className="bg-info text-info-content"
            />
          </div>
        ) : null}
      </div>
      <AddNodeModal
        modalRef={addNodeModal}
        lastNode={workflow.length > 0 ? workflow[workflow.length - 1] : null}
        onClick={onAddNode}
        inLoop={false}
      />
      <ConfigureMappingModal
        modalRef={configureMappingModal}
        inputNode={inputNode}
        outputNode={outputNode}
      />
    </main>
  );
}

interface DropAreaProperties {
  uuid: string;
  dropAfter: boolean;
  isValidDropSpot: (dropAfter: boolean, spotUUID: string) => boolean;
  setDragNDropAfter: (dropAfter: boolean) => void;
  setDragOverUuid: (string: string | null) => void;
  nodeDropped: (after: boolean, dropUUID: string) => void;
}

function DropArea(props: React.PropsWithChildren<DropAreaProperties>) {
  const style = props.isValidDropSpot(props.dropAfter, props.uuid)
    ? "border-t-4 border-solid border-base-content"
    : "";

  return (
    <div
      className={`${style} w-full md:w-[480px] lg:w-[640px] min-h-6`}
      onDragOver={(event) => {
        if (props.isValidDropSpot(props.dropAfter, props.uuid)) {
          event.preventDefault();
        }

        props.setDragNDropAfter(props.dropAfter);
        props.setDragOverUuid(props.uuid);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        props.setDragOverUuid(null);
      }}
      onDrop={(dropEvent) => {
        dropEvent.preventDefault();
        props.nodeDropped(props.dropAfter, props.uuid);
        props.setDragOverUuid(null);
      }}
    >
      {props.children}
    </div>
  );
}

export default App;
