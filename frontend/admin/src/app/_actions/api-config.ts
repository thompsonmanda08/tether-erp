import { verifyAdminSession } from "@/lib/auth";
import { ADMIN_SESSION } from "@/lib/constants";
import axiosClient, { AxiosRequestConfig, AxiosRequestHeaders } from "axios";

export const axios = axiosClient.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
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
    401: "Unauthorized",
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
  const isDev = process.env.NODE_ENV === "development";

  try {
    if (isDev)
      console.log(
        `[authenticatedApiClient] Attempt ${retryCount + 1}/${maxRetries + 1} for ${request.url}`,
      );

    // Enhanced admin session verification
    const { isAuthenticated, session } = await verifyAdminSession();

    if (!isAuthenticated || !session?.access_token) {
      if (isDev)
        console.log(
          `[authenticatedApiClient] No valid admin session found on attempt ${retryCount + 1}`,
        );

      // If no session and we haven't retried yet, wait a bit and try again
      if (retryCount < maxRetries) {
        if (isDev)
          console.log(
            `[authenticatedApiClient] Retrying in ${retryDelay}ms...`,
          );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        return authenticatedApiClient(request, retryCount + 1);
      }

      throw new Error("No valid admin session found");
    }
    if (isDev)
      console.log(
        `[authenticatedApiClient] Admin session found, making request to ${request.url}`,
      );

    const headers: any = {
      "Content-type": request.contentType
        ? request.contentType
        : "application/json",
      Authorization: `Bearer ${session?.access_token}`,
      Cookie: `${ADMIN_SESSION}=${session.access_token}`, // Forward the admin session cookie to API
    };

    // Add admin context headers
    if (session.user_id) {
      headers["X-Admin-User-ID"] = session.user_id;
    }

    const config = {
      method: "GET",
      headers,
      withCredentials: true,
      ...request,
    };

    return await axios(config);
  } catch (error: any) {
    if (isDev)
      console.log(
        `[authenticatedApiClient] Error on attempt ${retryCount + 1}:`,
        error.message,
      );
    // If it's a session error and we haven't exhausted retries, try again
    if (
      error.message === "No valid admin session found" &&
      retryCount < maxRetries
    ) {
      if (isDev)
        console.log(
          `[authenticatedApiClient] Retrying due to session error in ${retryDelay * (retryCount + 1)}ms...`,
        );
      await new Promise((resolve) =>
        setTimeout(resolve, retryDelay * (retryCount + 1)),
      );
      return authenticatedApiClient(request, retryCount + 1);
    }
    throw error;
  }
};

export default authenticatedApiClient;

// Response helpers
export const successResponse = (data: any, message?: string, meta?: any) => ({
  success: true,
  data,
  message,
  meta,
});

export const unauthorizedResponse = (message = "Unauthorized") => ({
  success: false,
  message,
  status: 401,
});

export const notFoundResponse = (message = "Not found") => ({
  success: false,
  message,
  status: 404,
});

export const methodNotAllowedResponse = (message = "Method not allowed") => ({
  success: false,
  message,
  status: 405,
});

export const badRequestResponse = (message = "Bad request") => ({
  success: false,
  message,
  status: 400,
});

export const handleError = (error: any) => {
  console.error("API Error:", error);
  return {
    success: false,
    message: error?.message || "An unexpected error occurred",
    status: error?.status || 500,
  };
};
