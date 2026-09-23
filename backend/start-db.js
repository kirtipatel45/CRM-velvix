import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '.mongo-data');
if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath, { recursive: true });
}

// Clean stale locks
['mongod.lock', 'WiredTiger.lock'].forEach((f) => {
  const p = path.join(dbPath, f);
  if (fs.existsSync(p)) {
    try {
      fs.unlinkSync(p);
      console.log(`Cleaned lock file: ${f}`);
    } catch (_) {}
  }
});

// Find mongod binary
const findMongodExe = () => {
  const cacheDir = path.join(os.homedir(), '.cache', 'mongodb-binaries');
  if (fs.existsSync(cacheDir)) {
    const files = fs.readdirSync(cacheDir);
    const exe = files.find((f) => f.startsWith('mongod') && f.endsWith('.exe'));
    if (exe) return path.join(cacheDir, exe);
  }
  return 'mongod';
};

const mongodPath = findMongodExe();
console.log(`Starting MongoDB Server on 127.0.0.1:27017...`);
console.log(`Binary: ${mongodPath}`);
console.log(`Database Path: ${dbPath}`);

const mongod = spawn(mongodPath, [
  '--dbpath', dbPath,
  '--port', '27017',
  '--bind_ip', '127.0.0.1',
  '--setParameter', 'diagnosticDataCollectionEnabled=false',
], { stdio: 'inherit' });

mongod.on('error', (err) => {
  console.error('Failed to start mongod:', err.message);
});

mongod.on('exit', (code, signal) => {
  console.log(`MongoDB process exited with code ${code} signal ${signal}`);
});

process.on('SIGINT', () => {
  mongod.kill('SIGINT');
  process.exit();
});

process.on('SIGTERM', () => {
  mongod.kill('SIGTERM');
  process.exit();
});
