# ITS Équipement — Boutique en ligne (EquipPro)

Site e-commerce Next.js 16 avec back-office admin, base de données PostgreSQL (Neon), authentification NextAuth, notifications WhatsApp et génération de devis PDF.

## Démarrage rapide

```bash
npm install
cp .env.example .env.local   # puis remplir les valeurs
npm run db:push              # créer les tables (DATABASE_URL requis)
npm run db:seed              # créer le compte admin
npm run dev                  # http://localhost:3000
```

Le back-office est accessible sur `/admin/login`.

## Déploiement

Voir **GUIDE-DEPLOIEMENT** (GitHub → Neon → Vercel) et `INSTALL.md`.

- Hébergement : Vercel
- Base de données : PostgreSQL (Neon.tech, plan gratuit)
- ⚠️ Ce site est une application Next.js avec base de données : il ne fonctionne PAS sur un hébergeur statique (Netlify Pages, GitHub Pages, etc.)

## Scripts utiles

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement (port 3000) |
| `npm run build` | Build production (génère le client Prisma) |
| `npm start` | Serveur production |
| `npm run db:push` | Synchroniser le schéma Prisma avec la base |
| `npm run db:seed` | Créer le compte admin (mot de passe aléatoire affiché une fois) |
| `npx tsx scripts/reset-admin-password.ts` | Régénérer le mot de passe admin perdu (écrit CREDENTIALS-ADMIN.txt) |
.
