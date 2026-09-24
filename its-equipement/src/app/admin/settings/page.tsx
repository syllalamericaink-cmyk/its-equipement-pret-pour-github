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
import { Loader2, Save } from 'lucide-react'

interface Setting {
  id: string
  key: string
  value: string
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON'
  label: string
  category: string | null
  updatedAt: string
}

type CategoryKey = 'entreprise' | 'paiement' | 'livraison' | 'devis'

const CATEGORY_MAP: Record<string, CategoryKey> = {
  COMPANY_NAME: 'entreprise',
  COMPANY_ADDRESS: 'entreprise',
  COMPANY_PHONE: 'entreprise',
  COMPANY_EMAIL: 'entreprise',
  COMPANY_SIRET: 'entreprise',
  COMPANY_VAT_NUMBER: 'entreprise',
  LOGO_URL: 'entreprise',
  CURRENCY: 'entreprise',
  PAYMENT_DEPOSIT_PERCENTAGE: 'paiement',
  PAYMENT_BALANCE_PERCENTAGE: 'paiement',
  PAYMENT_CONDITIONS: 'paiement',
  BANK_DETAILS: 'paiement',
  DELIVERY_FEE: 'livraison',
  DELIVERY_FREE_THRESHOLD: 'livraison',
  WHATSAPP_NUMBER: 'livraison',
  TVA_RATE: 'devis',
  QUOTE_VALIDITY_DAYS: 'devis',
  SALE_CONDITIONS: 'devis',
}

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: 'entreprise', label: 'Entreprise' },
  { key: 'paiement', label: 'Paiement' },
  { key: 'livraison', label: 'Livraison' },
  { key: 'devis', label: 'Devis' },
]

function getCategoryForSetting(setting: Setting): CategoryKey {
  if (setting.category && CATEGORY_MAP[setting.category]) return CATEGORY_MAP[setting.category]
  return CATEGORY_MAP[setting.key] ?? 'entreprise'
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
        type={setting.type === 'NUMBER' ? 'number' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
    const body = categorySettings.map((s) => ({
      key: s.key,
      value: values[s.key] ?? s.value,
      type: s.type,
      label: s.label,
      category: getCategoryForSetting(s),
    }))
    const res = await adminPut<Setting[]>('/api/admin/settings', { settings: body })
    setSaving(false)
    if (res.success) {
      toast.success('Parametres enregistres avec succes.')
    } else {
      toast.error(res.error ?? 'Erreur lors de la sauvegarde.')
    }
  }, [categorySettings, values])

  if (categorySettings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Aucun parametre dans cette categorie.
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
      <PageHeader title="Parametres" description="Configuration generale de la plateforme." />

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
          <TabsList>
            {CATEGORIES.map((cat) => (
              <TabsTrigger key={cat.key} value={cat.key}>
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {CATEGORIES.map((cat) => (
            <TabsContent key={cat.key} value={cat.key}>
              <CategorySettings
                category={cat.key}
                allSettings={settings}
                values={values}
                onChange={handleChange}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}