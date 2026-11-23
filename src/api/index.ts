import { USE_MOCK } from '../config'
import type { Neo4LinkApi } from './api'
import { mockApi } from './mock/mockApi'
import { realApi } from './realApi'

/**
 * L'API utilisée par toute l'application. Les pages importent uniquement cet objet.
 * USE_MOCK (src/config.ts) choisit entre l'API simulée et le vrai back.
 */
export const api: Neo4LinkApi = USE_MOCK ? mockApi : realApi

export { USE_MOCK }
export { ApiError } from './api'
