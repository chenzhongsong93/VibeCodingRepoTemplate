export function activeConds(config) {
  const comps = config.components || [];
  const set = new Set(comps);
  if (set.has('docker') || set.has('three-tier-test')) set.add('full-workflow');
  if (config.remote && config.remote !== 'none') set.add('remote-hook');
  if (set.has('dev-flow-skills')) set.add('agent-policy');
  return [...set];
}

// Match a conditional marker, capturing its kind and cond.
// Consumes the marker AND one trailing newline (so stripped blocks leave no
// dangling blank line; kept content is never modified).
const MARKER_RE = /<!--(IF:([\w-]+)|ELSE|\/IF:([\w-]+))-->\n?/g;

function stripOnce(text, activeSet) {
  // Stack-based parser: handles arbitrary nesting of IF/ELSE and IF-only
  // blocks in a single pass. The previous single-regex approach mis-paired
  // an outer IF/ELSE whose IF-body contained a nested IF/ELSE (the non-greedy
  // `<!--ELSE-->` match grabbed the inner ELSE). Tokenizing + tree building
  // makes pairing unambiguous.
  // Root frame: ifBody collects top-level text.
  const root = { ifBody: '', elseBody: '', hasElse: false, cond: null, parent: null };
  let frame = root;
  let last = 0; // index of last consumed char in text

  for (const m of text.matchAll(MARKER_RE)) {
    const token = m[0];
    const ifCond = m[2];
    const closeCond = m[3];
    // text between last marker and this one belongs to current branch buffer
    if (frame.hasElse) frame.elseBody += text.slice(last, m.index);
    else frame.ifBody += text.slice(last, m.index);
    last = m.index + token.length;

    if (ifCond) {
      // <!--IF:cond--> : push new frame
      const child = { ifBody: '', elseBody: '', hasElse: false, cond: ifCond, parent: frame };
      frame = child;
    } else if (m[1] === 'ELSE' && frame.cond) {
      frame.hasElse = true;
    } else if (closeCond && frame.cond === closeCond) {
      // <!--/IF:cond--> : resolve and pop
      const resolved = activeSet.has(frame.cond)
        ? frame.ifBody
        : (frame.hasElse ? frame.elseBody : '');
      frame = frame.parent;
      if (frame.hasElse) frame.elseBody += resolved;
      else frame.ifBody += resolved;
    } else {
      // Unmatched marker (stray <!--ELSE--> or </IF> with no open):
      // treat as literal text to avoid silent data loss.
      if (frame.hasElse) frame.elseBody += token;
      else frame.ifBody += token;
    }
  }
  // trailing text after last marker
  if (frame.hasElse) frame.elseBody += text.slice(last);
  else frame.ifBody += text.slice(last);
  return root.ifBody;
}

export function stripConditionals(text, active) {
  const activeSet = new Set(active);
  // Loop to handle nested IF blocks: when an outer block is kept, its body
  // may still contain inner IF markers that need stripping. Iterate until
  // stable. Terminates because each pass either removes a marker layer or
  // leaves the text unchanged.
  let prev;
  let out = text;
  do {
    prev = out;
    out = stripOnce(prev, activeSet);
  } while (out !== prev);
  return out;
}
