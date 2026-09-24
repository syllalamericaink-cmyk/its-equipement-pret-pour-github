import { db } from '../db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'image/avif',
]

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.pdf', '.webp', '.avif'])

const MAX_FILE_SIZE = 10 * 1024 * 1024

export async function uploadFile(
  file: File,
  entityType: string,
  entityId?: string
) {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Type de fichier non autorise')
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Fichier trop volumineux')
  }

  if (file.size === 0) {
    throw new Error('Fichier vide')
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const rawExt = path.extname(file.name).toLowerCase()
  const ext = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : '.bin'
  const uniqueName = `${randomUUID()}${ext}`
  const relativePath = `/uploads/${uniqueName}`
  const absolutePath = path.join(process.cwd(), 'public', 'uploads', uniqueName)

  await mkdir(path.join(process.cwd(), 'public', 'uploads'), { recursive: true })
  await writeFile(absolutePath, buffer)

  const upload = await db.upload.create({
    data: {
      filename: uniqueName,
      originalName: file.name,
      url: relativePath,
      mimeType: file.type,
      size: file.size,
      entityType: entityType.slice(0, 50),
      entityId,
    },
  })

  return upload
}

export async function getUploads(entityType?: string, entityId?: string) {
  const where: Record<string, unknown> = {}
  if (entityType) where.entityType = entityType
  if (entityId) where.entityId = entityId

  return db.upload.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
}

export async function deleteUpload(id: string) {
  const upload = await db.upload.findUnique({ where: { id } })
  if (!upload) throw new Error('Fichier introuvable')

  if (upload.url.startsWith('/uploads/')) {
    const filePath = path.join(process.cwd(), 'public', upload.url)
    try {
      const { unlink } = await import('fs/promises')
      await unlink(filePath)
    } catch {
    }
  }

  return db.upload.delete({ where: { id } })
}
