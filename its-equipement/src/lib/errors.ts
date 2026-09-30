/**
 * Erreur métier intentionnelle : message compréhensible par l'utilisateur
 * final (quantité invalide, stock insuffisant, logo manquant…).
 * Les routes la convertissent en 400 avec le message, au lieu d'un 500
 * générique « Erreur serveur ». Toute autre exception reste un vrai 500.
 */
export class BusinessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BusinessError'
  }
}
