import sharp from 'sharp'
import { db } from '../db'

// Photos affichées sur le site : redimensionnées et converties en WebP pour
// un chargement rapide sur mobile. Les logos clients (impression) restent intacts.
const OPTIMIZE: Record<string, { maxSize: number }> = {
  'product-image': { maxSize: 1600 },
  'hero-image': { maxSize: 2400 },
}

async function optimizeImage(buffer: Buffer, maxSize: number): Promise<Buffer | null> {
  try {
    return await sharp(buffer, { failOn: 'error' })
      .rotate() // respecte l'orientation des photos de téléphone
      .resize({ width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer()
  } catch (err) {
    console.error('[upload] Optimisation impossible, original conservé:', err)
    return null // fichier illisible par sharp : on garde l'original
  }
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'application/pdf',
]

/**
 * Vérifie les premiers octets du fichier : le type annoncé par le navigateur
 * ne suffit pas (un fichier HTML renommé en .png serait sinon accepté).
 */
function matchesSignature(buf: Buffer, mime: string): boolean {
  const ascii = (start: number, end: number) => buf.subarray(start, end).toString('latin1')
  switch (mime) {
    case 'image/jpeg':
      return buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
    case 'image/png':
      return ascii(1, 4) === 'PNG' && buf[0] === 0x89
    case 'image/webp':
      return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP'
    case 'image/avif':
      return ascii(4, 8) === 'ftyp'
    case 'application/pdf':
      return ascii(0, 5) === '%PDF-'
    default:
      return false
  }
}

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

  let buffer: Buffer = Buffer.from(await file.arrayBuffer())
  if (!matchesSignature(buffer, file.type)) {
    throw new Error('Le contenu du fichier ne correspond pas à son format')
  }
  let mimeType = file.type
  let safeName = file.name.replace(/[^\w.\-() ]+/g, '_').slice(0, 180) || 'fichier'

  const optimize = file.type.startsWith('image/') ? OPTIMIZE[entityType] : undefined
  if (optimize) {
    const optimized = await optimizeImage(buffer, optimize.maxSize)
    if (optimized && optimized.length < buffer.length) {
      buffer = optimized
      mimeType = 'image/webp'
      safeName = safeName.replace(/\.[a-z0-9]+$/i, '') + '.webp'
    }
  }
  const base64 = buffer.toString('base64')

  const upload = await db.upload.create({
    data: {
      filename: `${Date.now()}-${safeName}`,
      originalName: safeName,
      url: '',
      mimeType,
      size: buffer.length,
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
