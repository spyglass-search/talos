import { MutableRefObject } from "react";
import { NodeDef } from "../../types/node";
import { PencilIcon, QuestionMarkCircleIcon } from "@heroicons/react/20/solid";
import {
  getInputTypeDefinition,
  getOutputTypeDefinition,
} from "../../types/typeutils";

export interface ConfigureMappingModalProperties {
  modalRef: MutableRefObject<HTMLDialogElement | null>;
  inputNode: NodeDef | null;
  outputNode: NodeDef | null;
}

export function ConfigureMappingModal({
  modalRef,
  inputNode,
  outputNode,
}: ConfigureMappingModalProperties) {
  if (!inputNode || !outputNode) {
    return <div>Missing Nodes</div>;
  }

  let fromType = getOutputTypeDefinition(inputNode);
  let toType = getInputTypeDefinition(outputNode);

  return (
    <dialog
      ref={modalRef}
      className="border border-base-200 rounded-lg bg-base-100"
    >
      <div className="m-6">
        <h2 className="text-center text-xl">Customize your mappings</h2>
        <p> </p>
        <div className="m-6 flex flex-row gap-2">
          <div className="card indicator card-bordered">
            <span className="badge">Output from {inputNode?.label}</span>
            <StringContent></StringContent>
          </div>
          <div className="card indicator card-bordered">
            <span className="badge">Input to {outputNode?.label}</span>
            <div className="join mt-2 flex flex-row justify-center">
              <input
                className="join-item btn btn-xs"
                type="radio"
                name="outputOptions"
                aria-label="Object"
              />
              <input
                className="join-item btn btn-xs"
                type="radio"
                name="outputOptions"
                aria-label="Array"
              />
              <input
                className="join-item btn btn-xs"
                type="radio"
                name="outputOptions"
                aria-label="Value"
              />
            </div>
            <div className="card-body">
              <span>{"{"}</span>
              <div className="join  ml-2">
                <button className="btn btn-primary btn-sm join-item swap-on">
                  content
                </button>
                <button className="btn btn-neutral btn-sm join-item swap-off line-through">
                  content
                </button>

                <button className="btn btn-neutral btn-sm join-item">
                  <PencilIcon className="w-4 h-4"></PencilIcon>
                </button>
              </div>
              <span>{"}"}</span>
            </div>
          </div>
        </div>
        <div className="w-full justify-end flex gap-2">
          <button
            className="btn btn-primary"
            onClick={() => {
              modalRef.current?.close();
            }}
          >
            Ok
          </button>
          <button
            className="btn"
            onClick={() => {
              modalRef.current?.close();
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  );
}

function StringContent() {
  return (
    <>
      <Value></Value>
      <div className="card-body">
        <div className="join">
          <button className="btn btn-primary btn-sm join-item">content</button>
          <button className="btn btn-neutral btn-sm join-item">
            <QuestionMarkCircleIcon className="h-4 w-4"></QuestionMarkCircleIcon>
          </button>
        </div>
      </div>
    </>
  );
}

function Value() {
  return (
    <div className="join mt-2 flex flex-row justify-center">
      <input
        className="join-item btn btn-xs"
        type="radio"
        name="options"
        aria-label="Object"
        disabled
      />
      <input
        className="join-item btn btn-xs"
        type="radio"
        name="options"
        aria-label="Array"
        disabled
      />
      <input
        className="join-item btn btn-xs"
        type="radio"
        name="options"
        aria-label="Value"
        checked
      />
    </div>
  );
}
