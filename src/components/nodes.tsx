import React, { useEffect, useState } from "react";
import { DateTime } from "luxon";
import {
  LastRunDetails,
  NodeType,
  NodeUpdates,
  NodeResult,
  NodeDataTypes,
} from "../types/node";
import {
  ArrowDownIcon,
  BoltIcon,
  BookOpenIcon,
  CheckBadgeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CodeBracketIcon,
  ExclamationCircleIcon,
  NoSymbolIcon,
  TableCellsIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";
import ExtractNode from "./nodes/extract";
import TemplateNode from "./nodes/template";
import SummarizeNode from "./nodes/summarize";
import { DataNode } from "./nodes/sources";
import { EditableText } from "./editable";
import { ClipboardDocumentListIcon } from "@heroicons/react/24/outline";

export interface BaseNodeProps {
  uuid: string;
  label: string;
  data: NodeDataTypes;
  nodeType: NodeType;
  isRunning?: boolean;
  lastRun?: LastRunDetails;
  // Request node deletion
  onDelete?: () => void;
  // Request node update
  onUpdate?: (nodeUpdates: NodeUpdates) => void;
}

export interface NodeBodyProps {
  data: NodeDataTypes;
  onUpdateData?: (dataUpdates: NodeDataTypes) => void;
}

export interface NodeHeaderProps {
  label: string;
  nodeType: NodeType;
  onUpdate?: (newValue: string, oldValue: string) => void;
}

export interface NodeIconProps {
  nodeType: NodeType;
  className?: string;
}

const BASE_CARD_STYLE = "card shadow-xl w-full md:w-[480px] lg:w-[640px]";

export function NodeIcon({ nodeType, className }: NodeIconProps) {
  let icon = <TableCellsIcon className={className} />;
  if (nodeType === NodeType.Extract) {
    icon = <BoltIcon className={className} />;
  } else if (nodeType === NodeType.Template) {
    icon = <CodeBracketIcon className={className} />;
  } else if (nodeType === NodeType.Summarize) {
    icon = <BookOpenIcon className={className} />;
  }
  return icon;
}

export function NodeHeader({
  nodeType,
  label,
  onUpdate = () => {},
}: NodeHeaderProps) {
  return (
    <h2 className="card-title flex flex-row">
      <NodeIcon nodeType={nodeType} className="w-6 h-6" />
      <EditableText
        data={label}
        onChange={(newValue) => onUpdate(newValue, label)}
      />
    </h2>
  );
}

function LastRunSummary({ lastRun }: { lastRun: LastRunDetails }) {
  if (lastRun.nodeResult.status.toLowerCase() === "ok") {
    let duration = DateTime.fromJSDate(lastRun.endTimestamp).diff(
      DateTime.fromJSDate(lastRun.startTimestamp),
      "seconds",
    );
    return (
      <div className="flex flex-row gap-2 text-xs w-full">
        <CheckBadgeIcon className="w-4 text-success" />
        <div className="text-neutral-500">{duration.seconds.toFixed(3)}s</div>
        <div className="text-neutral-500 ml-auto">
          {DateTime.fromJSDate(lastRun.endTimestamp).toLocaleString(
            DateTime.DATETIME_FULL,
          )}
        </div>
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
  if (result.data && "content" in result.data) {
    content = result.data["content"];
  } else {
    content = JSON.stringify(result.data, null, 2);
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
        <pre className="text-xs p-4 rounded-lg overflow-auto">{content}</pre>
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
  onUpdate = () => {},
  onDelete = () => {},
}: BaseNodeProps) {
  let [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  let [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lastRun?.nodeResult.status === "error") {
      setError(lastRun.nodeResult.error ?? null);
    } else {
      setError(null);
    }
  }, [lastRun]);
  let renderNodeBody = () => {
    if (nodeType === NodeType.Extract) {
      return (
        <ExtractNode data={data} onUpdateData={(data) => onUpdate({ data })} />
      );
    } else if (nodeType === NodeType.Data) {
      // todo: handle other data node types
      return (
        <DataNode data={data} onUpdateData={(data) => onUpdate({ data })} />
      );
    } else if (nodeType === NodeType.Template) {
      return (
        <TemplateNode data={data} onUpdateData={(data) => onUpdate({ data })} />
      );
    } else if (nodeType === NodeType.Summarize) {
      return (
        <SummarizeNode
          data={data}
          onUpdateData={(data) => onUpdate({ data })}
        />
      );
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
    <div className={`${BASE_CARD_STYLE} bg-neutral border-2 ${borderColor}`}>
      <figure className="bg-base-100 p-2 border-inherit">
        <div className="flex flex-row w-full justify-between items-center">
          <div className="text-neutral-600 px-2 text-xs">id: {uuid}</div>
          <div className="flex flex-row gap-2">
            <button
              className="btn btn-circle btn-xs btn-neutral btn-outline"
              onClick={() => setIsCollapsed(!isCollapsed)}
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
        {lastRun && !isRunning ? (
          <LastRunSummary lastRun={lastRun} />
        ) : !isRunning ? (
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
  result,
}: {
  result: LastRunDetails | undefined;
}) {
  let [showResult, setShowResult] = useState<boolean>(false);

  if (!result) {
    return <ArrowDownIcon className="mt-4 mx-auto w-4" />;
  } else if (showResult && result) {
    return (
      <div className="mt-8 mb-4">
        <WorkflowResult
          result={result.nodeResult}
          hideButton={true}
          onHide={() => setShowResult(false)}
        />
      </div>
    );
  } else {
    return (
      <div className="mt-4 mx-auto flex flex-col w-full items-center">
        {result ? (
          <div className="btn" onClick={() => setShowResult(true)}>
            View Results
          </div>
        ) : (
          <ArrowDownIcon className="w-4" />
        )}
      </div>
    );
  }
}
