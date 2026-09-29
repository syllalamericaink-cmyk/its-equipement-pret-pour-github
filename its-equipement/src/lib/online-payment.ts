/**
 * Drapeau central du paiement en ligne.
 *
 * STATUT ACTUEL : DÉSACTIVÉ (défaut). Aucune commande ne dépend d'un paiement
 * en ligne : le client commande sans payer sur le site, et les paiements
 * (espèces, mobile money, virement) sont enregistrés manuellement par
 * l'administrateur après encaissement réel.
 *
 * Pour réactiver un jour CinetPay/FedaPay :
 *   1. Créer le compte marchand et obtenir les clés API.
 *   2. Ajouter ONLINE_PAYMENT_ENABLED=true + PAYMENT_WEBHOOK_SECRET dans les
 *      variables d'environnement Vercel.
 *   3. Redéployer — le webhook et l'initiation de paiement se réactivent.
 *
 * Garde-fous appliqués quand le drapeau est OFF :
 *   - POST /api/webhook/payment/[provider]   → 503 (aucun paiement ne peut
 *     être confirmé, même avec une signature valide)
 *   - POST /api/admin/payments (initiation)  → 403 (aucun paiement en ligne
 *     ne peut être créé)
 *   - payment.service.initiatePayment()      → erreur (défense en profondeur)
 */
export function isOnlinePaymentEnabled(): boolean {
  return process.env.ONLINE_PAYMENT_ENABLED === 'true'
}
