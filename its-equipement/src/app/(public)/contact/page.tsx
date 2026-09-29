'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MapPin, Phone, Mail, Send, Clock, MessageCircle, Loader2 } from 'lucide-react'
import { CONTACT_PHONE, CONTACT_EMAIL, CONTACT_ADDRESS, CONTACT_WHATSAPP } from '@/constants'

const contactInfo = [
  {
    icon: Phone,
    title: 'Téléphone',
    value: CONTACT_PHONE,
    href: `tel:${CONTACT_PHONE.replace(/\s/g, '')}`,
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp',
    value: 'Devis via WhatsApp',
    href: CONTACT_WHATSAPP,
  },
  {
    icon: Mail,
    title: 'Email',
    value: CONTACT_EMAIL,
    href: `mailto:${CONTACT_EMAIL}`,
  },
  {
    icon: MapPin,
    title: 'Adresse',
    value: CONTACT_ADDRESS,
  },
  {
    icon: Clock,
    title: 'Horaires',
    value: 'Lundi - Vendredi, 8h - 18h',
  },
]

const SUBJECTS = [
  { value: 'produit', label: 'Question produit' },
  { value: 'devis', label: 'Devis' },
  { value: 'suivi', label: 'Suivi de commande' },
  { value: 'autre', label: 'Autre' },
]

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const [submitting, setSubmitting] = useState(false)

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.name.trim()) {
      toast.error('Veuillez indiquer votre nom')
      return
    }
    if (!form.subject) {
      toast.error('Veuillez sélectionner un sujet')
      return
    }
    if (!form.message.trim()) {
      toast.error('Veuillez écrire votre message')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          subject: SUBJECTS.find((s) => s.value === form.subject)?.label ?? form.subject,
          message: form.message.trim(),
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Votre message a bien été envoyé. Nous vous répondrons dans les plus brefs délais.')
        setForm({ name: '', email: '', phone: '', subject: '', message: '' })
      } else {
        toast.error(json.error || "Erreur lors de l'envoi de votre message")
      }
    } catch {
      toast.error("Erreur de connexion. Vérifiez votre connexion internet puis réessayez.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col">
      <section className="border-b bg-gradient-to-br from-muted/80 via-background to-muted/40">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/5" />
          <div className="absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full bg-primary/5" />
        </div>
        <div className="container mx-auto px-4 py-16 md:py-24 text-center relative z-10">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            Contact
          </h1>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
            Notre équipe est à votre écoute pour répondre à toutes vos questions
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 max-w-6xl mx-auto">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold tracking-tight mb-6">
              Nos coordonnées
            </h2>
            {contactInfo.map((info) => (
              <Card key={info.title} className={info.href ? 'hover:border-primary/30 transition-colors' : ''}>
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <info.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{info.title}</p>
                    {info.href ? (
                      <a
                        href={info.href}
                        target={info.href.startsWith('http') ? '_blank' : undefined}
                        rel={info.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className="text-sm text-muted-foreground mt-0.5 hover:text-primary transition-colors"
                      >
                        {info.value}
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-0.5">{info.value}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-6 md:p-8">
                <h2 className="text-xl font-semibold tracking-tight mb-6">
                  Envoyez-nous un message
                </h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="nom">Nom *</Label>
                      <Input
                        id="nom"
                        value={form.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        placeholder="Votre nom"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        placeholder="votre@email.com"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="telephone">Téléphone</Label>
                      <Input
                        id="telephone"
                        type="tel"
                        value={form.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        placeholder="+225 07 00 00 00 00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sujet *</Label>
                      <Select value={form.subject} onValueChange={(v) => updateField('subject', v)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sélectionnez un sujet" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUBJECTS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      value={form.message}
                      onChange={(e) => updateField('message', e.target.value)}
                      placeholder="Décrivez votre demande..."
                      rows={6}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
                    {submitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    {submitting ? 'Envoi en cours...' : 'Envoyer'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
