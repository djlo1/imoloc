-- Le parcours plan par plan est terminé : plans_licences couvre désormais
-- tous les plans organisation pour les 6 licences, et AddUserModal.jsx lit
-- ces chiffres. L'ancien champ ambigu (ne précisait pas le produit) n'est
-- plus lu nulle part dans le code — on peut le supprimer.
ALTER TABLE public.plans DROP COLUMN quota_utilisateurs_inclus;
