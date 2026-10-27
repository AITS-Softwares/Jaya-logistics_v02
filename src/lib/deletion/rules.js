import { deletionBlockers } from './linkGraph';

export function isDeletionAdmin(user) {
  return user?.type === 'company' || user?.roles?.includes('Admin') === true;
}

export async function evaluateDeletion(graph, companyId, session) {
  const blockers = await deletionBlockers(graph, companyId, session);
  return { impact: graph.map(({ type, id, no, label, depth }) => ({ type, id, no, label, depth })), blockers, canConfirm: blockers.length === 0 };
}
