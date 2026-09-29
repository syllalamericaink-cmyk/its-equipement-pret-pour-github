'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/admin/page-header'
import { adminFetch, adminPut } from '@/lib/admin-api'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Loader2, Save, KeyRound } from 'lucide-react'

interface Setting {
  id: string
  key: string
  value: string
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON'
  label: string
  category: string | null
  updatedAt: string
}

interface AdminProfile {
  id: string
  email: string
  name: string
  role: string
  lastLogin: string | null
  createdAt: string
}

type CategoryKey = 'entreprise' | 'facturation' | 'whatsapp' | 'systeme' | 'compte'

/** Correspondance clé → onglet (alignée sur prisma/seed.ts). */
const CATEGORY_MAP: Record<string, Exclude<CategoryKey, 'compte'>> = {
  COMPANY_NAME: 'entreprise',
  COMPANY_ADDRESS: 'entreprise',
  COMPANY_PHONE: 'entreprise',
  COMPANY_EMAIL: 'entreprise',
  COMPANY_SIRET: 'entreprise',
  COMPANY_VAT_NUMBER: 'entreprise',
  LOGO_URL: 'entreprise',
  CURRENCY: 'entreprise',
  TVA_RATE: 'facturation',
  QUOTE_VALIDITY_DAYS: 'facturation',
  BANK_DETAILS: 'facturation',
  DEPOSIT_PERCENTAGE: 'facturation',
  BALANCE_PERCENTAGE: 'facturation',
  SALE_CONDITIONS: 'facturation',
  WHATSAPP_NUMBER: 'whatsapp',
  WHATSAPP_RECIPIENT_NUMBER: 'whatsapp',
  WHATSAPP_ACCESS_TOKEN: 'whatsapp',
  WHATSAPP_PHONE_NUMBER_ID: 'whatsapp',
  MAINTENANCE_MODE: 'systeme',
}

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: 'entreprise', label: 'Entreprise' },
  { key: 'facturation', label: 'Facturation & devis' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'systeme', label: 'Système' },
  { key: 'compte', label: 'Mon compte' },
]

function getCategoryForSetting(setting: Setting): CategoryKey {
  if (CATEGORY_MAP[setting.key]) return CATEGORY_MAP[setting.key]
  // Repli : catégorie en base ('company', 'billing', 'whatsapp', 'system')
  const dbCategory = setting.category
  if (dbCategory === 'company') return 'entreprise'
  if (dbCategory === 'billing') return 'facturation'
  if (dbCategory === 'whatsapp') return 'whatsapp'
  if (dbCategory === 'system') return 'systeme'
  return 'entreprise'
}

function SettingField({
  setting,
  value,
  onChange,
}: {
  setting: Setting
  value: string
  onChange: (value: string) => void
}) {
  const isSecret = setting.key.includes('TOKEN')

  if (setting.type === 'BOOLEAN') {
    const checked = value === 'true'
    return (
      <div className="flex items-center justify-between rounded-lg border p-4">
        <Label htmlFor={setting.key} className="cursor-pointer text-sm font-medium">
          {setting.label}
        </Label>
        <Switch
          id={setting.key}
          checked={checked}
          onCheckedChange={(v) => onChange(String(v))}
        />
      </div>
    )
  }

  if (setting.type === 'JSON') {
    return (
      <div className="space-y-2">
        <Label htmlFor={setting.key} className="text-sm font-medium">
          {setting.label}
        </Label>
        <Textarea
          id={setting.key}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="font-mono text-sm"
        />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={setting.key} className="text-sm font-medium">
        {setting.label}
      </Label>
      <Input
        id={setting.key}
        type={isSecret ? 'password' : setting.type === 'NUMBER' ? 'number' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={isSecret ? 'off' : undefined}
      />
    </div>
  )
}

function CategorySettings({
  category,
  allSettings,
  values,
  onChange,
}: {
  category: CategoryKey
  allSettings: Setting[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
}) {
  const [saving, setSaving] = useState(false)
  const categorySettings = allSettings.filter((s) => getCategoryForSetting(s) === category)

  const handleSave = useCallback(async () => {
    setSaving(true)
    // On préserve la catégorie d'origine en base (ne pas écraser avec la clé d'onglet)
    const body = categorySettings.map((s) => ({
      key: s.key,
      value: values[s.key] ?? s.value,
      type: s.type,
      label: s.label,
      category: s.category ?? undefined,
    }))
    const res = await adminPut<Setting[]>('/api/admin/settings', { settings: body })
    setSaving(false)
    if (res.success) {
      toast.success('Paramètres enregistrés avec succès.')
    } else {
      toast.error(res.error ?? 'Erreur lors de la sauvegarde.')
    }
  }, [categorySettings, values])

  if (categorySettings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Aucun paramètre dans cette catégorie.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {CATEGORIES.find((c) => c.key === category)?.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {categorySettings.map((setting) => (
          <SettingField
            key={setting.key}
            setting={setting}
            value={values[setting.key] ?? setting.value}
            onChange={(v) => onChange(setting.key, v)}
          />
        ))}
      </CardContent>
      <CardFooter className="justify-end border-t pt-6">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Enregistrer
        </Button>
      </CardFooter>
    </Card>
  )
}

function AccountSettings() {
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      const res = await adminFetch<AdminProfile>('/api/admin/profile')
      if (res.success && res.data) {
        setProfile(res.data)
      }
    })()
  }, [])

  const handleChangePassword = useCallback(async () => {
    if (newPassword.length < 8) {
      toast.error('Le nouveau mot de passe doit contenir au moins 8 caractères')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Les deux mots de passe ne correspondent pas')
      return
    }
    setSaving(true)
    const res = await adminPut('/api/admin/profile', { currentPassword, newPassword })
    setSaving(false)
    if (res.success) {
      toast.success('Mot de passe modifié avec succès')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } else {
      toast.error(res.error ?? 'Erreur lors du changement de mot de passe')
    }
  }, [currentPassword, newPassword, confirmPassword])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informations du compte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Nom :</span> <span className="font-medium">{profile?.name ?? '…'}</span></p>
          <p><span className="text-muted-foreground">Email :</span> <span className="font-medium">{profile?.email ?? '…'}</span></p>
          <p><span className="text-muted-foreground">Rôle :</span> <span className="font-medium">{profile?.role ?? '…'}</span></p>
          <p>
            <span className="text-muted-foreground">Dernière connexion :</span>{' '}
            <span className="font-medium">{profile?.lastLogin ? new Date(profile.lastLogin).toLocaleString('fr-FR') : '—'}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="h-5 w-5" />
            Changer le mot de passe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Mot de passe actuel</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="new-password">Nouveau mot de passe (8 caractères minimum)</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end border-t pt-6">
          <Button
            onClick={handleChangePassword}
            disabled={saving || !currentPassword || !newPassword || !confirmPassword}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
            Mettre à jour le mot de passe
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function ParametresPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<CategoryKey>('entreprise')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await adminFetch<Setting[]>('/api/admin/settings')
      if (!cancelled) {
        if (res.success && res.data) {
          setSettings(res.data)
          const initial: Record<string, string> = {}
          res.data.forEach((s) => {
            initial[s.key] = s.value
          })
          setValues(initial)
        } else {
          toast.error(res.error || 'Erreur lors du chargement des paramètres')
        }
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const handleChange = useCallback((key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader title="Paramètres" description="Configuration générale de la plateforme." />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-[400px]" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </CardContent>
            <CardFooter className="justify-end">
              <Skeleton className="h-10 w-32" />
            </CardFooter>
          </Card>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CategoryKey)}>
          <TabsList className="flex-wrap">
            {CATEGORIES.map((cat) => (
              <TabsTrigger key={cat.key} value={cat.key}>
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {CATEGORIES.map((cat) => (
            <TabsContent key={cat.key} value={cat.key}>
              {cat.key === 'compte' ? (
                <AccountSettings />
              ) : (
                <CategorySettings
                  category={cat.key}
                  allSettings={settings}
                  values={values}
                  onChange={handleChange}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}
