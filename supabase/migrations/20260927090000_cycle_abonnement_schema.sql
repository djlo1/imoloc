-- Support du choix du nombre de licences a l achat + cycle de vie
-- essai -> relance -> suspension (delai de grace 15 jours).

ALTER TYPE statut_abonnement ADD VALUE IF NOT EXISTS 'en_attente';
ALTER TYPE statut_abonnement ADD VALUE IF NOT EXISTS 'suspendu';

ALTER TABLE public.abonnements
  ADD COLUMN IF NOT EXISTS grace_fin date,
  ADD COLUMN IF NOT EXISTS periode text NOT NULL DEFAULT 'mensuel';

COMMENT ON COLUMN public.abonnements.grace_fin IS
  'Date limite du delai de grace de 15 jours apres la fin d une periode non payee (essai ou renouvellement). Passe cette date sans paiement, statut devient suspendu.';
COMMENT ON COLUMN public.abonnements.periode IS
  'mensuel ou annuel — determine le montant de relance et le prochain date_fin (corrige le bug ou date_fin etait toujours +1 mois).';

ALTER TABLE public.pawapay_transactions
  ADD COLUMN IF NOT EXISTS nombre_licences integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS periode text NOT NULL DEFAULT 'mensuel';

COMMENT ON COLUMN public.pawapay_transactions.nombre_licences IS
  'Nombre de licences Imoloc Manager choisies par l organisation au moment du paiement — reporte dans agence_licences_achetees par pawapay-callback une fois le paiement confirme.';
