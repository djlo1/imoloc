-- Ajustement validé avec l'utilisateur pour le plan "Imoloc Standard"
-- (organisation, code 'organisation_starter') : Imoloc Manager passe de 3 à 2
-- licences incluses, et Loci AI devient disponible à ce palier avec 1 licence
-- incluse (il ne l'était pas du tout auparavant).

UPDATE public.plans_licences pl
SET licences_incluses = 2
FROM public.plans p, public.licences l
WHERE pl.plan_id = p.id AND pl.licence_id = l.id
  AND p.code = 'organisation_starter' AND l.type = 'imoloc_standard';

UPDATE public.plans_licences pl
SET licences_incluses = 1
FROM public.plans p, public.licences l
WHERE pl.plan_id = p.id AND pl.licence_id = l.id
  AND p.code = 'organisation_starter' AND l.type = 'loci_ai_pro';

UPDATE public.plans_applications pa
SET disponible = true, niveau = 'basique'
FROM public.plans p, public.applications a
WHERE pa.plan_id = p.id AND pa.application_id = a.id
  AND p.code = 'organisation_starter' AND a.nom = 'Loci AI';
