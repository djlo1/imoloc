-- Relie l'ancien système d'abonnement (abonnements.plan, un enum, utilisé
-- par la facturation réelle) au nouveau catalogue de paliers (table plans,
-- qui porte les vrais quotas — quota_utilisateurs_inclus, sièges par
-- application via plans_applications) ajouté plus tard et jamais raccordé.
-- Sans ce lien, impossible de savoir quel palier réel une agence a souscrit,
-- donc impossible d'afficher un vrai décompte de licences (comme le fait
-- M365 : "X licence(s) sur Y disponible(s)" basé sur le forfait acheté).
--
-- Approche : abonnements.plan_id, tenu à jour automatiquement par
-- déclencheur à partir de abonnements.plan (l'enum reste la source saisie
-- par le code applicatif existant — activate-plan, create-trial,
-- pawapay-callback, AbonnementPlan.jsx — rien à y changer).

ALTER TABLE public.abonnements
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.plans(id);

CREATE OR REPLACE FUNCTION public.abonnements_map_plan_id(p_plan public.plan_abonnement)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM public.plans WHERE code = CASE p_plan
    WHEN 'starter_p' THEN 'particulier_starter'
    WHEN 'pro_p' THEN 'particulier_pro'
    WHEN 'starter_o' THEN 'organisation_starter'
    WHEN 'business_o' THEN 'organisation_business'
    WHEN 'enterprise_o' THEN 'organisation_enterprise'
    -- Valeurs historiques (avant la convention *_p/*_o) : rattachées au
    -- palier organisation le plus proche en couverture.
    WHEN 'basic' THEN 'organisation_starter'
    WHEN 'standard' THEN 'organisation_business'
    WHEN 'premium' THEN 'organisation_business_premium'
    WHEN 'entreprise' THEN 'organisation_enterprise'
  END;
$$;

CREATE OR REPLACE FUNCTION public.abonnements_set_plan_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.plan_id := public.abonnements_map_plan_id(NEW.plan);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_abonnements_set_plan_id ON public.abonnements;
CREATE TRIGGER trg_abonnements_set_plan_id
  BEFORE INSERT OR UPDATE OF plan ON public.abonnements
  FOR EACH ROW EXECUTE FUNCTION public.abonnements_set_plan_id();

-- Backfill des lignes existantes.
UPDATE public.abonnements
SET plan_id = public.abonnements_map_plan_id(plan)
WHERE plan_id IS NULL;

COMMENT ON COLUMN public.abonnements.plan_id IS
  'Renseigné automatiquement (trigger) à partir de plan — source de vérité pour les vrais quotas (plans.quota_utilisateurs_inclus, plans_applications.sieges_inclus). Ne pas écrire directement, modifier plan à la place.';
