import {test as base, expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

/** Every test gets a real local HTTP server and a fresh, separate SQLite DB. */
export const test = base.extend<{demoURL: string}>({
  demoURL: async ({}, use) => {
    const directory = await mkdtemp(join(tmpdir(), 'nomi-e2e-'));
    const child = spawn(process.env.PYTHON ?? 'python3',
      ['demo_server.py', '--port', '0', '--data', join(directory, 'demo.sqlite3')],
      {cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe']});
    let diagnostics = '';
    child.stderr.on('data', chunk => { diagnostics += String(chunk); });
    try {
      const url = await new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Demo startup timed out: ${diagnostics}`)), 10_000);
        child.once('error', error => { clearTimeout(timer); reject(error); });
        child.once('exit', code => { clearTimeout(timer); reject(new Error(`Demo exited ${code}: ${diagnostics}`)); });
        child.stdout.on('data', chunk => {
          const match = String(chunk).match(/Nomi demo: (http:\/\/127\.0\.0\.1:\d+)/);
          if (match) { clearTimeout(timer); resolve(match[1]); }
        });
      });
      await use(url);
    } finally {
      if (child.exitCode === null && child.signalCode === null) {
        const stopped = new Promise<void>(resolve => child.once('exit', () => resolve()));
        child.kill('SIGTERM');
        await stopped;
      }
      await rm(directory, {recursive: true, force: true});
    }
  },
});

export {expect};
