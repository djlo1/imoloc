-- Domaine A — profiles.role mélangeait deux choses : le routage (quel
-- espace ouvrir : proprietaire/locataire/super_admin/agence) ET un doublon
-- complet des valeurs RBAC d'agence_users.role (global_admin, user_admin,
-- billing_admin...). profiles.type_compte existait déjà et couvrait ce
-- qu'on voulait appeler "nature_compte" — ce nom est abandonné.
--
-- profiles.espace (nouvelle colonne) ne porte que le routage :
-- proprietaire / locataire / super_admin / collaborateur (tout le reste,
-- qui n'a plus besoin d'être distingué à ce niveau maintenant que
-- agence_users_roles existe pour le détail RBAC réel).
--
-- profiles.role N'EST PAS supprimée ni vidée : au moins une vraie
-- fonctionnalité (le lien "Configurer maintenant" sur la fiche bien,
-- réservé à global_admin) lit encore sa valeur fine directement. La
-- nettoyer complètement attend que ces points d'usage soient migrés vers
-- une vraie vérification de permission (agence_users_roles/role_permissions)
-- — un chantier séparé, plus large que ce renommage.

ALTER TABLE public.profiles ADD COLUMN espace text;

UPDATE public.profiles SET espace = CASE role
  WHEN 'locataire' THEN 'locataire'
  WHEN 'proprietaire' THEN 'proprietaire'
  WHEN 'super_admin' THEN 'super_admin'
  ELSE 'collaborateur'
END;

ALTER TABLE public.profiles ALTER COLUMN espace SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN espace SET DEFAULT 'collaborateur';

COMMENT ON COLUMN public.profiles.espace IS
  'Routage uniquement : proprietaire / locataire / super_admin / collaborateur. Le détail des droits d''un collaborateur vit dans agence_users_roles, pas ici.';
COMMENT ON COLUMN public.profiles.role IS
  'Historique : mélange routage + RBAC dupliqué d''agence_users.role. Le routage a migré vers profiles.espace. Encore lue telle quelle par au moins un contrôle fin (ex. Biens.jsx, lien reservé global_admin) — ne pas vider tant que ces usages n''ont pas migré vers agence_users_roles.';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, nom, prenom, role, type_compte, espace)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nom', ''),
    COALESCE(NEW.raw_user_meta_data->>'prenom', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'global_admin'),
    COALESCE(NEW.raw_user_meta_data->>'type_compte', 'organisation'),
    CASE COALESCE(NEW.raw_user_meta_data->>'role', 'global_admin')
      WHEN 'locataire' THEN 'locataire'
      WHEN 'proprietaire' THEN 'proprietaire'
      WHEN 'super_admin' THEN 'super_admin'
      ELSE 'collaborateur'
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $function$
  select exists (
    select 1 from profiles
    where id = auth.uid() and espace = 'super_admin'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_agence()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $function$
  select exists (
    select 1 from profiles
    where id = auth.uid() and espace = 'collaborateur'
  );
$function$;
