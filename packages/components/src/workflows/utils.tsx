import { NodeDef } from "../types/node";

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
