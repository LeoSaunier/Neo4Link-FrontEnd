import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { api } from '../api'
import { useCurrentUser } from '../context/currentUser'
import { errorMessage, timeAgo } from '../lib/format'
import type { Post } from '../types'
import { Avatar } from './Avatar'
import { CodeIcon, HeartIcon } from './icons'
import { Card } from './ui'

/**
 * Affiche une publication, avec ses « j'aime » et ses commentaires.
 *
 * Le nom de l'auteur vient de `author_snapshot`, une copie enregistrée dans le post par le back :
 * pas besoin de relire la collection `users` pour afficher le fil.
 *
 * Le post est gardé dans un état local : après un j'aime ou un commentaire, le back renvoie
 * le post mis à jour, qui remplace l'ancien.
 */
export function PostCard({ post: initialPost }: { post: Post }) {
  const { user } = useCurrentUser()
  const [post, setPost] = useState(initialPost)
  const [showComments, setShowComments] = useState(false)
  const [showJson, setShowJson] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const liked = user !== null && post.likes.includes(user._id)

  async function toggleLike() {
    if (!user) return
    setBusy(true)
    setError(null)
    try {
      setPost(liked ? await api.unlikePost(post._id, user._id) : await api.likePost(post._id, user._id))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <article className="p-4">
        <header className="flex items-start gap-3">
          <Link to={`/users/${post.author_id}`}>
            <Avatar id={post.author_id} name={post.author_snapshot.full_name} />
          </Link>
          <div className="min-w-0 flex-1">
            <Link to={`/users/${post.author_id}`} className="font-semibold text-slate-900 hover:underline">
              {post.author_snapshot.full_name}
            </Link>
            <p className="truncate text-xs text-slate-500">
              @{post.author_snapshot.username} · {timeAgo(post.created_at)}
            </p>
          </div>
        </header>

        <p className="mt-3 whitespace-pre-line text-slate-800">{post.content.text}</p>

        {post.tags.length > 0 && (
          <p className="mt-2 flex flex-wrap gap-2 text-sm">
            {post.tags.map((tag) => (
              <span key={tag} className="text-neo">
                #{tag}
              </span>
            ))}
          </p>
        )}

        <footer className="mt-3 flex items-center gap-1 border-t border-slate-100 pt-2 text-sm text-slate-500">
          <button
            onClick={toggleLike}
            disabled={busy || !user}
            className={`flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-rose-50 ${liked ? 'text-rose-600' : 'hover:text-rose-600'}`}
            aria-pressed={liked}
            title={liked ? "Je n'aime plus" : "J'aime"}
          >
            <HeartIcon className="size-4" fill={liked ? 'currentColor' : 'none'} />
            {post.likes.length}
          </button>
          <button
            onClick={() => setShowComments(!showComments)}
            className={`rounded-md px-2 py-1 transition-colors hover:bg-slate-100 ${showComments ? 'text-slate-900' : ''}`}
            aria-expanded={showComments}
          >
            {post.comments.length} commentaire{post.comments.length > 1 ? 's' : ''}
          </button>
          <button
            onClick={() => setShowJson(!showJson)}
            className={`ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
              showJson ? 'bg-mongo/10 text-mongo' : 'hover:bg-slate-100'
            }`}
            title="Voir le document tel qu'il est stocké dans MongoDB"
            aria-pressed={showJson}
          >
            <CodeIcon className="size-3.5" /> Document
          </button>
        </footer>

        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        {showComments && <Comments post={post} onUpdated={setPost} />}
        {showJson && <MongoDocument post={post} />}
      </article>
    </Card>
  )
}

/** Commentaires (tableau `comments` imbriqué dans le post) + formulaire pour en ajouter un. */
function Comments({ post, onUpdated }: { post: Post; onUpdated: (post: Post) => void }) {
  const { user } = useCurrentUser()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!user || !text.trim()) return
    setSending(true)
    setError(null)
    try {
      onUpdated(await api.addComment(post._id, { user_id: user._id, text }))
      setText('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mt-3 space-y-3">
      {post.comments.map((comment, i) => (
        <div key={i} className="flex gap-2">
          <Avatar id={comment.user_id} name={comment.author_snapshot.full_name} size="xs" />
          <div className="min-w-0 flex-1 rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <p>
              <Link to={`/users/${comment.user_id}`} className="font-semibold text-slate-900 hover:underline">
                {comment.author_snapshot.full_name}
              </Link>{' '}
              <span className="text-xs text-slate-400">{timeAgo(comment.created_at)}</span>
            </p>
            <p className="whitespace-pre-line text-slate-700">{comment.text}</p>
          </div>
        </div>
      ))}
      {user && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Avatar id={user._id} name={user.profile.full_name} size="xs" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Écrire un commentaire…"
            className="min-w-0 flex-1 rounded-full border border-slate-300 px-3 py-1 text-sm focus:border-neo focus:ring-2 focus:ring-neo/20 focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="rounded-full px-3 text-sm font-semibold text-neo hover:bg-neo/10 disabled:text-slate-300 disabled:hover:bg-transparent"
          >
            {sending ? '…' : 'Envoyer'}
          </button>
        </form>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

/** Le post tel qu'il est stocké dans la collection MongoDB `posts`. */
function MongoDocument({ post }: { post: Post }) {
  return (
    <div className="mt-3 rounded-lg bg-slate-900 p-3">
      <p className="mb-1 text-xs font-medium text-emerald-300">db.posts : copie de l'auteur, likes et commentaires dans le même document</p>
      <pre className="max-h-80 overflow-auto font-mono text-[11px] leading-relaxed text-slate-200">{JSON.stringify(post, null, 2)}</pre>
    </div>
  )
}
