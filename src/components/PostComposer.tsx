import { useState, type FormEvent } from 'react'
import { api } from '../api'
import { useLoggedUser } from '../context/currentUser'
import { errorMessage, parseList } from '../lib/format'
import type { Post, PostCreate, PostType } from '../types'
import { Avatar } from './Avatar'
import { PlusIcon } from './icons'
import { Button, Card } from './ui'

const TYPES: { type: PostType; label: string }[] = [
  { type: 'text', label: 'Texte' },
  { type: 'image', label: 'Image' },
  { type: 'poll', label: 'Sondage' },
  { type: 'article', label: 'Article' },
]

/** Images d'exemple fournies avec le front (dossier public/demo). */
const DEMO_IMAGES = [
  { url: '/demo/stand.svg', label: 'Salon' },
  { url: '/demo/servers.svg', label: 'Serveurs' },
  { url: '/demo/handshake.svg', label: 'Partenariat' },
  { url: '/demo/screens.svg', label: 'Maquettes' },
]

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-neo focus:ring-2 focus:ring-neo/20 focus:outline-none'

/**
 * Formulaire de publication. Selon le type choisi, les champs changent… et le document
 * envoyé à MongoDB (POST /posts) n'a pas la même forme. Aucun changement de schéma n'est nécessaire.
 */
export function PostComposer({ onCreated }: { onCreated: (post: Post) => void }) {
  const { user } = useLoggedUser()
  const [type, setType] = useState<PostType>('text')
  const [text, setText] = useState('')
  const [caption, setCaption] = useState('')
  const [imageUrl, setImageUrl] = useState(DEMO_IMAGES[0].url)
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Construit le JSON envoyé au back, différent selon le type de post. */
  function buildPayload(): PostCreate {
    const common = { author_id: user.id, tags: parseList(tags.toLowerCase()) }
    switch (type) {
      case 'text':
        return { ...common, type, text }
      case 'image':
        return { ...common, type, caption: caption || undefined, image: { url: imageUrl, alt: caption || undefined } }
      case 'poll':
        return { ...common, type, question, options: options.filter((o) => o.trim()).map((label) => ({ label })) }
      case 'article':
        return { ...common, type, title, body }
    }
  }

  function reset() {
    setText('')
    setCaption('')
    setQuestion('')
    setOptions(['', ''])
    setTitle('')
    setBody('')
    setTags('')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault() // empêche le navigateur de recharger la page
    setSubmitting(true)
    setError(null)
    try {
      const post = await api.createPost(buildPayload())
      reset()
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
        <div className="flex items-center gap-3">
          <Avatar user={user} />
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Type de publication">
            {TYPES.map((t) => (
              <button
                key={t.type}
                type="button"
                role="tab"
                aria-selected={type === t.type}
                onClick={() => setType(t.type)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  type === t.type ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {type === 'text' && (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Quoi de neuf, ${user.display_name.split(' ')[0]} ?`}
            rows={3}
            className={inputClass}
          />
        )}

        {type === 'image' && (
          <div className="space-y-2">
            <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Légende" className={inputClass} />
            <div className="grid grid-cols-4 gap-2">
              {DEMO_IMAGES.map((image) => (
                <button
                  key={image.url}
                  type="button"
                  onClick={() => setImageUrl(image.url)}
                  className={`overflow-hidden rounded-lg ring-2 transition ${imageUrl === image.url ? 'ring-neo' : 'ring-transparent hover:ring-slate-300'}`}
                  title={image.label}
                >
                  <img src={image.url} alt={image.label} className="aspect-video w-full object-cover" />
                </button>
              ))}
            </div>
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="…ou l'URL d'une image"
              className={`${inputClass} font-mono text-xs`}
            />
          </div>
        )}

        {type === 'poll' && (
          <div className="space-y-2">
            <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Votre question" className={inputClass} />
            {options.map((option, i) => (
              <input
                key={i}
                value={option}
                onChange={(e) => setOptions(options.map((o, j) => (j === i ? e.target.value : o)))}
                placeholder={`Option ${i + 1}`}
                className={inputClass}
              />
            ))}
            {options.length < 5 && (
              <Button type="button" variant="ghost" onClick={() => setOptions([...options, ''])}>
                <PlusIcon className="size-4" /> Ajouter une option
              </Button>
            )}
          </div>
        )}

        {type === 'article' && (
          <div className="space-y-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de l'article" className={inputClass} />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Contenu (laissez une ligne vide entre deux paragraphes)"
              rows={6}
              className={inputClass}
            />
          </div>
        )}

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
              {JSON.stringify(buildPayload(), null, 2)}
            </pre>
          </details>
          <Button type="submit" disabled={submitting} className="shrink-0">
            {submitting ? 'Publication…' : 'Publier'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
