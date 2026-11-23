import { useState } from 'react'
import { Link } from 'react-router'
import { timeAgo } from '../lib/format'
import type { ArticlePost, ImagePost, PollPost, Post, PostType, UserSummary } from '../types'
import { Avatar } from './Avatar'
import { CodeIcon, HeartIcon } from './icons'
import { Card } from './ui'

const TYPE_LABELS: Record<PostType, { label: string; className: string }> = {
  text: { label: 'Texte', className: 'bg-slate-100 text-slate-600' },
  image: { label: 'Image', className: 'bg-violet-100 text-violet-700' },
  poll: { label: 'Sondage', className: 'bg-amber-100 text-amber-700' },
  article: { label: 'Article', className: 'bg-teal-100 text-teal-700' },
}

/** Affiche un post, quel que soit son type (texte, image, sondage, article). */
export function PostCard({ post, author }: { post: Post; author: UserSummary }) {
  const [showJson, setShowJson] = useState(false)
  const type = TYPE_LABELS[post.type]

  return (
    <Card>
      <article className="p-4">
        <header className="flex items-start gap-3">
          <Link to={`/users/${author.id}`}>
            <Avatar user={author} />
          </Link>
          <div className="min-w-0 flex-1">
            <Link to={`/users/${author.id}`} className="font-semibold text-slate-900 hover:underline">
              {author.display_name}
            </Link>
            <p className="truncate text-xs text-slate-500">
              {author.job_title} · {timeAgo(post.created_at)}
            </p>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${type.className}`}>{type.label}</span>
        </header>

        <div className="mt-3">
          <PostBody post={post} />
        </div>

        <footer className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          {post.tags.map((tag) => (
            <span key={tag} className="text-neo">
              #{tag}
            </span>
          ))}
          <span className="ml-auto flex items-center gap-1" title="J'aime">
            <HeartIcon className="size-4" /> {post.likes_count}
          </span>
          <button
            onClick={() => setShowJson(!showJson)}
            className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs transition-colors ${
              showJson ? 'bg-mongo/10 text-mongo' : 'hover:bg-slate-100'
            }`}
            title="Voir le document tel qu'il est stocké dans MongoDB"
            aria-pressed={showJson}
          >
            <CodeIcon className="size-3.5" /> Document
          </button>
        </footer>

        {showJson && <MongoDocument post={post} />}
      </article>
    </Card>
  )
}

/**
 * Le cœur du polymorphisme : selon `post.type`, on affiche un composant différent.
 * TypeScript sait, dans chaque `case`, quels champs existent (ex. `post.options` seulement pour un sondage).
 */
function PostBody({ post }: { post: Post }) {
  switch (post.type) {
    case 'text':
      return <p className="whitespace-pre-line text-slate-800">{post.text}</p>
    case 'image':
      return <ImageBody post={post} />
    case 'poll':
      return <PollBody post={post} />
    case 'article':
      return <ArticleBody post={post} />
  }
}

function ImageBody({ post }: { post: ImagePost }) {
  const exif = Object.entries(post.image.exif ?? {})
  return (
    <div className="space-y-2">
      {post.caption && <p className="text-slate-800">{post.caption}</p>}
      <img
        src={post.image.url}
        alt={post.image.alt ?? ''}
        width={post.image.width}
        height={post.image.height}
        className="w-full rounded-lg bg-slate-100 object-cover"
        loading="lazy"
      />
      {exif.length > 0 && (
        <details className="text-xs text-slate-500">
          <summary className="cursor-pointer select-none">Métadonnées EXIF ({exif.length})</summary>
          <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            {exif.map(([key, value]) => (
              <div key={key} className="contents">
                <dt className="font-medium text-slate-600">{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </div>
  )
}

function PollBody({ post }: { post: PollPost }) {
  const total = post.options.reduce((sum, option) => sum + option.votes, 0)
  const best = Math.max(...post.options.map((o) => o.votes))
  return (
    <div>
      <p className="font-medium text-slate-900">{post.question}</p>
      <ul className="mt-2 space-y-1.5">
        {post.options.map((option) => {
          const percent = total === 0 ? 0 : Math.round((option.votes / total) * 100)
          return (
            <li key={option.label} className="relative overflow-hidden rounded-lg bg-slate-100 px-3 py-1.5 text-sm">
              <div
                className={`absolute inset-y-0 left-0 ${option.votes === best && total > 0 ? 'bg-amber-200' : 'bg-slate-200'}`}
                style={{ width: `${percent}%` }}
              />
              <div className="relative flex justify-between">
                <span>{option.label}</span>
                <span className="font-medium">{percent} %</span>
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mt-1.5 text-xs text-slate-500">{total} vote{total > 1 ? 's' : ''}</p>
    </div>
  )
}

function ArticleBody({ post }: { post: ArticlePost }) {
  const [expanded, setExpanded] = useState(false)
  const paragraphs = post.body.split(/\n{2,}/)
  const visible = expanded ? paragraphs : paragraphs.slice(0, 1)
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <h3 className="text-lg font-bold text-slate-900">{post.title}</h3>
      <p className="text-xs text-slate-500">{post.reading_time_min} min de lecture</p>
      <div className="mt-2 space-y-2 text-slate-700">
        {visible.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
      {paragraphs.length > 1 && (
        <button onClick={() => setExpanded(!expanded)} className="mt-2 text-sm font-medium text-neo hover:underline">
          {expanded ? 'Réduire' : 'Lire la suite'}
        </button>
      )}
    </div>
  )
}

/** Le post tel qu'il est stocké dans la collection MongoDB `posts` (champs différents selon le type). */
function MongoDocument({ post }: { post: Post }) {
  const { id, ...fields } = post
  // Un FeedItem contient aussi `author` (ajouté par l'API) : ce champ n'est pas dans le document stocké.
  const stored = { _id: id, ...fields } as Record<string, unknown>
  delete stored.author
  return (
    <div className="mt-3 rounded-lg bg-slate-900 p-3">
      <p className="mb-1 text-xs font-medium text-emerald-300">db.posts — document « {post.type} »</p>
      <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-slate-200">{JSON.stringify(stored, null, 2)}</pre>
    </div>
  )
}
