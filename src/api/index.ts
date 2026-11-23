import type { Neo4LinkApi } from './api'
import { mockApi } from './mock/mockApi'
import { realApi } from './realApi'

/**
 * true  -> API simulée (aucun back nécessaire)
 * false -> vrai back FastAPI
 * Réglable dans .env.local avec VITE_USE_MOCK=false (voir .env.example). Par défaut : simulée.
 */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

/** L'API utilisée par toute l'application. Les pages importent uniquement cet objet. */
export const api: Neo4LinkApi = USE_MOCK ? mockApi : realApi

export { ApiError } from './api'
