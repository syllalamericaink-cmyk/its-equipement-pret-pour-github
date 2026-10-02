import { redirect } from 'next/navigation'
import { adminPath } from '@/lib/admin-path'

export default function AdminPage() {
  redirect(adminPath('/dashboard'))
}