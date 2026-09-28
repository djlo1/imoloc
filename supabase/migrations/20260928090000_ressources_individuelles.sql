-- Composantes par produit, façon "plans de service" M365 : chaque ressource
-- peut être individuellement décochée pour un utilisateur précis (comme
-- décocher Teams sans retirer toute la licence). "assignable_individuellement"
-- correspond au champ appliesTo=User/Company de Microsoft — aujourd'hui,
-- aucune ressource imoloc n'est un vrai equivalent "Company" (reglage de
-- plateforme sans sens par utilisateur), la colonne est prevue pour le jour
-- ou ce cas apparaitra, sans inventer une restriction qui n'existe pas.
ALTER TABLE public.ressources
  ADD COLUMN IF NOT EXISTS assignable_individuellement boolean NOT NULL DEFAULT true;

-- Meme style exact que agence_equipements_desactives / agence_types_biens_desactives
-- deja dans le projet : cle primaire composite, presence = desactivee pour cet
-- utilisateur, absence = active par defaut (comme les cases cochees par
-- defaut chez Microsoft quand on attribue une licence).
CREATE TABLE public.agence_users_ressources_desactivees (
  agence_user_id uuid NOT NULL REFERENCES public.agence_users(id) ON DELETE CASCADE,
  ressource_id uuid NOT NULL REFERENCES public.ressources(id) ON DELETE CASCADE,
  PRIMARY KEY (agence_user_id, ressource_id)
);

ALTER TABLE public.agence_users_ressources_desactivees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_all_agence_users_ressources_desactivees" ON public.agence_users_ressources_desactivees
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
