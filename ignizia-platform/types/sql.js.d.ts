declare module 'sql.js' {
  export interface Database {
    run(sql: string, params?: unknown[]): void;
    exec(sql: string, params?: unknown[]): { columns: string[]; values: unknown[][] }[];
    export(): Uint8Array;
    close(): void;
  }
  export default function initSqlJs(config?: unknown): Promise<{ Database: new (data?: Uint8Array) => Database }>;
}

declare module 'sql.js/dist/sql-wasm.js' {
  import initSqlJs from 'sql.js';
  export default initSqlJs;
}
