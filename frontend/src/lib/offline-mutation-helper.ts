// Offline mutation infra removed. Pass-through shim retained so callers can
// keep their existing structure while always running mutations online.

export type OfflineResult<T> = T;

export function isOfflineResult(_result: unknown): boolean {
  return false;
}

export async function handleOfflineMutation<T>(
  fn: () => Promise<T>,
  _opts?: unknown,
): Promise<T> {
  return fn();
}
