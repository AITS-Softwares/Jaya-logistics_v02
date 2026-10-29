import { AsyncLocalStorage } from 'node:async_hooks';

// One scope per HTTP request. Never share branch assignments between users.
const storage = globalThis.__jayaBranchContext ||= new AsyncLocalStorage();
export const branchContext = storage;

export function branchDenied(message = 'This record is outside your assigned branches.') {
  const error = new Error(`Branch access denied: ${message}`);
  error.status = 403;
  error.code = 'BRANCH_ACCESS_DENIED';
  return error;
}
