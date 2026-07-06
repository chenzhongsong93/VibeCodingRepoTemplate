export function activeConds(config) {
  const comps = config.components || [];
  const set = new Set(comps);
  if (set.has('docker') || set.has('three-tier-test')) set.add('full-workflow');
  if (config.remote && config.remote !== 'none') set.add('remote-hook');
  return [...set];
}

export function stripConditionals(text, active) {
  const activeSet = new Set(active);
  // IF/ELSE blocks first. \n? after each marker consumes the marker's own
  // trailing newline so stripped blocks leave no dangling blank line and
  // kept content (including paragraph breaks) is never modified.
  let out = text.replace(
    /<!--IF:([\w-]+)-->\n?([\s\S]*?)<!--ELSE-->\n?([\s\S]*?)<!--\/IF:\1-->\n?/g,
    (m, cond, ifBody, elseBody) =>
      activeSet.has(cond) ? ifBody : elseBody
  );
  // IF-only blocks
  out = out.replace(
    /<!--IF:([\w-]+)-->\n?([\s\S]*?)<!--\/IF:\1-->\n?/g,
    (m, cond, body) => (activeSet.has(cond) ? body : '')
  );
  return out;
}
