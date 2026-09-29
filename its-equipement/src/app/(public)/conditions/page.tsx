import type { Metadata } from 'next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Conditions générales de vente | ITS Équipement',
  description: 'Consultez les conditions générales de vente (CGV) ITS Équipement : devis, prix, personnalisation, commande, paiement, livraison, retours et responsabilité.',
  alternates: { canonical: '/conditions' },
  openGraph: {
    title: 'Conditions générales de vente | ITS Équipement',
    description: 'Consultez les conditions générales de vente (CGV) ITS Équipement : devis, prix, personnalisation, commande, paiement, livraison, retours et responsabilité.',
    url: '/conditions',
  },
}

const articles = [
  {
    title: 'Article 1 : Objet',
    content: `Les présentes conditions générales de vente (CGV) régissent l'ensemble des relations commerciales entre ITS Équipement, ci-après dénommé "le Vendeur", et toute personne morale ou physique agissant dans le cadre d'une activité professionnelle ou à titre particulier, ci-après dénommé "le Client", pour toute commande d'équipements professionnels, de vêtements de travail, d'équipements de protection individuelle (EPI) et de toute autre prestation proposée sur le site ou par tout autre canal de vente du Vendeur.

Toute commande emportant acceptation sans réserve des présentes CGV, qui prévalent sur toute autre condition, notamment celles figurant sur les documents d'achat du Client. Le Vendeur se réserve le droit de modifier ses CGV à tout moment. Les CGV applicables sont celles en vigueur à la date de la commande.

L'absence de contestation de la part du Client quant aux CGV vaut acceptation pleine et entière de celles-ci.`,
  },
  {
    title: 'Article 2 : Devis',
    content: `Tout devis émis par ITS Équipement est valable pour une durée de 30 jours calendaires à compter de sa date d'émission, sauf mention contraire. Au-delà de ce délai, les prix et les conditions peuvent être révisés.

Le devis est établi sur la base des informations fournies par le Client. Toute modification de la commande (quantités, personnalisation, références) nécessite l'émission d'un nouveau devis.

La commande n'est considérée comme définitive qu'après validation écrite du devis par le Client, par retour signé ou par email de confirmation. Le Vendeur se réserve le droit de refuser toute commande en cas d'informations incomplètes ou erronées.`,
  },
  {
    title: 'Article 3 : Prix',
    content: `Les prix indiques sur les devis et factures sont exprimés en FCFA (Francs CFA BCEAO). Les prix comprennent les frais de personnalisation le cas échéant, sauf mention contraire.

ITS Équipement se réserve le droit de modifier ses tarifs à tout moment. Toutefois, les prix annoncés dans un devis accepte par le Client restent fermes et non révisables.

Les conditions de paiement sont les suivantes : pour les commandes sans personnalisation, le paiement intégral est exigible à la livraison. Pour les commandes avec personnalisation (impression, broderie, gravure), un acompte de 50% est exigible à la commande, le solde étant du à la livraison. Ces modalites sont rappelées sur chaque devis et facture.

Le paiement s'effectue par virement bancaire, par Mobile Money (Orange Money, MTN Mobile Money, Moov Money) ou par chèque.`,
  },
  {
    title: 'Article 4 : Personnalisation',
    content: `La personnalisation des produits (impression de logo, texte, broderie, gravure) est réalisée conformément aux spécifications fournies par le Client lors de la commande. Le Client est seul responsable de la qualite des fichiers graphiques transmis et de l'exactitude des informations a imprimer.

ITS Équipement se réserve le droit de refuser toute personnalisation contraire à l'ordre public, aux bonnes moeurs ou portant atteinte aux droits de tiers. Le Client garantit détenir les droits nécessaires sur les logos, marques et éléments graphiques fournis.

Les zones de personnalisation varient selon les produits et sont précisées dans le devis. Toute demande de modification des zones d'impression après validation du devis pourra entraîner un supplement de prix et un délai supplémentaire.`,
  },
  {
    title: 'Article 5 : Commande',
    content: `La commande est confirmée après validation expresse du devis par le Client. A réception de cette validation, ITS Équipement transmet au Client une confirmation de commande par email, reprenant l'ensemble des éléments convenus : références, quantités, prix, délais et conditions de personnalisation.

Toute annulation de la part du Client doit être notifiée par écrit. Si l'annulation intervient après le démarrage de la production, le Client pourra être tenu de rembourser les frais deja engages, notamment les coûts de personnalisation et d'approvisionnement des matières premieres.

La production est lancée à compter de la réception du paiement de l'acompte le cas échéant. ITS Équipement s'engage a respecter les délais indiques dans le devis, sous réserve de la réception des éléments nécessaires à la commande dans les délais impartis.`,
  },
  {
    title: 'Article 6 : Paiement',
    content: `Pour les commandes ne comprenant pas de personnalisation, le paiement intégral est exigible à la livraison, par virement bancaire, Mobile Money (Orange Money, MTN Mobile Money, Moov Money) ou chèque.

Pour les commandes incluant une personnalisation (impression, broderie, gravure), les conditions de paiement sont les suivantes : un acompte de 50% du montant total est exigible à la commande, avant tout démarrage de production. Le solde de 50% est exigible à la livraison, sur présentation de la facture finale.

En cas de retard de paiement, ITS Équipement se réserve le droit de suspendre les livraisons en cours sans préavis. Des pénalités de retard pourront être appliquées conformément a la législation ivoirienne en vigueur.`,
  },
  {
    title: 'Article 7 : Livraison',
    content: `ITS Équipement effectue ses livraisons à Abidjan et dans les principales villes de Côte d'Ivoire via des transporteurs professionnels partenaires. Les délais de livraison indicatifs sont de 5 a 10 jours ouvrables après validation du devis pour les commandes sans personnalisation, et de 10 a 20 jours ouvrables pour les commandes avec personnalisation. Ces délais sont donnes a titre indicatif et peuvent varier en fonction des volumes et de la complexite de la commande.

Le transfert des risques s'opere au moment de la remise de la marchandise au transporteur. Il appartient au Client de vérifier l'état de la marchandise à la livraison et d'émettre toute réserve auprès du transporteur en cas de dommage constaté lors de la réception.

Les conditions de livraison gratuites sont précisées sur chaque devis en fonction du volume et de la destination. Pour les livraisons hors zone couverte, des frais supplémentaires pourront être appliqués. ITS Équipement ne saurait être tenu responsable des retards de livraison imputables au transporteur ou à des cas de force majeure.`,
  },
  {
    title: 'Article 8 : Retours et échanges',
    content: `Les retours et échanges ne sont possibles que dans les cas suivants : produit défectueux, erreur de livraison (mauvaise référence, mauvaise quantite), ou non-conformité par rapport au devis valide.

Toute demande de retour doit être notifiée par écrit a ITS Équipement dans un délai de 7 jours ouvrables à compter de la réception de la marchandise, accompagnee de photographies et d'une description detaillee du motif. ITS Équipement se réserve le droit d'examiner le produit retourné avant d'accepter ou de refuser la demande.

En cas de retour accepte, ITS Équipement procedera au remplacement du produit ou a l'émission d'un avoir. Les produits personnalises ne sont ni repris ni échanges, sauf en cas de vice de conformité imputable au Vendeur. Les frais de retour sont a la charge du Client sauf en cas d'erreur imputable a ITS Équipement.`,
  },
  {
    title: 'Article 9 : Responsabilite',
    content: `ITS Équipement s'engage a fournir des produits conformes aux spécifications du devis valide et aux normes en vigueur applicables aux équipements de travail et aux EPI. Toutefois, la responsabilité du Vendeur est limitée au montant de la commande concernee.

ITS Équipement ne saurait être tenu responsable des dommages indirects, tels que perte d'exploitation, prejudice commercial ou perte de chiffre d'affaires, résultant de l'utilisation des produits fournis. Le Client reste seul responsable de l'utilisation qu'il fait des équipements et du respect des consignes de sécurité associees.

Les informations, descriptions et photographs présentes sur les supports de communication d'ITS Équipement sont données a titre indicatif et ne sauraient engager la responsabilité du Vendeur. En cas de litige, une recherche de solution amiable sera privilegiee avant toute action en justice. Le tribunal compétent sera celui d'Abidjan, Côte d'Ivoire.`,
  },
  {
    title: 'Article 10 : Donnees personnelles',
    content: `ITS Équipement s'engage a traiter les données personnelles collectees dans le cadre de ses relations commerciales conformément a la loi n° 2013-450 du 19 juin 2013 relative a la protection des données personnelles en Côte d'Ivoire.

Les données collectees (nom, prenom, raison sociale, adresse, email, téléphone) sont nécessaires a la gestion des commandes, a l'émission des factures et au suivi de la relation commerciale. Elles sont conservees pendant la durée de la relation commerciale et pendant une durée de 5 ans à compter de la derniere commande, conformément aux obligations légales.

Le Client dispose d'un droit d'accès, de rectification, de suppression et d'opposition de ses données personnelles, qu'il peut exercer en adressant sa demande a : contact@itschoolci.com. ITS Équipement ne communique aucune donnee personnelle a des tiers sans l'accord préalable du Client, sauf obligation legale.`,
  },
]

export default function ConditionsPage() {
  return (
    <div className="flex flex-col">
      <section className="border-b bg-gradient-to-br from-muted/80 via-background to-muted/40">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/5" />
          <div className="absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full bg-primary/5" />
        </div>
        <div className="container mx-auto px-4 py-16 md:py-24 text-center relative z-10">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            Conditions générales de vente
          </h1>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
            Dernière mise à jour : Août 2025
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="mx-auto max-w-3xl space-y-6">
          {articles.map((article) => (
            <Card key={article.title}>
              <CardHeader>
                <CardTitle className="text-lg">{article.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {article.content}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
