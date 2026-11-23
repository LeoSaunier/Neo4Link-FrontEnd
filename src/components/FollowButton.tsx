import { useState } from 'react'
import { useCurrentUser } from '../context/currentUser'
import { errorMessage } from '../lib/format'

/**
 * Bouton Suivre / Abonné. Un clic crée ou supprime une relation FOLLOWS dans Neo4j, et le back
 * met à jour les compteurs dans MongoDB (POST /users/{id}/follow ou DELETE /users/{id}/follow/{target_id}).
 */
export function FollowButton({ targetId, className = '' }: { targetId: string; className?: string }) {
  const { user, followingIds, follow, unfollow } = useCurrentUser()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pas de bouton sur son propre profil
  if (!user || user._id === targetId) return null

  const isFollowing = followingIds.has(targetId)

  async function toggle() {
    setBusy(true)
    setError(null)
    try {
      if (isFollowing) await unfollow(targetId)
      else await follow(targetId)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className={`inline-flex flex-col items-end gap-1 ${className}`}>
      <button
        onClick={toggle}
        disabled={busy}
        className={
          isFollowing
            ? 'group w-32 rounded-full px-3 py-1.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 transition-colors hover:bg-red-50 hover:text-red-600 hover:ring-red-300 disabled:opacity-60'
            : 'w-32 rounded-full bg-neo px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-sky-600 disabled:opacity-60'
        }
      >
        {busy ? (
          '…'
        ) : isFollowing ? (
          <>
            <span className="group-hover:hidden">Abonné ✓</span>
            <span className="hidden group-hover:inline">Ne plus suivre</span>
          </>
        ) : (
          'Suivre'
        )}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  )
}
