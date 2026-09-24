'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/admin/page-header'
import { adminFetch, adminPost, formatCurrency } from '@/lib/admin-api'
import { StatusBadge } from '@/components/admin/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Search, ArrowUpDown, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface StockItem {
  id: string
  name: string
  sku: string
  priceModifier: number
  stock: number
  reservedStock: number
  alertThreshold: number
  isActive: boolean
  product: {
    name: string
    sku: string
    isActive: boolean
  }
}

interface Movement {
  id: string
  type: string
  quantity: number
  reason: string
  createdAt: string
  productVariant: { name: string; product: { name: string; sku: string } }
  orderItem: { order: { orderNumber: string } } | null
}

function StockLevel({ stock, reserved, threshold }: { stock: number; reserved: number; threshold: number }) {
  const available = stock - reserved
  const onAlert = available <= threshold
  const color = onAlert
    ? 'text-red-600 bg-red-50'
    : available < 50
      ? 'text-orange-600 bg-orange-50'
      : 'text-green-600 bg-green-50'
  const dotColor = onAlert
    ? 'bg-red-500'
    : available < 50
      ? 'bg-orange-500'
      : 'bg-green-500'
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-sm font-medium ${color}`}>
        <span className={`h-2 w-2 rounded-full ${dotColor}`} />
        {available}
      </span>
      {reserved > 0 && (
        <span className="text-xs text-muted-foreground">Reserve: {reserved}</span>
      )}
    </div>
  )
}

const MOVEMENT_TYPES = [
  { value: 'IN', label: 'Entree' },
  { value: 'OUT', label: 'Sortie' },
  { value: 'ADJUSTMENT', label: 'Ajustement' },
] as const

export default function StocksPage() {
  const [stocks, setStocks] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selectedVariant, setSelectedVariant] = useState<StockItem | null>(null)
  const [movements, setMovements] = useState<Movement[]>([])
  const [movementsLoading, setMovementsLoading] = useState(false)
  const [movementDialog, setMovementDialog] = useState(false)
  const [movementType, setMovementType] = useState('')
  const [movementQty, setMovementQty] = useState('')
  const [movementReason, setMovementReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await adminFetch<StockItem[]>('/api/admin/stocks')
      if (!cancelled) {
        if (res.success && res.data) setStocks(res.data)
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setSearch(value), 300)
  }, [])

  const filtered = stocks.filter((s) =>
    s.product.name.toLowerCase().includes(search.toLowerCase()) ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.sku?.toLowerCase().includes(search.toLowerCase())
  )

  const sorted = [...filtered].sort((a, b) => {
    const diff = (a.stock - a.reservedStock) - (b.stock - b.reservedStock)
    return sortDir === 'asc' ? diff : -diff
  })

  const lowStockCount = stocks.filter(s => s.stock - s.reservedStock <= s.alertThreshold).length

  const handleOpenMovements = useCallback(async (variant: StockItem) => {
    setSelectedVariant(variant)
    setMovementDialog(false)
    setMovementsLoading(true)
    const res = await adminFetch<Movement[]>(`/api/admin/stocks/${variant.id}?movements=true&limit=20`)
    if (res.success && res.data) setMovements(res.data)
    setMovementsLoading(false)
  }, [])

  const handleSubmitMovement = useCallback(async () => {
    if (!selectedVariant || !movementType || !movementQty) return
    const qty = parseInt(movementQty, 10)
    if (isNaN(qty) || qty <= 0) { toast.error('Quantite invalide'); return }
    setSubmitting(true)
    const res = await adminPost(`/api/admin/stocks/${selectedVariant.id}`, {
      productVariantId: selectedVariant.id,
      type: movementType,
      quantity: qty,
      reason: movementReason || undefined,
    })
    setSubmitting(false)
    if (res.success) {
      toast.success('Mouvement enregistre')
      setMovementType('')
      setMovementQty('')
      setMovementReason('')
      setMovementDialog(false)
      const stockRes = await adminFetch<StockItem[]>('/api/admin/stocks')
      if (stockRes.success && stockRes.data) setStocks(stockRes.data)
      handleOpenMovements(selectedVariant)
    } else {
      toast.error(res.error ?? 'Erreur')
    }
  }, [selectedVariant, movementType, movementQty, movementReason, handleOpenMovements])

  return (
    <div className="space-y-6">
      <PageHeader title="Stocks" description="Gestion des stocks par variante." />

      {lowStockCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
          <AlertTriangle className="h-4 w-4" />
          <span><strong>{lowStockCount}</strong> variante(s) en alerte stock</span>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher par produit..." value={searchInput} onChange={(e) => handleSearchChange(e.target.value)} className="pl-9" />
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')} className="flex items-center gap-1 hover:text-foreground">
            <ArrowUpDown className="h-3.5 w-3.5" /> {sortDir === 'asc' ? 'Croissant' : 'Decroissant'}
          </button>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500" />{'< seuil'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-500" /> OK
          </span>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead>Variante</TableHead>
              <TableHead className="hidden md:table-cell">SKU</TableHead>
              <TableHead>Stock dispo</TableHead>
              <TableHead className="hidden sm:table-cell">Reserve</TableHead>
              <TableHead className="hidden lg:table-cell">Seuil alerte</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                ))}</TableRow>
              ))
            ) : sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Aucun stock trouve.</TableCell>
              </TableRow>
            ) : (
              sorted.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.product.name}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground font-mono text-xs">{item.sku || item.product.sku}</TableCell>
                  <TableCell><StockLevel stock={item.stock} reserved={item.reservedStock} threshold={item.alertThreshold} /></TableCell>
                  <TableCell className="hidden sm:table-cell">{item.reservedStock}</TableCell>
                  <TableCell className="hidden lg:table-cell">{item.alertThreshold}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" onClick={() => handleOpenMovements(item)}>Mouvements</Button>
                      <Button variant="outline" size="sm" onClick={() => { setSelectedVariant(item); setMovementDialog(true) }}>+/-</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedVariant && !movementDialog} onOpenChange={(open) => { if (!open) setSelectedVariant(null) }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mouvements - {selectedVariant?.product.name} / {selectedVariant?.name}</DialogTitle>
          </DialogHeader>
          {selectedVariant && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-2xl font-bold">{selectedVariant.stock}</p><p className="text-xs text-muted-foreground">Stock</p></div>
                <div className="rounded-lg bg-indigo-50 p-3"><p className="text-2xl font-bold text-indigo-600">{selectedVariant.reservedStock}</p><p className="text-xs text-muted-foreground">Reserve</p></div>
                <div className="rounded-lg bg-green-50 p-3"><p className="text-2xl font-bold text-green-600">{selectedVariant.stock - selectedVariant.reservedStock}</p><p className="text-xs text-muted-foreground">Disponible</p></div>
              </div>
              {movementsLoading ? (<Skeleton className="h-40 w-full" />) : movements.length === 0 ? (<p className="text-center text-muted-foreground py-8">Aucun mouvement</p>) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Qte</TableHead><TableHead>Commande</TableHead><TableHead className="hidden sm:table-cell">Motif</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {movements.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm">{new Date(m.createdAt).toLocaleDateString('fr-FR')}</TableCell>
                        <TableCell><StatusBadge status={m.type} /></TableCell>
                        <TableCell className={m.type === 'OUT' || m.type === 'RESERVATION' ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>{m.type === 'OUT' || m.type === 'RESERVATION' ? '-' : '+'}{m.quantity}</TableCell>
                        <TableCell className="text-sm">{m.orderItem?.order?.orderNumber || '—'}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{m.reason || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={movementDialog} onOpenChange={setMovementDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un mouvement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={movementType} onValueChange={setMovementType}>
                <SelectTrigger><SelectValue placeholder="Type de mouvement" /></SelectTrigger>
                <SelectContent>{MOVEMENT_TYPES.map(t => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantite</Label>
              <Input type="number" min={1} value={movementQty} onChange={(e) => setMovementQty(e.target.value)} placeholder="Quantite" />
            </div>
            <div className="space-y-2">
              <Label>Motif (optionnel)</Label>
              <Input value={movementReason} onChange={(e) => setMovementReason(e.target.value)} placeholder="Motif du mouvement" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovementDialog(false)}>Annuler</Button>
            <Button onClick={handleSubmitMovement} disabled={!movementType || !movementQty || submitting}>{submitting ? '...' : 'Enregistrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}