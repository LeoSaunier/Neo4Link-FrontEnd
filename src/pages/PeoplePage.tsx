import { useState } from 'react'
import { api } from '../api'
import { SearchIcon } from '../components/icons'
import { UserCard } from '../components/UserCard'
import { Card, ErrorBox, PageHeader, Spinner } from '../components/ui'
import { useAsync } from '../lib/useAsync'

/** Annuaire de tous les membres (GET /users, MongoDB), avec recherche et filtre par service. */
export function PeoplePage() {
  const users = useAsync(() => api.listUsers(), [])
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState<string | null>(null)

  const departments = [...new Set((users.data ?? []).map((u) => u.department))].sort()
  const query = search.trim().toLowerCase()
  // Filtrage côté navigateur : avec quelques dizaines de profils, inutile de redemander au back.
  const visible = (users.data ?? []).filter(
    (u) =>
      (department === null || u.department === department) &&
      (query === '' || `${u.display_name} ${u.username} ${u.job_title}`.toLowerCase().includes(query)),
  )

  return (
    <div className="space-y-4">
      <PageHeader title="Personnes" subtitle="Tous les membres du réseau" dbs={['mongodb']} />

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-48 flex-1">
          <SearchIcon className="pointer-events-none absolute top-2 left-2.5 size-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un nom, un poste…"
            className="w-full rounded-lg border border-slate-300 py-1.5 pr-3 pl-8 text-sm focus:border-neo focus:ring-2 focus:ring-neo/20 focus:outline-none"
          />
        </label>
        {[null, ...departments].map((d) => (
          <button
            key={d ?? 'all'}
            onClick={() => setDepartment(d)}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              department === d ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50'
            }`}
          >
            {d ?? 'Tous'}
          </button>
        ))}
      </div>

      {users.loading && !users.data && <Spinner />}
      {users.error && <ErrorBox error={users.error} onRetry={users.reload} />}
      {users.data && (
        <Card className="divide-y divide-slate-100">
          {visible.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-500">Aucun résultat.</p>}
          {visible.map((u) => (
            <UserCard key={u.id} user={u} />
          ))}
        </Card>
      )}
    </div>
  )
}
