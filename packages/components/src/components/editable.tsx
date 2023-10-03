import { CheckIcon, PencilSquareIcon } from "@heroicons/react/20/solid";
import { useRef, useState } from "react";

interface EditableFieldProps {
  label?: string | null;
  data: string;
  isCode?: boolean;
  className?: string;
  placeholder?: string;
  onChange?: (newValue: string, oldValue: string) => void;
}

export function EditableTextarea({
  label = null,
  data,
  isCode,
  onChange = () => {},
}: EditableFieldProps) {
  let [isEditing, setIsEditing] = useState<boolean>(false);
  let fieldInput = useRef(null);

  let saveEdit = () => {
    if (fieldInput.current) {
      let updatedValue = (fieldInput.current as HTMLTextAreaElement).value;
      onChange(updatedValue, data);
    }
    setIsEditing(false);
  };

  let styles = "w-full h-48 text-xs rounded-lg py-2 px-4";
  if (isCode) {
    styles = `${styles} font-mono`;
  } else {
    styles = `${styles} font-sans whitespace-pre-wrap leading-relaxed`;
  }

  if (isEditing) {
    styles = `${styles} bg-neutral-900`;
  } else {
    styles = `${styles} bg-base-100`;
  }

  return (
    <div>
      <div className="text-xs uppercase font-semibold pb-2 flex flex-row justify-between items-center">
        {label ? <div>{label}</div> : null}
        {isEditing ? (
          <button className="btn btn-xs btn-success" onClick={() => saveEdit()}>
            <CheckIcon className="w-4" />
            save
          </button>
        ) : (
          <button className="btn btn-xs" onClick={() => setIsEditing(true)}>
            <PencilSquareIcon className="w-4" />
            edit
          </button>
        )}
      </div>
      {isEditing ? (
        <textarea
          ref={fieldInput}
          className={`form-textarea ${styles}`}
          defaultValue={data}
        />
      ) : (
        <pre className={`${styles} overflow-auto`}>{data}</pre>
      )}
    </div>
  );
}

export function EditableText({
  label,
  data,
  className,
  placeholder,
  onChange = () => {},
}: EditableFieldProps) {
  let [isEditing, setIsEditing] = useState<boolean>(false);
  let fieldInput = useRef(null);

  let saveEdit = () => {
    if (fieldInput.current) {
      let updatedValue = (fieldInput.current as HTMLTextAreaElement).value;
      onChange(updatedValue, data);
    }
    setIsEditing(false);
  };

  let styles = `${className} w-full mr-2`;
  if (isEditing) {
    styles = `${styles} bg-neutral-900`;
  } else {
    styles = `${styles}`;
  }

  return (
    <div className="flex flex-col w-full">
      {label ? (
        <div className="text-xs uppercase font-semibold pb-2">{label}</div>
      ) : null}
      <div className="flex flex-row gap-2 items-center justify-between w-full">
        {isEditing ? (
          <input
            ref={fieldInput}
            type="text"
            defaultValue={data}
            className={`form-text input ${styles}`}
          />
        ) : (
          <div className={styles}>
            {data && data.length > 0 ? (
              data
            ) : (
              <span className="italic">{placeholder ?? "empty"}</span>
            )}
          </div>
        )}
        {isEditing ? (
          <button
            className="btn btn-success btn-sm btn-square"
            onClick={() => saveEdit()}
          >
            <CheckIcon className="w-4" />
          </button>
        ) : (
          <button
            className="btn btn-sm flex btn-ghost"
            onClick={() => setIsEditing(true)}
          >
            <PencilSquareIcon className="w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
