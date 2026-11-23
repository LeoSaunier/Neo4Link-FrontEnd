import { useState, type ReactNode } from 'react'
import { USE_MOCK } from '../api'
import { clearTraces, useTraces, type RequestTrace } from '../api/traceStore'
import type { DbTraceEntry } from '../types'
import { CloseIcon } from './icons'
import { DbBadge } from './ui'

/**
 * Panneau « Coulisses » : la liste des appels HTTP envoyés par le front et, pour chacun,
 * les requêtes Cypher (Neo4j) et MQL (MongoDB) exécutées par le back.
 * C'est l'outil principal de la démo : il montre comment les deux bases coopèrent.
 */
export function BackstagePanel({ onClose }: { onClose: () => void }) {
  const traces = useTraces()

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-xl bg-slate-900 text-slate-100 shadow-xl ring-1 ring-slate-700">
      <header className="flex items-start justify-between gap-2 border-b border-slate-700 px-4 py-3">
        <div>
          <h2 className="font-semibold">Coulisses</h2>
          <p className="text-xs text-slate-400">Ce que chaque action déclenche dans les bases</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearTraces}
            className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            Vider
          </button>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            aria-label="Fermer les coulisses"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-800 px-4 py-2 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <DbBadge db="mongodb" dark /> documents
        </span>
        <span className="flex items-center gap-1.5">
          <DbBadge db="neo4j" dark /> graphe
        </span>
        {USE_MOCK && (
          <span className="ml-auto rounded bg-amber-400/15 px-1.5 py-0.5 text-amber-300" title="Les requêtes affichées sont celles que le back devra exécuter. Les durées ne sont pas mesurées.">
            API simulée
          </span>
        )}
      </div>

      {traces.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500">
          Aucune requête pour l'instant.
          <br />
          Utilisez l'application pour voir les appels apparaître ici.
        </p>
      ) : (
        <ol className="flex-1 divide-y divide-slate-800 overflow-y-auto">
          {traces.map((trace, index) => (
            <TraceItem key={trace.id} trace={trace} initiallyOpen={index === 0} />
          ))}
        </ol>
      )}
    </section>
  )
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-sky-300',
  POST: 'text-emerald-300',
  DELETE: 'text-rose-300',
}

function TraceItem({ trace, initiallyOpen }: { trace: RequestTrace; initiallyOpen: boolean }) {
  const [open, setOpen] = useState(initiallyOpen)
  const ok = typeof trace.status === 'number' && trace.status < 400
  const dbsUsed = [...new Set((trace.db ?? []).map((d) => d.db))]

  return (
    <li>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-mono text-xs hover:bg-slate-800/60"
        aria-expanded={open}
      >
        <span className={`w-12 shrink-0 font-bold ${METHOD_COLORS[trace.method] ?? ''}`}>{trace.method}</span>
        <span className="min-w-0 flex-1 truncate text-slate-200" title={trace.path}>
          {trace.path}
        </span>
        <span className="flex shrink-0 gap-1">
          {dbsUsed.map((db) => (
            <span key={db} className={`size-2 rounded-full ${db === 'mongodb' ? 'bg-mongo' : 'bg-neo'}`} title={db} />
          ))}
        </span>
        <span className={`shrink-0 ${ok ? 'text-emerald-400' : 'text-rose-400'}`}>{trace.status}</span>
        <span className="w-12 shrink-0 text-right text-slate-500">{Math.round(trace.duration_ms)} ms</span>
      </button>

      {open && (
        <div className="space-y-2 px-4 pb-3">
          {trace.db === null ? (
            <p className="rounded-md bg-slate-800 px-3 py-2 text-xs text-slate-400">
              Le back n'a pas envoyé le détail des requêtes (en-tête <code>X-Db-Trace</code> absent).
            </p>
          ) : trace.db.length === 0 ? (
            <p className="text-xs text-slate-500">Aucune requête en base.</p>
          ) : (
            trace.db.map((entry, i) => <DbEntry key={i} entry={entry} />)
          )}
        </div>
      )}
    </li>
  )
}

function DbEntry({ entry }: { entry: DbTraceEntry }) {
  const isMongo = entry.db === 'mongodb'
  return (
    <div className={`rounded-md border-l-2 bg-slate-800/70 ${isMongo ? 'border-mongo' : 'border-neo'}`}>
      <div className="flex items-center justify-between gap-2 px-3 pt-2 text-xs">
        <span className="flex min-w-0 items-center gap-2">
          <DbBadge db={entry.db} dark />
          <span className="truncate text-slate-300">{entry.operation}</span>
        </span>
        {entry.duration_ms !== null && <span className="shrink-0 text-slate-500">{entry.duration_ms.toFixed(1)} ms</span>}
      </div>
      <pre className="overflow-x-auto px-3 py-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-slate-300">
        {highlight(entry.query)}
      </pre>
    </div>
  )
}

// Coloration syntaxique minimaliste : mots-clés Cypher, opérateurs MongoDB ($in…), chaînes.
// On construit des éléments React (et non du HTML brut) : le texte saisi par l'utilisateur
// (ex. le contenu d'un post) ne peut donc pas injecter de code dans la page.
const TOKEN =
  /("(?:[^"\\]|\\.)*"|\$\w+|\bdb\.\w+\.\w+|\b(?:MATCH|MERGE|RETURN|WHERE|AND|NOT|ORDER BY|LIMIT|DELETE|ON CREATE SET|COUNT|DISTINCT|AS|DESC|collect|count|datetime)\b)/g

function highlight(query: string): ReactNode[] {
  return query.split(TOKEN).map((part, i) => {
    if (i % 2 === 0) return part // texte ordinaire
    if (part.startsWith('"')) return <span key={i} className="text-amber-200">{part}</span>
    if (part.startsWith('$')) return <span key={i} className="text-fuchsia-300">{part}</span>
    if (part.startsWith('db.')) return <span key={i} className="text-emerald-300">{part}</span>
    return <span key={i} className="font-semibold text-sky-300">{part}</span>
  })
}
