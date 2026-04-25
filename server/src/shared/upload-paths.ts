import path from 'node:path';

export function materialsUploadDir() {
  const cwd = process.cwd();
  const root = path.basename(cwd) === 'server' ? cwd : path.join(cwd, 'server');
  return path.resolve(root, 'uploads', 'materials');
}

export function submissionsUploadDir() {
  const cwd = process.cwd();
  const root = path.basename(cwd) === 'server' ? cwd : path.join(cwd, 'server');
  return path.resolve(root, 'uploads', 'submissions');
}
