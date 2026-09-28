-- Ajoute une vraie valeur enum pour Imoloc Business Premium (jusqu'ici,
-- seule l'ancienne valeur historique 'premium' y pointait, sans jamais avoir
-- ete exposee dans le parcours de paiement en libre-service).
ALTER TYPE plan_abonnement ADD VALUE IF NOT EXISTS 'business_premium_o';
