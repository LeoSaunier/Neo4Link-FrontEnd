// Petits composants d'interface réutilisés partout.
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { errorMessage } from '../lib/format'
import type { DbName } from '../types'

const DB_LABEL: Record<DbName, string> = { mongodb: 'MongoDB', neo4j: 'Neo4j' }

/** Pastille « MongoDB » (vert) ou « Neo4j » (bleu) : indique d'où vient une donnée. */
export function DbBadge({ db, dark = false }: { db: DbName; dark?: boolean }) {
  const colors =
    db === 'mongodb'
      ? dark ? 'bg-mongo/20 text-emerald-300 ring-mongo/40' : 'bg-mongo/10 text-mongo ring-mongo/30'
      : dark ? 'bg-neo/20 text-sky-300 ring-neo/40' : 'bg-neo/10 text-neo ring-neo/30'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${colors}`}>
      <span className={`size-1.5 rounded-full ${db === 'mongodb' ? 'bg-mongo' : 'bg-neo'}`} />
      {DB_LABEL[db]}
    </span>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl bg-white shadow-sm ring-1 ring-slate-200 ${className}`}>{children}</div>
}

/** Titre de page + les bases de données qu'elle utilise. */
export function PageHeader({ title, subtitle, dbs = [] }: { title: string; subtitle?: string; dbs?: DbName[] }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {dbs.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          {dbs.map((db, i) => (
            <span key={db} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true">→</span>}
              <DbBadge db={db} />
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/** Encadré dépliable « Comment ça marche ? » qui explique les étapes côté bases. */
export function HowItWorks({ title, steps }: { title: string; steps: { db: DbName; text: ReactNode }[] }) {
  return (
    <details className="group rounded-xl bg-slate-50 px-4 py-3 text-sm ring-1 ring-slate-200">
      <summary className="cursor-pointer font-medium text-slate-700 select-none">{title}</summary>
      <ol className="mt-3 space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
              {i + 1}
            </span>
            <DbBadge db={step.db} />
            <span className="text-slate-600">{step.text}</span>
          </li>
        ))}
      </ol>
    </details>
  )
}

export function Spinner({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-sm text-slate-500" role="status">
      <span className="size-5 animate-spin rounded-full border-2 border-slate-300 border-t-neo" />
      {label}
    </div>
  )
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
      <span>{errorMessage(error)}</span>
      {onRetry && (
        <button onClick={onRetry} className="rounded-lg bg-white px-3 py-1 font-medium ring-1 ring-red-200 hover:bg-red-100">
          Réessayer
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Card className="px-6 py-10 text-center">
      <p className="font-semibold text-slate-700">{title}</p>
      {children && <div className="mt-2 text-sm text-slate-500">{children}</div>}
    </Card>
  )
}

const BUTTON_STYLES = {
  primary: 'bg-neo text-white hover:bg-sky-600 disabled:bg-sky-300',
  secondary: 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 disabled:text-slate-400',
  ghost: 'text-slate-600 hover:bg-slate-100',
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BUTTON_STYLES }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${BUTTON_STYLES[variant]} ${className}`}
    />
  )
}
