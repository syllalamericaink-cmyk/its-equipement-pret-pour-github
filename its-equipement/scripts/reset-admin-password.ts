// Script unique : régénère un mot de passe admin robuste, met à jour la DB,
// et écrit le fichier credentials. À n'exécuter qu'une fois en cas de perte
// des identifiants.

import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { randomBytes } from 'crypto'
import { writeFileSync, chmodSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

function generatePassword(length: number = 32): string {
  // base64url : caractères sans ambiguïté (pas de /, +, =), pas d'espace
  // 24 octets → 32 caractères base64url
  return randomBytes(length).toString('base64url').slice(0, length)
}

async function main() {
  const newPassword = generatePassword(32)
  const newEmail = 'admin-its@equippro.local'

  const hashed = await hash(newPassword, 12)

  // Supprime tout admin existant (dev only — en prod on fait un upsert à la place)
  await prisma.admin.deleteMany({
    where: { email: { in: ['admin@equippro.fr', newEmail] } },
  })

  const admin = await prisma.admin.create({
    data: {
      email: newEmail,
      password: hashed,
      name: 'Super Administrateur',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  })

  // Écrit le fichier credentials (droits 600 = seul le propriétaire peut le lire)
  const creds = `===================================================================
    IDENTIFIANTS ADMINISTRATEUR - ITS ÉQUIPEMENT
    À CONSERVER DANS UN COFFRE-FORT (1Password, KeePass, etc.)
===================================================================

URL de connexion :
  Dev  : http://localhost:3000/admin/login
  Prod : https://TON-DOMAINE.vercel.app/admin/login

Email :         ${newEmail}
Mot de passe :  ${newPassword}

-------------------------------------------------------------------
IMPORTANT
-------------------------------------------------------------------
- Mot de passe généré aléatoirement (32 caractères, base64url).
- Ne JAMAIS le commettre dans Git ni le partager par email.
- Après le premier démarrage en production, change ce mot de passe
  via la page "Profil" du tableau de bord admin.
- En cas de perte, exécuter à nouveau :
      bun run scripts/reset-admin-password.ts
===================================================================
`
  const credsPath = join(process.cwd(), 'CREDENTIALS-ADMIN.txt')
  writeFileSync(credsPath, creds, { mode: 0o600 })
  chmodSync(credsPath, 0o600)

  console.log('✓ Admin recréé avec un nouveau mot de passe robuste')
  console.log('  ID    :', admin.id)
  console.log('  Email :', admin.email)
  console.log('  Rôle  :', admin.role)
  console.log('  Fichier credentials :', join(process.cwd(), 'CREDENTIALS-ADMIN.txt'))
  console.log('')
  console.log('⚠ Le mot de passe en clair n\'est JAMAIS affiché ici.')
  console.log('  Consulte le fichier CREDENTIALS-ADMIN.txt (racine du projet) pour le récupérer.')
}

main()
  .catch((e) => {
    console.error('Erreur :', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
