import { APIResponse } from "@/types";

// Response helpers - these are pure utility functions, not server actions

/**
 * Normalises an axios response from the backend into a standard APIResponse.
 * Replaces the `successResponse(response?.data?.data, ...)` pattern so that
 * the backend's own success/failure flag is preserved correctly.
 */
export function fromBackend(axiosResponse: any, message?: string): APIResponse {
  const body = axiosResponse?.data;
  return {
    success: body?.success ?? false,
    message: message || body?.message || "",
    data: body?.data ?? null,
    pagination: body?.pagination,
  };
}

export function successResponse(
  data: any | null,
  message: string = "Action completed successfully",
  pagination?: any,
): APIResponse {
  return {
    success: true,
    message,
    data,
    pagination,
  };
}

export function unauthorizedResponse(
  message: string = "Unauthorized",
): APIResponse {
  return {
    success: false,
    message,
    data: null,
  };
}

export function notFoundResponse(message: string): APIResponse {
  return {
    success: false,
    message,
    data: null,
  };
}

export function methodNotAllowedResponse(): APIResponse {
  return {
    success: false,
    message: "Method not allowed",
    data: null,
  };
}

export function handleError(
  error: any,
  method = "GET",
  url: string,
): APIResponse {
  console.error({
    endpoint: `${method} |  ~ ${url}`,
    status: error?.response?.status,
    statusText: error?.response?.statusText,
    headers: error?.response?.headers,
    config: error?.response?.config,
    data: error?.response?.data || error,
  });

  // Handle authentication errors specifically
  const status = error?.response?.status || 500;
  if (status === 401) {
    return unauthorizedResponse(
      error?.response?.data?.message ||
        "Authentication required. Please log in again.",
    );
  }

  if (status === 403) {
    return {
      success: false,
      message:
        error?.response?.data?.message ||
        "You don't have permission to perform this action.",
      data: error?.response?.data?.featureName
        ? { featureName: error.response.data.featureName, errorType: "feature_locked" }
        : null,
    };
  }

  // Preserve structured tier limit errors (400 from CheckLimit middleware)
  if (status === 400 && error?.response?.data?.resourceType) {
    return {
      success: false,
      message: error.response.data.message,
      data: {
        errorType: "limit_reached",
        resourceType: error.response.data.resourceType,
        currentUsage: error.response.data.currentUsage,
        limit: error.response.data.limit,
      },
    };
  }

  return {
    success: false,
    message:
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.response?.message ||
      error?.message ||
      "Oops! Something went wrong. Please try again.",
    data: null,
  };
}

export function badRequestResponse(message: string): APIResponse {
  return {
    success: false,
    message,
    data: null,
  };
}
