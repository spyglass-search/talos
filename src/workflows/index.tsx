import { LastRunDetails, NodeDef, NodeResult } from "../types/node";
import { track } from "../utils/metrics";
import { executeNode } from "./executor";
import { WorkflowContext } from "./workflowinstance";

export async function runWorkflow(
  workflow: Array<NodeDef>,
  onRunningNodeChange: (uuid: string) => void,
  onResultChange: (nodeResults: Map<string, LastRunDetails>) => void,
): Promise<NodeResult | null> {
  let runInstance = new WorkflowContext(
    workflow,
    onRunningNodeChange,
    onResultChange,
  );

  if (process.env.NODE_ENV === "production") {
    track("run workflow", {
      numNodes: workflow.length,
    });
  }

  let lastResult: NodeResult | null = null;
  for (var idx = 0; idx < workflow.length; idx++) {
    let node = workflow[idx];
    lastResult = await runInstance.runNode(node, lastResult);

    // Early exit if we run into an error.
    if (lastResult.error) {
      break;
    }
  }

  return lastResult;
}
