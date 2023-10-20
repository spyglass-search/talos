import React, { useEffect, useRef, useState } from "react";
import { DateTime } from "luxon";
import {
  LastRunDetails,
  NodeType,
  NodeUpdates,
  NodeResult,
  NodeDataTypes,
  DataNodeDef,
  DataNodeType,
  NodeDef,
  NodeState,
} from "../types/node";
import {
  ArrowDownIcon,
  ArrowPathIcon,
  Bars3BottomLeftIcon,
  Bars3Icon,
  BeakerIcon,
  BoltIcon,
  BookOpenIcon,
  CheckBadgeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CircleStackIcon,
  CloudIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  GlobeAltIcon,
  NoSymbolIcon,
  TableCellsIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";
import ExtractNode from "./nodes/extract";
import SummarizeNode from "./nodes/summarize";
import { EditableText } from "./editable";
import { ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import Loop from "./nodes/loop";
import { getValue, isStringResult } from "../types/typeutils";
import { DataNodeComponent } from "./nodes/sources";
import DataDestinationNode from "./nodes/destinations/connection";
import TemplateNode from "./nodes/destinations/template";
import {
  ValidationError,
  WorkflowValidationResult,
} from "../utils/workflowValidator";

export interface BaseNodeProps {
  uuid: string;
  label: string;
  data: NodeDataTypes;
  nodeType: NodeType;
  isRunning?: boolean;
  lastRun?: LastRunDetails;
  nodeState?: NodeState;
  workflowValidation?: WorkflowValidationResult;
  // Request node deletion
  onDelete?: () => void;
  // Request node update
  onUpdate?: (nodeUpdates: NodeUpdates) => void;
  onStateChange?: (nodeSate: NodeState) => void;
  dragUpdate: (uuid: string | null) => void;
  getAuthToken?: () => Promise<string>;
}

export interface NodeBodyProps {
  data: NodeDataTypes;
  onUpdateData?: (dataUpdates: NodeDataTypes) => void;
  getAuthToken?: () => Promise<string>;
}

export interface NodeHeaderProps {
  label: string;
  nodeType: NodeType;
  subType?: DataNodeType;
  onUpdate?: (newValue: string, oldValue: string) => void;
}

export interface NodeIconProps {
  nodeType: NodeType;
  subType?: DataNodeType | null;
  className?: string;
}

const BASE_CARD_STYLE = "card shadow-xl w-full md:w-[480px] lg:w-[640px]";

export function NodeIcon({ nodeType, subType, className }: NodeIconProps) {
  let icon = <TableCellsIcon className={className} />;
  if (nodeType === NodeType.Extract) {
    icon = <BoltIcon className={className} />;
  } else if (nodeType === NodeType.Template) {
    icon = <CodeBracketIcon className={className} />;
  } else if (nodeType === NodeType.Summarize) {
    icon = <BookOpenIcon className={className} />;
  } else if (nodeType === NodeType.DataSource) {
    if (subType === DataNodeType.Connection) {
      icon = <CloudIcon className={className} />;
    } else if (subType === DataNodeType.Url) {
      icon = <GlobeAltIcon className={className} />;
    } else if (subType === DataNodeType.File) {
      icon = <DocumentTextIcon className={className} />;
    } else if (subType === DataNodeType.Text) {
      icon = <Bars3BottomLeftIcon className={className} />;
    }
  } else if (nodeType === NodeType.DataDestination) {
    icon = <CircleStackIcon className={className} />;
  } else if (nodeType === NodeType.Loop) {
    icon = <ArrowPathIcon className={className} />;
  }
  return icon;
}

export function NodeHeader({
  nodeType,
  subType,
  label,
  onUpdate = () => {},
}: NodeHeaderProps) {
  return (
    <h2 className="card-title flex flex-row">
      <NodeIcon nodeType={nodeType} subType={subType} className="w-6 h-6" />
      <EditableText
        data={label}
        onChange={(newValue) => onUpdate(newValue, label)}
      />
    </h2>
  );
}

function ValidationErrorStatus({
  validationError,
}: {
  validationError: ValidationError;
}) {
  return (
    <div className="flex flex-row gap-2 text-xs text-error">
      <ExclamationCircleIcon className="w-4" />
      {validationError.error}
    </div>
  );
}

function LastRunSummary({
  lastRun,
  validationError,
}: {
  lastRun: LastRunDetails;
  validationError?: ValidationError;
}) {
  let scrollToRef = useRef(null);

  useEffect(() => {
    if (lastRun.nodeResult.status.toLowerCase() === "ok") {
      if (scrollToRef.current) {
        (scrollToRef.current as HTMLElement).scrollIntoView();
      }
    }
  }, [lastRun]);

  if (lastRun.nodeResult.status.toLowerCase() === "ok") {
    let duration = DateTime.fromJSDate(lastRun.endTimestamp).diff(
      DateTime.fromJSDate(lastRun.startTimestamp),
      "seconds",
    );
    return (
      <div ref={scrollToRef} className="flex flex-row gap-2 text-xs w-full">
        <CheckBadgeIcon className="w-4 text-success" />
        <div className="text-neutral-500">{duration.seconds.toFixed(3)}s</div>
        <div className="text-neutral-500 ml-auto">
          {DateTime.fromJSDate(lastRun.endTimestamp).toLocaleString(
            DateTime.DATETIME_FULL,
          )}
        </div>
      </div>
    );
  } else if (validationError) {
    return (
      <div className="flex flex-row gap-2 text-xs text-error">
        <ExclamationCircleIcon className="w-4" />
        {validationError.error}
      </div>
    );
  } else {
    return (
      <div className="flex flex-row gap-2 text-xs text-error">
        <ExclamationCircleIcon className="w-4" />
        {lastRun.nodeResult.error}
      </div>
    );
  }
}

interface WorkflowResultProps {
  result: NodeResult;
  hideButton?: boolean;
  onHide?: () => void;
  className?: string;
}

export function WorkflowResult({
  result,
  className = "bg-base-200",
  hideButton = false,
  onHide = () => {},
}: WorkflowResultProps) {
  let [isCopying, setIsCopying] = useState(false);

  // Pull out text based content to display by itself, otherwise
  // render data as a pretty printed JSON blob.
  let content: string | null | undefined = null;
  if (result.data && isStringResult(result.data)) {
    content = result.data.content;
  } else if (result.data) {
    content = JSON.stringify(getValue(result.data), null, 2);
  } else {
    content = null;
  }

  let handleCopy = () => {
    setIsCopying(true);
    setTimeout(() => setIsCopying(false), 512);
    if (content) {
      navigator.clipboard.writeText(content);
    }
  };

  return (
    <div className={`${BASE_CARD_STYLE} ${className}`}>
      <div className="card-body p-2 max-h-[512px] overflow-y-auto">
        <pre className="text-xs p-4 rounded-lg overflow-auto">
          {content ? content : <span className="italic">Result is empty</span>}
        </pre>
        {hideButton && (
          <button
            className="btn btn-block btn-neutral btn-sm"
            onClick={() => onHide()}
          >
            Hide
          </button>
        )}
      </div>
      <div className="card-actions p-2 place-content-end">
        <button
          className="btn disabled:btn-info"
          disabled={isCopying}
          onClick={() => handleCopy()}
        >
          {isCopying ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : (
            <ClipboardDocumentListIcon className="w-6 h-6" />
          )}
          Copy
        </button>
      </div>
    </div>
  );
}

export function NodeComponent({
  uuid,
  label,
  nodeType,
  data,
  isRunning,
  lastRun,
  workflowValidation,
  nodeState,
  onUpdate = () => {},
  onDelete = () => {},
  onStateChange = () => {},
  dragUpdate,
  getAuthToken,
}: BaseNodeProps) {
  let scrollToRef = useRef(null);

  let [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  let [error, setError] = useState<string | null>(null);
  let [canDrag, setCanDrag] = useState<boolean>(false);
  let [validationResult, setValidationResult] = useState<
    ValidationError | undefined
  >(undefined);

  useEffect(() => {
    if (nodeState) {
      if (nodeState.expanded !== undefined) {
        setIsCollapsed(!nodeState.expanded);
      }
    }
  }, [nodeState]);

  useEffect(() => {
    if (lastRun?.nodeResult.status === "error") {
      setError(lastRun.nodeResult.error ?? null);
    } else {
      setError(null);
    }
  }, [lastRun]);

  useEffect(() => {
    const result = workflowValidation?.validationErrors?.find(
      (errors) => errors.uuid === uuid,
    );
    setValidationResult(result);
  }, [workflowValidation]);

  useEffect(() => {
    if (isRunning && scrollToRef.current) {
      (scrollToRef.current as HTMLElement).scrollIntoView();
    }
  }, [isRunning]);

  let baseProps = {
    data: data,
    onUpdateData: (data: any) => onUpdate({ data }),
  };

  let renderNodeBody = () => {
    if (nodeType === NodeType.Extract) {
      return <ExtractNode {...baseProps} />;
    } else if (nodeType === NodeType.DataSource) {
      return (
        <DataNodeComponent
          data={data as DataNodeDef}
          onUpdate={(data) => onUpdate({ data })}
          getAuthToken={getAuthToken}
        />
      );
    } else if (nodeType === NodeType.Template) {
      return <TemplateNode {...baseProps} />;
    } else if (nodeType === NodeType.Summarize) {
      return <SummarizeNode {...baseProps} />;
    } else if (nodeType === NodeType.DataDestination) {
      return <DataDestinationNode {...baseProps} />;
    } else if (nodeType === NodeType.Loop) {
      return <Loop {...baseProps} />;
    }

    return null;
  };

  let borderColor = isRunning ? "border-info" : "border-neutral";
  if (!isRunning && lastRun) {
    if (lastRun.nodeResult.status.toLowerCase() === "ok") {
      borderColor = "border-success";
    } else {
      borderColor = "border-error";
    }
  }

  return (
    <div
      ref={scrollToRef}
      className={`${BASE_CARD_STYLE} bg-neutral border-2 ${borderColor}`}
      draggable={canDrag}
      onDragStart={() => dragUpdate(uuid)}
      onDragEnd={() => {
        setCanDrag(false);
        dragUpdate(null);
      }}
    >
      <figure className="bg-base-100 p-2 border-inherit">
        <div className="flex flex-row w-full justify-between items-center">
          <div className="flex flex-row gap-2">
            <Bars3Icon
              className="w-4 h-4 cursor-pointer"
              onMouseDown={() => setCanDrag(true)}
              onMouseUp={() => setCanDrag(false)}
            ></Bars3Icon>
            <div className="text-neutral-600 px-2 text-xs">id: {uuid}</div>
          </div>
          <div className="flex flex-row gap-2">
            <button
              className="btn btn-circle btn-xs btn-neutral btn-outline"
              onClick={() => {
                const state = nodeState ?? ({} as NodeState);
                const newState = !isCollapsed;
                setIsCollapsed(newState);

                state.expanded = !newState;
                onStateChange(state);
              }}
            >
              {isCollapsed ? (
                <ChevronDownIcon className="w-4 text-gray" />
              ) : (
                <ChevronUpIcon className="w-4 text-gray" />
              )}
            </button>
            <button
              className="btn btn-circle btn-xs btn-error btn-outline"
              onClick={() => onDelete()}
            >
              <XMarkIcon className="w-4 text-gray" />
            </button>
          </div>
        </div>
      </figure>
      <div className="card-body px-6 py-4">
        <div className="flex flex-col gap-4">
          <NodeHeader
            label={label}
            nodeType={nodeType}
            onUpdate={(value) => onUpdate({ label: value })}
          />
          {!isCollapsed && renderNodeBody()}
        </div>
      </div>
      <figure className="card-actions bg-base-100 py-2 px-4">
        {error && <div className="alert alert-error text-sm">{error}</div>}
        {isRunning ? (
          <div className="text-sm text-neutral-content flex flex-row items-center gap-2">
            <span className="loading loading-spinner text-info loading-sm"></span>
            Executing...
          </div>
        ) : null}
        {validationResult && !lastRun && !isRunning ? (
          <ValidationErrorStatus
            validationError={validationResult}
          ></ValidationErrorStatus>
        ) : null}
        {lastRun && !isRunning ? (
          <LastRunSummary
            lastRun={lastRun}
            validationError={validationResult}
          />
        ) : !isRunning && !validationResult ? (
          <div className="text-sm text-neutral-content flex flex-row items-center gap-2">
            <NoSymbolIcon className="w-4" />
            Has not been run.
          </div>
        ) : null}
      </figure>
    </div>
  );
}

export function ShowNodeResult({
  node,
  result,
  onMappingConfigure,
  canShowMapping,
}: {
  node: NodeDef;
  result: LastRunDetails | undefined;
  onMappingConfigure: () => void;
  canShowMapping: boolean;
}) {
  let [showResult, setShowResult] = useState<boolean>(false);

  const hasMapping = node.mapping !== undefined && node.mapping.length > 0;

  if (!result) {
    return (
      <div className="w-full flex justify-center">
        <MappingButton
          onMappingConfigure={onMappingConfigure}
          showMapping={canShowMapping}
          hasMapping={hasMapping}
        ></MappingButton>
      </div>
    );
  } else if (showResult && result) {
    return (
      <WorkflowResult
        result={result.nodeResult}
        hideButton={true}
        onHide={() => setShowResult(false)}
      />
    );
  } else {
    return (
      <div className="mx-auto flex flex-col w-fit items-center">
        {result ? (
          <div className="btn" onClick={() => setShowResult(true)}>
            View Results
          </div>
        ) : (
          <MappingButton
            onMappingConfigure={onMappingConfigure}
            showMapping={canShowMapping}
            hasMapping={hasMapping}
          ></MappingButton>
        )}
      </div>
    );
  }
}

function MappingButton({
  onMappingConfigure,
  showMapping,
  hasMapping,
}: {
  onMappingConfigure: () => void;
  showMapping: boolean;
  hasMapping: boolean;
}) {
  if (showMapping) {
    let badgeColor = hasMapping ? "badge-primary" : "";

    return (
      <button
        className="btn btn-neutral indicator"
        onClick={() => onMappingConfigure()}
      >
        <span className={`indicator-item indicator-end badge ${badgeColor}`}>
          <BeakerIcon className="h-4 w-4"></BeakerIcon>
        </span>
        <ArrowDownIcon className="h-4 w-4"></ArrowDownIcon>
      </button>
    );
  } else {
    return <ArrowDownIcon className="h-4 w-4"></ArrowDownIcon>;
  }
}
