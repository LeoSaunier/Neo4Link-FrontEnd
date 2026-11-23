import { useState, type FormEvent } from 'react'
import { api } from '../api'
import { useLoggedUser } from '../context/currentUser'
import { errorMessage, parseList } from '../lib/format'
import type { Post, PostCreate } from '../types'
import { Avatar } from './Avatar'
import { Button, Card } from './ui'

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-neo focus:ring-2 focus:ring-neo/20 focus:outline-none'

/** Formulaire de publication : POST /posts avec le schéma PostCreate du back (author_id, text, tags). */
export function PostComposer({ onCreated }: { onCreated: (post: Post) => void }) {
  const { user } = useLoggedUser()
  const [text, setText] = useState('')
  const [tags, setTags] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const payload: PostCreate = { author_id: user._id, text, tags: parseList(tags.toLowerCase()) }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault() // empêche le navigateur de recharger la page
    setSubmitting(true)
    setError(null)
    try {
      const post = await api.createPost(payload)
      setText('')
      setTags('')
      onCreated(post)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-3 p-4">
        <div className="flex gap-3">
          <Avatar id={user._id} name={user.profile.full_name} />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Quoi de neuf, ${user.profile.full_name.split(' ')[0]} ?`}
            rows={3}
            className={inputClass}
          />
        </div>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Tags séparés par des virgules (ex. neo4j, équipe)"
          className={inputClass}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-between gap-3">
          <details className="min-w-0 text-xs text-slate-500">
            <summary className="cursor-pointer select-none">JSON envoyé au back</summary>
            <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-slate-900 p-2 font-mono text-[11px] text-slate-200">
              POST /posts{'\n'}
              {JSON.stringify(payload, null, 2)}
            </pre>
          </details>
          <Button type="submit" disabled={submitting || !text.trim()} className="shrink-0">
            {submitting ? 'Publication…' : 'Publier'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
