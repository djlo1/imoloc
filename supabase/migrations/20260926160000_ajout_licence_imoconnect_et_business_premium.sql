-- ImoConnect devient une vraie licence du catalogue (auparavant simplement
-- "inclus avec Manager", sans quota propre) suite à la décision de lui
-- donner un nombre de licences incluses par plan, comme les autres produits.
INSERT INTO public.licences (nom, description, type, actif, devise)
VALUES (
  'ImoConnect',
  'Accès à ImoConnect — connecteurs et intégrations tierces.',
  'imoloc_connect',
  true,
  'FCFA'
);

-- La description d'Imoloc Manager mentionnait encore ImoConnect comme inclus
-- automatiquement ; ce n'est plus le cas puisqu'il a désormais sa propre
-- licence et son propre quota par plan.
UPDATE public.licences
SET description = 'Accès à Imoloc Manager et ImoDrive — utilisateur interne classique. Prix dépendant du palier de l''organisation.'
WHERE type = 'imoloc_standard';

-- Complète les plans déjà traités avec la nouvelle licence ImoConnect
-- (0 pour Imoloc Standard, où ImoConnect n'est pas disponible).
INSERT INTO public.plans_licences (plan_id, licence_id, licences_incluses)
SELECT p.id, l.id, 0
FROM public.plans p, public.licences l
WHERE p.code = 'organisation_starter' AND l.type = 'imoloc_connect';

-- Pour Imoloc Business, ImoConnect était déjà disponible (plans_applications)
-- mais sans quota défini avant l'ajout de cette licence : proposition de 1,
-- à ajuster si besoin.
INSERT INTO public.plans_licences (plan_id, licence_id, licences_incluses)
SELECT p.id, l.id, 1
FROM public.plans p, public.licences l
WHERE p.code = 'organisation_business' AND l.type = 'imoloc_connect';

-- Imoloc Business Premium : les 6 chiffres validés avec l'utilisateur
-- (Imoloc Hub laissé de côté, chantier API à concevoir séparément).
INSERT INTO public.plans_licences (plan_id, licence_id, licences_incluses)
SELECT p.id, l.id,
  CASE l.type
    WHEN 'imoloc_standard'          THEN 2   -- Imoloc Manager
    WHEN 'imoloc_field'             THEN 2   -- ImoField
    WHEN 'imo_assist_agent'         THEN 2   -- Imo Assist
    WHEN 'imoloc_insights_viewer'   THEN 15  -- Imoloc Insights
    WHEN 'loci_ai_pro'              THEN 1   -- Loci AI
    WHEN 'imoloc_connect'           THEN 2   -- ImoConnect
    ELSE 0
  END
FROM public.plans p
CROSS JOIN public.licences l
WHERE p.code = 'organisation_business_premium';
