import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seed() {
  // Create category
  const cat = await prisma.category.upsert({
    where: { slug: 'equipements-de-protection-individuelle' },
    update: {},
    create: {
      name: 'Équipements de Protection Individuelle',
      slug: 'equipements-de-protection-individuelle',
      description: 'Casques, gants, lunettes, chaussures de sécurité et tous les EPI conformes aux normes en vigueur.',
      sortOrder: 1,
      isActive: true,
    },
  })
  console.log('Category:', cat.name)

  // Create product
  const product = await prisma.product.upsert({
    where: { sku: 'EPI-CASQ-001' },
    update: {},
    create: {
      name: 'Casque de sécurité blanc avec jugulaire',
      slug: 'casque-securite-blanc-jugulaire',
      sku: 'EPI-CASQ-001',
      description: 'Casque de sécurité haute résistance EN 397. Coque en polyéthylène, jugulaire réglable 4 points, ventilation intégrée. Idéal pour chantiers BTP et industries. Disponible en blanc, jaune, rouge et bleu avec personnalisation logo possible.',
      basePrice: 3500,
      categoryId: cat.id,
      isPersonalizable: true,
      minQuantity: 10,
      isActive: true,
    },
  })
  console.log('Product:', product.name)

  // Create variant
  const variant = await prisma.productVariant.upsert({
    where: { sku: 'EPI-CASQ-001-BLANC' },
    update: {},
    create: {
      productId: product.id,
      name: 'Blanc',
      sku: 'EPI-CASQ-001-BLANC',
      priceModifier: 0,
      stock: 500,
      alertThreshold: 50,
      isActive: true,
    },
  })
  console.log('Variant:', variant.name)

  // Create personalization option
  const perso = await prisma.personalizationOption.create({
    data: {
      productId: product.id,
      type: 'logo',
      label: 'Logo entreprise (impression avant)',
      isRequired: false,
      config: { position: 'avant', maxSize: '8x4cm', technique: 'sérigraphie' },
      sortOrder: 1,
      isActive: true,
    },
  })
  console.log('Personalization:', perso.label)

  console.log('\n✅ Demo product created successfully!')
  await prisma.$disconnect()
}

seed().catch((e) => {
  console.error(e)
  process.exit(1)
})
