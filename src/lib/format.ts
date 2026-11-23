// Petites fonctions d'affichage (dates, pluriels…).

const relativeFormatter = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

/** "il y a 3 heures", "hier", "à l'instant"… */
export function timeAgo(iso: string): string {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relativeFormatter.format(Math.round(seconds / size), unit)
  }
  return "à l'instant"
}

/** "23 novembre 2026" */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** plural(1, 'abonné') -> "1 abonné" ; plural(3, 'abonné') -> "3 abonnés" */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count > 1 ? pluralForm : singular}`
}

/** "neo4j, Graphes ,  data" -> ["neo4j", "graphes", "data"] */
export function parseList(input: string): string[] {
  return [...new Set(input.split(',').map((s) => s.trim()).filter(Boolean))]
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
