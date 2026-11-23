import { Link } from 'react-router'
import { api } from '../api'
import { UserCard } from '../components/UserCard'
import { Card, EmptyState, ErrorBox, HowItWorks, PageHeader, Spinner } from '../components/ui'
import { useLoggedUser } from '../context/currentUser'
import { useAsync } from '../lib/useAsync'
import type { Suggestion } from '../types'

/** Suggestions « amis d'amis » : GET /users/{id}/suggestions — parcours à 2 sauts dans Neo4j. */
export function SuggestionsPage() {
  const { user, graphVersion } = useLoggedUser()
  const suggestions = useAsync(() => api.getSuggestions(user.id, 12), [user.id, graphVersion])

  return (
    <div className="space-y-4">
      <PageHeader title="Suggestions" subtitle="Des personnes suivies par celles que vous suivez" dbs={['neo4j', 'mongodb']} />

      <HowItWorks
        title="Comment ces suggestions sont-elles calculées ?"
        steps={[
          {
            db: 'neo4j',
            text: (
              <>
                Parcourir le graphe sur 2 niveaux : <code>(moi)-[:FOLLOWS]-&gt;(f)-[:FOLLOWS]-&gt;(s)</code>, en excluant les personnes
                déjà suivies, puis classer par nombre d'intermédiaires.
              </>
            ),
          },
          { db: 'mongodb', text: 'Récupérer les profils des personnes suggérées et des intermédiaires.' },
        ]}
      />

      {suggestions.loading && !suggestions.data && <Spinner />}
      {suggestions.error && <ErrorBox error={suggestions.error} onRetry={suggestions.reload} />}
      {suggestions.data?.length === 0 && (
        <EmptyState title="Aucune suggestion pour l'instant">
          Suivez quelques personnes depuis{' '}
          <Link to="/people" className="font-medium text-neo hover:underline">
            l'annuaire
          </Link>{' '}
          : leurs abonnements apparaîtront ici.
        </EmptyState>
      )}
      {suggestions.data && suggestions.data.length > 0 && (
        <Card className="divide-y divide-slate-100">
          {suggestions.data.map((s) => (
            <UserCard key={s.user.id} user={s.user}>
              <ViaText suggestion={s} />
            </UserCard>
          ))}
        </Card>
      )}
    </div>
  )
}

/** « Suivi par Alice, Bob et 2 autres personnes que vous suivez » */
function ViaText({ suggestion }: { suggestion: Suggestion }) {
  const names = suggestion.via.map((u) => u.display_name.split(' ')[0])
  const others = suggestion.mutual_count - names.length
  return (
    <p className="mt-0.5 text-xs text-slate-500">
      <span className="font-semibold text-neo">{suggestion.mutual_count}</span> en commun · suivi par {names.join(', ')}
      {others > 0 && ` et ${others} autre${others > 1 ? 's' : ''}`}
    </p>
  )
}
