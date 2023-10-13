import React, { useEffect, useRef } from "react";
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
  DataNodeDef,
  DataNodeType,
  NodeDataTypes,
  ExtractNodeDef,
  SummaryDataDef,
  TemplateNodeDef,
  ParentDataDef,
} from "./types/node";
import {
  NodeComponent,
  ShowNodeResult,
  WorkflowResult,
} from "./components/nodes";
import { useState } from "react";
import { loadWorkflow, saveWorkflow } from "./workflows/utils";
import { cancelExecution } from "./workflows/executor";
import { ModalType } from "./types";
import AddNodeModal from "./components/modal/AddNodeModal";
import { runWorkflow } from "./workflows";
import { createNodeDefFromType } from "./utils/nodeUtils";
import { WorkflowContext } from "./workflows/workflowinstance";

function AddAction({ onAdd = () => {} }: { onAdd: () => void }) {
  return (
    <div className="mx-auto">
      <button className="btn" onClick={onAdd}>
        <PlusCircleIcon className="w-8 h-auto" />
        Add Action
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
  let [workflowRun, setWorkflowRun] = useState<WorkflowContext | null>();
  let [isRunning, setIsRunning] = useState<boolean>(false);
  let [isLoading, setIsLoading] = useState<boolean>(false);
  let [currentNodeRunning, setCurrentNodeRunning] = useState<string | null>(
    null,
  );
  let [endResult, setEndResult] = useState<NodeResult | null>(null);
  let fileInput = useRef(null);
  let exampleSelection = useRef(null);
  let addNodeModal = useRef(null);

  // Initialize workflow
  useEffect(() => {
    const fetchInitialData = async () => {
      await axios
        .get<Array<NodeDef>>(
          `${process.env.PUBLIC_URL}/workflow-examples/initial.json`,
        )
        .then((resp) => resp.data)
        .then((workflow) => setWorkflow(workflow as Array<NodeDef>));
    };

    fetchInitialData().catch(console.error);
  }, []);

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

  let onAddNode = (nodeType: NodeType) => {
    let newNode = createNodeDefFromType(nodeType);

    if (newNode) {
      let newWorkflow = [...workflow, newNode];
      setWorkflow(newWorkflow);
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
        <div className="items-center flex flex-col gap-4 z-0">
          {workflow.map((node, idx) => {
            return (
              <>
                <NodeComponent
                  key={`node-${idx}`}
                  {...node}
                  isRunning={node.uuid === currentNodeRunning}
                  lastRun={nodeResults.get(node.uuid)}
                  onDelete={() => deleteWorkflowNode(node.uuid)}
                  onUpdate={(updates) => updateWorkflow(node.uuid, updates)}
                />
                {idx < workflow.length - 1 ? (
                  <ShowNodeResult result={nodeResults.get(node.uuid)} />
                ) : (
                  <ArrowDownIcon className="mt-4 w-4 mx-auto" />
                )}
                {node.parentNode
                  ? (node.data as ParentDataDef).actions.map(
                      (childNode, childIdx) => {
                        return (
                          <div className="ml-16">
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
                            />
                            <div className="mt-6">
                              <ShowNodeResult
                                result={nodeResults.get(childNode.uuid)}
                              />
                            </div>
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
        lastNode={workflow.length > 0 ? workflow[workflow.length] : null}
        onClick={onAddNode}
        inLoop={false}
      />
    </main>
  );
}

export default App;
