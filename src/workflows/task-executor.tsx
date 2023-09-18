import axios, { AxiosRequestConfig } from "axios";
import {
  ApiError,
  ApiResponse,
  SummaryResponse,
  TaskResponse,
} from "../types/spyglassApi";
import { NodeResult, SummaryDataDef } from "../types/node";
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

export async function executeSummarizeTask(
  input: NodeResult | null,
  controller: AbortController,
  cancelListener: Observable<boolean>,
): Promise<NodeResult | ApiError> {
  let config: AxiosRequestConfig = {
    headers: { Authorization: `Bearer ${API_TOKEN}` },
    signal: controller.signal,
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

  if (response.status === "Ok" && "result" in response) {
    let taskResponse = await waitForTaskCompletion(
      response.result,
      cancelListener,
    );
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
            val.result.status === "'Complete'" ||
            val.result.status === "'Failed'"
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
  let config: AxiosRequestConfig = {
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  };

  return axios
    .get<ApiResponse<TaskResponse<any>>>(
      `${API_ENDPOINT}/tasks/${task_uuid}`,
      config,
    )
    .then((resp) => resp.data);
}