import { redirect } from 'next/navigation'

/**
 * Page de redirection : la connexion administrateur se fait désormais
 * exclusivement sur /admin/login (page unique, plus de doublon).
 */
export default function AuthLoginPage() {
  redirect('/admin/login')
}
