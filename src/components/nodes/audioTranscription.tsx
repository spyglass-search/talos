import Ajv from "ajv/dist/2020";
import {
  AudioDataSourceType,
  AudioTranscriptionNodeDef,
  ExtractNodeDef,
} from "../../types/node";
import { NodeBodyProps } from "../nodes";
import React, { useEffect, useState } from "react";
import { JSONSchema7, JSONSchema7Definition } from "json-schema";
import { EditableText, EditableTextarea } from "../editable";

export default function AudioTranscription({
  data,
  onUpdateData = () => {},
}: NodeBodyProps) {
  let [audioSource, setAudioSource] = useState<string>();

  let actionData = data as AudioTranscriptionNodeDef;

  useEffect(() => {
    if (actionData.audioSource.data.url) {
      setAudioSource(actionData.audioSource.data.url);
    }
  }, [actionData]);

  let updateUrl = (newUrl: string) => {
    onUpdateData({ ...actionData });
    onUpdateData({
      ...actionData,
      audioSource: {
        sourceType: AudioDataSourceType.URL,
        data: { url: newUrl },
      },
    } as AudioTranscriptionNodeDef);
  };

  return (
    <div className="flex flex-col gap-4">
      <EditableText
        label="Audio Source URL"
        data={actionData.audioSource.data.url}
        onChange={(newValue) => updateUrl(newValue)}
        className="bg-base-100 p-2 rounded text-sm w-full"
      />
    </div>
  );
}
