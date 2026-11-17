import { readdirSync } from 'node:fs';
import { posix } from 'node:path';
import { inside } from './model.mjs';

// A selector changes the command itself: tools receive the exact enumerated
// filenames, never a broad directory whose real reads exceed this contract.
export function materializeCommand(root, check) {
  if (check.kind !== 'command' || !check.inputSelection) return check;
  const selection = check.inputSelection, cwd = check.cwd || '.', files = [];
  const excluded = selection.excludePaths.map(path => posix.normalize(posix.join(cwd, path)));
  function walk(path) {
    for (const entry of readdirSync(inside(root, path), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const child = posix.join(path, entry.name);
      if ((entry.isDirectory() || entry.isSymbolicLink()) && (selection.excludeDirectoryNames.includes(entry.name) || excluded.includes(child))) continue;
      if (entry.isSymbolicLink()) throw new Error(`Python源输入拒绝symlink: ${child}`);
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile() && /\.pyi?$/.test(entry.name)) files.push(child);
    }
  }
  walk(cwd);
  if (!files.length) throw new Error(`无Python源文件输入: ${check.id}；请核对inputSelection/cwd或声明实际项目检查`);
  return { ...check, argv: [...check.argv, '--', ...files.map(path => posix.relative(cwd, path))], selectedInputs: files };
}
