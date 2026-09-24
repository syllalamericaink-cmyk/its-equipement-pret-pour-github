import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

// Pattern officiel NextAuth v4 + App Router :
// On exporte simplement le handler. Le rate-limiting spécifique au login
// est géré par le middleware global (src/middleware.ts) pour la route
// POST /api/auth/callback/credentials.
const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
