import { fetchUniqueColumnValuesForTable } from '@/lib/onet/database';

export const dynamic = 'force-dynamic';

const TABLE_ID = 'skills';
const COLUMN_ID = 'element_name';

export default async function OnetValidationPage() {
  try {
    const result = await fetchUniqueColumnValuesForTable(TABLE_ID, COLUMN_ID);

    return (
      <main className="min-h-screen bg-background-light text-slate-900 dark:bg-background-dark dark:text-white p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <header className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">O*NET v2 Validation</h1>
            <p className="text-slate-600 dark:text-slate-300">
              Server-side validation of the official O*NET Database Services table.
            </p>
          </header>

          <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-card-light dark:bg-card-dark p-6">
            <h2 className="text-lg font-semibold mb-4">Validation Summary</h2>
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-white/70 dark:bg-slate-900/40">
                <dt className="text-slate-500 dark:text-slate-400">Source table</dt>
                <dd className="font-semibold text-base mt-1">{result.tableId}</dd>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-white/70 dark:bg-slate-900/40">
                <dt className="text-slate-500 dark:text-slate-400">Total rows scanned</dt>
                <dd className="font-semibold text-base mt-1">{result.totalRowsScanned.toLocaleString()}</dd>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-white/70 dark:bg-slate-900/40">
                <dt className="text-slate-500 dark:text-slate-400">Unique skills found</dt>
                <dd className="font-semibold text-base mt-1">{result.uniqueValues.length.toLocaleString()}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-card-light dark:bg-card-dark p-6">
            <h2 className="text-lg font-semibold mb-3">Canonical Unique Skill Names (A-Z)</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              Deduplicated by <code className="font-mono">{COLUMN_ID}</code> across all rows in the{' '}
              <code className="font-mono">{TABLE_ID}</code> table.
            </p>

            <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 list-decimal list-inside text-sm">
              {result.uniqueValues.map((skill) => (
                <li key={skill} className="py-0.5">
                  {skill}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </main>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    return (
      <main className="min-h-screen bg-background-light text-slate-900 dark:bg-background-dark dark:text-white p-8">
        <div className="max-w-4xl mx-auto">
          <section className="rounded-xl border border-danger/30 bg-danger/10 p-6">
            <h1 className="text-2xl font-bold text-danger mb-2">O*NET Validation Failed</h1>
            <p className="text-sm text-slate-700 dark:text-slate-200 mb-4">
              The test page could not complete the server-side O*NET table scan.
            </p>
            <pre className="text-sm whitespace-pre-wrap break-words rounded-lg border border-danger/40 bg-white/70 dark:bg-slate-900/50 p-4">
              {message}
            </pre>
          </section>
        </div>
      </main>
    );
  }
}
