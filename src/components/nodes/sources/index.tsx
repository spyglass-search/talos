import { DataNodeDef, DataNodeType, NodeDataTypes } from "../../../types/node";
import { FileDataNode } from "./file";
import { StaticDataNode } from "./static";
import { UrlDataNode } from "./url";

export interface DataNodeProps {
  data: DataNodeDef;
  // Request node update
  onUpdate?: (nodeUpdates: NodeDataTypes) => void;
}

export function DataNodeComponent({
  data,
  onUpdate = () => {},
}: DataNodeProps) {
  let baseProps = {
    data: data,
    onUpdateData: onUpdate,
  };

  let dataType = data.type;

  if (dataType === DataNodeType.Text) {
    return <StaticDataNode {...baseProps} />;
  } else if (dataType === DataNodeType.File) {
    return <FileDataNode {...baseProps} />;
  } else if (dataType === DataNodeType.Url) {
    return <UrlDataNode {...baseProps} />;
  } else {
    return <></>;
  }
}
