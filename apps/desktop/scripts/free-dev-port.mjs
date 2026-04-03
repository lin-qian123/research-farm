import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const PORT = '4173';
const PROJECT_MARKERS = [
  '/research-farm/node_modules/.bin/vite',
  'npm run dev -w @vibe-researching/desktop',
  'vite --host 127.0.0.1 --port 4173 --strictPort',
];

async function run(command, args) {
  return execFileAsync(command, args, { encoding: 'utf8' });
}

async function main() {
  let stdout = '';

  try {
    ({ stdout } = await run('lsof', ['-nP', '-iTCP:4173', '-sTCP:LISTEN', '-t']));
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 1) {
      process.exit(0);
    }
    throw error;
  }

  const pids = stdout
    .split(/\s+/)
    .map(value => value.trim())
    .filter(Boolean);

  if (pids.length === 0) {
    process.exit(0);
  }

  for (const pid of pids) {
    const { stdout: command } = await run('ps', ['-p', pid, '-o', 'command=']);
    const normalized = command.trim();
    const isProjectDevServer = PROJECT_MARKERS.some(marker => normalized.includes(marker));

    if (!isProjectDevServer) {
      console.error(`Port ${PORT} is occupied by a non-project process: ${normalized}`);
      console.error(`Stop it manually or change the dev port before retrying.`);
      process.exit(1);
    }

    await run('kill', [pid]);
    process.stdout.write(`Stopped stale dev server on port ${PORT} (pid ${pid}).\n`);
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
