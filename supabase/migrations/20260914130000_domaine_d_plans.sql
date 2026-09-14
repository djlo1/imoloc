-- Domaine D (suite) — plans, plans_applications, agence_licences_achetees.
-- Complète ce qui manquait pour que les paliers/quotas validés deviennent
-- réels : licences/licences_utilisateurs (types de sièges) existaient déjà
-- (migration du 2026-09-13), il manquait les paliers eux-mêmes.

CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  nom text NOT NULL,
  famille text NOT NULL CHECK (famille IN ('particulier','organisation')),
  prix_mensuel numeric,
  prix_mensuel_annuel numeric,
  quota_biens integer,
  quota_proprietaires integer,
  quota_locataires integer,
  quota_utilisateurs_inclus integer,
  cout_utilisateur_supplementaire numeric,
  quota_stockage_go integer,
  est_sur_devis boolean NOT NULL DEFAULT false,
  ordre_affichage integer NOT NULL DEFAULT 0
);

COMMENT ON TABLE public.plans IS
  'Quota = null : illimité (biens/proprietaires/locataires) ou sur mesure (stockage) ou sur volume contractuel (utilisateurs). Prix = null quand est_sur_devis.';

INSERT INTO public.plans (code, nom, famille, prix_mensuel, prix_mensuel_annuel, quota_biens, quota_proprietaires, quota_locataires, quota_utilisateurs_inclus, cout_utilisateur_supplementaire, quota_stockage_go, est_sur_devis, ordre_affichage) VALUES
  ('particulier_free', 'Imoloc Free', 'particulier', 0, null, 3, null, 5, 1, null, 1, false, 1),
  ('particulier_starter', 'Imoloc Starter', 'particulier', 3000, 2400, 10, null, 30, 1, null, 10, false, 2),
  ('particulier_pro', 'Imoloc Pro', 'particulier', 7200, 6000, null, null, null, 1, null, 50, false, 3),
  ('organisation_starter', 'Imoloc Starter', 'organisation', 18000, 15000, 50, 20, null, 3, 5000, 10, false, 4),
  ('organisation_business', 'Imoloc Business', 'organisation', 39000, 32400, 500, 60, null, 10, 6000, 100, false, 5),
  ('organisation_business_premium', 'Imoloc Business Premium', 'organisation', 55000, 46000, 1000, null, null, 20, 7000, 500, false, 6),
  ('organisation_enterprise', 'Imoloc Enterprise', 'organisation', null, null, null, null, null, null, null, null, true, 7);

CREATE TABLE public.plans_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.applications(id),
  disponible boolean NOT NULL DEFAULT true,
  niveau text,
  sieges_inclus integer,
  UNIQUE (plan_id, application_id)
);

COMMENT ON TABLE public.plans_applications IS
  'Imoloc ID n''a volontairement aucune ligne ici : toujours inclus, transverse, jamais une application qu''on active/désactive par plan.';

-- Organisation.
INSERT INTO public.plans_applications (plan_id, application_id, disponible, niveau, sieges_inclus)
SELECT p.id, a.id, v.disponible, v.niveau, v.sieges_inclus
FROM (VALUES
  ('organisation_starter','imoloc_admin', true, 'standard', null),
  ('organisation_starter','imoloc_manager', true, 'essentiel', null),
  ('organisation_starter','imodrive', true, 'stockage limité', null),
  ('organisation_starter','imoconnect', false, null, null),
  ('organisation_starter','imoloc_insights', false, null, null),
  ('organisation_starter','imo_assist', false, null, null),
  ('organisation_starter','loci_ai', false, null, null),
  ('organisation_starter','imofield', false, null, null),
  ('organisation_starter','imoloc_hub', false, null, null),

  ('organisation_business','imoloc_admin', true, 'standard', null),
  ('organisation_business','imoloc_manager', true, 'complet', null),
  ('organisation_business','imodrive', true, 'stockage étendu', null),
  ('organisation_business','imoconnect', true, null, null),
  ('organisation_business','imoloc_insights', true, 'rapports de base', null),
  ('organisation_business','imo_assist', false, null, null),
  ('organisation_business','loci_ai', true, 'basique', null),
  ('organisation_business','imofield', true, 'basique', 2),
  ('organisation_business','imoloc_hub', false, null, null),

  ('organisation_business_premium','imoloc_admin', true, 'avancé', null),
  ('organisation_business_premium','imoloc_manager', true, 'complet', null),
  ('organisation_business_premium','imodrive', true, 'stockage étendu', null),
  ('organisation_business_premium','imoconnect', true, null, null),
  ('organisation_business_premium','imoloc_insights', true, 'rapports avancés', null),
  ('organisation_business_premium','imo_assist', true, null, null),
  ('organisation_business_premium','loci_ai', true, 'basique', null),
  ('organisation_business_premium','imofield', true, 'avancé', 5),
  ('organisation_business_premium','imoloc_hub', true, 'API de base', null),

  ('organisation_enterprise','imoloc_admin', true, 'avancé', null),
  ('organisation_enterprise','imoloc_manager', true, 'complet', null),
  ('organisation_enterprise','imodrive', true, 'sur mesure', null),
  ('organisation_enterprise','imoconnect', true, null, null),
  ('organisation_enterprise','imoloc_insights', true, 'avancé +', null),
  ('organisation_enterprise','imo_assist', true, null, null),
  ('organisation_enterprise','loci_ai', true, 'avancé', null),
  ('organisation_enterprise','imofield', true, 'sur mesure', null),
  ('organisation_enterprise','imoloc_hub', true, 'API complète + SSO', null),

  -- Particulier.
  ('particulier_free','imoloc_manager', true, 'très limité', null),
  ('particulier_free','imodrive', false, null, null),
  ('particulier_free','imoloc_insights', false, null, null),
  ('particulier_free','loci_ai', false, null, null),

  ('particulier_starter','imoloc_manager', true, 'complet', null),
  ('particulier_starter','imodrive', true, null, null),
  ('particulier_starter','imoloc_insights', false, null, null),
  ('particulier_starter','loci_ai', false, null, null),

  ('particulier_pro','imoloc_manager', true, 'complet', null),
  ('particulier_pro','imodrive', true, null, null),
  ('particulier_pro','imoloc_insights', true, 'rapports de base', null),
  ('particulier_pro','loci_ai', true, null, null)
) AS v(plan_code, app_code, disponible, niveau, sieges_inclus)
JOIN public.plans p ON p.code = v.plan_code
JOIN public.applications a ON a.code = v.app_code;

CREATE TABLE public.agence_licences_achetees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agence_id uuid NOT NULL REFERENCES public.agences(id) ON DELETE CASCADE,
  licence_id uuid NOT NULL REFERENCES public.licences(id),
  quantite integer NOT NULL DEFAULT 0,
  mis_a_jour_le timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (agence_id, licence_id)
);

COMMENT ON TABLE public.agence_licences_achetees IS
  'Sièges achetés EN PLUS de l''inclus du palier (plans.quota_utilisateurs_inclus pour Imoloc Standard, plans_applications.sieges_inclus pour ImoField). Total disponible = inclus + cette table.';

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agence_licences_achetees ENABLE ROW LEVEL SECURITY;

CREATE POLICY plans_select ON public.plans FOR SELECT USING (true);
CREATE POLICY plans_write_super_admin ON public.plans FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY plans_applications_select ON public.plans_applications FOR SELECT USING (true);
CREATE POLICY plans_applications_write_super_admin ON public.plans_applications FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY agence_licences_achetees_scope ON public.agence_licences_achetees
  FOR ALL
  USING (is_my_agence(agence_id) OR is_super_admin())
  WITH CHECK (is_my_agence(agence_id) OR is_super_admin());
