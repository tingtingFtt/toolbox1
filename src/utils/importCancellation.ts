/**
 * Global import cancellation controller and state manager.
 * Allows terminating active batch import and directory sync processes immediately.
 */

let activeController: AbortController | null = null;
let isAbortedFlag = false;

export function createImportAbortController(): AbortController {
  if (activeController) {
    try {
      activeController.abort();
    } catch {
      // ignore
    }
  }
  activeController = new AbortController();
  isAbortedFlag = false;
  return activeController;
}

export function abortActiveImport(): void {
  isAbortedFlag = true;
  if (activeController) {
    try {
      activeController.abort();
    } catch {
      // ignore
    }
    activeController = null;
  }
}

export function isImportAborted(): boolean {
  return isAbortedFlag || Boolean(activeController?.signal.aborted);
}

export function getActiveImportSignal(): AbortSignal | null {
  return activeController ? activeController.signal : null;
}

export function resetImportCancellation(): void {
  isAbortedFlag = false;
  activeController = null;
}
