import { useState } from 'react'
import { Link } from 'react-router'
import { api } from '../api'
import { PostCard } from '../components/PostCard'
import { PostComposer } from '../components/PostComposer'
import { EmptyState, ErrorBox, HowItWorks, PageHeader, Spinner } from '../components/ui'
import { useLoggedUser } from '../context/currentUser'
import { useAsync } from '../lib/useAsync'
import type { Post } from '../types'

/** Fil d'actualité : GET /users/{id}/feed — Neo4j choisit les auteurs, MongoDB fournit les posts. */
export function FeedPage() {
  const { user, graphVersion, followingIds } = useLoggedUser()
  // Rechargé quand l'utilisateur change ou quand il suit / ne suit plus quelqu'un (graphVersion)
  const feed = useAsync(() => api.getFeed(user._id, 20), [user._id, graphVersion])
  const [published, setPublished] = useState<Post | null>(null)

  return (
    <div className="space-y-4">
      <PageHeader title="Fil d'actualité" subtitle="Les publications des personnes que vous suivez" dbs={['neo4j', 'mongodb']} />

      <HowItWorks
        title="Comment ce fil est-il construit ?"
        steps={[
          { db: 'neo4j', text: <>Trouver les personnes que je suis : <code>(moi)-[:FOLLOWS]-&gt;(f)</code></> },
          { db: 'mongodb', text: <>Lire leurs 20 publications les plus récentes : <code>db.posts.find(&#123;author_id: &#123;$in: …&#125;&#125;)</code></> },
          {
            db: 'mongodb',
            text: "Pas de 3ᵉ requête : chaque post contient déjà une copie du nom de l'auteur (author_snapshot).",
          },
        ]}
      />

      <PostComposer onCreated={setPublished} />

      {published && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
          <span>Publié ! Ce post apparaîtra dans le fil des personnes qui vous suivent.</span>
          <span className="flex gap-3">
            <Link to={`/users/${user._id}`} className="font-medium underline">
              Voir sur mon profil
            </Link>
            <button onClick={() => setPublished(null)} className="text-emerald-600 hover:text-emerald-900">
              OK
            </button>
          </span>
        </div>
      )}

      {feed.loading && !feed.data && <Spinner />}
      {feed.error && <ErrorBox error={feed.error} onRetry={feed.reload} />}
      {feed.data?.length === 0 && (
        <EmptyState title="Votre fil est vide">
          {followingIds.size === 0 ? 'Vous ne suivez encore personne. ' : 'Les personnes que vous suivez n’ont rien publié. '}
          <Link to="/suggestions" className="font-medium text-neo hover:underline">
            Voir les suggestions
          </Link>{' '}
          ou{' '}
          <Link to="/people" className="font-medium text-neo hover:underline">
            parcourir l'annuaire
          </Link>
          .
        </EmptyState>
      )}
      {feed.data?.map((post) => <PostCard key={post._id} post={post} />)}
    </div>
  )
}
