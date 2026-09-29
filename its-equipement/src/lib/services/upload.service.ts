import { db } from '../db'

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'application/pdf',
]

const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4 Mo — stocké en base64 dans la base (compatible Vercel)

/**
 * Enregistre un fichier dans la base de données (base64).
 * Le système de fichiers n'est pas persistant sur Vercel (serverless),
 * donc le stockage en base est la seule option fiable.
 */
export async function uploadFile(
  file: File,
  entityType: string,
  entityId?: string
) {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Type de fichier non autorisé (formats acceptés : JPG, PNG, WEBP, AVIF, PDF)')
  }

  if (file.size === 0) {
    throw new Error('Fichier vide')
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Fichier trop volumineux (maximum 4 Mo)')
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const base64 = buffer.toString('base64')

  const safeName = file.name.replace(/[^\w.\-() ]+/g, '_').slice(0, 180) || 'fichier'

  const upload = await db.upload.create({
    data: {
      filename: `${Date.now()}-${safeName}`,
      originalName: safeName,
      url: '',
      mimeType: file.type,
      size: file.size,
      entityType: entityType.slice(0, 50),
      entityId: entityId ?? null,
      data: base64,
    },
    select: {
      id: true,
      filename: true,
      originalName: true,
      mimeType: true,
      size: true,
      entityType: true,
      entityId: true,
      createdAt: true,
    },
  })

  return upload
}

/** Liste les métadonnées d'uploads par identifiants (jamais le contenu binaire). */
export async function getUploadsByIds(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))].slice(0, 100)
  if (unique.length === 0) return []
  return db.upload.findMany({
    where: { id: { in: unique } },
    select: {
      id: true,
      filename: true,
      originalName: true,
      mimeType: true,
      size: true,
      entityType: true,
      entityId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}

/** Récupère le contenu binaire d'un upload (pour le téléchargement admin). */
export async function getUploadContent(id: string) {
  const upload = await db.upload.findUnique({ where: { id } })
  if (!upload || !upload.data) return null
  return {
    buffer: Buffer.from(upload.data, 'base64'),
    mimeType: upload.mimeType,
    filename: upload.originalName,
  }
}
