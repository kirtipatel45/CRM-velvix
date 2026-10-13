import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory cache for job search results
const jobspyCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache

// Find available Python executable
function getPythonExecutable() {
  if (process.env.PYTHON_PATH && fs.existsSync(process.env.PYTHON_PATH)) {
    return process.env.PYTHON_PATH;
  }
  
  // Standard Windows Python installations
  const potentialPaths = [
    process.env.PYTHON_PATH,
    'C:\\Users\\yagna\\AppData\\Local\\Python\\pythoncore-3.14-64\\python.exe',
    'py',
    'python3',
    'python',
  ].filter(Boolean);

  for (const p of potentialPaths) {
    if (p.includes('\\') || p.includes('/')) {
      if (fs.existsSync(p)) return p;
    }
  }

  return process.env.PYTHON_PATH || 'py';
}

/**
 * Executes python-jobspy search with resume skill matching
 * @param {Object} options Search options
 * @returns {Promise<Object>} Formatted job search results
 */
export async function searchJobsWithJobSpy(options = {}) {
  const {
    query = '',
    skills = [],
    date_posted = 'month',
    remote_jobs_only = false,
    employment_types = 'FULLTIME',
    results_wanted = 15,
    sites = ['indeed', 'linkedin', 'glassdoor', 'zip_recruiter'],
  } = options;

  const normalizedSkills = Array.isArray(skills)
    ? skills
    : typeof skills === 'string'
    ? skills.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const cacheKey = JSON.stringify({
    query: query.trim().toLowerCase(),
    skills: normalizedSkills.sort(),
    date_posted,
    remote_jobs_only: String(remote_jobs_only),
    employment_types,
  });

  // Check cache
  const cached = jobspyCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { ...cached.data, fromCache: true };
  }

  const scriptPath = path.join(__dirname, 'jobspy_search.py');
  const pythonCmd = getPythonExecutable();

  const payload = {
    query: query.trim(),
    skills: normalizedSkills,
    date_posted,
    remote_jobs_only: String(remote_jobs_only) === 'true',
    employment_types,
    results_wanted: Number(results_wanted) || 15,
    sites,
    location: 'USA',
  };

  return new Promise((resolve, reject) => {
    const isWindowsPyLauncher = pythonCmd === 'py';
    const pyArgs = isWindowsPyLauncher ? ['-3', scriptPath] : [scriptPath];

    const child = spawn(pythonCmd, pyArgs, {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdoutData = '';
    let stderrData = '';

    // Safety timeout: 30 seconds
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('JobSpy search timed out after 30 seconds.'));
    }, 30000);

    child.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString('utf-8');
    });

    child.stderr.on('data', (chunk) => {
      stderrData += chunk.toString('utf-8');
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      console.error('JobSpy process error:', err);
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0 && !stdoutData.trim()) {
        console.error('JobSpy exited with error code:', code, stderrData);
        return reject(new Error(stderrData || `JobSpy exited with code ${code}`));
      }

      try {
        const parsed = JSON.parse(stdoutData.trim());
        if (!parsed.success) {
          return reject(new Error(parsed.error || 'JobSpy scraping failed'));
        }

        // Cache the successful result
        jobspyCache.set(cacheKey, { data: parsed, timestamp: Date.now() });

        // Maintain cache size
        if (jobspyCache.size > 150) {
          const oldestKey = jobspyCache.keys().next().value;
          jobspyCache.delete(oldestKey);
        }

        resolve({ ...parsed, fromCache: false });
      } catch (err) {
        console.error('Failed to parse JobSpy JSON output:', err, stdoutData);
        reject(new Error(`Invalid response from JobSpy: ${err.message}`));
      }
    });

    // Send payload via stdin
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}
