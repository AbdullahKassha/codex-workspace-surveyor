// Invented M2a.1 fixture construction only. Never a Codex schema adapter.
import { copyFileSync, constants, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export const fixtureNames = ['standalone.sqlite', 'wal.sqlite', 'metadata.json'] as const;
export const privacyCanary = 'SYNTHETIC_PRIVATE_CONTENT_CANARY';
const inventedSchema = 'CREATE TABLE invented_threads(id TEXT PRIMARY KEY, cwd TEXT, private_note TEXT)';

export function constructFixtures(builder: string, sources: string): void {
  for (const name of ['standalone.sqlite', 'wal.sqlite'] as const) {
    const path = join(builder, name);
    const db = new DatabaseSync(path, { allowExtension: false, defensive: true });
    try {
      db.exec(inventedSchema);
      db.prepare('INSERT INTO invented_threads VALUES (?, ?, ?)')
        .run('synthetic-base', 'C:\\Synthetic\\Base', privacyCanary);
      if (name === 'wal.sqlite') {
        db.exec('PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0');
        db.prepare('INSERT INTO invented_threads VALUES (?, ?, ?)')
          .run('synthetic-wal-only', 'C:\\Synthetic\\Wal', privacyCanary);
      }
      // Fixture-building connection is idle. Copy before close removes its WAL.
      // Designated sources are raw copies and are NEVER opened through SQLite.
      copyFileSync(path, join(sources, name), constants.COPYFILE_EXCL);
      if (name === 'wal.sqlite') {
        for (const suffix of ['-wal', '-shm']) {
          copyFileSync(path + suffix, join(sources, name + suffix), constants.COPYFILE_EXCL);
        }
      }
    } finally {
      db.close();
    }
  }
  const json = JSON.stringify({
    synthetic: true, project: 'synthetic-project', root: 'C:\\Synthetic\\Base',
    private_note: privacyCanary,
  });
  writeFileSync(join(builder, 'metadata.json'), json, { flag: 'wx' });
  copyFileSync(join(builder, 'metadata.json'), join(sources, 'metadata.json'), constants.COPYFILE_EXCL);
}

// Only analysis paths produced by the owning harness reach this function.
export function inspectFixtureAnalysis(paths: readonly string[]): void {
  for (const path of paths) {
    if (path.endsWith('.json')) {
      const value: unknown = JSON.parse(readFileSync(path, 'utf8'));
      if (typeof value !== 'object' || value === null ||
          !('synthetic' in value) || value.synthetic !== true ||
          !('project' in value) || value.project !== 'synthetic-project') {
        throw new Error('Unsupported invented JSON');
      }
    } else {
      const db = new DatabaseSync(path, { readOnly: true, allowExtension: false, defensive: true, timeout: 0 });
      try {
        db.exec('PRAGMA trusted_schema=OFF; PRAGMA query_only=ON');
        const table = db.prepare("SELECT type, sql FROM sqlite_schema WHERE name = 'invented_threads'").get();
        if (table?.type !== 'table' || table.sql !== inventedSchema) throw new Error('Unsupported invented table');
        const rows = db.prepare('SELECT id, cwd FROM invented_threads ORDER BY id LIMIT 3').all();
        const expected = path.endsWith('wal.sqlite') ? 2 : 1;
        if (rows.length !== expected || rows[0]?.id !== 'synthetic-base' ||
            rows[0]?.cwd !== 'C:\\Synthetic\\Base' ||
            (expected === 2 && (rows[1]?.id !== 'synthetic-wal-only' || rows[1]?.cwd !== 'C:\\Synthetic\\Wal'))) {
          throw new Error('Unsupported invented metadata');
        }
      } finally {
        db.close();
      }
    }
  }
}
