import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button, Card, HowItWorks, PageHeader } from '../components/ui'
import { useCurrentUser } from '../context/currentUser'
import { errorMessage } from '../lib/format'

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-neo focus:ring-2 focus:ring-neo/20 focus:outline-none'

/** Inscription : POST /auth/register avec le schéma RegisterRequest du back. */
export function RegisterPage() {
  const { register } = useCurrentUser()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '', full_name: '', bio: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Met à jour un seul champ du formulaire. */
  const update = (field: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [field]: e.target.value })

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await register(form)
      navigate('/people') // un nouveau compte ne suit personne : direction l'annuaire
    } catch (err) {
      setError(errorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Créer un compte" dbs={['mongodb', 'neo4j']} />

      <HowItWorks
        title="Que se passe-t-il dans les bases ?"
        steps={[
          { db: 'mongodb', text: 'Le back hache le mot de passe (bcrypt) puis insère le document complet dans la collection users.' },
          { db: 'neo4j', text: 'Il crée le nœud (:User {id, username}). Si cette étape échoue, il supprime le document MongoDB pour rester cohérent.' },
        ]}
      />

      <Card>
        <form onSubmit={handleSubmit} className="grid gap-3 p-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Nom d'utilisateur *</span>
            <input value={form.username} onChange={update('username')} placeholder="jeanne_d" minLength={3} maxLength={30} required className={inputClass} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Nom complet *</span>
            <input value={form.full_name} onChange={update('full_name')} placeholder="Jeanne Dupont" required className={inputClass} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">E-mail *</span>
            <input type="email" value={form.email} onChange={update('email')} placeholder="jeanne@demo.fr" autoComplete="email" required className={inputClass} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Mot de passe * (8 caractères min.)</span>
            <input type="password" value={form.password} onChange={update('password')} minLength={8} autoComplete="new-password" required className={inputClass} />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">Bio</span>
            <textarea value={form.bio} onChange={update('bio')} rows={2} className={inputClass} />
          </label>
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
          <div className="flex items-center justify-between gap-2 sm:col-span-2">
            <Link to="/login" className="text-sm font-medium text-neo hover:underline">
              J'ai déjà un compte
            </Link>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Création…' : 'Créer le compte'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
