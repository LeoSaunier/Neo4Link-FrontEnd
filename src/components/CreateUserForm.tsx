import { useState, type FormEvent } from 'react'
import { api } from '../api'
import { errorMessage, parseList } from '../lib/format'
import type { User } from '../types'
import { Button, Card } from './ui'

const DEPARTMENTS = ['R&D', 'Commercial']

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-neo focus:ring-2 focus:ring-neo/20 focus:outline-none'

/**
 * Création d'un profil (POST /users). Côté back, c'est une double écriture :
 * le document complet dans MongoDB, et un nœud (:User {id}) dans Neo4j.
 */
export function CreateUserForm({ onCreated, onCancel }: { onCreated: (user: User) => void; onCancel: () => void }) {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [department, setDepartment] = useState(DEPARTMENTS[0])
  const [skills, setSkills] = useState('')
  const [bio, setBio] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const user = await api.createUser({
        username,
        display_name: displayName,
        job_title: jobTitle,
        department,
        bio,
        skills: parseList(skills),
      })
      onCreated(user)
    } catch (err) {
      setError(errorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="grid gap-3 p-4 sm:grid-cols-2">
        <h2 className="font-semibold text-slate-900 sm:col-span-2">Nouveau profil</h2>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Nom d'utilisateur *</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="jdupont" required className={inputClass} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Nom affiché *</span>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Jeanne Dupont" required className={inputClass} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Poste</span>
          <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Data engineer" className={inputClass} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Service</span>
          <select value={department} onChange={(e) => setDepartment(e.target.value)} className={inputClass}>
            {DEPARTMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="font-medium text-slate-700">Compétences</span>
          <input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="MongoDB, Neo4j, React" className={inputClass} />
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="font-medium text-slate-700">Bio</span>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} className={inputClass} />
        </label>
        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Création…' : 'Créer le profil'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
