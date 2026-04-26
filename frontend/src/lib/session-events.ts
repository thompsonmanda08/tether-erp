/**
 * Session expiry event system.
 * Server actions run on the server and cannot dispatch browser events,
 * so hooks propagate the 401 status via a tagged Error, and the global
 * QueryCache / MutationCache onError fires this event so the modal can
 * show from anywhere in the app.
 */

export const SESSION_EXPIRED_EVENT = "tether:session-expired";

export function dispatchSessionExpired() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  }
}

/**
 * Unwrap a server-action APIResponse result.
 * Throws a status-tagged Error on failure so the global cache
 * error handler can detect 401 and trigger the session-expired modal.
 */
export function unwrapResult<T>(result: {
  success: boolean;
  message?: string;
  status?: number;
  data?: T;
}): T {
  if (!result.success) {
    const err: any = new Error(result.message || "Request failed");
    err.status = result.status ?? 500;
    throw err;
  }
  return result.data as T;
}
