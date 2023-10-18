import { ArrowDownIcon } from "@heroicons/react/20/solid";
import { LastRunDetails, NodeDef, ParentDataDef } from "../../types/node";
import { ShowNodeResult } from "../nodes";
import { InputOutputDefinition } from "../../types/typeutils";

export interface NodeDividerProperties {
  currentIndex: number;
  nodeResults: Map<string, LastRunDetails>;
  parentNode?: NodeDef;
  childNode: NodeDef;
  steps: NodeDef[];
  dataTypes: InputOutputDefinition[];
  configureMappings: (inputNode: NodeDef, outputNode: NodeDef) => void;
  canConfigureMappings: (
    dataTypes: InputOutputDefinition[],
    inputNode: NodeDef,
    outputNode: NodeDef,
  ) => boolean;
}

export function NodeDivider({
  currentIndex,
  nodeResults,
  parentNode,
  childNode,
  steps,
  dataTypes,
  configureMappings,
  canConfigureMappings,
}: NodeDividerProperties) {
  if (parentNode && parentNode.parentNode) {
    const parentData = parentNode.data as ParentDataDef;
    if (currentIndex < parentData.actions.length - 1) {
      return (
        <ShowNodeResult
          node={childNode}
          result={nodeResults.get(childNode.uuid)}
          onMappingConfigure={() =>
            configureMappings(childNode, steps[currentIndex + 1])
          }
          canShowMapping={canConfigureMappings(
            dataTypes,
            childNode,
            steps[currentIndex + 1],
          )}
        />
      );
    } else {
      return <ArrowDownIcon className="mt-4 w-4 mx-auto" />;
    }
  } else if (
    currentIndex !== 0 &&
    childNode.parentNode &&
    (childNode.data as ParentDataDef).actions &&
    (childNode.data as ParentDataDef).actions.length > 0
  ) {
    return (
      <ShowNodeResult
        node={childNode}
        result={nodeResults.get(childNode.uuid)}
        onMappingConfigure={() =>
          configureMappings(
            childNode,
            (childNode.data as ParentDataDef).actions[0],
          )
        }
        canShowMapping={true}
      />
    );
  } else {
    if (currentIndex < steps.length - 1) {
      return (
        <ShowNodeResult
          node={childNode}
          result={nodeResults.get(childNode.uuid)}
          onMappingConfigure={() =>
            configureMappings(childNode, steps[currentIndex + 1])
          }
          canShowMapping={canConfigureMappings(
            dataTypes,
            childNode,
            steps[currentIndex + 1],
          )}
        />
      );
    } else {
      return <ArrowDownIcon className="mt-4 w-4 mx-auto" />;
    }
  }
}
