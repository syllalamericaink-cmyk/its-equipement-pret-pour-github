// Seed supplémentaire : catégories + produits démo pour ITS Équipement
// À exécuter après prisma/seed.ts : bun run prisma/seed-demo.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 1. Catégories
  const catEpi = await prisma.category.upsert({
    where: { slug: 'epi' },
    update: {},
    create: {
      name: 'Équipement de Protection Individuelle',
      slug: 'epi',
      description: 'Casques, gants, chaussures, gilets et accessoires de sécurité.',
      sortOrder: 1,
      isActive: true,
    },
  })

  const catOutillage = await prisma.category.upsert({
    where: { slug: 'outillage' },
    update: {},
    create: {
      name: 'Outillage professionnel',
      slug: 'outillage',
      description: 'Perceuses, visseuses, scies et outillage à main.',
      sortOrder: 2,
      isActive: true,
    },
  })

  const catSignalisation = await prisma.category.upsert({
    where: { slug: 'signalisation' },
    update: {},
    create: {
      name: 'Signalisation',
      slug: 'signalisation',
      description: 'Cônes, barrières, panneaux et équipements de signalisation.',
      sortOrder: 3,
      isActive: true,
    },
  })

  // 2. Produits démo
  const products = [
    {
      name: 'Casque de chantier blanc',
      slug: 'casque-chantier-blanc',
      sku: 'EPI-CASQ-001',
      basePrice: 8500,
      categoryId: catEpi.id,
      description: 'Casque de protection ABS blanc, norme EN 397. Légère et respirante, sangle réglable.',
      isPersonalizable: true,
      variants: [
        { name: 'Taille unique', sku: 'EPI-CASQ-001-U', priceModifier: 0, stock: 50 },
      ],
      persoOptions: [
        { type: 'text', label: 'Texte à imprimer (nom/entreprise)', isRequired: false },
      ],
    },
    {
      name: 'Gants anti-coutures nitrile',
      slug: 'gants-anticoutures-nitrile',
      sku: 'EPI-GANT-002',
      basePrice: 2500,
      categoryId: catEpi.id,
      description: 'Gants enduits nitrile, résistant aux coupures et à la perforation. Paume antidérapante.',
      isPersonalizable: false,
      variants: [
        { name: 'Taille S', sku: 'EPI-GANT-002-S', priceModifier: 0, stock: 80 },
        { name: 'Taille M', sku: 'EPI-GANT-002-M', priceModifier: 0, stock: 100 },
        { name: 'Taille L', sku: 'EPI-GANT-002-L', priceModifier: 0, stock: 60 },
        { name: 'Taille XL', sku: 'EPI-GANT-002-XL', priceModifier: 0, stock: 40 },
      ],
      persoOptions: [],
    },
    {
      name: 'Perceuse sans-fil 18V',
      slug: 'perceuse-sansfil-18v',
      sku: 'OUT-PCDV-001',
      basePrice: 65000,
      categoryId: catOutillage.id,
      description: 'Perceuse-visseuse 18V, 2 batteries Li-ion, chargeur rapide, mallette de transport incluse.',
      isPersonalizable: false,
      variants: [
        { name: 'Standard', sku: 'OUT-PCDV-001-S', priceModifier: 0, stock: 15 },
        { name: 'Version Pro (couple 60 Nm)', sku: 'OUT-PCDV-001-P', priceModifier: 15000, stock: 8 },
      ],
      persoOptions: [],
    },
    {
      name: 'Cône de signalisation 70 cm',
      slug: 'cone-signalisation-70cm',
      slug_alt: '',
      basePrice: 3500,
      sku: 'SIG-CONE-001',
      categoryId: catSignalisation.id,
      description: 'Cône PVC orange avec bande réfléchissant. Base stable. Idéal chantier et parking.',
      isPersonalizable: true,
      variants: [
        { name: 'Sans logo', sku: 'SIG-CONE-001-N', priceModifier: 0, stock: 120 },
        { name: 'Avec logo entreprise', sku: 'SIG-CONE-001-L', priceModifier: 1500, stock: 30 },
      ],
      persoOptions: [
        { type: 'logo', label: 'Logo à imprimer', isRequired: false },
        { type: 'text', label: 'Texte additionnel', isRequired: false },
      ],
    },
    {
      name: 'Chaussures de sécurité S3',
      slug: 'chaussures-securite-s3',
      sku: 'EPI-CHAU-001',
      basePrice: 18000,
      categoryId: catEpi.id,
      description: 'Chaussures S3 coque acier, semelle anti-perforation, tige cuir, doublure respirante.',
      isPersonalizable: false,
      variants: [
        { name: 'Taille 40', sku: 'EPI-CHAU-001-40', priceModifier: 0, stock: 10 },
        { name: 'Taille 41', sku: 'EPI-CHAU-001-41', priceModifier: 0, stock: 12 },
        { name: 'Taille 42', sku: 'EPI-CHAU-001-42', priceModifier: 0, stock: 15 },
        { name: 'Taille 43', sku: 'EPI-CHAU-001-43', priceModifier: 0, stock: 14 },
        { name: 'Taille 44', sku: 'EPI-CHAU-001-44', priceModifier: 0, stock: 9 },
        { name: 'Taille 45', sku: 'EPI-CHAU-001-45', priceModifier: 0, stock: 6 },
      ],
      persoOptions: [],
    },
    {
      name: 'Gilet haute visibilité jaune',
      slug: 'gilets-haute-visibilite-jaune',
      sku: 'EPI-GILE-001',
      basePrice: 4500,
      categoryId: catEpi.id,
      description: 'Gilet Classe 2, tissu respirant, bandes réfléchissantes 5 cm. Lavable en machine.',
      isPersonalizable: true,
      variants: [
        { name: 'Taille M', sku: 'EPI-GILE-001-M', priceModifier: 0, stock: 40 },
        { name: 'Taille L', sku: 'EPI-GILE-001-L', priceModifier: 0, stock: 35 },
        { name: 'Taille XL', sku: 'EPI-GILE-001-XL', priceModifier: 0, stock: 25 },
      ],
      persoOptions: [
        { type: 'text', label: 'Texte à imprimer (dos)', isRequired: false },
        { type: 'logo', label: 'Logo poitrine', isRequired: false },
      ],
    },
  ] as const

  for (const p of products) {
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } })
    if (existing) continue

    const created = await prisma.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        basePrice: p.basePrice,
        categoryId: p.categoryId,
        description: p.description,
        isPersonalizable: p.isPersonalizable,
        minQuantity: 1,
        isActive: true,
        variants: {
          create: p.variants.map((v) => ({
            name: v.name,
            sku: v.sku,
            priceModifier: v.priceModifier,
            stock: v.stock,
            alertThreshold: 10,
            isActive: true,
          })),
        },
        personalizationOptions: (p as { persoOptions?: ReadonlyArray<{ type: string; label: string; isRequired: boolean }> }).persoOptions?.length
          ? {
              create: ([...(p as { persoOptions: ReadonlyArray<{ type: string; label: string; isRequired: boolean }> }).persoOptions]).map((opt, idx) => ({
                type: opt.type,
                label: opt.label,
                isRequired: opt.isRequired,
                sortOrder: idx,
                isActive: true,
              })),
            }
          : undefined,
      },
    })

    console.log(`✓ Produit créé : ${created.name} (${created.sku})`)
  }

  console.log('\n=== Seed démo terminé ===')
  console.log(`Catégories : ${await prisma.category.count()}`)
  console.log(`Produits : ${await prisma.product.count()}`)
  console.log(`Variantes : ${await prisma.productVariant.count()}`)
  console.log(`Options perso : ${await prisma.personalizationOption.count()}`)
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
