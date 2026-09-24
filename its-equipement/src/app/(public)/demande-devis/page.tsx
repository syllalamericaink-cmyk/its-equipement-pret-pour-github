'use client'

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Plus, Trash2, ArrowLeft, ArrowRight, Check, Loader2, Package, Upload, X, User, ShoppingCart, FileText } from 'lucide-react'
import { publicFetch, formatCurrency } from '@/lib/public-api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface ProductVariant {
  id: string
  name: string
  sku: string
  priceModifier: number
  stock: number
  isActive: boolean
}

interface Location {
  id: string
  label: string
  enabled: boolean
}

interface PersonalizationOption {
  id: string
  productId: string
  type: string
  label: string
  isRequired: boolean
  config: {
    maxFileSizeMB?: number
    acceptedFileTypes?: string[]
    maxTextLength?: number
    locations?: Location[]
    [key: string]: unknown
  }
  sortOrder: number
  isActive: boolean
}

interface Product {
  id: string
  name: string
  slug: string
  description: string
  sku: string
  basePrice: string
  isPersonalizable: boolean
  minQuantity: number
  category: { id: string; name: string; slug: string }
  variants: ProductVariant[]
  images: { id: string; url: string; altText: string; sortOrder: number }[]
  personalizationOptions: PersonalizationOption[]
}

interface PersonalizationValue {
  logoFileId?: string
  logoFileName?: string
  text?: string
  location?: string
  additionalNotes?: string
}

interface ItemPersonalization {
  optionId: string
  type: string
  label: string
  value: PersonalizationValue
}

interface QuoteItem {
  productId: string
  productName: string
  productSlug: string
  variantId: string
  variantName: string
  quantity: number
  unitPrice: number
  hasPersonalization: boolean
  personalizations: ItemPersonalization[]
}

interface ClientInfo {
  companyName: string
  contactName: string
  email: string
  phone: string
  whatsapp: string
  address: string
  city: string
  zipCode: string
  country: string
  notes: string
}

const defaultClient: ClientInfo = {
  companyName: '',
  contactName: '',
  email: '',
  phone: '',
  whatsapp: '',
  address: '',
  city: '',
  zipCode: '',
  country: '',
  notes: '',
}

function parsePrice(val: string | number): number {
  if (typeof val === 'number') return val
  return parseFloat(val) || 0
}

function DemandeDevisPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [client, setClient] = useState<ClientInfo>(defaultClient)
  const [items, setItems] = useState<QuoteItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoaded, setProductsLoaded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!productsLoaded) {
      publicFetch<Product[]>('/api/public/products?limit=999').then((res) => {
        if (res.success && res.data) {
          setProducts(res.data)
        }
        setProductsLoaded(true)
      })
    }
  }, [productsLoaded])

  useEffect(() => {
    const slug = searchParams.get('product')
    if (slug && productsLoaded && products.length > 0 && items.length === 0) {
      const product = products.find((p) => p.slug === slug)
      if (product) {
        addProductToItems(product)
      }
    }
  }, [searchParams, productsLoaded, products])

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products
    const q = searchQuery.toLowerCase()
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
    )
  }, [products, searchQuery])

  const activeVariants = useCallback(
    (product: Product) => product.variants.filter((v) => v.isActive),
    []
  )

  const addProductToItems = useCallback(
    (product: Product) => {
      const variants = activeVariants(product)
      const variant = variants.length === 1 ? variants[0] : (variants[0] || { id: '', name: '', priceModifier: 0 })
      const unitPrice = parsePrice(product.basePrice) + parsePrice(variant.priceModifier)
      const newItem: QuoteItem = {
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        variantId: variant.id,
        variantName: variant.name,
        quantity: 1,
        unitPrice,
        hasPersonalization: false,
        personalizations: [],
      }
      setItems((prev) => [...prev, newItem])
      setDialogOpen(false)
      setSearchQuery('')
    },
    [activeVariants]
  )

  const updateItem = useCallback((index: number, updates: Partial<QuoteItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...updates } : item)))
  }, [])

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleVariantChange = useCallback(
    (index: number, variantId: string) => {
      const item = items[index]
      const product = products.find((p) => p.id === item.productId)
      if (!product) return
      const variant = product.variants.find((v) => v.id === variantId)
      if (!variant) return
      updateItem(index, {
        variantId: variant.id,
        variantName: variant.name,
        unitPrice: parsePrice(product.basePrice) + parsePrice(variant.priceModifier),
      })
    },
    [items, products, updateItem]
  )

  const handleFileUpload = useCallback(
    async (file: File, itemId: number, optionId: string) => {
      const key = `${itemId}-${optionId}`
      setUploadingFiles((prev) => ({ ...prev, [key]: true }))
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('entityType', 'QUOTE_REQUEST')
        const res = await fetch('/api/public/upload', {
          method: 'POST',
          body: formData,
        })
        const json = await res.json()
        if (json.success && json.data) {
          setItems((prev) =>
            prev.map((item, i) => {
              if (i !== itemId) return item
              return {
                ...item,
                personalizations: item.personalizations.map((p) =>
                  p.optionId === optionId
                    ? { ...p, value: { ...p.value, logoFileId: json.data.id, logoFileName: json.data.originalName } }
                    : p
                ),
              }
            })
          )
        } else {
          toast.error(json.error || 'Erreur lors du telechargement du fichier')
        }
      } catch {
        toast.error('Erreur lors du telechargement du fichier')
      } finally {
        setUploadingFiles((prev) => ({ ...prev, [key]: false }))
      }
    },
    []
  )

  const togglePersonalization = useCallback(
    (index: number, enabled: boolean, product: Product) => {
      const item = items[index]
      if (enabled) {
        const personalizations: ItemPersonalization[] = product.personalizationOptions
          .filter((po) => po.isActive)
          .map((po) => ({
            optionId: po.id,
            type: po.type,
            label: po.label,
            value: {} as PersonalizationValue,
          }))
        updateItem(index, { hasPersonalization: true, personalizations })
      } else {
        updateItem(index, { hasPersonalization: false, personalizations: [] })
      }
    },
    [items, updateItem]
  )

  const updatePersonalizationValue = useCallback(
    (itemIndex: number, optionId: string, fieldUpdate: Partial<PersonalizationValue>) => {
      setItems((prev) =>
        prev.map((item, i) => {
          if (i !== itemIndex) return item
          return {
            ...item,
            personalizations: item.personalizations.map((p) =>
              p.optionId === optionId ? { ...p, value: { ...p.value, ...fieldUpdate } } : p
            ),
          }
        })
      )
    },
    []
  )

  const total = useMemo(() => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0), [items])

  const validateStep1 = useCallback(() => {
    if (!client.contactName.trim()) {
      toast.error('Le nom du contact est requis')
      return false
    }
    if (!client.companyName.trim()) {
      toast.error('Le nom de l\'entreprise est requis')
      return false
    }
    return true
  }, [client])

  const validateStep2 = useCallback(() => {
    if (items.length === 0) {
      toast.error('Ajoutez au moins un produit')
      return false
    }
    return true
  }, [items])

  const handleNext = useCallback(() => {
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    setStep((prev) => Math.min(prev + 1, 3))
  }, [step, validateStep1, validateStep2])

  const handlePrev = useCallback(() => {
    setStep((prev) => Math.max(prev - 1, 1))
  }, [])

  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    try {
      const payload = {
        client: {
          companyName: client.companyName,
          contactName: client.contactName,
          email: client.email || undefined,
          phone: client.phone || undefined,
          whatsapp: client.whatsapp || undefined,
          address: client.address || undefined,
          city: client.city || undefined,
          zipCode: client.zipCode || undefined,
          country: client.country || undefined,
          notes: client.notes || undefined,
        },
        items: items.map((item) => ({
          productId: item.productId,
          productVariantId: item.variantId || undefined,
          quantity: item.quantity,
          hasPersonalization: item.hasPersonalization,
          personalizations: item.hasPersonalization
            ? item.personalizations.map((p) => ({
                optionId: p.optionId,
                value: {
                  logoFileId: p.value.logoFileId || undefined,
                  logoFileName: p.value.logoFileName || undefined,
                  text: p.value.text || undefined,
                  location: p.value.location || undefined,
                  additionalNotes: p.value.additionalNotes || undefined,
                },
              }))
            : undefined,
        })),
        notes: client.notes || undefined,
      }
      const res = await fetch('/api/public/quote-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.success && json.data) {
        router.push(`/confirmation?ref=${json.data.reference}`)
      } else {
        toast.error(json.error || 'Erreur lors de l\'envoi de la demande')
      }
    } catch {
      toast.error('Erreur lors de l\'envoi de la demande')
    } finally {
      setSubmitting(false)
    }
  }, [client, items, router])

  const getProduct = useCallback(
    (productId: string) => products.find((p) => p.id === productId),
    [products]
  )

  const steps = [
    { number: 1, label: 'Informations client', icon: User },
    { number: 2, label: 'Choix des produits', icon: ShoppingCart },
    { number: 3, label: 'Recapitulatif', icon: FileText },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Demande de devis</h1>
          <p className="mt-2 text-muted-foreground">Remplissez le formulaire pour recevoir votre devis personnalise</p>
        </div>

        <div className="mb-10 flex items-center justify-center gap-2 sm:gap-4">
          {steps.map((s, i) => {
            const Icon = s.icon
            const isActive = step === s.number
            const isDone = step > s.number
            return (
              <div key={s.number} className="flex items-center gap-2 sm:gap-4">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors sm:h-12 sm:w-12 ${
                      isActive
                        ? 'border-primary bg-primary text-primary-foreground'
                        : isDone
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-muted-foreground/30 text-muted-foreground'
                    }`}
                  >
                    {isDone ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span
                    className={`hidden text-xs font-medium sm:block ${
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`h-0.5 w-8 sm:w-16 ${
                      step > s.number ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Informations client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contactName">
                    Nom du contact <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="contactName"
                    value={client.contactName}
                    onChange={(e) => setClient((prev) => ({ ...prev, contactName: e.target.value }))}
                    placeholder="Jean Dupont"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName">
                    Nom de l'entreprise <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="companyName"
                    value={client.companyName}
                    onChange={(e) => setClient((prev) => ({ ...prev, companyName: e.target.value }))}
                    placeholder="Mon Entreprise SARL"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telephone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={client.phone}
                    onChange={(e) => setClient((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="+225 07 00 00 00 00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-muted-foreground text-xs font-normal">(facultatif)</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={client.email}
                  onChange={(e) => setClient((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="contact@entreprise.com"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">Ville</Label>
                  <Input
                    id="city"
                    value={client.city}
                    onChange={(e) => setClient((prev) => ({ ...prev, city: e.target.value }))}
                    placeholder="Abidjan"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Adresse de livraison</Label>
                  <Input
                    id="address"
                    value={client.address}
                    onChange={(e) => setClient((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="Cocody 2 Plateaux, rue..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Commentaire</Label>
                <Textarea
                  id="notes"
                  value={client.notes}
                  onChange={(e) => setClient((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Informations complementaires..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end pt-4">
                <Button onClick={handleNext} className="gap-2">
                  Suivant
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Choix des produits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {items.length} produit{items.length !== 1 ? 's' : ''} selectionne{items.length !== 1 ? 's' : ''}
                </p>
                <Button onClick={() => setDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Ajouter un produit
                </Button>
              </div>

              {items.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
                  <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Aucun produit ajoute</p>
                  <p className="text-sm text-muted-foreground/70">Cliquez sur &quot;Ajouter un produit&quot; pour commencer</p>
                </div>
              )}

              <div className="space-y-4">
                {items.map((item, index) => {
                  const product = getProduct(item.productId)
                  const variants = product ? activeVariants(product) : []
                  const activeOptions = product
                    ? product.personalizationOptions.filter((po) => po.isActive)
                    : []
                  const lineTotal = item.unitPrice * item.quantity

                  return (
                    <div key={`${item.productId}-${index}`} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{item.productName}</p>
                          {product && (
                            <Badge variant="secondary" className="mt-1">
                              {product.category.name}
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground" htmlFor={`variant-${index}`}>Variante</Label>
                          <Select
                            value={item.variantId}
                            onValueChange={(val) => handleVariantChange(index, val)}
                          >
                            <SelectTrigger id={`variant-${index}`} className="w-full">
                              <SelectValue placeholder="Choisir" />
                            </SelectTrigger>
                            <SelectContent>
                              {variants.map((v) => (
                                <SelectItem key={v.id} value={v.id}>
                                  {v.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground" htmlFor={`qty-${index}`}>Quantite</Label>
                          <Input
                            id={`qty-${index}`}
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0
                              updateItem(index, { quantity: val < 1 ? 1 : val })
                            }}
                            className="w-full"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Prix unitaire</Label>
                          <p className="flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm font-medium">
                            {formatCurrency(item.unitPrice)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end">
                        <p className="text-sm font-semibold">
                          Total : {formatCurrency(lineTotal)}
                        </p>
                      </div>

                      {product && product.isPersonalizable && activeOptions.length > 0 && (
                        <div className="mt-4 border-t pt-4">
                          <Label className="text-sm font-medium">Personnalisation</Label>
                          <RadioGroup
                            className="mt-2 flex gap-4"
                            value={item.hasPersonalization ? 'avec' : 'sans'}
                            onValueChange={(val) => togglePersonalization(index, val === 'avec', product)}
                          >
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="sans" id={`sans-${index}`} />
                              <Label htmlFor={`sans-${index}`} className="cursor-pointer font-normal">
                                Sans impression
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="avec" id={`avec-${index}`} />
                              <Label htmlFor={`avec-${index}`} className="cursor-pointer font-normal">
                                Avec impression
                              </Label>
                            </div>
                          </RadioGroup>

                          {item.hasPersonalization && (
                            <div className="mt-4 space-y-4 rounded-md border bg-muted/20 p-4">
                              {activeOptions.map((po) => {
                                const pers = item.personalizations.find((p) => p.optionId === po.id)
                                if (!pers) return null
                                const uploadKey = `${index}-${po.id}`
                                const isUploading = uploadingFiles[uploadKey] || false

                                return (
                                  <div key={po.id} className="space-y-2">
                                    <p className="text-sm font-medium">{po.label}</p>

                                    {po.type === 'logo' && (
                                      <>
                                        <div className="space-y-2">
                                          {pers.value.logoFileId ? (
                                            <div className="flex items-center gap-2 rounded-md border bg-background p-2">
                                              <Upload className="h-4 w-4 text-muted-foreground" />
                                              <span className="flex-1 truncate text-sm">
                                                {pers.value.logoFileName}
                                              </span>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-destructive hover:text-destructive"
                                                onClick={() =>
                                                  updatePersonalizationValue(index, po.id, {
                                                    logoFileId: undefined,
                                                    logoFileName: undefined,
                                                  })
                                                }
                                              >
                                                <X className="h-3.5 w-3.5" />
                                              </Button>
                                            </div>
                                          ) : (
                                            <Label
                                              htmlFor={`file-${index}-${po.id}`}
                                              className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed p-4 text-center transition-colors hover:border-primary hover:bg-primary/5"
                                            >
                                              {isUploading ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                              ) : (
                                                <Upload className="h-4 w-4 text-muted-foreground" />
                                              )}
                                              <span className="text-sm text-muted-foreground">
                                                {isUploading
                                                  ? 'Telechargement...'
                                                  : 'Cliquer pour televerser un fichier'}
                                              </span>
                                              <input
                                                id={`file-${index}-${po.id}`}
                                                type="file"
                                                accept=".png,.jpg,.jpeg,.svg,.pdf"
                                                className="sr-only"
                                                disabled={isUploading}
                                                onChange={(e) => {
                                                  const file = e.target.files?.[0]
                                                  if (file) handleFileUpload(file, index, po.id)
                                                  e.target.value = ''
                                                }}
                                              />
                                            </Label>
                                          )}
                                        </div>
                                      </>
                                    )}

                                    {po.type === 'text' && (
                                      <div className="space-y-2">
                                        <Input
                                          value={pers.value.text || ''}
                                          onChange={(e) =>
                                            updatePersonalizationValue(index, po.id, {
                                              text: e.target.value,
                                            })
                                          }
                                          maxLength={po.config.maxTextLength || 100}
                                          placeholder={`Saisir le texte (${po.config.maxTextLength || 100} caracteres max)`}
                                          aria-label={`Texte de personnalisation : ${po.label}`}
                                        />
                                      </div>
                                    )}

                                    {po.config.locations && po.config.locations.some((loc) => loc.enabled) && (
                                      <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Emplacement</Label>
                                        <Select
                                          value={pers.value.location || ''}
                                          onValueChange={(val) =>
                                            updatePersonalizationValue(index, po.id, { location: val })
                                          }
                                        >
                                          <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Choisir un emplacement" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {po.config.locations
                                              .filter((loc) => loc.enabled)
                                              .map((loc) => (
                                                <SelectItem key={loc.id} value={loc.id}>
                                                  {loc.label}
                                                </SelectItem>
                                              ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}

                                    <div className="space-y-1.5">
                                      <Label className="text-xs text-muted-foreground" htmlFor={`notes-${index}-${po.id}`}>Notes supplementaires</Label>
                                      <Input
                                        id={`notes-${index}-${po.id}`}
                                        value={pers.value.additionalNotes || ''}
                                        onChange={(e) =>
                                          updatePersonalizationValue(index, po.id, {
                                            additionalNotes: e.target.value,
                                          })
                                        }
                                        placeholder="Notes facultatives"
                                      />
                                    </div>

                                    {po !== activeOptions[activeOptions.length - 1] && <Separator />}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {items.length > 0 && (
                <div className="flex items-center justify-end rounded-lg border bg-muted/30 p-4">
                  <span className="text-lg font-bold">Total HT : {formatCurrency(total)}</span>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handlePrev} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Precedent
                </Button>
                <Button onClick={handleNext} className="gap-2">
                  Suivant
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Recapitulatif</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">Informations client</h3>
                  <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="gap-1 text-xs">
                    Modifier
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
                <div className="rounded-lg border bg-muted/20 p-4">
                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <span className="text-muted-foreground">Nom du contact : </span>
                      <span className="font-medium">{client.contactName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Entreprise : </span>
                      <span className="font-medium">{client.companyName}</span>
                    </div>
                    {client.phone && (
                      <div>
                        <span className="text-muted-foreground">Telephone : </span>
                        <span className="font-medium">{client.phone}</span>
                      </div>
                    )}
                    {client.email && (
                      <div>
                        <span className="text-muted-foreground">Email : </span>
                        <span className="font-medium">{client.email}</span>
                      </div>
                    )}
                    {client.city && (
                      <div>
                        <span className="text-muted-foreground">Ville : </span>
                        <span className="font-medium">{client.city}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="sm:col-span-2">
                        <span className="text-muted-foreground">Adresse : </span>
                        <span className="font-medium">{client.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">Produits</h3>
                  <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="gap-1 text-xs">
                    Modifier
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead>Variante</TableHead>
                        <TableHead className="text-right">Quantite</TableHead>
                        <TableHead className="text-right">Prix unitaire</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Personnalisation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => {
                        const lineTotal = item.unitPrice * item.quantity
                        return (
                          <TableRow key={`${item.productId}-${index}`}>
                            <TableCell className="font-medium">{item.productName}</TableCell>
                            <TableCell>{item.variantName || '-'}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(lineTotal)}
                            </TableCell>
                            <TableCell>
                              {!item.hasPersonalization ? (
                                <span className="text-muted-foreground">-</span>
                              ) : (
                                <div className="space-y-1">
                                  {item.personalizations.map((p) => (
                                    <div key={p.optionId} className="text-xs">
                                      <Badge variant="outline" className="mr-1 text-[10px]">
                                        {p.type === 'logo' ? 'Logo' : 'Texte'}
                                      </Badge>
                                      <span>{p.label}</span>
                                      {p.value.location && (
                                        <span className="text-muted-foreground"> ({p.value.location})</span>
                                      )}
                                      {p.type === 'text' && p.value.text && (
                                        <p className="mt-0.5 text-muted-foreground italic">
                                          &quot;{p.value.text}&quot;
                                        </p>
                                      )}
                                      {p.type === 'logo' && p.value.logoFileName && (
                                        <p className="mt-0.5 text-muted-foreground italic">
                                          {p.value.logoFileName}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {client.notes && (
                <div>
                  <h3 className="mb-2 font-semibold">Commentaire</h3>
                  <p className="rounded-lg border bg-muted/20 p-3 text-sm">{client.notes}</p>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-end">
                <span className="text-xl font-bold">Total HT : {formatCurrency(total)}</span>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={handlePrev} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Precedent
                </Button>
                <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Envoyer la demande
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Ajouter un produit</DialogTitle>
              <DialogDescription>Recherchez et selectionnez un produit a ajouter a votre demande</DialogDescription>
            </DialogHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom, categorie ou reference..."
                className="pl-9"
                autoFocus
                aria-label="Rechercher un produit a ajouter"
              />
            </div>
            <div className="max-h-96 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Aucun produit trouve</p>
              ) : (
                <div className="space-y-1">
                  {filteredProducts.map((product) => {
                    const variants = activeVariants(product)
                    const price = parsePrice(product.basePrice) + parsePrice(variants[0]?.priceModifier || 0)
                    return (
                      <button
                        key={product.id}
                        className="flex w-full items-center justify-between gap-3 rounded-md p-3 text-left transition-colors hover:bg-accent"
                        onClick={() => addProductToItems(product)}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {product.category.name}
                            {product.sku ? ` - ${product.sku}` : ''}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold">{formatCurrency(price)}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default function DemandeDevisPageWrapper() {
  return (
    <Suspense>
      <DemandeDevisPage />
    </Suspense>
  )
}
