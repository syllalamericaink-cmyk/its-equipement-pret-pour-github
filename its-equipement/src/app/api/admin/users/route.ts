/**
 * Gestion des comptes administrateurs — ADMIN UNIQUEMENT (rôle ADMIN).
 *
 *   GET  /api/admin/users   → liste des comptes admin
 *   POST /api/admin/users   → crée un compte admin
 *                            { name, email, password, role? }
 */

import { requireAdmin } from '@/lib/api-auth'
import { success, error, serverError } from '@/lib/api-response'
import { db } from '@/lib/db'
import { hash } from 'bcryptjs'
import type { NextRequest } from 'next/server'

const BCRYPT_SALT_ROUNDS = 12
const VALID_ROLES = ['ADMIN', 'VIEWER']

export async function GET(request: NextRequest) {
  try {
    const { error: authError, session } = await requireAdmin(request)
    if (authError) return authError
    if (session!.user.role !== 'ADMIN') {
      return error('Seul un administrateur peut gérer les comptes.', 403)
    }

    const users = await db.admin.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
      },
    })

    return success(users)
  } catch (err) {
    console.error('[api /admin/users] Erreur:', err)
    return serverError()
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error: authError, session } = await requireAdmin(request)
    if (authError) return authError
    if (session!.user.role !== 'ADMIN') {
      return error('Seul un administrateur peut créer des comptes.', 403)
    }

    const body = (await request.json().catch(() => ({}))) as {
      name?: string
      email?: string
      password?: string
      role?: string
    }

    const name = body.name?.trim() ?? ''
    const email = body.email?.trim().toLowerCase() ?? ''
    const password = body.password ?? ''
    const role = VALID_ROLES.includes(body.role ?? '') ? body.role! : 'ADMIN'

    if (!name || name.length > 100) return error('Le nom est requis (100 caractères maximum)')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error('Adresse email invalide')
    if (password.length < 8) return error('Le mot de passe doit contenir au moins 8 caractères')

    const existing = await db.admin.findUnique({ where: { email } })
    if (existing) return error('Un compte existe déjà avec cet email')

    const hashed = await hash(password, BCRYPT_SALT_ROUNDS)
    const user = await db.admin.create({
      data: { name, email, password: hashed, role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
      },
    })

    return success(user)
  } catch (err) {
    console.error('[api /admin/users] Erreur:', err)
    return serverError()
  }
}
