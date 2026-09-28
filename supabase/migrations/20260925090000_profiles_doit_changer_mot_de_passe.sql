-- Rend réellement fonctionnelle la case "Demander à cet utilisateur de
-- modifier son mot de passe lors de sa première connexion" (assistant
-- Ajouter un utilisateur, panneau Réinitialiser le mot de passe) : jusqu'ici
-- ce choix n'était sauvegardé que sur invitations.force_change_password,
-- jamais relu après l'envoi de l'email — aucune page ne forçait quoi que ce
-- soit. Ce drapeau, lui, vit sur le profil et est vérifié à chaque connexion
-- (PrivateRoute) pour rediriger vers /changer-mot-de-passe tant qu'il est vrai.
alter table public.profiles
  add column if not exists doit_changer_mot_de_passe boolean not null default false;

comment on column public.profiles.doit_changer_mot_de_passe is
  'Vrai tant que l''utilisateur doit changer son mot de passe avant d''accéder au reste de l''application (fixé à la création/réinitialisation, effacé une fois le changement effectué).';
