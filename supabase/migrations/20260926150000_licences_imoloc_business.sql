-- Licences incluses validées avec l'utilisateur pour "Imoloc Business"
-- (organisation, code 'organisation_business').

INSERT INTO public.plans_licences (plan_id, licence_id, licences_incluses)
SELECT p.id, l.id,
  CASE l.type
    WHEN 'imoloc_standard'          THEN 6   -- Imoloc Manager
    WHEN 'imoloc_field'             THEN 1
    WHEN 'imo_assist_agent'         THEN 0   -- Imo Assist
    WHEN 'imoloc_insights_viewer'   THEN 10  -- Imoloc Insights
    WHEN 'loci_ai_pro'              THEN 1   -- Loci AI
    ELSE 0
  END
FROM public.plans p
CROSS JOIN public.licences l
WHERE p.code = 'organisation_business';

-- Aligne le champ existant plans_applications.sieges_inclus pour ImoField
-- (était à 2, désormais 1 licence incluse validée pour ce plan).
UPDATE public.plans_applications pa
SET sieges_inclus = 1
FROM public.plans p, public.applications a
WHERE pa.plan_id = p.id AND pa.application_id = a.id
  AND p.code = 'organisation_business' AND a.nom = 'ImoField';
