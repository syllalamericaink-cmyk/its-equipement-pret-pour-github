import { redirect } from 'next/navigation'
import { adminPath } from '@/lib/admin-path'

/**
 * Page de redirection : la connexion administrateur se fait désormais
 * exclusivement sur /admin/login (page unique, plus de doublon).
 */
export default function AuthLoginPage() {
  redirect(adminPath('/login'))
}
