import { useEffect, useState } from 'react'

type Dependency = string | number | boolean | null | undefined

interface Result<T> {
  /** Clé de la requête qui a produit ce résultat. */
  key: string | null
  data?: T
  error?: Error
}

/**
 * Charge des données de façon asynchrone (un appel API) et suit son état.
 *
 * Exemple :
 *   const feed = useAsync(() => api.getFeed(user.id), [user.id])
 *   feed.loading  -> true pendant le chargement
 *   feed.data     -> le résultat une fois arrivé
 *   feed.error    -> l'erreur si l'appel a échoué
 *   feed.reload() -> relance l'appel
 *
 * L'appel est relancé quand une valeur de `deps` change (valeurs simples : textes, nombres…).
 *
 * Principe : on calcule une « clé » à partir des dépendances. Chaque réponse est rangée avec la clé
 * de la requête qui l'a produite. Si la clé de la dernière réponse n'est pas la clé actuelle,
 * c'est qu'une requête est en cours. Pendant ce temps, on garde les anciennes données affichées
 * pour éviter un clignotement.
 */
export function useAsync<T>(load: () => Promise<T>, deps: Dependency[]) {
  const [reloadCount, setReloadCount] = useState(0)
  const key = JSON.stringify([...deps, reloadCount])
  const [result, setResult] = useState<Result<T>>({ key: null })

  useEffect(() => {
    // Si la clé change avant la fin de l'appel, on ignore la réponse devenue obsolète.
    let cancelled = false
    load().then(
      (data) => {
        if (!cancelled) setResult({ key, data })
      },
      (error: unknown) => {
        if (!cancelled) setResult({ key, error: error instanceof Error ? error : new Error(String(error)) })
      },
    )
    return () => {
      cancelled = true
    }
    // `load` change à chaque rendu (fonction fléchée) : c'est `key` qui décide quand recharger.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const loading = result.key !== key
  return {
    data: result.data,
    error: loading ? undefined : result.error,
    loading,
    reload: () => setReloadCount((n) => n + 1),
  }
}
