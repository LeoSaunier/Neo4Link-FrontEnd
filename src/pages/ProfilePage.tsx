import { useState } from 'react'
import { useParams } from 'react-router'
import { api, ApiError } from '../api'
import { Avatar } from '../components/Avatar'
import { FollowButton } from '../components/FollowButton'
import { PostCard } from '../components/PostCard'
import { UserCard } from '../components/UserCard'
import { Card, DbBadge, EmptyState, ErrorBox, Spinner } from '../components/ui'
import { useLoggedUser } from '../context/currentUser'
import { formatDate } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import type { DbName, UserProfile } from '../types'

type Tab = 'posts' | 'following' | 'followers'

export function ProfilePage() {
  const { id = '' } = useParams()
  // `key` force React à repartir de zéro quand on passe d'un profil à un autre
  // (onglet, données chargées…), au lieu de garder l'état du profil précédent.
  return <ProfileView key={id} userId={id} />
}

/** Profil : GET /users/{id} — le document MongoDB + des compteurs venant de Neo4j et MongoDB. */
function ProfileView({ userId }: { userId: string }) {
  const { user: me, graphVersion } = useLoggedUser()
  const profile = useAsync(() => api.getUserProfile(userId), [userId, graphVersion])
  const [tab, setTab] = useState<Tab>('posts')

  if (profile.loading && !profile.data) return <Spinner />
  if (profile.error) {
    if (profile.error instanceof ApiError && profile.error.status === 404) {
      return <EmptyState title="Utilisateur introuvable" />
    }
    return <ErrorBox error={profile.error} onRetry={profile.reload} />
  }
  if (!profile.data) return null
  const p = profile.data

  return (
    <div className="space-y-4">
      <ProfileHeader profile={p} isMe={me.id === p.id} />

      <div className="grid grid-cols-3 gap-2">
        <StatButton label="Publications" value={p.stats.posts_count} db="mongodb" active={tab === 'posts'} onClick={() => setTab('posts')} />
        <StatButton label="Abonnements" value={p.stats.following_count} db="neo4j" active={tab === 'following'} onClick={() => setTab('following')} />
        <StatButton label="Abonnés" value={p.stats.followers_count} db="neo4j" active={tab === 'followers'} onClick={() => setTab('followers')} />
      </div>

      {tab === 'posts' && <PostsTab profile={p} />}
      {tab === 'following' && <PeopleTab userId={p.id} kind="following" />}
      {tab === 'followers' && <PeopleTab userId={p.id} kind="followers" />}
    </div>
  )
}

function ProfileHeader({ profile, isMe }: { profile: UserProfile; isMe: boolean }) {
  const cover = profile.department === 'R&D' ? 'from-sky-500 to-indigo-600' : 'from-amber-400 to-orange-600'
  return (
    <Card className="overflow-hidden">
      <div className={`h-24 bg-linear-to-r ${cover}`} />
      <div className="px-5 pb-5">
        <div className="-mt-12 flex items-end justify-between gap-3">
          <span className="rounded-full ring-4 ring-white">
            <Avatar user={profile} size="xl" />
          </span>
          {isMe ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">C'est vous</span>
          ) : (
            <FollowButton targetId={profile.id} />
          )}
        </div>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">{profile.display_name}</h1>
        <p className="text-sm text-slate-500">@{profile.username}</p>
        <p className="mt-1 text-slate-700">
          {profile.job_title} · <span className="font-medium">{profile.department}</span>
        </p>
        {profile.bio && <p className="mt-3 text-slate-700">{profile.bio}</p>}
        {profile.skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {profile.skills.map((skill) => (
              <span key={skill} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {skill}
              </span>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-slate-400">Membre depuis le {formatDate(profile.created_at)}</p>
      </div>
    </Card>
  )
}

function StatButton(props: { label: string; value: number; db: DbName; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={props.onClick}
      className={`rounded-xl bg-white px-3 py-2.5 text-left shadow-sm ring-1 transition ${
        props.active ? 'ring-2 ring-slate-900' : 'ring-slate-200 hover:ring-slate-300'
      }`}
      aria-pressed={props.active}
    >
      <p className="text-2xl font-bold text-slate-900">{props.value}</p>
      <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
        {props.label} <DbBadge db={props.db} />
      </p>
    </button>
  )
}

function PostsTab({ profile }: { profile: UserProfile }) {
  const posts = useAsync(() => api.getUserPosts(profile.id), [profile.id])
  if (posts.loading && !posts.data) return <Spinner />
  if (posts.error) return <ErrorBox error={posts.error} onRetry={posts.reload} />
  if (posts.data?.length === 0) return <EmptyState title="Aucune publication" />
  return (
    <div className="space-y-4">
      {posts.data?.map((post) => (
        <PostCard key={post.id} post={post} author={profile} />
      ))}
    </div>
  )
}

function PeopleTab({ userId, kind }: { userId: string; kind: 'following' | 'followers' }) {
  const { graphVersion } = useLoggedUser()
  const people = useAsync(
    () => (kind === 'following' ? api.getFollowing(userId) : api.getFollowers(userId)),
    [userId, kind, graphVersion],
  )
  if (people.loading && !people.data) return <Spinner />
  if (people.error) return <ErrorBox error={people.error} onRetry={people.reload} />
  if (people.data?.length === 0) {
    return <EmptyState title={kind === 'following' ? 'Ne suit personne' : "Pas encore d'abonnés"} />
  }
  return (
    <Card className="divide-y divide-slate-100">
      {people.data?.map((u) => (
        <UserCard key={u.id} user={u} />
      ))}
    </Card>
  )
}
