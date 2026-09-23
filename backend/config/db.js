import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import path from 'path';
import fs from 'fs';
import net from 'net';
import { spawn } from 'child_process';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mongodInstance = null;

const cleanupStaleLocks = (dbPath) => {
  try {
    const lockFiles = ['mongod.lock', 'WiredTiger.lock'];
    for (const file of lockFiles) {
      const filePath = path.join(dbPath, file);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up stale lock file: ${file}`);
        } catch (err) {
          // File may be locked by an active mongod process
        }
      }
    }
  } catch (e) {
    // Ignore cleanup errors
  }
};

const ensureDefaultAdmin = async () => {
  try {
    const User = (await import('../models/User.js')).default;
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      console.log('No admin user found. Creating default admin (admin@velvix.com / admin123)...');
      await User.create({
        name: 'Admin User',
        email: 'admin@velvix.com',
        password: 'admin123',
        role: 'admin',
      });
      console.log('Default admin created successfully.');
    }
  } catch (err) {
    console.warn('Admin check warning:', err.message);
  }
};

const isPortOpen = (port = 27017, host = '127.0.0.1', timeout = 400) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
};

const findMongodExe = () => {
  try {
    const cacheDir = path.join(os.homedir(), '.cache', 'mongodb-binaries');
    if (fs.existsSync(cacheDir)) {
      const files = fs.readdirSync(cacheDir);
      const exe = files.find((f) => f.startsWith('mongod') && f.endsWith('.exe'));
      if (exe) return path.join(cacheDir, exe);
    }
  } catch (_) {}
  return 'mongod';
};

const startBackgroundMongod = async (dbPath) => {
  cleanupStaleLocks(dbPath);
  const mongodPath = findMongodExe();
  console.log(`Auto-starting background MongoDB (${mongodPath}) on port 27017...`);

  try {
    const child = spawn(
      mongodPath,
      [
        '--dbpath', dbPath,
        '--port', '27017',
        '--bind_ip', '127.0.0.1',
        '--setParameter', 'diagnosticDataCollectionEnabled=false',
      ],
      { detached: true, stdio: 'ignore', windowsHide: true }
    );
    child.unref();
  } catch (spawnErr) {
    console.warn(`Direct spawn failed, attempting MongoMemoryServer: ${spawnErr.message}`);
    mongodInstance = await MongoMemoryServer.create({
      instance: { port: 27017, dbPath, storageEngine: 'wiredTiger' },
    });
  }

  // Wait up to 5 seconds for port 27017 to become ready
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 200));
    if (await isPortOpen(27017)) {
      console.log('MongoDB server is ready on port 27017.');
      return true;
    }
  }
  return false;
};

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crm-velvix';
  const dbPath = path.join(__dirname, '..', '.mongo-data');

  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }

  // If connecting to local MongoDB and port 27017 is not open, start it automatically
  const isLocalUri = uri.includes('127.0.0.1:27017') || uri.includes('localhost:27017');
  if (isLocalUri) {
    const portActive = await isPortOpen(27017);
    if (!portActive) {
      await startBackgroundMongod(dbPath);
    }
  }

  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    await ensureDefaultAdmin();
    return conn;
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}. Retrying with embedded fallback...`);
    cleanupStaleLocks(dbPath);
    if (!mongodInstance) {
      mongodInstance = await MongoMemoryServer.create({
        instance: { dbPath, storageEngine: 'wiredTiger' },
      });
    }
    const fallbackUri = mongodInstance.getUri();
    const dbUri = fallbackUri.endsWith('/') ? `${fallbackUri}crm-velvix` : `${fallbackUri}/crm-velvix`;
    const conn = await mongoose.connect(dbUri);
    console.log(`Fallback MongoDB Connected: ${dbUri}`);
    await ensureDefaultAdmin();
    return conn;
  }
};

export const closeDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongodInstance) {
      await mongodInstance.stop();
      mongodInstance = null;
    }
  } catch (err) {
    console.error('Error closing MongoDB connection:', err.message);
  }
};

// Graceful shutdown hooks for nodemon restarts and process termination
const handleExit = async () => {
  await closeDB();
};

process.once('SIGUSR2', async () => {
  await handleExit();
  process.kill(process.pid, 'SIGUSR2');
});

process.on('SIGINT', async () => {
  await handleExit();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await handleExit();
  process.exit(0);
});

export default connectDB;
