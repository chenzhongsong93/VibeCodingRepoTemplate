export function activeConds(config) {
  const comps = config.components || [];
  const set = new Set(comps);
  if (set.has('docker') || set.has('three-tier-test')) set.add('full-workflow');
  if (config.remote && config.remote !== 'none') set.add('remote-hook');
  return [...set];
}

export function stripConditionals(text, active) {
  const activeSet = new Set(active);
  // IF/ELSE blocks first (condition names may contain hyphens, e.g. full-workflow)
  let out = text.replace(
    /<!--IF:([\w-]+)-->([\s\S]*?)<!--ELSE-->([\s\S]*?)<!--\/IF:\1-->/g,
    (m, cond, ifBody, elseBody) =>
      activeSet.has(cond) ? ifBody : elseBody
  );
  // IF-only blocks
  out = out.replace(
    /<!--IF:([\w-]+)-->([\s\S]*?)<!--\/IF:\1-->/g,
    (m, cond, body) => (activeSet.has(cond) ? body : '')
  );
  // Collapse blank lines left by stripping marker-only lines
  return out.replace(/\n{2,}/g, '\n');
}
