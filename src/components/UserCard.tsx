import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useCurrentUser } from '../context/currentUser'
import type { UserSummary } from '../types'
import { Avatar } from './Avatar'
import { FollowButton } from './FollowButton'

/** Ligne « personne » : avatar, nom, poste, bouton Suivre. `children` = texte en plus (ex. « Suivi par… »). */
export function UserCard({ user, children }: { user: UserSummary; children?: ReactNode }) {
  const { user: me } = useCurrentUser()
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Link to={`/users/${user.id}`}>
        <Avatar user={user} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={`/users/${user.id}`} className="font-semibold text-slate-900 hover:underline">
          {user.display_name}
        </Link>
        {me?.id === user.id && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">vous</span>}
        <p className="truncate text-sm text-slate-500">
          {user.job_title} · {user.department}
        </p>
        {children}
      </div>
      <FollowButton targetId={user.id} />
    </div>
  )
}
