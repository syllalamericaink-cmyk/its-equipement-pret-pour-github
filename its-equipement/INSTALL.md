# Installation — EquipPro

## Prérequis

- Node.js 18+
- Bun (optionnel)
- PostgreSQL 14+
- Git

## Cloner le dépôt

```bash
git clone <url-du-depot> && cd equippro
```

## Installer les dépendances

```bash
bun install
```
ou

```bash
npm install
```

## Configurer les variables d'environnement

Copier le fichier d'exemple et remplir les valeurs :

```bash
cp .env.example .env
```

## Variables d'environnement

| Variable | Requise | Description |
|---------|---------|-------------|
| DATABASE_URL | Oui | URL PostgreSQL : postgresql://user:pass@host:5432/db |
| NEXTAUTH_SECRET | Oui | Secret JWT (minimum 32 caractères) |
| NEXTAUTH_URL | Oui | URL de l'application (ex: https://equippro.fr) |
| WHATSAPP_ACCESS_TOKEN | Non | Token WhatsApp Business Platform |
| WHATSAPP_PHONE_NUMBER_ID | Non | ID du numéro WhatsApp Business |
| WHATSAPP_BUSINESS_ACCOUNT_ID | Non | ID du compte WhatsApp Business |
| WHATSAPP_API_VERSION | Non | Version API WhatsApp (défaut: v21.0) |
| WHATSAPP_RECIPIENT_NUMBER | Non | Numéro destinataire notifications |
| PAYMENT_PROVIDER | Non | Fournisseur de paiement (cinetpay\|fedapay) |
| PAYMENT_API_KEY | Non | Clé API du fournisseur de paiement |
| PAYMENT_WEBHOOK_SECRET | Non | Secret pour vérification webhooks |
| PAYMENT_CALLBACK_URL | Non | URL de callback paiement |

## Base de données

1. Créer la base PostgreSQL :

```bash
createdb equippro
```

2. Pousser le schéma :

```bash
npx prisma db push
```

3. (Optionnel) Créer un premier admin :

```bash
bun run prisma/seed.ts
```

4. Générer le client Prisma :

```bash
npx prisma generate
```

## Commandes

- `bun dev` : Serveur de développement (port 3000)
- `bun run build` : Build production
- `bun run start` : Serveur production (standalone)
- `bun run lint` : Lint ESLint
- `npx tsc --noEmit` : Vérification TypeScript
- `npx prisma db push` : Synchroniser le schéma
- `npx prisma generate` : Régénérer le client
- `bun run db:seed` : Créer l'admin par défaut

## Configuration stockage

Les fichiers uploadés sont stockés dans public/uploads/. Les PDF de devis sont dans private/quotes/. Pour la production, utiliser un volume monté ou un stockage objet (S3).

## Configuration WhatsApp

1. Créer un compte Meta Business
2. Configurer WhatsApp Business Platform
3. Obtenir un access token permanent
4. Configurer le phone number ID
5. Remplir WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID

## Configuration paiement

1. Créer un compte CinetPay ou FedaPay
2. Obtenir la clé API
3. Configurer l'URL de webhook : https://votre-domaine.com/api/webhook/payment/cinetpay
4. Remplir PAYMENT_PROVIDER, PAYMENT_API_KEY, PAYMENT_WEBHOOK_SECRET

## Création du premier admin

Le seed crée un admin avec un **mot de passe aléatoire** affiché une seule
fois dans la console :

```bash
bun run db:seed
```

Alternative (recommandé en production) :

```bash
bun run scripts/reset-admin-password.ts
```

Ce script génère un mot de passe robuste de 32 caractères et l'écrit dans
`/home/z/my-project/download/CREDENTIALS-ADMIN.txt`. À conserver dans un
coffre-fort (1Password, KeePass, etc.).

**Aucun identifiant n'est hardcodé dans le code source.**

## Procédure de déploiement

1. Build :

```bash
bun run build
```

2. Le dossier .next/standalone/ contient le serveur autonome
3. Copier .next/standalone/, .next/static/, et public/ sur le serveur
4. Lancer :

```bash
NODE_ENV=production node .next/standalone/server.js
```

5. Configurer un reverse proxy (Caddy/Nginx) avec HTTPS
6. Configurer les variables d'environnement sur le serveur

## Sauvegarde

- Sauvegarder la base PostgreSQL : `pg_dump equippro > backup.sql`
- Sauvegarder le dossier private/quotes/ (PDFs)
- Sauvegarder le dossier public/uploads/ (images uploadées)