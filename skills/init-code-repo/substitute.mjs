const VARS = {
  PROJECT_NAME: 'projectName',
  ONE_LINE: 'oneLine',
  YEAR: 'year',
  COMMIT_REGEX: 'commitRegex',
  DEV_BRANCH: 'devBranch',
  MAIN_BRANCH: 'mainBranch',
  FIX_BRANCH: 'fixBranch',
  RELEASE_PREFIX: 'releasePrefix',
  POLICY_ID: 'policyId',
  PI_FORMAT: 'piFormat',
  PI_FIRST: 'piFirst',
  VERIFY_FAST_CMD: 'verifyFastCmd',
  UPSTREAM_REPO: 'upstreamRepo',
  UPSTREAM_BASELINE: 'upstreamBaseline',
  UPSTREAM_LICENSE: 'upstreamLicense',
};

export function substitute(text, ctx) {
  return text.replace(/\{\{(\w+)\}\}/g, (m, name) => {
    const key = VARS[name];
    return key && ctx[key] !== undefined ? ctx[key] : m;
  });
}
