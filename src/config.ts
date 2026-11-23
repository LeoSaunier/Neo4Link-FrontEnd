// Réglages du front, modifiables dans .env.local (voir .env.example).

/**
 * true  -> API simulée (aucun back nécessaire)
 * false -> vrai back FastAPI
 * Par défaut : simulée.
 */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

/**
 * Mot de passe commun aux comptes de démonstration (jeu de données de test, pas un vrai secret).
 * Il sert aux boutons de connexion rapide de la page de connexion.
 * Avec le vrai back, son script seed.py doit hacher ce même mot de passe pour les comptes de démo.
 */
export const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || 'demo1234'
