-- Ajustement tarifaire : le palier "Imoloc Pro" (particulier) passe de
-- 50 Go à 5 Go de stockage inclus.
UPDATE public.plans
SET quota_stockage_go = 5
WHERE code = 'particulier_pro';
