import {DataNodeDef, DataNodeType, NodeDataTypes} from '../../../types/node';
import {ConnectionDataNode} from './connection';
import {FileDataNode} from './file';
import {StaticDataNode} from './static';
import {UrlDataNode} from './url';

export interface DataNodeProps {
  data: DataNodeDef;
  // Request node update
  onUpdate?: (nodeUpdates: NodeDataTypes) => void;
  getAuthToken?: () => Promise<string>;
}

export function DataNodeComponent({
  data,
  onUpdate = () => {},
  getAuthToken,
}: DataNodeProps) {
  let baseProps = {
    data: data,
    onUpdateData: onUpdate,
    getAuthToken: getAuthToken,
  };

  let dataType = data.type;

  if (dataType === DataNodeType.Connection) {
    return <ConnectionDataNode {...baseProps} />;
  } else if (dataType === DataNodeType.Text) {
    return <StaticDataNode {...baseProps} />;
  } else if (dataType === DataNodeType.File) {
    return <FileDataNode {...baseProps} />;
  } else if (dataType === DataNodeType.Url) {
    return <UrlDataNode {...baseProps} />;
  } else {
    return <></>;
  }
}
