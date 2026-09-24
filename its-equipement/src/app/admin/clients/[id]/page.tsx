'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { adminFetch, adminPut, formatDate } from '@/lib/admin-api'
import { StatusBadge } from '@/components/admin/status-badge'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Save,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'

interface Client {
  id: string
  companyName: string
  contactName: string
  email: string
  phone: string
  address: string
  city: string
  zipCode: string
  country: string
  notes: string
  createdAt: string
  updatedAt: string
  _count: {
    quoteRequests: number
  }
}

interface QuoteRequest {
  id: string
  reference: string
  status: string
  createdAt: string
  _count: {
    items: number
  }
}

export default function FicheClientPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([])
  const [quoteRequestsLoading, setQuoteRequestsLoading] = useState(true)

  const [form, setForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zipCode: '',
    country: '',
    notes: '',
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await adminFetch<Client>(`/api/admin/clients/${id}`)
      if (!cancelled) {
        if (res.success && res.data) {
          setClient(res.data)
          setForm({
            companyName: res.data.companyName ?? '',
            contactName: res.data.contactName ?? '',
            email: res.data.email ?? '',
            phone: res.data.phone ?? '',
            address: res.data.address ?? '',
            city: res.data.city ?? '',
            zipCode: res.data.zipCode ?? '',
            country: res.data.country ?? '',
            notes: res.data.notes ?? '',
          })
        }
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    if (!client?.companyName) return
    let cancelled = false
    ;(async () => {
      setQuoteRequestsLoading(true)
      const params = new URLSearchParams({
        search: client.companyName,
        limit: '50',
      })
      const res = await adminFetch<QuoteRequest[]>(`/api/admin/quote-requests?${params}`)
      if (!cancelled) {
        if (res.success && res.data) {
          setQuoteRequests(res.data)
        }
        setQuoteRequestsLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [client?.companyName])

  const updateField = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    const res = await adminPut(`/api/admin/clients/${id}`, form)
    setSaving(false)
    if (res.success) {
      toast.success('Client mis a jour avec succes')
      if (res.data) {
        setClient(res.data as Client)
      }
    } else {
      toast.error('Erreur lors de la mise a jour du client')
    }
  }, [id, form])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" disabled>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-96 animate-pulse rounded-lg bg-muted" />
          <div className="h-96 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/admin/clients')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <p className="text-muted-foreground">Client introuvable.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/clients')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{client.companyName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Client depuis le {formatDate(client.createdAt)}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Enregistrer
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informations entreprise
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">
                <Building2 className="mr-1.5 inline h-3.5 w-3.5" />
                Entreprise
              </Label>
              <Input
                id="companyName"
                value={form.companyName}
                onChange={(e) => updateField('companyName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">
                <MapPin className="mr-1.5 inline h-3.5 w-3.5" />
                Adresse
              </Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="zipCode">Code postal</Label>
                <Input
                  id="zipCode"
                  value={form.zipCode}
                  onChange={(e) => updateField('zipCode', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => updateField('city', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Pays</Label>
                <Input
                  id="country"
                  value={form.country}
                  onChange={(e) => updateField('country', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contactName">
                <User className="mr-1.5 inline h-3.5 w-3.5" />
                Nom du contact
              </Label>
              <Input
                id="contactName"
                value={form.contactName}
                onChange={(e) => updateField('contactName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="mr-1.5 inline h-3.5 w-3.5" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">
                <Phone className="mr-1.5 inline h-3.5 w-3.5" />
                Telephone
              </Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">
                <FileText className="mr-1.5 inline h-3.5 w-3.5" />
                Notes
              </Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Demandes de devis ({quoteRequestsLoading ? '...' : quoteRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {quoteRequestsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : quoteRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune demande de devis trouvee pour ce client.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Nombre articles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quoteRequests.map((qr) => (
                    <TableRow key={qr.id}>
                      <TableCell>
                        <Link href={`/admin/quote-requests/${qr.id}`} className="font-medium text-primary hover:underline">
                          {qr.reference}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={qr.status} />
                      </TableCell>
                      <TableCell>{formatDate(qr.createdAt)}</TableCell>
                      <TableCell className="text-right">{qr._count.items}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
