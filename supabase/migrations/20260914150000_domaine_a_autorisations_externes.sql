-- Domaine A (suite) — autorisations_externes : le mécanisme de consentement
-- explicite et révocable. Une organisation ne peut modifier le profil d'un
-- utilisateur externe (locataire/propriétaire/prestataire) que si elle l'a
-- créé elle-même (profiles.cree_par_type/cree_par_agence_id) OU si cette
-- personne le lui a explicitement autorisé — c'est ce que cette table trace.

ALTER TABLE public.profiles
  ADD COLUMN cree_par_type text NOT NULL DEFAULT 'self' CHECK (cree_par_type IN ('self','organisation')),
  ADD COLUMN cree_par_agence_id uuid REFERENCES public.agences(id);

COMMENT ON COLUMN public.profiles.cree_par_type IS
  'self : la personne a créé son propre compte (chemin cible). organisation : compte créé par une agence (mécanisme de secours, ex. create-locataire-account).';

CREATE TABLE public.autorisations_externes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agence_id uuid NOT NULL REFERENCES public.agences(id) ON DELETE CASCADE,
  permission_code text NOT NULL,
  accorde_le timestamp with time zone NOT NULL DEFAULT now(),
  revoque_le timestamp with time zone,
  UNIQUE (utilisateur_id, agence_id, permission_code)
);

COMMENT ON TABLE public.autorisations_externes IS
  'Consentement explicite d''un utilisateur externe envers une organisation. Actif si revoque_le IS NULL. permission_code libre (ex. modifier_profil) pour rester extensible.';

ALTER TABLE public.autorisations_externes ENABLE ROW LEVEL SECURITY;

-- La personne concernée gère ses propres autorisations ; l'organisation
-- destinataire peut les consulter (pour savoir ce qu'elle a le droit de
-- faire) mais ne peut ni les créer ni les révoquer à sa place.
CREATE POLICY autorisations_externes_self ON public.autorisations_externes
  FOR ALL
  USING (utilisateur_id = auth.uid() OR is_super_admin())
  WITH CHECK (utilisateur_id = auth.uid() OR is_super_admin());

CREATE POLICY autorisations_externes_agence_lecture ON public.autorisations_externes
  FOR SELECT
  USING (is_my_agence(agence_id) OR is_super_admin());
