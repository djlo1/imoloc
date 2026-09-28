-- Ajustement tarifaire : le palier "Imoloc Starter" (particulier) passe de
-- 10 Go à 3 Go de stockage inclus.
UPDATE public.plans
SET quota_stockage_go = 3
WHERE code = 'particulier_starter';
