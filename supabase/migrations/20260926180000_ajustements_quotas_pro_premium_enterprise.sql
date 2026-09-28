-- Ajustements validés avec l'utilisateur sur le récapitulatif complet des plans.
UPDATE public.plans SET quota_biens = 25 WHERE code = 'particulier_pro';
UPDATE public.plans SET quota_proprietaires = 350 WHERE code = 'organisation_business_premium';
UPDATE public.plans SET quota_proprietaires = 1750 WHERE code = 'organisation_enterprise';
