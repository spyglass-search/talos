import axios, { AxiosError, AxiosRequestConfig } from "axios";
import {
  ApiError,
  ApiResponse,
  FetchResponse,
  ParseResponse,
  SummaryResponse,
  TaskResponse,
} from "../types/spyglassApi";
import { DataNodeDef, NodeResult, SummaryDataDef } from "../types/node";
import {
  interval,
  mergeMap,
  from,
  lastValueFrom,
  tap,
  Observable,
  of,
  takeUntil,
  Subject,
  merge,
} from "rxjs";
const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;
const API_TOKEN = process.env.REACT_APP_API_TOKEN;
const API_CONFIG: AxiosRequestConfig = {
  headers: { Authorization: `Bearer ${API_TOKEN}` },
};

export async function executeFetchUrl(
  url: string | undefined,
): Promise<NodeResult | ApiError> {
  if (!url || url.length === 0) {
    return {
      status: "error",
      error: "No URL inputed",
    };
  } else if (!url.startsWith("http")) {
    return {
      status: "error",
      error: "Only http and https URLs are supported.",
    };
  }

  console.debug(`fetching url: ${url}`);
  let config: AxiosRequestConfig = {
    params: {
      url,
    },
    ...API_CONFIG,
  };
  return await axios
    .get<ApiResponse<FetchResponse>>(`${API_ENDPOINT}/fetch`, config)
    .then((resp) => {
      let { content } = resp.data.result;
      return {
        status: "ok",
        data: { content } as DataNodeDef,
      } as NodeResult;
    })
    .catch((err) => {
      return {
        status: "error",
        error: err.toString(),
      };
    });
}

export async function executeParseFile(
  file: File | undefined,
): Promise<NodeResult | ApiError> {
  if (!file) {
    return {
      status: "error",
      error: "No file selected"
    }
  }

  let formData = new FormData();
  formData.append("file", file);
  return await axios
    .post<ApiResponse<ParseResponse>>(
      `${API_ENDPOINT}/fetch/parse`,
      formData,
      API_CONFIG,
    )
    .then((resp) => {
      let { parsed } = resp.data.result;
      return {
        status: "ok",
        data: { content: parsed } as DataNodeDef,
      } as NodeResult;
    })
    .catch((err) => {
      return {
        status: "error",
        error: err.toString(),
      };
    });
}

export async function executeSummarizeTask(
  input: NodeResult | null,
  controller: AbortController,
  cancelListener: Observable<boolean>,
): Promise<NodeResult | ApiError> {
  let config: AxiosRequestConfig = {
    signal: controller.signal,
    ...API_CONFIG,
  };

  let text = "";
  if (input && input.data && "content" in input.data) {
    text = input.data.content ?? "";
  }

  let response: ApiResponse<string> | ApiError = await axios
    .post<ApiResponse<string>>(
      `${API_ENDPOINT}/action/summarize/task`,
      { text },
      config,
    )
    .then((resp) => resp.data)
    .catch((err) => {
      return {
        status: "error",
        error: err.toString(),
      };
    });

  if (response.status.toLowerCase() === "ok" && "result" in response) {
    let taskId: any = response.result;
    if (taskId instanceof Object) {
      taskId = taskId.taskId;
    }

    console.log(`waiting for task "${taskId}" to finish`);
    let taskResponse = await waitForTaskCompletion(taskId, cancelListener);

    if (!taskResponse.result) {
      return {
        status: "error",
        error: "Invalid response",
      };
    }

    return {
      status: taskResponse.status,
      data: {
        summary: taskResponse.result.result?.paragraph,
        bulletSummary: taskResponse.result.result?.bullets,
      } as SummaryDataDef,
    } as NodeResult;
  } else {
    let res = await lastValueFrom(of(response));
    return {
      status: "error",
      error: "error" in res ? res.error : JSON.stringify(res),
    };
  }
}

export function waitForTaskCompletion(
  taskUUID: string,
  cancelListener: Observable<boolean>,
): Promise<ApiResponse<TaskResponse<SummaryResponse>>> {
  const finished = new Subject<boolean>();
  return lastValueFrom(
    interval(1000)
      .pipe(
        takeUntil(merge(cancelListener, finished)),
        mergeMap(() => from(getTaskResult(taskUUID))),
      )
      .pipe(
        tap((val) => {
          if (
            val.result.status.startsWith("Complete") ||
            val.result.status === "Failed"
          ) {
            finished.next(true);
            finished.complete();
          }
        }),
      ),
  );
}

function getTaskResult(
  task_uuid: string,
): Promise<ApiResponse<TaskResponse<SummaryResponse>>> {
  return axios
    .get<ApiResponse<TaskResponse<any>>>(
      `${API_ENDPOINT}/tasks/${task_uuid}`,
      API_CONFIG,
    )
    .then((resp) => resp.data);
}
