import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useCurrentUser } from '../context/currentUser'
import type { UserSummary } from '../types'
import { Avatar } from './Avatar'
import { FollowButton } from './FollowButton'

/** Ligne « personne » : avatar, nom, bio, bouton Suivre. `children` = texte en plus (ex. « Suivi par… »). */
export function UserCard({ user, children }: { user: UserSummary; children?: ReactNode }) {
  const { user: me } = useCurrentUser()
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Link to={`/users/${user._id}`}>
        <Avatar id={user._id} name={user.profile.full_name} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={`/users/${user._id}`} className="font-semibold text-slate-900 hover:underline">
          {user.profile.full_name}
        </Link>
        <span className="ml-1.5 text-sm text-slate-400">@{user.username}</span>
        {me?._id === user._id && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">vous</span>}
        {user.profile.bio && <p className="truncate text-sm text-slate-500">{user.profile.bio}</p>}
        {children}
      </div>
      <FollowButton targetId={user._id} />
    </div>
  )
}
