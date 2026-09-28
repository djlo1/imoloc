-- Reconnait la nouvelle valeur enum 'business_premium_o' en plus de
-- l'ancienne valeur historique 'premium' (conservee pour les abonnements
-- existants qui l'utilisent encore).
CREATE OR REPLACE FUNCTION public.abonnements_map_plan_id(p_plan plan_abonnement)
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  SELECT id FROM public.plans WHERE code = CASE p_plan
    WHEN 'starter_p' THEN 'particulier_starter'
    WHEN 'pro_p' THEN 'particulier_pro'
    WHEN 'starter_o' THEN 'organisation_starter'
    WHEN 'business_o' THEN 'organisation_business'
    WHEN 'business_premium_o' THEN 'organisation_business_premium'
    WHEN 'enterprise_o' THEN 'organisation_enterprise'
    -- Valeurs historiques (avant la convention *_p/*_o) : rattachées au
    -- palier organisation le plus proche en couverture.
    WHEN 'basic' THEN 'organisation_starter'
    WHEN 'standard' THEN 'organisation_business'
    WHEN 'premium' THEN 'organisation_business_premium'
    WHEN 'entreprise' THEN 'organisation_enterprise'
  END;
$function$
