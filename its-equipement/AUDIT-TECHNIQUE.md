# Audit technique et feuille de route — ITS Équipement

_Date de l’audit : 28 septembre 2026_

## 1. Périmètre vérifié

Le dépôt contient une application Next.js 16 / React 19, un back-office, Prisma/PostgreSQL, NextAuth, Zustand pour le panier, génération de PDF, notifications WhatsApp et deux providers de paiement (CinetPay et FedaPay). Les appels IA détectés sont uniquement des dépendances/features vides : aucune exécution d’agent n’a été inventée.

Routes publiques vérifiées : accueil, catalogue, catégorie, fiche produit, panier, commande, devis, demande de devis, confirmation, contact, informations légales et livraison. Routes API vérifiées : catalogue/catégories publiques, commande/devis, auth, admin, uploads via les routes admin, et webhook paiement.

## 2. Architecture actuelle

```text
src/app                 pages, layouts et route handlers Next.js
src/components          UI publique, admin et primitives Radix/shadcn
src/lib/services        accès Prisma + règles applicatives + providers externes
src/lib/validation      schémas Zod (admin et désormais commande publique)
src/stores              panier persistant local (Zustand)
src/lib/db.ts           singleton Prisma
prisma/schema.prisma    modèle PostgreSQL
```

Le flux commande réel est : panier Zustand → formulaire `/commande` → `POST /api/public/orders` → validation → relecture des produits Prisma et recalcul des prix → création `PublicOrder` et `PublicOrderItem` → notification WhatsApp asynchrone → traitement admin. Le navigateur ne confirme aucun paiement dans ce parcours. Les pages de devis utilisent aussi le service de commande et produisent ensuite un PDF/devis côté serveur.

## 3. Corrections livrées

### Prix et identité des produits — risque critique

- **Avant :** l’API acceptait `productName`, `unitPrice`, `lineTotal`, SKU et slug envoyés par le navigateur et les persistait tels quels.
- **Cause racine :** absence de validation métier côté service ; la validation HTTP était uniquement syntaxique et partielle.
- **Après :** Zod borne la charge utile ; le service recharge les produits actifs et variantes actives, vérifie leur appartenance, puis recalcule nom, SKU, prix unitaire et total. Un produit supprimé/désactivé ou une variante étrangère renvoie un conflit.
- **Impact :** le total stocké ne peut plus être modifié par DevTools. Le comportement client reste le même lorsque les données sont valides.

### Double soumission — risque élevé

- **Avant :** deux clics ou un retry réseau créaient deux commandes.
- **Après :** `Idempotency-Key` est accepté (16 à 100 caractères) et stocké comme contrainte unique sur `PublicOrder.idempotencyKey`.
- **Limite opérationnelle :** la migration Prisma doit être appliquée à l’environnement (`prisma db push` ou migration versionnée) avant déploiement. Pour couvrir une course entre deux requêtes simultanées, le handler de production doit aussi traiter explicitement `P2002` en relisant la commande par clé ; le contrôle préalable couvre les retries séquentiels.

### Validation et erreurs publiques

- **Avant :** nombreuses conversions `Number(...) || 0`, champs non bornés et erreurs de validation dispersées.
- **Après :** schéma dédié `src/lib/validation/public-order.ts`, limites sur tailles, quantités, frais, email et types de demande. Les détails Prisma/provider ne sont pas renvoyés au client.

### Uploads — risque élevé

- **Avant :** MIME et extension étaient contrôlés, mais tous deux sont contrôlables par le navigateur.
- **Après :** contrôle de signature binaire JPEG/PNG/WebP/AVIF/PDF avant écriture, nom généré par UUID, taille 10 MiB et stockage hors nom original.
- **À faire côté infrastructure :** préférer un stockage objet privé/public signé et un antivirus asynchrone pour les PDF/visuels fournis par des tiers ; `public/uploads` sur filesystem Vercel n’est pas persistant.

### Webhook paiement

La signature HMAC est effectivement vérifiée en temps constant avant parsing et les paiements déjà sortis de `EN_ATTENTE` ne sont pas retraités. **Reste à faire :** le schéma Prisma ne possède pas de journal d’événements provider/idempotence ni de fenêtre timestamp ; ajouter un `PaymentWebhookEvent(provider, providerEventId)` unique après confirmation de l’identifiant réellement fourni par chaque provider. Ne jamais ajouter une validation générique qui ferait croire que le montant est sûr : `confirmPayment` doit encore comparer montant, devise, commande et provider auprès de l’API provider.

## 4. Données et contraintes

Entités principales : `Product`, `Category`, `ProductVariant`, `ProductImage`, `PersonalizationOption`, `Client`, `QuoteRequest`, `Quote`, `Order`, `PublicOrder`, `Payment`, `Delivery`, `StockMovement`, `Notification`, `Upload` et historiques de statut. Les mots de passe admin sont sensibles et ne doivent sortir que hashés/selectionnés explicitement. Les données client, adresse, téléphone et personnalisations sont également sensibles.

Le schéma possède déjà des index utiles sur statuts, dates, FK, recherche de commande et catalogue. `PublicOrder.orderNumber`, `devisNumber`, les SKU et slug sont uniques. Les montants sont actuellement des `Float` : une migration future vers `Decimal` est recommandée avant d’activer un paiement en ligne réel, avec recalcul et test des arrondis.

## 5. API et protections observées

- `/api/public/products`, `/categories` : lecture catalogue, pagination côté produits.
- `/api/public/orders` : public, rate limit mémoire, validation Zod, prix serveur, idempotence optionnelle.
- `/api/public/devis`, `/quote-requests` : public, à aligner sur le même niveau de validation et d’idempotence.
- `/api/admin/**` : middleware + `requireAdmin` côté serveur ; les services admin doivent continuer à ne jamais accepter le rôle du navigateur comme autorité.
- `/api/auth/[...nextauth]` : NextAuth credentials, bcryptjs, secret serveur ; rate limit login en middleware.
- `/api/webhook/payment/[provider]` : HMAC obligatoire si secret configuré, dispatch CinetPay/FedaPay.

Le rate limiting actuel est un `Map` mémoire par instance. Il est utile en développement et protection basique, mais non suffisant en multi-instance/serverless : migrer vers Redis/Upstash ou la protection edge de l’hébergeur, avec quotas distincts login, public order, recherche, admin et webhook.

## 6. Architecture cible progressive

```text
UI (app, components)
  ↓
hooks / stores (état d’affichage, panier)
  ↓
application services (création commande, devis, paiement)
  ↓
domain policies (prix, transitions, stock, idempotence)
  ↓
repositories Prisma (select/where explicites)
  ↓
PostgreSQL          providers (WhatsApp, paiement, stockage)
```

Étapes recommandées sans refactor massif :

1. déplacer chaque `findMany/create` restant dans un repository par feature ;
2. rendre les services purs sur calculs de prix/transitions ;
3. adopter un résultat d’erreur typé et un `requestId` structuré ;
4. mettre les effets WhatsApp/PDF dans une file durable avec retries bornés ;
5. introduire `Decimal` et transaction de réservation de stock avant paiement ;
6. tester les transitions et webhooks par tests d’intégration PostgreSQL.

## 7. Frontend et design

La marque vérifiée est navy profond + or chaud (logo ITS & DG). La base CSS a été alignée sur cette palette, avec focus visible et `prefers-reduced-motion`. L’application conserve les routes, le flux WhatsApp, les données dynamiques du dashboard, les états de chargement et le responsive existants. Aucun visuel marketing n’a été hardcodé et aucun faux paiement n’a été ajouté.

Le catalogue et les fiches produits consomment les images et produits de Prisma. Les prochains gains UX sûrs sont : message d’erreur réseau persistant sur les listes, skeletons communs, pagination accessible avec URL, et `aria-live` sur l’ajout panier/erreurs formulaire.

## 8. Sauvegardes et production

Non configurable depuis ce dépôt : sauvegardes Neon/PostgreSQL, rétention, chiffrement, restauration testée, secrets Vercel et stockage durable. À configurer : sauvegarde quotidienne minimum avec rétention adaptée, restauration mensuelle sur environnement isolé, alerte d’échec, accès séparés, rotation des secrets, et stockage objet pour uploads. Une sauvegarde non restaurée n’est pas une sauvegarde validée.

## 9. Validation effectuée

- `npm run lint` : passe, deux avertissements existants React Hook Form (`watch()` incompatible React Compiler), aucune erreur.
- `npm run build` / génération Prisma : non exécutable dans cet environnement car le téléchargement du moteur Prisma a échoué sur une coupure TLS réseau (`binaries.prisma.sh`). À relancer dans CI ou après rétablissement réseau.
- `npm audit` après installation : 30 avis (2 low, 9 moderate, 17 high, 2 critical). Aucune mise à jour automatique majeure n’a été faite ; chaque avis doit être trié avec son chemin de dépendance avant production.

## 10. Non applicable actuellement

- IA/agent autonome : aucune fonctionnalité correspondante détectée, features IA/mockup vides.
- A2F : non implémentée ; à ajouter uniquement après définition du périmètre des comptes admin.
- RLS PostgreSQL : non activée ; Prisma utilise un accès serveur global, une activation superficielle casserait les opérations. À concevoir avec rôles DB dédiés si multi-tenant.
- Paiement navigateur pour le parcours public : non détecté ; le parcours actuel conserve la prise de commande et le contact commercial/WhatsApp.
