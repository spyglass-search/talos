import { LastRunDetails, NodeDef, NodeResult } from "../types/node";
import { track } from "../utils/metrics";
import { executeNode } from "./executor";

export async function runWorkflow(
  workflow: Array<NodeDef>,
  lastRun: Map<string, LastRunDetails>,
  setCurrentNode: (uuid: string) => void,
  clearNode: (uuid: string) => void,
  updateNode: (
    uuid: string,
    startTimestamp: Date,
    nodeResult: NodeResult,
  ) => void,
): Promise<NodeResult | null> {
  if (process.env.NODE_ENV === "production") {
    track("run workflow", {
      numNodes: workflow.length,
    });
  }

  let lastResult: NodeResult | null = null;
  for (var idx = 0; idx < workflow.length; idx++) {
    let node = workflow[idx];

    setCurrentNode(node.uuid);
    let lastRunResult = lastRun.get(node.uuid);
    // skip over nodes we've successfully run already.
    if (lastRunResult && idx !== workflow.length - 1 && !lastRunResult.nodeResult.error) {
      lastResult = lastRunResult.nodeResult;
      continue;
    }

    let startTimestamp = new Date();
    console.debug(`executing node ${idx} w/ input =`, lastResult);
    // Clear any existing results from a node before running it.
    clearNode(node.uuid);

    lastResult = await executeNode(lastResult, node);
    console.debug("output = ", lastResult);
    // Set the new node result
    updateNode(node.uuid, startTimestamp, lastResult);

    // Early exit if we run into an error.
    if (lastResult.error) {
      break;
    }
  }

  return lastResult;
}
