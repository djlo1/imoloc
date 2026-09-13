-- Fusion architecture : utilisateurs_invites (agence_id, email,
-- organisation_externe, statut, token) est déjà exactement la table pensée
-- pour le domaine F (Prestataire externe, garant...) — reprise telle quelle,
-- aucun renommage. Il lui manquera un role_id une fois le domaine E
-- (table roles) réellement construit, pas avant.
--
-- Ce qui manque dès maintenant : un moyen de marquer, sur agence_users, un
-- accès invité qui ne consomme aucune licence — aucun code ne convertit
-- encore une ligne utilisateurs_invites en agence_users (flux d'acceptation
-- pas construit), mais la colonne doit exister pour que ce flux, une fois
-- bâti, puisse s'appuyer dessus sans nouvelle migration.
ALTER TABLE public.agence_users
  ADD COLUMN est_invite boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.agence_users.est_invite IS
  'Vrai pour un accès externe limité (prestataire, garant...) via utilisateurs_invites — ne consomme aucune licence et ne compte pas dans les quotas d''utilisateurs du plan.';
