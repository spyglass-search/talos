import { MutableRefObject, useState } from "react";
import {
  InputDataType,
  NodeDef,
  NodeInputMapping,
  NodePropertyDefinition,
  NodeType,
  NodeUpdates,
  PropertyType,
} from "../../types/node";
import { TrashIcon } from "@heroicons/react/20/solid";
import { InputOutputDefinition } from "../../types/typeutils";
import { EditableText } from "../editable";

export interface ConfigureMappingModalProperties {
  modalRef: MutableRefObject<HTMLDialogElement | null>;
  fromNode: NodeDef | null;
  toNode: NodeDef | null;
  dataTypes: InputOutputDefinition[];
  updateWorkflow: (uuid: string, update: NodeUpdates) => void;
}

export function ConfigureMappingModal({
  modalRef,
  fromNode,
  toNode,
  dataTypes,
  updateWorkflow,
}: ConfigureMappingModalProperties) {
  let [pendingUpdate, setPendingUpdate] = useState<NodeInputMapping[]>([]);

  return (
    <dialog
      ref={modalRef}
      className="border border-base-200 rounded-lg bg-base-100 max-h-3/4 lg:w-1/2 md:w-3/4 xs:w-full w-3/4"
    >
      <div className="m-6">
        <div className="w-full flex flex-col ">
          <h2 className="text-center text-xl mb-4">Customize your mappings</h2>
          <ConfigurationBody
            dataTypes={dataTypes}
            fromNode={fromNode}
            toNode={toNode}
            pendingUpdate={pendingUpdate}
            setPendingUpdate={setPendingUpdate}
          ></ConfigurationBody>
          <div className="flex flex-row gap-2 justify-end">
            <button
              className="btn btn-primary"
              onClick={() => {
                if (fromNode && pendingUpdate.length > 0) {
                  updateWorkflow(fromNode.uuid, {
                    mapping: pendingUpdate,
                  });
                }
                modalRef.current?.close();
              }}
              disabled={pendingUpdate.length <= 0}
            >
              Ok
            </button>
            <button
              className="btn btn-accent"
              onClick={() => {
                setPendingUpdate([]);
                if (fromNode) {
                  updateWorkflow(fromNode.uuid, {
                    mapping: [],
                  });
                }
                modalRef.current?.close();
              }}
              disabled={!fromNode?.mapping || fromNode.mapping.length <= 0}
            >
              Clear Mapping
            </button>
            <button
              className="btn"
              onClick={() => {
                setPendingUpdate([]);
                modalRef.current?.close();
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

export interface ConfigurationBodyProperties {
  fromNode: NodeDef | null;
  toNode: NodeDef | null;
  dataTypes: InputOutputDefinition[];
  pendingUpdate: NodeInputMapping[];
  setPendingUpdate: (mapping: NodeInputMapping[]) => void;
}

function ConfigurationBody({
  fromNode,
  toNode,
  dataTypes,
  pendingUpdate,
  setPendingUpdate,
}: ConfigurationBodyProperties) {
  if (!fromNode || !toNode) {
    return null;
  }

  const toggleSkipProperty = (node: NodeDef, property: string) => {
    let mapping = newMapping(node, pendingUpdate);

    let currentMapping = mapping.find(
      (inputMapping) => inputMapping.from === property,
    );

    mapping = mapping.filter((inputMapping) => inputMapping.from !== property);
    if (!currentMapping?.skip) {
      mapping.push({
        from: property,
        skip: true,
      } as NodeInputMapping);
    }

    setPendingUpdate(mapping);
  };

  const renameMapping = (node: NodeDef, from: string, to: string) => {
    let mapping = newMapping(node, pendingUpdate);

    mapping = mapping.filter((inputMapping) => inputMapping.from !== from);
    mapping.push({
      from: from,
      to: to,
    } as NodeInputMapping);
    setPendingUpdate(mapping);
  };

  const setExtractedProperty = (node: NodeDef, property: string) => {
    let mapping = newMapping(node, pendingUpdate);

    mapping = mapping.filter((inputMapping) => !inputMapping.extract);
    mapping.push({
      from: property,
      extract: true,
    } as NodeInputMapping);
    setPendingUpdate(mapping);
  };

  let fromDefinition = dataTypes.find(
    (definition) => definition.uuid === fromNode.uuid,
  );
  let toDefinition = dataTypes.find(
    (definition) => definition.uuid === toNode.uuid,
  );

  if (!fromDefinition || !toDefinition) {
    return (
      <div>
        <p>
          Unable to identify properties please fully configure input node for
          mapping information
        </p>
      </div>
    );
  }

  if (inputOutputMatch(fromDefinition, toDefinition)) {
    return (
      <div className="m-6">
        <p>
          Input array of strings match expected string input, no available
          mapping.
        </p>
      </div>
    );
  } else if (canMapObjects(fromDefinition, toDefinition)) {
    return (
      <div className="m-6 flex flex-row gap-2">
        <ObjectMapping
          definition={fromDefinition.outputSchema}
          nodeDef={fromNode}
          toggleSkipProperty={toggleSkipProperty}
          renameProperty={renameMapping}
          pendingUpdate={pendingUpdate}
        ></ObjectMapping>
      </div>
    );
  } else if (canExtractObject(fromDefinition, toDefinition)) {
    return (
      <div className="m-6 flex flex-row gap-2">
        <ExtractStringMapping
          definition={fromDefinition.outputSchema}
          nodeDef={fromNode}
          setExtractedProperty={setExtractedProperty}
          pendingUpdate={pendingUpdate}
        ></ExtractStringMapping>
      </div>
    );
  } else {
    return (
      <div>
        <p>
          Unable to identify properties please fully configure input node for
          mapping information
        </p>
      </div>
    );
  }
}

function ObjectMapping({
  definition,
  nodeDef,
  toggleSkipProperty,
  renameProperty,
  pendingUpdate,
}: {
  definition?: NodePropertyDefinition;
  nodeDef: NodeDef;
  toggleSkipProperty: (node: NodeDef, property: string) => void;
  renameProperty: (node: NodeDef, from: string, to: string) => void;
  pendingUpdate: NodeInputMapping[];
}) {
  if (!definition) {
    return (
      <div>
        <p>
          Unable to identify properties please fully configure input node for
          mapping information
        </p>
      </div>
    );
  }

  let message =
    nodeDef.nodeType === NodeType.Loop
      ? `Each row in the loop will have the following properties. You can
  rename properties or remove properties. The row passed into the first
  node of the loop will only have the properties shown in the "Output
  Property" column`
      : `Input properties can be renamed or removed before being passed to the next node`;

  if (definition.properties) {
    return (
      <div className="flex flex-col">
        <p>{message}</p>
        <div className="overflow-x-auto overflow-y-auto w-full mt-4 max-h-80">
          <table className="table w-full table-zebra table-sm ">
            <thead className="text-secondary">
              <tr>
                <th>Input Property</th>
                <th>Output Property</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(definition.properties).map(([name, value]) => (
                <tr key={name}>
                  <td className={getNameStyle(nodeDef, pendingUpdate, name)}>
                    {name}
                  </td>
                  <td className={getNameStyle(nodeDef, pendingUpdate, name)}>
                    <EditableText
                      data={getValue(nodeDef, pendingUpdate, name)}
                      onChange={(newValue, oldValue) =>
                        renameProperty(nodeDef, name, newValue)
                      }
                    />
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm btn-square"
                      onClick={() => {
                        toggleSkipProperty(nodeDef, name);
                      }}
                    >
                      <TrashIcon className=" w-4"></TrashIcon>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  return null;
}

function ExtractStringMapping({
  definition,
  nodeDef,
  setExtractedProperty,
  pendingUpdate,
}: {
  definition?: NodePropertyDefinition;
  nodeDef: NodeDef;
  setExtractedProperty: (node: NodeDef, property: string) => void;
  pendingUpdate: NodeInputMapping[];
}) {
  if (
    !definition ||
    !definition.properties ||
    Object.keys(definition.properties).length === 0
  ) {
    return (
      <div>
        <p>
          Unable to identify properties please fully configure input node for
          mapping information
        </p>
      </div>
    );
  }

  let message =
    nodeDef.nodeType === NodeType.Loop
      ? `Each row in the loop will have the following properties. Select the
    property to forward on.`
      : `Select property to forward on to the next node`;

  if (definition.properties) {
    return (
      <div className="flex flex-col">
        <p>{message}</p>
        <div className="overflow-x-auto overflow-y-auto w-full mt-4 max-h-80">
          <table className="table w-full table-zebra table-sm">
            <thead className="text-secondary">
              <tr>
                <th>Input Property</th>
                <th>Selected</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(definition.properties).map(([name, value]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>
                    <input
                      id={`selection ${name}`}
                      type="radio"
                      name="extracted-property"
                      className="radio checked:bg-primary"
                      onClick={() => setExtractedProperty(nodeDef, name)}
                      checked={isExtracted(nodeDef, pendingUpdate, name)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  return null;
}

function isExtracted(
  node: NodeDef,
  updates: NodeInputMapping[],
  name: string,
): boolean {
  if (updates.length > 0) {
    for (let mapping of updates) {
      if (mapping.from === name && mapping.extract) {
        return true;
      }
    }
    return false;
  }

  if (node.mapping) {
    for (let mapping of node.mapping) {
      if (mapping.from === name && mapping.extract) {
        return true;
      }
    }
  }
  return false;
}

function getNameStyle(
  node: NodeDef,
  updates: NodeInputMapping[],
  name: string,
): string {
  if (updates) {
    for (let mapping of updates) {
      if (mapping.from === name && mapping.skip) {
        return "line-through text-red-600";
      }
    }
  }

  if (node.mapping) {
    for (let mapping of node.mapping) {
      if (mapping.from === name && mapping.skip) {
        return "line-through text-red-600";
      }
    }
  }
  return "";
}

function getValue(
  node: NodeDef,
  updates: NodeInputMapping[],
  name: string,
): string {
  if (updates) {
    for (let mapping of updates) {
      if (mapping.from === name && mapping.to) {
        return mapping.to;
      }
    }
  }

  if (node.mapping) {
    for (let mapping of node.mapping) {
      if (mapping.from === name && mapping.to) {
        return mapping.to;
      }
    }
  }
  return name;
}

function newMapping(
  node: NodeDef,
  pendingUpdate: NodeInputMapping[],
): NodeInputMapping[] {
  let mapping = node.mapping ? [...node.mapping] : [];
  if (pendingUpdate.length > 0) {
    mapping = pendingUpdate;
  }
  return mapping;
}

function canMapObjects(
  from: InputOutputDefinition,
  to: InputOutputDefinition,
): boolean {
  console.error("Checking if objects can be mapped ", from, to);
  return (
    to.inputType === InputDataType.Object &&
    from.outputSchema?.type === PropertyType.Object
  );
}

function canExtractObject(
  from: InputOutputDefinition,
  to: InputOutputDefinition,
): boolean {
  console.error("Checking if objects can be extracted ", from, to);
  return from.outputSchema?.type === PropertyType.Object;
}

function inputOutputMatch(
  from: InputOutputDefinition,
  to: InputOutputDefinition,
): boolean {
  return (
    (from.outputSchema?.type === PropertyType.String &&
      to.inputType === InputDataType.StringContent) ||
    (from.outputSchema?.type === PropertyType.Array &&
      to.inputType === InputDataType.Iterable)
  );
}
