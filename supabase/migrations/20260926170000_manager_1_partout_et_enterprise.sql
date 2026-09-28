-- Décision : Imoloc Manager passe à 1 seule licence incluse sur tous les
-- plans organisation (au lieu de 2/6/2 selon le palier) — simplification
-- validée avec l'utilisateur.
UPDATE public.plans_licences pl
SET licences_incluses = 1
FROM public.licences l
WHERE pl.licence_id = l.id AND l.type = 'imoloc_standard';

-- Imoloc Enterprise n'est plus "sur devis" : vraie offre chiffrée.
UPDATE public.plans
SET
  prix_mensuel = 95000,
  prix_mensuel_annuel = 79000,
  quota_biens = 5000,
  quota_proprietaires = 500,
  quota_stockage_go = 1000,
  cout_utilisateur_supplementaire = 8000,
  est_sur_devis = false
WHERE code = 'organisation_enterprise';

-- Licences incluses validées pour Imoloc Enterprise (Imoloc Hub laissé de
-- côté, chantier API à concevoir séparément).
INSERT INTO public.plans_licences (plan_id, licence_id, licences_incluses)
SELECT p.id, l.id,
  CASE l.type
    WHEN 'imoloc_standard'          THEN 1   -- Imoloc Manager
    WHEN 'imoloc_field'             THEN 5   -- ImoField
    WHEN 'imo_assist_agent'         THEN 5   -- Imo Assist
    WHEN 'imoloc_insights_viewer'   THEN 25  -- Imoloc Insights
    WHEN 'loci_ai_pro'              THEN 5   -- Loci AI
    WHEN 'imoloc_connect'           THEN 5   -- ImoConnect
    ELSE 0
  END
FROM public.plans p
CROSS JOIN public.licences l
WHERE p.code = 'organisation_enterprise';
