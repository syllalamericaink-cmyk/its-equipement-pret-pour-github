import type { Metadata } from 'next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Conditions generales de vente | ITS Equipement',
  description: 'Consultez les conditions generales de vente (CGV) ITS Equipement : devis, prix, personnalisation, commande, paiement, livraison, retours et responsabilite.',
  alternates: { canonical: '/conditions' },
  openGraph: {
    title: 'Conditions generales de vente | ITS Equipement',
    description: 'Consultez les conditions generales de vente (CGV) ITS Equipement : devis, prix, personnalisation, commande, paiement, livraison, retours et responsabilite.',
    url: '/conditions',
  },
}

const articles = [
  {
    title: 'Article 1 : Objet',
    content: `Les presentes conditions generales de vente (CGV) regissent l'ensemble des relations commerciales entre ITS Equipement, ci-apres denomme "le Vendeur", et toute personne morale ou physique agissant dans le cadre d'une activite professionnelle ou a titre particulier, ci-apres denomme "le Client", pour toute commande d'equipements professionnels, de vetements de travail, d'equipements de protection individuelle (EPI) et de toute autre prestation proposee sur le site ou par tout autre canal de vente du Vendeur.

Toute commande emportant acceptation sans reserve des presentes CGV, qui prevalent sur toute autre condition, notamment celles figurant sur les documents d'achat du Client. Le Vendeur se reserve le droit de modifier ses CGV a tout moment. Les CGV applicables sont celles en vigueur a la date de la commande.

L'absence de contestation de la part du Client quant aux CGV vaut acceptation pleine et entiere de celles-ci.`,
  },
  {
    title: 'Article 2 : Devis',
    content: `Tout devis emis par ITS Equipement est valable pour une duree de 30 jours calendaires a compter de sa date d'emission, sauf mention contraire. Au-dela de ce delai, les prix et les conditions peuvent etre revises.

Le devis est etabli sur la base des informations fournies par le Client. Toute modification de la commande (quantites, personnalisation, references) necessite l'emission d'un nouveau devis.

La commande n'est consideree comme definitive qu'apres validation ecrite du devis par le Client, par retour signe ou par email de confirmation. Le Vendeur se reserve le droit de refuser toute commande en cas d'informations incompletes ou erronnees.`,
  },
  {
    title: 'Article 3 : Prix',
    content: `Les prix indiques sur les devis et factures sont exprimes en FCFA (Francs CFA BCEAO). Les prix comprennent les frais de personnalisation le cas echeant, sauf mention contraire.

ITS Equipement se reserve le droit de modifier ses tarifs a tout moment. Toutefois, les prix annonces dans un devis accepte par le Client restent fermes et non revisables.

Les conditions de paiement sont les suivantes : pour les commandes sans personnalisation, le paiement integral est exigible a la livraison. Pour les commandes avec personnalisation (impression, broderie, gravure), un acompte de 50% est exigible a la commande, le solde etant du a la livraison. Ces modalites sont rappelees sur chaque devis et facture.

Le paiement s'effectue par virement bancaire, par Mobile Money (Orange Money, MTN Mobile Money, Moov Money) ou par cheque.`,
  },
  {
    title: 'Article 4 : Personnalisation',
    content: `La personnalisation des produits (impression de logo, texte, broderie, gravure) est realisee conformement aux specifications fournies par le Client lors de la commande. Le Client est seul responsable de la qualite des fichiers graphiques transmis et de l'exactitude des informations a imprimer.

ITS Equipement se reserve le droit de refuser toute personnalisation contraire a l'ordre public, aux bonnes moeurs ou portant atteinte aux droits de tiers. Le Client garantit detenir les droits necessaires sur les logos, marques et elements graphiques fournis.

Les zones de personnalisation varient selon les produits et sont precisees dans le devis. Toute demande de modification des zones d'impression apres validation du devis pourra entrainer un supplement de prix et un delai supplementaire.`,
  },
  {
    title: 'Article 5 : Commande',
    content: `La commande est confirmee apres validation expresse du devis par le Client. A reception de cette validation, ITS Equipement transmet au Client une confirmation de commande par email, reprenant l'ensemble des elements convenus : references, quantites, prix, delais et conditions de personnalisation.

Toute annulation de la part du Client doit etre notifiee par ecrit. Si l'annulation intervient apres le demarrage de la production, le Client pourra etre tenu de rembourser les frais deja engages, notamment les couts de personnalisation et d'approvisionnement des matieres premieres.

La production est lancee a compter de la reception du paiement de l'acompte le cas echeant. ITS Equipement s'engage a respecter les delais indiques dans le devis, sous reserve de la reception des elements necessaires a la commande dans les delais impartis.`,
  },
  {
    title: 'Article 6 : Paiement',
    content: `Pour les commandes ne comprenant pas de personnalisation, le paiement integral est exigible a la livraison, par virement bancaire, Mobile Money (Orange Money, MTN Mobile Money, Moov Money) ou cheque.

Pour les commandes incluant une personnalisation (impression, broderie, gravure), les conditions de paiement sont les suivantes : un acompte de 50% du montant total est exigible a la commande, avant tout demarrage de production. Le solde de 50% est exigible a la livraison, sur presentation de la facture finale.

En cas de retard de paiement, ITS Equipement se reserve le droit de suspendre les livraisons en cours sans preavis. Des penalites de retard pourront etre appliquees conformement a la legislation ivoirienne en vigueur.`,
  },
  {
    title: 'Article 7 : Livraison',
    content: `ITS Equipement effectue ses livraisons a Abidjan et dans les principales villes de Cote d'Ivoire via des transporteurs professionnels partenaires. Les delais de livraison indicatifs sont de 5 a 10 jours ouvrables apres validation du devis pour les commandes sans personnalisation, et de 10 a 20 jours ouvrables pour les commandes avec personnalisation. Ces delais sont donnes a titre indicatif et peuvent varier en fonction des volumes et de la complexite de la commande.

Le transfert des risques s'opere au moment de la remise de la marchandise au transporteur. Il appartient au Client de verifier l'etat de la marchandise a la livraison et d'emettre toute reserve aupres du transporteur en cas de dommage constate lors de la reception.

Les conditions de livraison gratuites sont precisees sur chaque devis en fonction du volume et de la destination. Pour les livraisons hors zone couverte, des frais supplementaires pourront etre appliques. ITS Equipement ne saurait etre tenu responsable des retards de livraison imputables au transporteur ou a des cas de force majeure.`,
  },
  {
    title: 'Article 8 : Retours et echanges',
    content: `Les retours et echanges ne sont possibles que dans les cas suivants : produit defectueux, erreur de livraison (mauvaise reference, mauvaise quantite), ou non-conformite par rapport au devis valide.

Toute demande de retour doit etre notifiee par ecrit a ITS Equipement dans un delai de 7 jours ouvrables a compter de la reception de la marchandise, accompagnee de photographies et d'une description detaillee du motif. ITS Equipement se reserve le droit d'examiner le produit retourne avant d'accepter ou de refuser la demande.

En cas de retour accepte, ITS Equipement procedera au remplacement du produit ou a l'emission d'un avoir. Les produits personnalises ne sont ni repris ni echanges, sauf en cas de vice de conformite imputable au Vendeur. Les frais de retour sont a la charge du Client sauf en cas d'erreur imputable a ITS Equipement.`,
  },
  {
    title: 'Article 9 : Responsabilite',
    content: `ITS Equipement s'engage a fournir des produits conformes aux specifications du devis valide et aux normes en vigueur applicables aux equipements de travail et aux EPI. Toutefois, la responsabilite du Vendeur est limitee au montant de la commande concernee.

ITS Equipement ne saurait etre tenu responsable des dommages indirects, tels que perte d'exploitation, prejudice commercial ou perte de chiffre d'affaires, resultant de l'utilisation des produits fournis. Le Client reste seul responsable de l'utilisation qu'il fait des equipements et du respect des consignes de securite associees.

Les informations, descriptions et photographs presentes sur les supports de communication d'ITS Equipement sont donnees a titre indicatif et ne sauraient engager la responsabilite du Vendeur. En cas de litige, une recherche de solution amiable sera privilegiee avant toute action en justice. Le tribunal competent sera celui d'Abidjan, Cote d'Ivoire.`,
  },
  {
    title: 'Article 10 : Donnees personnelles',
    content: `ITS Equipement s'engage a traiter les donnees personnelles collectees dans le cadre de ses relations commerciales conformement a la loi n 2013-450 du 19 juin 2013 relative a la protection des donnees personnelles en Cote d'Ivoire.

Les donnees collectees (nom, prenom, raison sociale, adresse, email, telephone) sont necessaires a la gestion des commandes, a l'emission des factures et au suivi de la relation commerciale. Elles sont conservees pendant la duree de la relation commerciale et pendant une duree de 5 ans a compter de la derniere commande, conformement aux obligations legales.

Le Client dispose d'un droit d'acces, de rectification, de suppression et d'opposition de ses donnees personnelles, qu'il peut exercer en adressant sa demande a : contact@itschoolci.com. ITS Equipement ne communique aucune donnee personnelle a des tiers sans l'accord prealable du Client, sauf obligation legale.`,
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
            Conditions generales de vente
          </h1>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
            Derniere mise a jour : Aout 2025
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
