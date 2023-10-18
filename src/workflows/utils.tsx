import { NodeDef, ParentDataDef } from "../types/node";

export function saveWorkflow(workflow: Array<NodeDef>) {
  let a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify(workflow, null, 2)], { type: "text/plain" }),
  );
  a.setAttribute("download", "workflow.json");
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function loadWorkflow(
  fileInput: HTMLInputElement,
): Promise<Array<NodeDef>> {
  if (fileInput.files && fileInput.files.length > 0) {
    let file = fileInput.files[0];
    console.log(`loading ${file.name}`);
    console.log(await file.text());
    fileInput.value = "";
    return JSON.parse(await file.text());
  }

  return [];
}

export function isLastNode(workflow: Array<NodeDef>, uuid: string): boolean {
  const length = workflow.length;
  for (let i = 0; i < length; i++) {
    const node = workflow[i];

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

export function isInLoop(workflow: Array<NodeDef>, uuid: string): boolean {
  const length = workflow.length;
  for (let i = 0; i < length; i++) {
    const node = workflow[i];

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

export function getPreviousUuid(
  uuid: string,
  workflow: Array<NodeDef>,
): string | undefined {
  const length = workflow.length;
  let previous;
  for (let i = 0; i < length; i++) {
    const node = workflow[i];

    if (node.parentNode) {
      let subnodeLength = (node.data as ParentDataDef).actions.length;
      let subNodesPrevious = node;
      for (let j = 0; j < subnodeLength; j++) {
        const subNode = (node.data as ParentDataDef).actions[j];
        if (subNode.uuid === uuid) {
          return subNodesPrevious.uuid;
        }
        subNodesPrevious = subNode;
      }
    }

    if (node.uuid === uuid) {
      if (previous) {
        return previous.uuid;
      }
      return;
    }

    previous = node;
  }
}

export function nodeComesAfter(
  workflow: Array<NodeDef>,
  firstNodeUuid: string,
  secondNodeUuid: string,
): boolean {
  const length = workflow.length;
  let foundFirst = false;
  for (let i = 0; i < length; i++) {
    const node = workflow[i];

    if (node.parentNode) {
      let subnodeLength = (node.data as ParentDataDef).actions.length;
      let subNodesFoundFirst = false;
      for (let j = 0; j < subnodeLength; j++) {
        const subNode = (node.data as ParentDataDef).actions[j];

        if (subNodesFoundFirst) {
          return subNode.uuid === secondNodeUuid;
        } else {
          if (subNode.uuid === firstNodeUuid) {
            subNodesFoundFirst = true;
          }
        }
      }
    }

    if (foundFirst) {
      return node.uuid === secondNodeUuid;
    } else {
      if (node.uuid === firstNodeUuid) {
        foundFirst = true;
      }
    }
  }
  return false;
}

export function removeNode(
  workflow: Array<NodeDef>,
  uuid: string,
): NodeDef | null {
  const length = workflow.length;
  for (let i = 0; i < length; i++) {
    const node = workflow[i];

    if (node.parentNode) {
      let subnodeLength = (node.data as ParentDataDef).actions.length;
      for (let j = 0; j < subnodeLength; j++) {
        const subNode = (node.data as ParentDataDef).actions[j];

        if (subNode.uuid === uuid) {
          return (node.data as ParentDataDef).actions.splice(j, 1)[0];
        }
      }
    }

    if (node.uuid === uuid) {
      return workflow.splice(i, 1)[0];
    }
  }
  return null;
}

export function insertNode(
  workflow: Array<NodeDef>,
  after: boolean,
  uuid: string,
  insertNode: NodeDef,
) {
  const length = workflow.length;
  for (let i = 0; i < length; i++) {
    const node = workflow[i];

    if (node.parentNode) {
      let subnodeLength = (node.data as ParentDataDef).actions.length;
      for (let j = 0; j < subnodeLength; j++) {
        const actionList = (node.data as ParentDataDef).actions;
        const subNode = actionList[j];

        if (subNode.uuid === uuid) {
          if (after) {
            actionList.splice(j + 1, 0, insertNode);
          } else {
            actionList.splice(j, 0, insertNode);
          }
          return;
        }
      }
    }

    if (node.uuid === uuid) {
      if (after) {
        workflow.splice(i + 1, 0, insertNode);
      } else {
        workflow.splice(i, 0, insertNode);
      }
      break;
    }
  }
}
