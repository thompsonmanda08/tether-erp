import { describe, it, expect, vi, afterEach } from "vitest";
import {
  fromBackend,
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
  methodNotAllowedResponse,
  handleError,
  badRequestResponse,
} from "@/lib/response-helpers";

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// fromBackend
// ---------------------------------------------------------------------------

describe("fromBackend", () => {
  it("maps a successful backend response", () => {
    const axiosResponse = {
      data: { success: true, message: "OK", data: { id: "1" }, pagination: null },
    };
    const result = fromBackend(axiosResponse);
    expect(result.success).toBe(true);
    expect(result.message).toBe("OK");
    expect(result.data).toEqual({ id: "1" });
  });

  it("maps a failed backend response", () => {
    const axiosResponse = {
      data: { success: false, message: "Not found", data: null },
    };
    const result = fromBackend(axiosResponse);
    expect(result.success).toBe(false);
    expect(result.message).toBe("Not found");
    expect(result.data).toBeNull();
  });

  it("defaults success to false when body.success is missing", () => {
    const axiosResponse = { data: {} };
    const result = fromBackend(axiosResponse);
    expect(result.success).toBe(false);
  });

  it("defaults data to null when body.data is missing", () => {
    const axiosResponse = { data: { success: true } };
    const result = fromBackend(axiosResponse);
    expect(result.data).toBeNull();
  });

  it("defaults message to empty string when body.message is missing", () => {
    const axiosResponse = { data: { success: true } };
    const result = fromBackend(axiosResponse);
    expect(result.message).toBe("");
  });

  it("overrides message with the provided message argument", () => {
    const axiosResponse = {
      data: { success: true, message: "Backend message" },
    };
    const result = fromBackend(axiosResponse, "Custom message");
    expect(result.message).toBe("Custom message");
  });

  it("preserves pagination from backend", () => {
    const pagination = { page: 1, total: 100, totalPages: 10, hasNext: true, hasPrev: false };
    const axiosResponse = {
      data: { success: true, data: [], pagination },
    };
    const result = fromBackend(axiosResponse);
    expect(result.pagination).toEqual(pagination);
  });

  it("handles null axiosResponse gracefully", () => {
    const result = fromBackend(null);
    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.message).toBe("");
  });

  it("handles undefined axiosResponse gracefully", () => {
    const result = fromBackend(undefined);
    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// successResponse
// ---------------------------------------------------------------------------

describe("successResponse", () => {
  it("returns success: true with provided data and message", () => {
    const result = successResponse({ id: "1" }, "Created");
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: "1" });
    expect(result.message).toBe("Created");
  });

  it("uses default message when none provided", () => {
    const result = successResponse(null);
    expect(result.message).toBe("Action completed successfully");
  });

  it("accepts null data", () => {
    const result = successResponse(null, "Done");
    expect(result.data).toBeNull();
    expect(result.success).toBe(true);
  });

  it("includes pagination when provided", () => {
    const pagination = { page: 1, total: 50, totalPages: 5, hasNext: true, hasPrev: false };
    const result = successResponse([], "Listed", pagination);
    expect(result.pagination).toEqual(pagination);
  });

  it("pagination is undefined when not provided", () => {
    const result = successResponse(null);
    expect(result.pagination).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// unauthorizedResponse
// ---------------------------------------------------------------------------

describe("unauthorizedResponse", () => {
  it("returns success: false with default message", () => {
    const result = unauthorizedResponse();
    expect(result.success).toBe(false);
    expect(result.message).toBe("Unauthorized");
    expect(result.data).toBeNull();
  });

  it("accepts a custom message", () => {
    const result = unauthorizedResponse("Session expired");
    expect(result.message).toBe("Session expired");
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// notFoundResponse
// ---------------------------------------------------------------------------

describe("notFoundResponse", () => {
  it("returns success: false with the provided message", () => {
    const result = notFoundResponse("Resource not found");
    expect(result.success).toBe(false);
    expect(result.message).toBe("Resource not found");
    expect(result.data).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// methodNotAllowedResponse
// ---------------------------------------------------------------------------

describe("methodNotAllowedResponse", () => {
  it("returns success: false with 'Method not allowed' message", () => {
    const result = methodNotAllowedResponse();
    expect(result.success).toBe(false);
    expect(result.message).toBe("Method not allowed");
    expect(result.data).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// badRequestResponse
// ---------------------------------------------------------------------------

describe("badRequestResponse", () => {
  it("returns success: false with the provided message", () => {
    const result = badRequestResponse("Invalid input");
    expect(result.success).toBe(false);
    expect(result.message).toBe("Invalid input");
    expect(result.data).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// handleError
// ---------------------------------------------------------------------------

describe("handleError", () => {
  // Suppress console.error output during tests
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns unauthorizedResponse for 401 status", () => {
    const error = {
      response: {
        status: 401,
        data: { message: "Token expired" },
      },
    };
    const result = handleError(error, "GET", "/api/resource");
    expect(result.success).toBe(false);
    expect(result.message).toBe("Token expired");
  });

  it("uses fallback message for 401 when no response message", () => {
    const error = { response: { status: 401, data: {} } };
    const result = handleError(error, "GET", "/api/resource");
    expect(result.message).toMatch(/authentication required/i);
  });

  it("returns 403 response with permission message", () => {
    const error = {
      response: {
        status: 403,
        data: { message: "Access denied" },
      },
    };
    const result = handleError(error, "POST", "/api/resource");
    expect(result.success).toBe(false);
    expect(result.message).toBe("Access denied");
    expect(result.data).toBeNull();
  });

  it("returns feature_locked data for 403 with featureName", () => {
    const error = {
      response: {
        status: 403,
        data: { message: "Feature locked", featureName: "advanced_reports" },
      },
    };
    const result = handleError(error, "GET", "/api/resource");
    expect(result.data).toEqual({
      featureName: "advanced_reports",
      errorType: "feature_locked",
    });
  });

  it("returns null data for 403 without featureName", () => {
    const error = {
      response: { status: 403, data: { message: "Forbidden" } },
    };
    const result = handleError(error, "GET", "/api/resource");
    expect(result.data).toBeNull();
  });

  it("returns limit_reached data for 400 with resourceType", () => {
    const error = {
      response: {
        status: 400,
        data: {
          message: "Limit reached",
          resourceType: "purchase_order",
          currentUsage: 10,
          limit: 10,
        },
      },
    };
    const result = handleError(error, "POST", "/api/resource");
    expect(result.success).toBe(false);
    expect(result.data).toEqual({
      errorType: "limit_reached",
      resourceType: "purchase_order",
      currentUsage: 10,
      limit: 10,
    });
    expect(result.message).toBe("Limit reached");
  });

  it("does not return limit_reached for 400 without resourceType", () => {
    const error = {
      response: {
        status: 400,
        data: { message: "Bad input" },
      },
    };
    const result = handleError(error, "POST", "/api/resource");
    expect(result.data).toBeNull();
    expect(result.message).toBe("Bad input");
  });

  it("returns generic error for 500 status", () => {
    const error = {
      response: {
        status: 500,
        data: { message: "Internal server error" },
      },
    };
    const result = handleError(error, "GET", "/api/resource");
    expect(result.success).toBe(false);
    expect(result.message).toBe("Internal server error");
    expect(result.data).toBeNull();
  });

  it("uses fallback generic message when no error response data", () => {
    const error = { message: "Network error" };
    const result = handleError(error, "GET", "/api/resource");
    expect(result.success).toBe(false);
    expect(result.message).toBe("Network error");
  });

  it("uses ultimate fallback message when error has no message fields", () => {
    const result = handleError({}, "GET", "/api/resource");
    expect(result.success).toBe(false);
    expect(result.message).toBe("Oops! Something went wrong. Please try again.");
  });

  it("defaults status to 500 when error.response.status is absent", () => {
    const error = { response: { data: { message: "Unknown" } } };
    const result = handleError(error, "GET", "/api/resource");
    // status defaults to 500, hits generic handler
    expect(result.success).toBe(false);
    expect(result.message).toBe("Unknown");
  });

  it("prefers response.data.message over response.data.error", () => {
    const error = {
      response: {
        status: 500,
        data: { message: "Primary message", error: "Secondary error" },
      },
    };
    const result = handleError(error, "GET", "/api/resource");
    expect(result.message).toBe("Primary message");
  });

  it("falls back to response.data.error when message is absent", () => {
    const error = {
      response: {
        status: 500,
        data: { error: "Error field value" },
      },
    };
    const result = handleError(error, "GET", "/api/resource");
    expect(result.message).toBe("Error field value");
  });

  it("calls console.error with endpoint info", () => {
    const error = { response: { status: 500, data: {} } };
    handleError(error, "DELETE", "/api/test");
    expect(console.error).toHaveBeenCalled();
  });
});
