import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  // --- Admin par défaut ---
  // Les credentials ne sont PLUS hardcodés. Le seed crée un admin avec un
  // mot de passe aléatoire affiché UNE seule fois dans la console.
  // En production, préférer `bun run scripts/reset-admin-password.ts`
  // qui écrit un fichier credentials séparé.
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin-its@equippro.local'
  const existingAdmin = await prisma.admin.findUnique({ where: { email: adminEmail } })
  if (!existingAdmin) {
    const temporaryPassword = randomBytes(24).toString('base64url').slice(0, 32)
    const hashedPassword = await hash(temporaryPassword, 12)
    await prisma.admin.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'Super Administrateur',
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    })
    console.log('================================================================')
    console.log('  ADMIN PAR DÉFAUT CRÉÉ (note ce mot de passe, il ne s\'affichera plus)')
    console.log('================================================================')
    console.log(`  Email : ${adminEmail}`)
    console.log(`  Mot de passe (temporaire) : ${temporaryPassword}`)
    console.log('  → Change-le immédiatement après le 1er login.')
    console.log('================================================================')
  } else {
    console.log(`Admin déjà existant pour ${adminEmail}, ignoré.`)
  }

  const settings = [
    { key: 'COMPANY_NAME', value: 'ITS Équipement', type: 'STRING', label: 'Nom de l\'entreprise', category: 'company' },
    { key: 'COMPANY_ADDRESS', value: '', type: 'STRING', label: 'Adresse de l\'entreprise', category: 'company' },
    { key: 'COMPANY_PHONE', value: '', type: 'STRING', label: 'Téléphone de l\'entreprise', category: 'company' },
    { key: 'COMPANY_EMAIL', value: '', type: 'STRING', label: 'Email de l\'entreprise', category: 'company' },
    { key: 'TVA_RATE', value: '0.20', type: 'NUMBER', label: 'Taux de TVA par défaut', category: 'billing' },
    { key: 'QUOTE_VALIDITY_DAYS', value: '30', type: 'NUMBER', label: 'Durée de validité des devis (jours)', category: 'billing' },
    { key: 'BANK_DETAILS', value: '', type: 'STRING', label: 'Coordonnées bancaires (RIB)', category: 'billing' },
    { key: 'DEPOSIT_PERCENTAGE', value: '50', type: 'NUMBER', label: 'Pourcentage d\'acompte (impression)', category: 'billing' },
    { key: 'BALANCE_PERCENTAGE', value: '50', type: 'NUMBER', label: 'Pourcentage du solde (impression)', category: 'billing' },
    { key: 'WHATSAPP_NUMBER', value: '', type: 'STRING', label: 'Numéro WhatsApp de l\'entreprise', category: 'whatsapp' },
    { key: 'WHATSAPP_RECIPIENT_NUMBER', value: '', type: 'STRING', label: 'Numéro destinataire notifications', category: 'whatsapp' },
    { key: 'WHATSAPP_ACCESS_TOKEN', value: '', type: 'STRING', label: 'WhatsApp Access Token', category: 'whatsapp' },
    { key: 'WHATSAPP_PHONE_NUMBER_ID', value: '', type: 'STRING', label: 'WhatsApp Phone Number ID', category: 'whatsapp' },
    { key: 'MAINTENANCE_MODE', value: 'false', type: 'BOOLEAN', label: 'Mode maintenance', category: 'system' },
  ]

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value, type: setting.type, label: setting.label, category: setting.category },
      create: setting,
    })
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
