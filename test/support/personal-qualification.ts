// Private fixed-query experiment. No source discovery or product imports.
import { DatabaseSync, constants, type StatementSync } from 'node:sqlite';
import type { CanaryScratch } from './personal-canary.js';

export type Qualification = Readonly<{
  structure: 'accepted' | 'unsupported';
  sample: 'present' | 'absent' | null;
  idText: boolean | null; cwdText: boolean | null;
  idNull: boolean | null; cwdNull: boolean | null;
}>;
type Phase = 'structure' | 'columns' | 'sample';
export type QualificationTest = (phase: Phase, attempt: (sql: string) => void) => void;
const statements = Object.freeze({
  structure: "PRAGMA main.table_list('threads');",
  // Approved projection: defaults never become result columns.
  columns: "SELECT cid, name, type, hidden FROM pragma_table_xinfo('threads', 'main') LIMIT 64;",
  sample: 'SELECT typeof(id), typeof(cwd), id IS NULL, cwd IS NULL FROM main.threads LIMIT 1;',
});
const unsupported = (): Qualification => ({ structure: 'unsupported', sample: null,
  idText: null, cwdText: null, idNull: null, cwdNull: null });
function refuse(): never {
  const error = new Error('Qualification refused'); error.stack = 'QualificationRefusal'; throw error;
}

// The connection never escapes. Even synthetic hooks receive only the fixed-text gate.
// SQLite authorizers cannot distinguish SELECT id from typeof(id) by column alone;
// exact statement identity and phase-scoped authorizers are both required.
export function inspectQualificationAnalysis(scratch: CanaryScratch, test?: QualificationTest): Qualification {
  let db: DatabaseSync | undefined;
  try {
    scratch.entries();
    db = new DatabaseSync(scratch.sqliteLocation(), { readOnly: true, allowExtension: false,
      defensive: true, timeout: 0, enableDoubleQuotedStringLiterals: false,
      limits: { length: 1024 * 1024, sqlLength: 4096, column: 512, attach: 0 } });
    db.exec('PRAGMA trusted_schema=OFF; PRAGMA query_only=ON');
    const prepare = (phase: Phase, sql: string): StatementSync => {
      if (sql !== statements[phase]) refuse();
      db!.setAuthorizer((action, first, second, database, trigger) => {
        if (trigger !== null) return constants.SQLITE_DENY;
        if (phase === 'structure') return action === constants.SQLITE_PRAGMA &&
          first === 'table_list' && second === 'threads' && database === 'main'
          ? constants.SQLITE_OK : constants.SQLITE_DENY;
        if (action === constants.SQLITE_SELECT) return constants.SQLITE_OK;
        if (phase === 'columns') {
          if (action === constants.SQLITE_PRAGMA && first === 'table_xinfo' &&
              second === 'threads' && database === 'main') return constants.SQLITE_OK;
          if (action === constants.SQLITE_READ && database === 'main' && first === 'pragma_table_xinfo' &&
              ['cid','name','type','hidden'].includes(second ?? '')) return constants.SQLITE_OK;
        } else {
          if (action === constants.SQLITE_FUNCTION && second === 'typeof') return constants.SQLITE_OK;
          if (action === constants.SQLITE_READ && database === 'main' && first === 'threads' &&
              ['id','cwd'].includes(second ?? '')) return constants.SQLITE_OK;
        }
        return constants.SQLITE_DENY;
      });
      return db!.prepare(sql);
    };
    const query = (phase: Phase): StatementSync => {
      test?.(phase, sql => { prepare(phase, sql); });
      return prepare(phase, statements[phase]);
    };
    const tables = query('structure').iterate();
    let table: Record<string, unknown> | undefined;
    try {
      table = tables.next().value;
      if (!tables.next().done) return unsupported();
    } finally { tables.return?.(); }
    if (!table || table.schema !== 'main' || table.name !== 'threads' || table.type !== 'table' ||
        !Number.isInteger(table.ncol) || Number(table.ncol) < 2 || Number(table.ncol) > 64 ||
        ![0,1].includes(Number(table.wr)) || ![0,1].includes(Number(table.strict))) return unsupported();
    const columns = query('columns').all();
    if (columns.length !== table.ncol || columns.some((column, index) => column.cid !== index ||
        typeof column.name !== 'string' || typeof column.type !== 'string' || column.hidden !== 0)) return unsupported();
    for (const name of ['id','cwd']) {
      const matches = columns.filter(column => column.name === name);
      if (matches.length !== 1 || String(matches[0]!.type).trim().toUpperCase() !== 'TEXT') return unsupported();
    }
    const sample = query('sample').get();
    if (!sample) return { structure: 'accepted', sample: 'absent',
      idText: null, cwdText: null, idNull: null, cwdNull: null };
    const idType = sample['typeof(id)'], cwdType = sample['typeof(cwd)'];
    const idNull = sample['id IS NULL'], cwdNull = sample['cwd IS NULL'];
    const storageTypes = ['null','text','integer','real','blob'];
    if (!storageTypes.includes(String(idType)) || !storageTypes.includes(String(cwdType)) ||
        ![0,1].includes(Number(idNull)) || ![0,1].includes(Number(cwdNull)) ||
        (idType === 'null') !== (idNull === 1) || (cwdType === 'null') !== (cwdNull === 1)) refuse();
    return { structure: 'accepted', sample: 'present', idText: idType === 'text',
      cwdText: cwdType === 'text', idNull: idNull === 1, cwdNull: cwdNull === 1 };
  } catch { return refuse(); }
  finally { if (db) { try { db.close(); } catch { refuse(); } } }
}
