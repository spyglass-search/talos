import {
  LastRunDetails,
  MultiNodeDataResult,
  NodeDef,
  NodeResult,
  NodeType,
  ParentDataDef,
} from "../types/node";
import { executeNode } from "./executor";
import { isInLoop, isLastNode } from "./utils";

export interface WorkflowRunContext {
  onRunningNodeChange: (uuid: string) => void;
  onResultChange: (nodeResults: Map<string, LastRunDetails>) => void;
  clearNode(uuid: string): void;
  updateNode(uuid: string, startTimestamp: Date, nodeResult: NodeResult): void;
  workflow: Array<NodeDef>;
  isLastNode(uuid: string): boolean;
  isInLoop(uuid: string): boolean;
}

export class WorkflowContext implements WorkflowRunContext {
  private nodeResults: Map<string, LastRunDetails>;
  constructor(
    public workflow: Array<NodeDef>,
    public onRunningNodeChange: (uuid: string) => void,
    public onResultChange: (nodeResults: Map<string, LastRunDetails>) => void,
  ) {
    this.nodeResults = new Map();
  }

  public clearNode(uuid: string): void {
    this.nodeResults.delete(uuid);
    this.onResultChange(new Map(this.nodeResults));
  }

  public updateNode(
    uuid: string,
    startTimestamp: Date,
    nodeResult: NodeResult,
  ): void {
    const newResult = {
      startTimestamp,
      endTimestamp: new Date(),
      nodeResult,
    };

    this.nodeResults.set(uuid, newResult);
    this.onResultChange(new Map(this.nodeResults));
  }

  public updateLoopNode(
    uuid: string,
    startTimestamp: Date,
    nodeResult: NodeResult,
  ): void {
    let newNodeResult: NodeResult;
    let currentResult = this.nodeResults.get(uuid);
    if (currentResult) {
      let currentData = currentResult.nodeResult.data as MultiNodeDataResult;
      newNodeResult = {
        status: nodeResult.status,
        error: nodeResult.error,
        data: [...currentData, nodeResult],
      };
    } else {
      newNodeResult = {
        status: nodeResult.status,
        error: nodeResult.error,
        data: [nodeResult],
      };
    }

    const newResult = {
      startTimestamp,
      endTimestamp: new Date(),
      nodeResult: newNodeResult,
    };

    this.nodeResults.set(uuid, newResult);
    this.onResultChange(new Map(this.nodeResults));
  }

  public isLastNode(uuid: string): boolean {
    return isLastNode(this.workflow, uuid);
  }

  public isInLoop(uuid: string): boolean {
    return isInLoop(this.workflow, uuid);
  }

  public async runNode(
    node: NodeDef,
    lastResult: NodeResult | null,
  ): Promise<NodeResult> {
    this.onRunningNodeChange(node.uuid);
    let lastRunResult = this.nodeResults.get(node.uuid);
    // skip over nodes we've successfully run already.
    if (
      lastRunResult &&
      this.isLastNode(node.uuid) &&
      !this.isInLoop(node.uuid) &&
      !lastRunResult.nodeResult.error
    ) {
      lastResult = lastRunResult.nodeResult;
      return lastResult;
    }

    let startTimestamp = new Date();
    console.debug(`executing node ${node.uuid} w/ input =`, lastResult);
    // Clear any existing results from a node before running it.
    if (!this.isInLoop(node.uuid)) {
      this.clearNode(node.uuid);
    }

    lastResult = await executeNode(lastResult, node, this);
    console.debug("output = ", lastResult);
    // Set the new node result
    if (this.isInLoop(node.uuid)) {
      this.updateLoopNode(node.uuid, startTimestamp, lastResult);
    } else {
      this.updateNode(node.uuid, startTimestamp, lastResult);
    }

    return lastResult;
  }
}
