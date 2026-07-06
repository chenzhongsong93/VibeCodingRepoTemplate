const VARS = {
  PROJECT_NAME: 'projectName',
  ONE_LINE: 'oneLine',
  YEAR: 'year',
};

export function substitute(text, ctx) {
  return text.replace(/\{\{(\w+)\}\}/g, (m, name) => {
    const key = VARS[name];
    return key && ctx[key] !== undefined ? ctx[key] : m;
  });
}
