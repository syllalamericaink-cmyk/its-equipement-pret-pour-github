'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/admin/page-header'
import { adminFetch, adminPut, adminPost, adminPatch, adminDelete } from '@/lib/admin-api'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Save,
  KeyRound,
  Send,
  RefreshCw,
  Table2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Plus,
  Trash2,
} from 'lucide-react'

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

type CategoryKey = 'entreprise' | 'facturation' | 'whatsapp' | 'systeme' | 'compte' | 'integrations' | 'administration'

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
  { key: 'integrations', label: 'Intégrations' },
  { key: 'administration', label: 'Administration' },
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

/* ============================== Intégrations ============================== */

interface IntegrationsStatus {
  telegram: {
    configured: boolean
    botUsername: string | null
    chatId: string | null
    chatCandidates: { id: string; type: string; name: string }[]
    testMessage?: { success: boolean; detail: string }
    hint: string
  }
  sheets: {
    configured: boolean
    sheetId: string | null
    tab: string
    access: { success: boolean; detail: string }
    hint: string
  }
}

/** Statut Telegram / Google Sheets : notifications automatiques des commandes et devis. */
function IntegrationsPanel() {
  const [status, setStatus] = useState<IntegrationsStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)

  const load = useCallback((sendTest = false) => {
    adminFetch<IntegrationsStatus>(
      `/api/admin/integrations/status${sendTest ? '?sendTest=1' : ''}`
    ).then((res) => {
      if (res.success && res.data) setStatus(res.data)
      setLoading(false)
      setTesting(false)
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  const telegram = status?.telegram
  const sheets = status?.sheets

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Notifications automatiques</CardTitle>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => load()}>
          <RefreshCw className="h-3.5 w-3.5" /> Actualiser
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Telegram */}
        <div className="rounded-lg border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Send className="h-4 w-4 text-sky-600" />
            <p className="text-sm font-semibold">Bot Telegram</p>
            {telegram?.configured ? (
              <Badge className="gap-1 bg-green-100 text-green-800 hover:bg-green-100">
                <CheckCircle2 className="h-3 w-3" /> Connecté
                {telegram.botUsername ? ` (@${telegram.botUsername})` : ''}
              </Badge>
            ) : telegram?.botUsername ? (
              <Badge className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-100">
                <AlertTriangle className="h-3 w-3" /> Bot détecté — chat à confirmer
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <XCircle className="h-3 w-3" /> Non connecté
              </Badge>
            )}
            {telegram?.configured && (
              <Button
                size="sm"
                variant="outline"
                className="ml-auto gap-1.5"
                disabled={testing}
                onClick={() => {
                  setTesting(true)
                  load(true)
                }}
              >
                {testing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Recevoir un message de test
              </Button>
            )}
          </div>
          {telegram?.testMessage && (
            <p className={`mt-2 text-xs ${telegram.testMessage.success ? 'text-green-700' : 'text-red-600'}`}>
              {telegram.testMessage.success ? '✓ ' : '✗ '}
              {telegram.testMessage.detail}
            </p>
          )}
          {telegram && !telegram.configured && (
            <p className="mt-2 text-xs text-muted-foreground">{telegram.hint}</p>
          )}
          {telegram?.chatCandidates && telegram.chatCandidates.length > 0 && !telegram.configured && (
            <div className="mt-2 rounded-md bg-muted p-2">
              <p className="text-xs font-medium">Chats détectés — copiez le « id » dans TELEGRAM_CHAT_ID (Vercel) :</p>
              <ul className="mt-1 space-y-0.5">
                {telegram.chatCandidates.map((chat) => (
                  <li key={chat.id} className="font-mono text-xs text-muted-foreground">
                    {chat.id} — {chat.name} ({chat.type})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Google Sheets */}
        <div className="rounded-lg border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Table2 className="h-4 w-4 text-green-700" />
            <p className="text-sm font-semibold">Google Sheets</p>
            {sheets?.configured && sheets.access.success ? (
              <Badge className="gap-1 bg-green-100 text-green-800 hover:bg-green-100">
                <CheckCircle2 className="h-3 w-3" /> Connecté — onglet « {sheets.tab} »
              </Badge>
            ) : sheets?.configured ? (
              <Badge className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-100">
                <AlertTriangle className="h-3 w-3" /> Accès à corriger
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <XCircle className="h-3 w-3" /> Non connecté
              </Badge>
            )}
            {sheets?.sheetId && sheets.access.success && (
              <a
                href={`https://docs.google.com/spreadsheets/d/${sheets.sheetId}/edit`}
                target="_blank"
                rel="noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Ouvrir le classeur <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          {sheets && !(sheets.configured && sheets.access.success) && (
            <p className="mt-2 text-xs text-muted-foreground">{sheets.hint}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/* ============================== Paramètres ============================== */

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

/* ============================== Administration ============================== */

interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  lastLogin: string | null
  createdAt: string
}

/** Créer / lister / désactiver / supprimer des comptes administrateurs. */
function AdminsPanel() {
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'ADMIN' })
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)

  const load = useCallback(async () => {
    const res = await adminFetch<AdminUser[]>('/api/admin/users')
    if (res.success && res.data) setUsers(res.data)
    else toast.error(res.error ?? 'Erreur lors du chargement des comptes')
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await adminFetch<AdminUser[]>('/api/admin/users')
      if (!cancelled) {
        if (res.success && res.data) setUsers(res.data)
        else toast.error(res.error ?? 'Erreur lors du chargement des comptes')
      }
    })()
    return () => { cancelled = true }
  }, [])

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) {
      toast.error('Nom, email valides et mot de passe de 8 caractères minimum requis.')
      return
    }
    setSaving(true)
    const res = await adminPost<AdminUser>('/api/admin/users', form)
    setSaving(false)
    if (res.success) {
      toast.success(`Compte « ${form.name} » créé.`)
      setForm({ name: '', email: '', password: '', role: 'ADMIN' })
      void load()
    } else {
      toast.error(res.error ?? 'Erreur lors de la création')
    }
  }

  const handleToggle = async (user: AdminUser) => {
    setBusyId(user.id)
    const res = await adminPatch<AdminUser>(`/api/admin/users/${user.id}`, { isActive: !user.isActive })
    setBusyId(null)
    if (res.success) void load()
    else toast.error(res.error ?? 'Erreur lors de la modification')
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setBusyId(deleteTarget.id)
    const res = await adminDelete(`/api/admin/users/${deleteTarget.id}`)
    setBusyId(null)
    setDeleteTarget(null)
    if (res.success) {
      toast.success('Compte supprimé.')
      void load()
    } else {
      toast.error(res.error ?? 'Erreur lors de la suppression')
    }
  }

  if (users === null) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">Chargement…</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Créer un compte administrateur</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="admin-name">Nom</Label>
            <Input
              id="admin-name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ex. : Secrétaire"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-email">Email (identifiant de connexion)</Label>
            <Input
              id="admin-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="ex@exemple.ci"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Mot de passe (8 caractères minimum)</Label>
            <Input
              id="admin-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Rôle</Label>
            <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Administrateur — accès complet</SelectItem>
                <SelectItem value="VIEWER">Observateur — consultation seule</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter className="justify-end border-t pt-6">
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Créer le compte
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comptes existants ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {users.map((user) => (
            <div key={user.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {user.name}
                  <Badge variant="outline" className="ml-2">{user.role}</Badge>
                  {!user.isActive && <Badge variant="secondary" className="ml-1">Désactivé</Badge>}
                </p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === user.id}
                onClick={() => handleToggle(user)}
              >
                {user.isActive ? 'Désactiver' : 'Réactiver'}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={busyId === user.id}
                onClick={() => setDeleteTarget(user)}
              >
                Supprimer
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Supprimer ce compte ?"
        description={
          deleteTarget
            ? `Le compte « ${deleteTarget.name} » (${deleteTarget.email}) ne pourra plus se connecter. Cette action est définitive.`
            : ''
        }
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}

/** Remise à zéro de toutes les données commerciales, en conservant produits et bannières. */
function ResetDataPanel() {
  const [confirmText, setConfirmText] = useState('')
  const [saving, setSaving] = useState(false)

  const handleReset = async () => {
    setSaving(true)
    const res = await adminPost<{ deletedRecords: number }>('/api/admin/reset-data', {
      confirm: 'REINITIALISER',
    })
    setSaving(false)
    if (res.success) {
      toast.success(`Données remises à zéro (${res.data?.deletedRecords ?? 0} enregistrements supprimés).`)
      setConfirmText('')
    } else {
      toast.error(res.error ?? 'Erreur lors de la réinitialisation')
    }
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Remise à zéro des données (sauf produits)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Supprime <b>définitivement</b> : commandes, devis, demandes de devis, clients, paiements,
          livraisons et messages de contact — ainsi que les logos clients joints aux commandes.
        </p>
        <p className="text-sm text-muted-foreground">
          Conserve : <b>produits</b>, catégories, bannières d&apos;accueil, paramètres, comptes et images.
        </p>
        <div className="space-y-2">
          <Label htmlFor="reset-confirm">
            Tapez <b>REINITIALISER</b> pour confirmer
          </Label>
          <Input
            id="reset-confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="REINITIALISER"
          />
        </div>
      </CardContent>
      <CardFooter className="justify-end border-t pt-6">
        <Button
          variant="destructive"
          disabled={saving || confirmText !== 'REINITIALISER'}
          onClick={handleReset}
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
          Réinitialiser les données
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
              ) : cat.key === 'integrations' ? (
                <IntegrationsPanel />
              ) : cat.key === 'administration' ? (
                <div className="space-y-6">
                  <AdminsPanel />
                  <ResetDataPanel />
                </div>
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
