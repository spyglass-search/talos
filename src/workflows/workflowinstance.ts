import {
  LastRunDetails,
  NodeDef,
  NodeResult,
  NodeType,
  ParentDataDef,
} from "../types/node";
import { executeNode } from "./executor";

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

  public isLastNode(uuid: string): boolean {
    const length = this.workflow.length;
    for (let i = 0; i < length; i++) {
      const node = this.workflow[i];

      if (node.parentNode) {
        let subnodeLength = (node.data as ParentDataDef).actions.length;
        for (let j = 0; j < subnodeLength; j++) {
          const subNode = (node.data as ParentDataDef).actions[j];
          if (subNode.uuid === uuid) {
            return i === length - 1 && j === subnodeLength - 1;
          }
        }
      }

      if (node.uuid === uuid) {
        return i === length - 1;
      }
    }
    return false;
  }

  public isInLoop(uuid: string): boolean {
    const length = this.workflow.length;
    for (let i = 0; i < length; i++) {
      const node = this.workflow[i];

      if (node.parentNode) {
        let subnodeLength = (node.data as ParentDataDef).actions.length;
        for (let j = 0; j < subnodeLength; j++) {
          const subNode = (node.data as ParentDataDef).actions[j];
          if (subNode.uuid === uuid) {
            return true;
          }
        }
      }

      if (node.uuid === uuid) {
        return false;
      }
    }
    return false;
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
    this.clearNode(node.uuid);

    lastResult = await executeNode(lastResult, node, this);
    console.debug("output = ", lastResult);
    // Set the new node result
    this.updateNode(node.uuid, startTimestamp, lastResult);
    return lastResult;
  }
}
