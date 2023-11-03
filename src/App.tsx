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
  OutputDataType,
  DataNodeDef,
  NodeResultStatus,
  NodeState,
} from "./types/node";
import { NodeComponent, WorkflowResult } from "./components/nodes";
import { useState } from "react";
import {
  getPreviousUuid,
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
import {
  InputOutputDefinition,
  canConfigureMappings,
  generateInputOutputTypes,
} from "./types/typeutils";
import { DropArea } from "./components/nodes/dropArea";
import { NodeDivider } from "./components/nodes/nodeDivider";
import {
  ValidationStatus,
  WorkflowValidationResult,
  validateWorkflow,
} from "./utils/workflowValidator";

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
  let [workflowDataTypes, setWorkflowDataTypes] = useState<
    InputOutputDefinition[]
  >([]);
  let [validationResult, setValidationResult] = useState<
    WorkflowValidationResult | undefined
  >(undefined);
  let [nodeResults, setNodeResults] = useState<Map<string, LastRunDetails>>(
    new Map(),
  );
  let [nodeStates, setNodeStates] = useState<Map<string, NodeState>>(new Map());
  let [dragNDropAfter, setDragNDropAfter] = useState<boolean>(true);
  let [isRunning, setIsRunning] = useState<boolean>(false);
  let [isLoading, setIsLoading] = useState<boolean>(false);
  let [currentNodeRunning, setCurrentNodeRunning] = useState<string | null>(
    null,
  );
  let [cachedNodeTypes, setCachedNodeTypes] = useState<{
    [key: string]: InputOutputDefinition;
  }>({});
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

  const updateNodeDataTypes = (
    newWorkflow: NodeDef[],
    cache: { [key: string]: InputOutputDefinition },
    getAuthToken: () => Promise<string>,
  ) => {
    generateInputOutputTypes(newWorkflow, cache, getAuthToken).then(
      (result) => {
        const newCache = { ...cachedNodeTypes };
        for (const node of result) {
          if (
            node.outputType === OutputDataType.TableResult &&
            node.outputSchema
          ) {
            newCache[node.uuid] = node;
          }
        }
        setCachedNodeTypes(newCache);
        setWorkflowDataTypes(result);
        console.debug("DataType Results", result);
      },
    );
  };

  const internalRunWorkflow = async () => {
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

  let handleRunWorkflow = async () => {
    let newWorkflowValidation = validateWorkflow(workflowDataTypes);
    if (newWorkflowValidation.result === ValidationStatus.Failure) {
      generateInputOutputTypes(workflow, cachedNodeTypes, getAuthToken).then(
        (result) => {
          let newWorkflowValidation = validateWorkflow(result);
          setValidationResult(newWorkflowValidation);
          if (newWorkflowValidation.result === ValidationStatus.Success) {
            internalRunWorkflow();
          } else {
            setEndResult({
              status: NodeResultStatus.Error,
              data: newWorkflowValidation.validationErrors,
            });
          }
        },
      );
    } else {
      internalRunWorkflow();
    }
  };

  let deleteWorkflowNode = (uuid: string) => {
    const newCache = { ...cachedNodeTypes };
    delete newCache[uuid];
    setCachedNodeTypes(newCache);

    nodeStates.delete(uuid);
    setNodeStates(nodeStates);

    let previousUUID = getPreviousUuid(uuid, workflow);
    const newWorkflow = workflow.flatMap((node) => {
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
    });

    if (previousUUID) {
      clearPreviousMapping(previousUUID, newWorkflow);
    }
    setWorkflow(newWorkflow);

    updateNodeDataTypes(newWorkflow, cachedNodeTypes, getAuthToken);
  };

  let updateNodeState = (uuid: string, update: NodeState) => {
    const newStates = new Map(nodeStates);
    newStates.set(uuid, update);
    setNodeStates(newStates);
  };

  let updateWorkflow = (uuid: string, updates: NodeUpdates) => {
    const newCache = { ...cachedNodeTypes };
    delete newCache[uuid];
    setCachedNodeTypes(newCache);

    const newWorkflow = workflow.map((node) => {
      if (node.uuid === uuid) {
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
    setWorkflow(newWorkflow);

    // Want to avoid making the same external request over and over
    if (
      (updates.data &&
        !((updates.data as DataNodeDef).type === DataNodeType.Connection)) ||
      updates.mapping
    ) {
      updateNodeDataTypes(newWorkflow, cachedNodeTypes, getAuthToken);
    }
  };

  let clearWorkflow = () => {
    setNodeResults(new Map());
    setValidationResult(undefined);
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
      updateNodeDataTypes(newWorkflow, cachedNodeTypes, getAuthToken);
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

    setValidationResult(undefined);
    updateNodeDataTypes(newWorkflow, cachedNodeTypes, getAuthToken);
    setDragOverUuid(null);
    setDraggedNode(null);
    setNodeResults(new Map());
    setEndResult(null);
    setWorkflow(
      newWorkflow.map((node) => {
        return { ...node, lastRun: undefined };
      }),
    );
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
      <div id="header" className="navbar md:w-fit mx-auto lg:fixed bg-base-200 p-4 rounded-lg z-10 shadow-lg pb-8 md:pb-4">
        <div className="navbar-center flex flex-col lg:flex-row gap-2 place-content-center items-center w-full">
          <img
            src={`${process.env.PUBLIC_URL}/logo@2x.png`}
            className="w-14 ml-6"
            alt="logo"
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
              <div key={`node-${idx}`} className="flex flex-col gap-4 w-full">
                <NodeComponent
                  {...node}
                  workflowValidation={validationResult}
                  isRunning={node.uuid === currentNodeRunning}
                  lastRun={nodeResults.get(node.uuid)}
                  nodeState={nodeStates.get(node.uuid)}
                  onStateChange={(state) => updateNodeState(node.uuid, state)}
                  onDelete={deleteWorkflowNode}
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
                  <NodeDivider
                    steps={workflow}
                    childNode={node}
                    dataTypes={workflowDataTypes}
                    canConfigureMappings={canConfigureMappings}
                    configureMappings={configureMappings}
                    currentIndex={idx}
                    nodeResults={nodeResults}
                  ></NodeDivider>
                </DropArea>
              </div>
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
        dataTypes={workflowDataTypes}
        fromNode={inputNode}
        toNode={outputNode}
        updateWorkflow={updateWorkflow}
      />
    </main>
  );
}

function clearPreviousMapping(uuid: string, workflow: NodeDef[]) {
  const node = workflow.find((node) => node.uuid === uuid);
  if (node) {
    node.mapping = [];
  }
}

async function getAuthToken(): Promise<string> {
  return `${API_TOKEN}`;
}

export default App;
