import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { ChevronRight, RefreshCcw, Clock3 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from '../components/Link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default function RolesOverview() {
  const { roles, syncOnetRoles } = useApp();
  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const onetRoles = useMemo(
    () =>
      roles.filter(
        (role) => role.source === 'onet' || role.id.startsWith('onet-') || Boolean(role.onetSocCode)
      ),
    [roles]
  );

  const handleSync = async () => {
    setSyncing(true);
    setSyncFeedback(null);
    const result = await syncOnetRoles();
    setSyncing(false);
    setSyncFeedback(result.ok ? 'Sync complete.' : result.error ?? 'Sync failed.');
  };

  const overviewStats = useMemo(() => {
    const latestUpdate = onetRoles
      .map((role) => role.onetLastUpdatedAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1);

    return {
      roles: onetRoles.length,
      latestUpdate,
    };
  }, [onetRoles]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-primary dark:text-slate-100">
            Roles
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Workforce role intelligence at a glance.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-2"
        >
          <RefreshCcw size={18} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing…' : 'Sync now'}
        </Button>
      </div>

      {syncFeedback && (
        <div
          className={cn(
            'rounded-xl border px-4 py-3 text-sm',
            syncFeedback.toLowerCase().includes('failed') || syncFeedback.toLowerCase().includes('error')
              ? 'border-danger/30 bg-danger/10 text-danger'
              : 'border-success/30 bg-success/10 text-success'
          )}
        >
          {syncFeedback}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-card-light px-4 py-3 dark:border-slate-700 dark:bg-card-dark">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Active roles</p>
          <p className="mt-1 font-display text-2xl font-bold text-primary dark:text-slate-100">{overviewStats.roles}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-card-light px-4 py-3 dark:border-slate-700 dark:bg-card-dark">
          <p className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Clock3 size={12} />
            Latest update
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{overviewStats.latestUpdate ?? 'N/A'}</p>
        </div>
      </div>

      <div className="grid gap-5 sm:gap-6">
        {onetRoles.map((role) => {
          const relevantBySkill = new Map<string, (typeof role.requirements)[number]>();
          for (const requirement of role.requirements) {
            if (requirement.notRelevant) continue;
            const existing = relevantBySkill.get(requirement.skillId);
            if (!existing) {
              relevantBySkill.set(requirement.skillId, requirement);
              continue;
            }
            relevantBySkill.set(requirement.skillId, {
              ...existing,
              importance: Math.max(existing.importance ?? 0, requirement.importance ?? 0),
              level: Math.max(existing.level ?? 0, requirement.level ?? 0),
              weight: Math.max(existing.weight, requirement.weight),
            });
          }

          const relevantRequirements = Array.from(relevantBySkill.values());
          const relevantCount = relevantBySkill.size;
          const avgImportance =
            relevantCount > 0
              ? relevantRequirements.reduce((sum, req) => sum + (req.importance ?? 0), 0) / relevantCount
              : 0;
          const topSkillNames = [...relevantRequirements]
            .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))
            .slice(0, 4)
            .map((req) => req.skillName ?? req.skillId);

          return (
            <Link
              key={role.id}
              to={`/roles/${role.id}`}
              className={cn(
                'group block rounded-2xl border bg-card-light p-6 shadow-sm transition-all duration-200',
                'border-slate-200 hover:-translate-y-0.5 hover:border-action/40 hover:shadow-md dark:bg-card-dark dark:border-slate-700 dark:hover:border-action/50',
                'focus-within:ring-2 focus-within:ring-action/30 focus-within:ring-offset-2'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-xl font-semibold text-slate-900 transition-colors group-hover:text-primary dark:text-slate-100 dark:group-hover:text-action">
                    {role.name}
                  </h2>

                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded-xl bg-brand-blue/10 px-3 py-2 text-sm text-primary dark:text-slate-100">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-300">Relevant skills</div>
                      <p className="mt-1 font-semibold">{relevantCount}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-300">Avg importance</div>
                      <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{avgImportance.toFixed(1)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {topSkillNames.map((skill) => (
                      <Badge key={`${role.id}-${skill}`} variant="neutral" className="normal-case tracking-normal text-[11px]">
                        {skill}
                      </Badge>
                    ))}
                    {role.onetLastUpdatedAt && (
                      <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">Updated {role.onetLastUpdatedAt}</span>
                    )}
                  </div>
                </div>
                <ChevronRight
                  size={20}
                  className="shrink-0 text-slate-300 transition-colors group-hover:text-action dark:text-slate-500"
                />
              </div>
            </Link>
          );
        })}
        {onetRoles.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-card-light px-6 py-12 text-center dark:border-slate-700 dark:bg-card-dark">
            <p className="text-slate-500 dark:text-slate-400">
              No roles yet. Click <strong className="text-slate-700 dark:text-slate-200">Sync now</strong> to load role definitions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
