import axios, { AxiosRequestConfig } from "axios";
import {
  ApiError,
  ApiResponse,
  FetchResponse,
  ParseResponse,
  SummaryResponse,
  TaskResponse,
} from "../types/spyglassApi";
import {
  ConnectionDataDef,
  DataNodeDef,
  NodeResult,
  NodeResultStatus,
  StringContentResult,
  SummaryDataDef,
  TableDataResult,
} from "../types/node";
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
import { UserConnection } from "../components/nodes/sources/connection";
import { WorkflowContext } from "./workflowinstance";
const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;
const API_TOKEN = process.env.REACT_APP_API_TOKEN;
const API_CONFIG: AxiosRequestConfig = {
  headers: { Authorization: `Bearer ${API_TOKEN}` },
};

export async function listUserConnections(
  token?: string,
): Promise<UserConnection[]> {
  let config: AxiosRequestConfig = {
    ...API_CONFIG,
  };

  if (token) {
    config = {
      headers: { Authorization: `Bearer ${token}` },
    };
  }

  return await axios
    .get<ApiResponse<UserConnection[]>>(`${API_ENDPOINT}/connections`, config)
    .then((resp) => resp.data.result);
}

export async function executeConnectionRequest(
  data: ConnectionDataDef,
  token?: string,
): Promise<NodeResult> {
  console.debug(`connection request: ${data}`);
  // Do some light data validation
  if (!data.connectionId) {
    return {
      status: NodeResultStatus.Error,
      error: "Please choose a valid connection.",
    };
  } else if (!data.spreadsheetId) {
    return {
      status: NodeResultStatus.Error,
      error: "Please set a valid spreadsheet id.",
    };
  }

  // Setup the data request
  let config: AxiosRequestConfig = {
    ...API_CONFIG,
  };

  if (token) {
    config = {
      headers: { Authorization: `Bearer ${token}` },
    };
  }

  // todo: refactor to support other integrations
  let request = {
    Sheets: {
      action: "ReadRows",
      request: {
        spreadsheetId: data.spreadsheetId ?? "",
        sheetId: data.sheetId ?? "",
        range: "A1:AA100",
      },
    },
  };

  return await axios
    .post<ApiResponse<any[]>>(
      `${API_ENDPOINT}/connections/${data.connectionId}`,
      request,
      config,
    )
    .then((resp) => {
      let result = resp.data.result;
      let header = {};
      if (result.length > 0) {
        header = result[0];
      }
      return {
        status: NodeResultStatus.Ok,
        data: {
          rows: result,
          headerRow: header,
        } as TableDataResult,
      };
    })
    .catch((err) => {
      return {
        status: NodeResultStatus.Error,
        error: err.toString(),
      };
    });
}

export async function executeGSheetsHeaderRequest(
  data: ConnectionDataDef,
  token?: string,
): Promise<NodeResult> {
  console.debug(`connection request: ${data}`);
  // Do some light data validation
  if (!data.connectionId) {
    return {
      status: NodeResultStatus.Error,
      error: "Please choose a valid connection.",
    };
  } else if (!data.spreadsheetId) {
    return {
      status: NodeResultStatus.Error,
      error: "Please set a valid spreadsheet id.",
    };
  }

  // Setup the data request
  let config: AxiosRequestConfig = {
    ...API_CONFIG,
  };

  if (token) {
    config = {
      headers: { Authorization: `Bearer ${token}` },
    };
  }

  // todo: refactor to support other integrations
  let request = {
    Sheets: {
      action: "ReadRows",
      request: {
        spreadsheetId: data.spreadsheetId ?? "",
        sheetId: data.sheetId ?? "",
        range: "1:1",
      },
    },
  };

  return await axios
    .post<ApiResponse<any[]>>(
      `${API_ENDPOINT}/connections/${data.connectionId}`,
      request,
      config,
    )
    .then((resp) => {
      let result = resp.data.result;
      let header = {};
      if (result.length > 0) {
        header = result[0];
      }
      return {
        status: NodeResultStatus.Ok,
        data: {
          rows: result,
          headerRow: header,
        } as TableDataResult,
      };
    })
    .catch((err) => {
      return {
        status: NodeResultStatus.Error,
        error: err.toString(),
      };
    });
}

export async function executeFetchUrl(
  url: string | undefined,
): Promise<NodeResult> {
  if (!url || url.length === 0) {
    return {
      status: NodeResultStatus.Error,
      error: "No URL inputed",
    };
  } else if (!url.startsWith("http")) {
    return {
      status: NodeResultStatus.Error,
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
        status: NodeResultStatus.Ok,
        data: { content, type: "string" } as StringContentResult,
      } as NodeResult;
    })
    .catch((err) => {
      return {
        status: NodeResultStatus.Error,
        error: err.toString(),
      };
    });
}

export async function executeParseFile(
  file: File | undefined,
): Promise<NodeResult> {
  if (!file) {
    return {
      status: NodeResultStatus.Error,
      error: "No file selected",
    };
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
        status: NodeResultStatus.Ok,
        data: { content: parsed, type: "string" } as StringContentResult,
      } as NodeResult;
    })
    .catch((err) => {
      return {
        status: NodeResultStatus.Error,
        error: err.toString(),
      } as NodeResult;
    });
}

export async function executeSummarizeTask(
  input: NodeResult | null,
  controller: AbortController,
  cancelListener: Observable<boolean>,
  executeContext: WorkflowContext,
): Promise<NodeResult> {
  let config: AxiosRequestConfig = {
    signal: controller.signal,
    ...API_CONFIG,
  };

  if (executeContext.getAuthToken) {
    const token = executeContext.getAuthToken();
    config.headers = { Authorization: `Bearer ${token}` };
  }

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
        status: NodeResultStatus.Error,
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
        status: NodeResultStatus.Error,
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
      status: NodeResultStatus.Error,
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
