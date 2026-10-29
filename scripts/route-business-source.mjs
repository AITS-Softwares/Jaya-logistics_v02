// Business-handler unit tests inject their own authentication/DB. Branch scope
// is exercised separately in test-branch-access.mjs; unwrap only its outer
// request boundary so existing transition/amount regressions test the same body.
export function unwrapBranchHandlers(source) {
  return source
    .replace(/^export const (GET|POST|PUT|PATCH|DELETE) = withBranchAccess\(branchHandler\1\);\r?\n/gm, '')
    .replace(/^async function branchHandler(GET|POST|PUT|PATCH|DELETE)\b/gm, 'export async function $1')
    .replace(/^const branchHandler(GET|POST|PUT|PATCH|DELETE)\b/gm, 'export const $1');
}
