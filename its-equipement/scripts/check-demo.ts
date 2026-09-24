import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const product = await prisma.product.findFirst({
    where: { sku: 'EPI-CASQ-001' },
    include: { variants: true, category: true, images: true, personalizationOptions: true }
  })
  if (product) {
    console.log('Product:', product.name, '| SKU:', product.sku, '| Price:', product.basePrice, '| Active:', product.isActive)
    console.log('Category:', product.category?.name)
    console.log('Variants:', product.variants.map(v => `${v.name} (stock: ${v.stock})`).join(', '))
    console.log('Images:', product.images.length)
    console.log('Personalization:', product.personalizationOptions.map(o => o.label).join(', '))
  } else {
    console.log('NOT FOUND')
  }
  await prisma.$disconnect()
}
main()
