import type { UserSummary } from '../types'

const SIZES = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
  xl: 'size-24 text-3xl',
}

const PALETTE = [
  'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-violet-500',
  'bg-teal-500', 'bg-orange-500', 'bg-indigo-500', 'bg-pink-500', 'bg-lime-600',
]

/** Couleur stable pour un même identifiant (petit hachage du texte). */
function colorFor(id: string) {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/** Photo de profil, ou initiales sur fond coloré si avatar_url est null. */
export function Avatar({ user, size = 'md' }: { user: UserSummary; size?: keyof typeof SIZES }) {
  if (user.avatar_url) {
    return <img src={user.avatar_url} alt="" className={`${SIZES[size]} shrink-0 rounded-full object-cover`} />
  }
  return (
    <span
      className={`${SIZES[size]} ${colorFor(user.id)} inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white`}
      aria-hidden="true"
    >
      {initials(user.display_name)}
    </span>
  )
}
