import { verifySession } from "@/lib/auth";
import { AUTH_SESSION } from "@/lib/constants";
import axiosClient, { AxiosRequestConfig, AxiosRequestHeaders } from "axios";

export const axios = axiosClient.create({
  baseURL: process.env.BASE_URL || "http://localhost:8080",
  
});

// Reusable error handler following DRY principle
const createErrorHandler = () => async (error: Error | any) => {
  // Timeout error
  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    throw {
      ...error,
      type: "Timeout Error",
      message: "Request timed out! Please try again",
    };
  }

  // Network error
  if (
    error.code === "ECONNREFUSED" ||
    error.code === "ECONNRESET" ||
    error.code === "ENOTFOUND"
  ) {
    return Promise.reject({
      ...error,
      type: "Network Error",
      message: "Please check your internet connection.",
    });
  }

  // No response error
  if (!error.response) {
    return Promise.reject({
      ...error,
      type: "No Response Error",
      message: "No response from server.",
    });
  }

  const { status, data } = error.response;

  // Handle specific error codes
  const errorMap: { [x: string]: string } = {
    400: "Bad request",
    403: "Forbidden",
    404: "Resource not found",
    500: "Internal server error",
    502: "Bad gateway",
    503: "Service unavailable",
  };

  return Promise.reject({
    ...error,
    type: "API",
    status,
    message:
      data?.message || data?.error || errorMap[status] || "Request failed",
  });
};

// Shared response and error handlers
const responseHandler = (response: any) => response;
const errorHandler = createErrorHandler();

// Apply the same interceptors to both API clients
axios.interceptors.response.use(responseHandler, errorHandler);

export type RequestType = AxiosRequestConfig & {
  contentType?: AxiosRequestHeaders["Content-Type"];
  
};

const authenticatedApiClient = async (
  request: RequestType,
  retryCount = 0,
): Promise<any> => {
  const maxRetries = 3;
  const retryDelay = 500; // 500ms delay between retries

  try {
    // Enhanced session verification
    const { isAuthenticated, session } = await verifySession();

    if (!isAuthenticated || !session?.access_token) {
      // If no session and we haven't retried yet, wait a bit and try again
      if (retryCount < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        return authenticatedApiClient(request, retryCount + 1);
      }

      throw new Error("No valid session found");
    }

    const headers: any = {
      "Content-type": request.contentType
        ? request.contentType
        : "application/json",
      Authorization: `Bearer ${session?.access_token}`,
      Cookie: `${AUTH_SESSION}=${session.access_token}`, // Forward the session cookie to API
    };

    // Add organization context if available
    if (session.organization_id) {
      headers["X-Organization-ID"] = session.organization_id;
    }

    const config = {
      method: "GET",
      withCredentials: true,
      ...request,
      headers: {
        ...headers, // Our auth headers (Authorization, Cookie, etc.)
        ...request.headers, // Merge with any headers from request (like NO_CACHE_HEADERS)
      },
    };

    return await axios(config);
  } catch (error: any) {
    // If it's a session error and we haven't exhausted retries, try again
    if (error.message === "No valid session found" && retryCount < maxRetries) {
      await new Promise((resolve) =>
        setTimeout(resolve, retryDelay * (retryCount + 1)),
      );
      return authenticatedApiClient(request, retryCount + 1);
    }
    throw error;
  }
};

export default authenticatedApiClient;

// Re-export response helpers from the library
// This file maintains backward compatibility for imports
// Note: This file does NOT have 'use server' because it only exports utility functions
export {
  successResponse,
  fromBackend,
  unauthorizedResponse,
  notFoundResponse,
  methodNotAllowedResponse,
  handleError,
  badRequestResponse,
} from "@/lib/response-helpers";

/**
 * Cache-busting headers to ensure fresh data
 * Use this for document retrieval endpoints that need to always fetch latest data
 */
export const NO_CACHE_HEADERS = {
  "Cache-Control": "no-cache, no-store, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
} as const;
