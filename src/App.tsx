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
} from "./types/node";
import {
  NodeComponent,
  ShowNodeResult,
  WorkflowResult,
} from "./components/nodes";
import { useState } from "react";
import { loadWorkflow, saveWorkflow } from "./workflows/utils";
import { cancelExecution, executeNode } from "./workflows/executor";
import { ModalType } from "./types";
import AddNodeModal from "./components/modal/AddNodeModal";
import { track } from "./utils/metrics";

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
  let [isRunning, setIsRunning] = useState<boolean>(false);
  let [isLoading, setIsLoading] = useState<boolean>(false);
  let [currentNodeRunning, setCurrentNodeRunning] = useState<number | null>(
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

  let runWorkflow = async () => {
    if (process.env.NODE_ENV === "production") {
      track("run workflow", {
        numNodes: workflow.length,
      });
    }

    setIsRunning(true);
    setEndResult(null);
    let lastResult: NodeResult | null = null;
    for (var idx = 0; idx < workflow.length; idx++) {
      setCurrentNodeRunning(idx);
      let node = workflow[idx];
      let startTimestamp = new Date();

      console.debug(`executing node ${idx} w/ input =`, lastResult);
      // Clear any existing results from a node before running it.
      setNodeResults((nodeResults) => {
        nodeResults.delete(node.uuid);
        return new Map(nodeResults);
      });
      lastResult = await executeNode(lastResult, node);
      console.debug("output = ", lastResult);
      // Set the new node result
      setNodeResults(
        new Map(
          nodeResults.set(node.uuid, {
            startTimestamp,
            endTimestamp: new Date(),
            nodeResult: lastResult,
          }),
        ),
      );

      // Early exit if we run into an error.
      if (lastResult.error) {
        break;
      }
    }

    setEndResult(lastResult);
    setIsRunning(false);
    setCurrentNodeRunning(null);
  };

  let deleteWorkflowNode = (uuid: string) => {
    setWorkflow(
      workflow.flatMap((node) => {
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
    let nodeData: NodeDataTypes;
    if (nodeType === NodeType.Data) {
      nodeData = { type: DataNodeType.Text } as DataNodeDef;
    } else if (nodeType === NodeType.Extract) {
      nodeData = { query: "", schema: {} } as ExtractNodeDef;
    } else if (nodeType === NodeType.Summarize) {
      nodeData = { summary: "", bulletSummary: "" } as SummaryDataDef;
    } else {
      nodeData = { template: "", varMapping: {} } as TemplateNodeDef;
    }

    let newNode: NodeDef = {
      uuid: crypto.randomUUID(),
      label: `${nodeType} node`,
      nodeType: nodeType,
      data: nodeData,
    };

    let newWorkflow = [...workflow, newNode];
    setWorkflow(newWorkflow);
  };

  return (
    <main className="flex min-h-screen flex-col gap-8 items-center md:py-8">
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
              onClick={() => runWorkflow()}
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
              <option value="sentiment-analysis.json">
                Yelp Review - Sentiment Analysis
              </option>
            </select>
          </div>
        </div>
      </div>
      <div className="lg:my-32 px-8">
        <div className="flex flex-col gap-4 z-0">
          {workflow.map((node, idx) => {
            return (
              <div key={`node-${idx}`}>
                <NodeComponent
                  {...node}
                  isRunning={idx === currentNodeRunning}
                  lastRun={nodeResults.get(node.uuid)}
                  onDelete={() => deleteWorkflowNode(node.uuid)}
                  onUpdate={(updates) => updateWorkflow(node.uuid, updates)}
                />
                {idx < workflow.length - 1 ? (
                  <ShowNodeResult result={nodeResults.get(node.uuid)} />
                ) : (
                  <ArrowDownIcon className="mt-4 w-4 mx-auto" />
                )}
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
          <div className="flex flex-col gap-4">
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
      />
    </main>
  );
}

export default App;
