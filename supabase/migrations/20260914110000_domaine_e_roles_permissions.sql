-- Domaine E — le moteur de permissions évolutif : ressources, actions,
-- permissions (paire ressource+action), roles (catalogue), role_permissions
-- (la matrice, avec portée) et agence_users_roles (l'attribution réelle,
-- avec cumul). agence_users est vide en production (0 ligne) : aucune
-- donnée à migrer, on construit un schéma neuf sans risque.

-- ── ressources ──
CREATE TABLE public.ressources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  nom text NOT NULL,
  application_id uuid NOT NULL REFERENCES public.applications(id),
  description text
);

INSERT INTO public.ressources (code, nom, application_id, description)
SELECT v.code, v.nom, a.id, v.description
FROM (VALUES
  ('biens','Biens','imoloc_manager', null),
  ('proprietaires','Propriétaires','imoloc_manager', null),
  ('locataires','Locataires','imoloc_manager', null),
  ('baux','Baux','imoloc_manager', null),
  ('paiements','Paiements','imoloc_manager', null),
  ('factures_releves','Factures & Relevés','imoloc_manager', null),
  ('tickets_sinistres','Tickets & Sinistres','imoloc_manager', null),
  ('prestataires','Prestataires','imoloc_manager', null),
  ('documents','Documents','imodrive', null),
  ('demandes_assistance','Demandes d''assistance','imo_assist', 'Support logiciel envers Imoloc — distinct des tickets de maintenance immobilière.'),
  ('conversations','Conversations & groupes','imoconnect', null),
  ('rapports','Rapports','imoloc_insights', null),
  ('integrations','Applications & intégrations','imoloc_hub', null),
  ('utilisateurs','Utilisateurs','imoloc_admin', null),
  ('roles','Rôles & permissions','imoloc_admin', null),
  ('groupes','Groupes','imoloc_admin', null),
  ('facturation_abonnement','Facturation de l''abonnement Imoloc','imoloc_admin', 'Abonnement de l''organisation à Imoloc — distinct des finances internes (paiements/factures_releves).'),
  ('securite','Sécurité','imoloc_admin', null),
  ('conformite','Conformité','imoloc_admin', null),
  ('invitations','Invitations','imoloc_admin', null)
) AS v(code, nom, app_code, description)
JOIN public.applications a ON a.code = v.app_code;

-- ── actions ──
CREATE TABLE public.actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  nom text NOT NULL
);

INSERT INTO public.actions (code, nom) VALUES
  ('voir','Voir'),
  ('creer','Créer'),
  ('modifier','Modifier'),
  ('supprimer','Supprimer'),
  ('mettre_en_vente','Mettre en vente'),
  ('blacklister','Blacklister'),
  ('resilier','Résilier'),
  ('renouveler','Renouveler'),
  ('encaisser','Encaisser'),
  ('annuler','Annuler'),
  ('remettre_en_attente','Remettre en attente'),
  ('generer','Générer'),
  ('valider_verser','Valider / Verser'),
  ('modifier_statut','Modifier le statut'),
  ('assigner','Assigner'),
  ('cloturer','Clôturer'),
  ('ajouter','Ajouter'),
  ('partager','Partager'),
  ('exporter','Exporter'),
  ('inviter','Inviter'),
  ('desactiver','Désactiver'),
  ('reinitialiser_mdp','Réinitialiser le mot de passe'),
  ('attribuer','Attribuer'),
  ('creer_role_personnalise','Créer un rôle personnalisé'),
  ('gerer','Gérer');

-- ── permissions (paires ressource, action qui ont un sens réel) ──
CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ressource_id uuid NOT NULL REFERENCES public.ressources(id),
  action_id uuid NOT NULL REFERENCES public.actions(id),
  code text NOT NULL UNIQUE,
  UNIQUE (ressource_id, action_id)
);

INSERT INTO public.permissions (ressource_id, action_id, code)
SELECT res.id, a.id, v.ressource_code || '.' || v.action_code
FROM (VALUES
  ('biens','voir'),('biens','creer'),('biens','modifier'),('biens','supprimer'),('biens','mettre_en_vente'),
  ('proprietaires','voir'),('proprietaires','creer'),('proprietaires','modifier'),('proprietaires','supprimer'),
  ('locataires','voir'),('locataires','creer'),('locataires','modifier'),('locataires','supprimer'),('locataires','blacklister'),
  ('baux','voir'),('baux','creer'),('baux','modifier'),('baux','resilier'),('baux','renouveler'),
  ('paiements','voir'),('paiements','encaisser'),('paiements','annuler'),('paiements','remettre_en_attente'),
  ('factures_releves','voir'),('factures_releves','creer'),('factures_releves','modifier_statut'),('factures_releves','generer'),('factures_releves','valider_verser'),
  ('tickets_sinistres','voir'),('tickets_sinistres','creer'),('tickets_sinistres','modifier'),('tickets_sinistres','assigner'),('tickets_sinistres','cloturer'),
  ('prestataires','voir'),('prestataires','creer'),('prestataires','modifier'),('prestataires','supprimer'),
  ('documents','voir'),('documents','ajouter'),('documents','supprimer'),('documents','partager'),('documents','gerer'),
  ('demandes_assistance','voir'),('demandes_assistance','creer'),('demandes_assistance','assigner'),('demandes_assistance','cloturer'),('demandes_assistance','gerer'),
  ('conversations','voir'),('conversations','creer'),('conversations','modifier'),('conversations','supprimer'),('conversations','gerer'),
  ('rapports','voir'),('rapports','exporter'),
  ('integrations','voir'),('integrations','creer'),('integrations','modifier'),('integrations','supprimer'),('integrations','gerer'),
  ('utilisateurs','voir'),('utilisateurs','creer'),('utilisateurs','modifier'),('utilisateurs','supprimer'),('utilisateurs','desactiver'),('utilisateurs','inviter'),('utilisateurs','reinitialiser_mdp'),
  ('roles','voir'),('roles','attribuer'),('roles','creer_role_personnalise'),
  ('groupes','voir'),('groupes','creer'),('groupes','modifier'),('groupes','supprimer'),('groupes','gerer'),
  ('facturation_abonnement','voir'),('facturation_abonnement','gerer'),
  ('securite','voir'),('securite','gerer'),
  ('conformite','voir'),('conformite','gerer'),
  ('invitations','voir'),('invitations','creer'),('invitations','gerer')
) AS v(ressource_code, action_code)
JOIN public.ressources res ON res.code = v.ressource_code
JOIN public.actions a ON a.code = v.action_code;

-- ── roles (les 27 rôles système) ──
CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  nom text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('transverse','applicatif')),
  application_id uuid REFERENCES public.applications(id),
  est_systeme boolean NOT NULL DEFAULT true,
  est_bypass boolean NOT NULL DEFAULT false,
  agence_id uuid REFERENCES public.agences(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CHECK ((type = 'applicatif') = (application_id IS NOT NULL)),
  CHECK (est_systeme OR agence_id IS NOT NULL)
);

-- Transverses (application_id NULL).
INSERT INTO public.roles (code, nom, type, est_bypass) VALUES
  ('admin_general','Administrateur général','transverse', true),
  ('lecteur_general','Lecteur général','transverse', false),
  ('admin_utilisateurs','Administrateur des utilisateurs','transverse', false),
  ('admin_mots_de_passe','Administrateur des mots de passe','transverse', false),
  ('admin_roles_privilegies','Administrateur des rôles privilégiés','transverse', false),
  ('admin_securite','Administrateur de sécurité','transverse', false),
  ('lecteur_securite','Lecteur de sécurité','transverse', false),
  ('operateur_securite','Opérateur de sécurité','transverse', false),
  ('admin_applications','Administrateur des applications','transverse', false),
  ('admin_groupes','Administrateur des groupes','transverse', false),
  ('admin_facturation','Administrateur de facturation','transverse', false),
  ('lecteur_rapports','Lecteur de rapports','transverse', false),
  ('admin_conformite','Administrateur de conformité','transverse', false),
  ('admin_support','Administrateur du support','transverse', false),
  ('admin_support_service','Administrateur du support de service','transverse', false),
  ('gestionnaire_invites','Gestionnaire des invités','transverse', false);

-- Applicatifs (application_id renseigné).
INSERT INTO public.roles (code, nom, type, application_id)
SELECT v.code, v.nom, 'applicatif', a.id
FROM (VALUES
  ('responsable_financier','Responsable financier','imoloc_manager'),
  ('comptable','Comptable','imoloc_manager'),
  ('gestionnaire_immobilier','Gestionnaire immobilier','imoloc_manager'),
  ('agent','Agent','imoloc_manager'),
  ('lecteur_imomanager','Lecteur','imoloc_manager'),
  ('gestionnaire_interventions','Gestionnaire des interventions','imoloc_manager'),
  ('agent_imo_assist','Agent Imo Assist','imo_assist'),
  ('technicien','Technicien','imofield'),
  ('prestataire_externe','Prestataire externe','imofield'),
  ('admin_imodrive','Administrateur ImoDrive','imodrive'),
  ('admin_imoconnect','Administrateur ImoConnect','imoconnect')
) AS v(code, nom, app_code)
JOIN public.applications a ON a.code = v.app_code;

-- ── role_permissions (la matrice, avec portée) ──
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id),
  portee text NOT NULL DEFAULT 'organisation' CHECK (portee IN ('organisation','secteur','assigne','personnel')),
  UNIQUE (role_id, permission_id)
);

INSERT INTO public.role_permissions (role_id, permission_id, portee)
SELECT r.id, p.id, v.portee
FROM (VALUES
  -- Lecteur général : voir sur tout, rien d'autre.
  ('lecteur_general','biens','voir','organisation'),('lecteur_general','proprietaires','voir','organisation'),
  ('lecteur_general','locataires','voir','organisation'),('lecteur_general','baux','voir','organisation'),
  ('lecteur_general','paiements','voir','organisation'),('lecteur_general','factures_releves','voir','organisation'),
  ('lecteur_general','tickets_sinistres','voir','organisation'),('lecteur_general','prestataires','voir','organisation'),
  ('lecteur_general','documents','voir','organisation'),('lecteur_general','demandes_assistance','voir','organisation'),
  ('lecteur_general','conversations','voir','organisation'),('lecteur_general','rapports','voir','organisation'),
  ('lecteur_general','integrations','voir','organisation'),('lecteur_general','utilisateurs','voir','organisation'),
  ('lecteur_general','roles','voir','organisation'),('lecteur_general','groupes','voir','organisation'),
  ('lecteur_general','facturation_abonnement','voir','organisation'),('lecteur_general','securite','voir','organisation'),
  ('lecteur_general','conformite','voir','organisation'),('lecteur_general','invitations','voir','organisation'),

  -- Administrateur des utilisateurs.
  ('admin_utilisateurs','utilisateurs','voir','organisation'),('admin_utilisateurs','utilisateurs','creer','organisation'),
  ('admin_utilisateurs','utilisateurs','modifier','organisation'),('admin_utilisateurs','utilisateurs','supprimer','organisation'),
  ('admin_utilisateurs','utilisateurs','desactiver','organisation'),('admin_utilisateurs','utilisateurs','inviter','organisation'),
  ('admin_utilisateurs','utilisateurs','reinitialiser_mdp','organisation'),
  ('admin_utilisateurs','groupes','voir','organisation'),('admin_utilisateurs','groupes','creer','organisation'),
  ('admin_utilisateurs','groupes','modifier','organisation'),('admin_utilisateurs','groupes','supprimer','organisation'),
  ('admin_utilisateurs','groupes','gerer','organisation'),
  ('admin_utilisateurs','roles','voir','organisation'),('admin_utilisateurs','roles','attribuer','organisation'),

  -- Administrateur des mots de passe.
  ('admin_mots_de_passe','utilisateurs','voir','organisation'),('admin_mots_de_passe','utilisateurs','reinitialiser_mdp','organisation'),

  -- Administrateur des rôles privilégiés.
  ('admin_roles_privilegies','roles','voir','organisation'),('admin_roles_privilegies','roles','attribuer','organisation'),
  ('admin_roles_privilegies','roles','creer_role_personnalise','organisation'),

  -- Sécurité (admin/lecteur/opérateur).
  ('admin_securite','securite','voir','organisation'),('admin_securite','securite','gerer','organisation'),
  ('lecteur_securite','securite','voir','organisation'),
  ('operateur_securite','securite','voir','organisation'),('operateur_securite','securite','gerer','organisation'),

  -- Administrateur des applications (Hub).
  ('admin_applications','integrations','voir','organisation'),('admin_applications','integrations','creer','organisation'),
  ('admin_applications','integrations','modifier','organisation'),('admin_applications','integrations','supprimer','organisation'),
  ('admin_applications','integrations','gerer','organisation'),

  -- Administrateur des groupes.
  ('admin_groupes','groupes','voir','organisation'),('admin_groupes','groupes','creer','organisation'),
  ('admin_groupes','groupes','modifier','organisation'),('admin_groupes','groupes','supprimer','organisation'),
  ('admin_groupes','groupes','gerer','organisation'),

  -- Administrateur de facturation (voit aussi la finance ImoManager, lien volontaire avec Responsable financier).
  ('admin_facturation','facturation_abonnement','voir','organisation'),('admin_facturation','facturation_abonnement','gerer','organisation'),
  ('admin_facturation','paiements','voir','organisation'),('admin_facturation','factures_releves','voir','organisation'),

  -- Lecteur de rapports (Insights).
  ('lecteur_rapports','rapports','voir','organisation'),('lecteur_rapports','rapports','exporter','organisation'),

  -- Administrateur de conformité.
  ('admin_conformite','conformite','voir','organisation'),('admin_conformite','conformite','gerer','organisation'),

  -- Administrateur du support (interne, collègue à collègue — distinct d'Imo Assist).
  ('admin_support','utilisateurs','voir','organisation'),('admin_support','utilisateurs','reinitialiser_mdp','organisation'),

  -- Administrateur du support de service (suivi du service Imoloc, côté organisation).
  ('admin_support_service','demandes_assistance','voir','organisation'),('admin_support_service','demandes_assistance','creer','organisation'),

  -- Gestionnaire des invités.
  ('gestionnaire_invites','invitations','voir','organisation'),('gestionnaire_invites','invitations','creer','organisation'),
  ('gestionnaire_invites','invitations','gerer','organisation'),

  -- Responsable financier · ImoManager (superset du Comptable + configuration/validation + lecture facturation).
  ('responsable_financier','paiements','voir','organisation'),('responsable_financier','paiements','encaisser','organisation'),
  ('responsable_financier','paiements','annuler','organisation'),('responsable_financier','paiements','remettre_en_attente','organisation'),
  ('responsable_financier','factures_releves','voir','organisation'),('responsable_financier','factures_releves','creer','organisation'),
  ('responsable_financier','factures_releves','modifier_statut','organisation'),('responsable_financier','factures_releves','generer','organisation'),
  ('responsable_financier','factures_releves','valider_verser','organisation'),
  ('responsable_financier','biens','voir','organisation'),('responsable_financier','proprietaires','voir','organisation'),
  ('responsable_financier','locataires','voir','organisation'),('responsable_financier','baux','voir','organisation'),
  ('responsable_financier','rapports','voir','organisation'),('responsable_financier','rapports','exporter','organisation'),
  ('responsable_financier','facturation_abonnement','voir','organisation'),

  -- Comptable · ImoManager (exécute, ne valide pas les relevés).
  ('comptable','paiements','voir','organisation'),('comptable','paiements','encaisser','organisation'),
  ('comptable','paiements','annuler','organisation'),('comptable','paiements','remettre_en_attente','organisation'),
  ('comptable','factures_releves','voir','organisation'),('comptable','factures_releves','creer','organisation'),
  ('comptable','factures_releves','modifier_statut','organisation'),('comptable','factures_releves','generer','organisation'),
  ('comptable','biens','voir','organisation'),('comptable','proprietaires','voir','organisation'),
  ('comptable','locataires','voir','organisation'),('comptable','baux','voir','organisation'),
  ('comptable','rapports','voir','organisation'),('comptable','rapports','exporter','organisation'),

  -- Gestionnaire immobilier · ImoManager — accès total, toutes actions, sans restriction.
  ('gestionnaire_immobilier','biens','voir','organisation'),('gestionnaire_immobilier','biens','creer','organisation'),
  ('gestionnaire_immobilier','biens','modifier','organisation'),('gestionnaire_immobilier','biens','supprimer','organisation'),
  ('gestionnaire_immobilier','biens','mettre_en_vente','organisation'),
  ('gestionnaire_immobilier','proprietaires','voir','organisation'),('gestionnaire_immobilier','proprietaires','creer','organisation'),
  ('gestionnaire_immobilier','proprietaires','modifier','organisation'),('gestionnaire_immobilier','proprietaires','supprimer','organisation'),
  ('gestionnaire_immobilier','locataires','voir','organisation'),('gestionnaire_immobilier','locataires','creer','organisation'),
  ('gestionnaire_immobilier','locataires','modifier','organisation'),('gestionnaire_immobilier','locataires','supprimer','organisation'),
  ('gestionnaire_immobilier','locataires','blacklister','organisation'),
  ('gestionnaire_immobilier','baux','voir','organisation'),('gestionnaire_immobilier','baux','creer','organisation'),
  ('gestionnaire_immobilier','baux','modifier','organisation'),('gestionnaire_immobilier','baux','resilier','organisation'),
  ('gestionnaire_immobilier','baux','renouveler','organisation'),
  ('gestionnaire_immobilier','paiements','voir','organisation'),('gestionnaire_immobilier','paiements','encaisser','organisation'),
  ('gestionnaire_immobilier','paiements','annuler','organisation'),('gestionnaire_immobilier','paiements','remettre_en_attente','organisation'),
  ('gestionnaire_immobilier','factures_releves','voir','organisation'),('gestionnaire_immobilier','factures_releves','creer','organisation'),
  ('gestionnaire_immobilier','factures_releves','modifier_statut','organisation'),('gestionnaire_immobilier','factures_releves','generer','organisation'),
  ('gestionnaire_immobilier','factures_releves','valider_verser','organisation'),
  ('gestionnaire_immobilier','tickets_sinistres','voir','organisation'),('gestionnaire_immobilier','tickets_sinistres','creer','organisation'),
  ('gestionnaire_immobilier','tickets_sinistres','modifier','organisation'),('gestionnaire_immobilier','tickets_sinistres','assigner','organisation'),
  ('gestionnaire_immobilier','tickets_sinistres','cloturer','organisation'),
  ('gestionnaire_immobilier','documents','voir','organisation'),('gestionnaire_immobilier','documents','ajouter','organisation'),
  ('gestionnaire_immobilier','documents','supprimer','organisation'),('gestionnaire_immobilier','documents','partager','organisation'),

  -- Agent · ImoManager, portée secteur (chantier domaine F).
  ('agent','biens','voir','secteur'),('agent','biens','modifier','secteur'),
  ('agent','proprietaires','voir','secteur'),
  ('agent','locataires','voir','secteur'),('agent','locataires','creer','secteur'),('agent','locataires','modifier','secteur'),
  ('agent','baux','voir','secteur'),('agent','baux','creer','secteur'),
  ('agent','paiements','voir','secteur'),('agent','paiements','encaisser','secteur'),
  ('agent','factures_releves','voir','secteur'),
  ('agent','tickets_sinistres','voir','secteur'),('agent','tickets_sinistres','creer','secteur'),
  ('agent','documents','voir','secteur'),('agent','documents','ajouter','secteur'),

  -- Lecteur · ImoManager — Gestionnaire immobilier restreint à voir.
  ('lecteur_imomanager','biens','voir','organisation'),('lecteur_imomanager','proprietaires','voir','organisation'),
  ('lecteur_imomanager','locataires','voir','organisation'),('lecteur_imomanager','baux','voir','organisation'),
  ('lecteur_imomanager','paiements','voir','organisation'),('lecteur_imomanager','factures_releves','voir','organisation'),
  ('lecteur_imomanager','tickets_sinistres','voir','organisation'),('lecteur_imomanager','documents','voir','organisation'),

  -- Gestionnaire des interventions · ImoManager (socle toujours disponible, sans Imo Assist).
  ('gestionnaire_interventions','tickets_sinistres','voir','organisation'),('gestionnaire_interventions','tickets_sinistres','creer','organisation'),
  ('gestionnaire_interventions','tickets_sinistres','modifier','organisation'),('gestionnaire_interventions','tickets_sinistres','assigner','organisation'),
  ('gestionnaire_interventions','tickets_sinistres','cloturer','organisation'),
  ('gestionnaire_interventions','prestataires','voir','organisation'),('gestionnaire_interventions','prestataires','creer','organisation'),
  ('gestionnaire_interventions','prestataires','modifier','organisation'),('gestionnaire_interventions','prestataires','supprimer','organisation'),
  ('gestionnaire_interventions','biens','voir','organisation'),('gestionnaire_interventions','locataires','voir','organisation'),

  -- Agent Imo Assist · Imo Assist (tout Gestionnaire des interventions + outils avancés).
  ('agent_imo_assist','tickets_sinistres','voir','organisation'),('agent_imo_assist','tickets_sinistres','creer','organisation'),
  ('agent_imo_assist','tickets_sinistres','modifier','organisation'),('agent_imo_assist','tickets_sinistres','assigner','organisation'),
  ('agent_imo_assist','tickets_sinistres','cloturer','organisation'),
  ('agent_imo_assist','prestataires','voir','organisation'),('agent_imo_assist','prestataires','creer','organisation'),
  ('agent_imo_assist','prestataires','modifier','organisation'),('agent_imo_assist','prestataires','supprimer','organisation'),
  ('agent_imo_assist','biens','voir','organisation'),('agent_imo_assist','locataires','voir','organisation'),
  ('agent_imo_assist','demandes_assistance','voir','organisation'),('agent_imo_assist','demandes_assistance','creer','organisation'),
  ('agent_imo_assist','demandes_assistance','assigner','organisation'),('agent_imo_assist','demandes_assistance','cloturer','organisation'),
  ('agent_imo_assist','demandes_assistance','gerer','organisation'),

  -- Technicien · ImoField, portée assigne (tickets.assigne_a).
  ('technicien','tickets_sinistres','voir','assigne'),('technicien','tickets_sinistres','creer','assigne'),
  ('technicien','tickets_sinistres','modifier','assigne'),('technicien','tickets_sinistres','cloturer','assigne'),
  ('technicien','documents','ajouter','assigne'),('technicien','biens','voir','assigne'),

  -- Prestataire externe · ImoField, portée assigne — plus restreint que Technicien (pas de création).
  ('prestataire_externe','tickets_sinistres','voir','assigne'),('prestataire_externe','tickets_sinistres','modifier','assigne'),
  ('prestataire_externe','tickets_sinistres','cloturer','assigne'),('prestataire_externe','documents','ajouter','assigne'),

  -- Administrateur ImoDrive.
  ('admin_imodrive','documents','voir','organisation'),('admin_imodrive','documents','ajouter','organisation'),
  ('admin_imodrive','documents','supprimer','organisation'),('admin_imodrive','documents','partager','organisation'),
  ('admin_imodrive','documents','gerer','organisation'),

  -- Administrateur ImoConnect.
  ('admin_imoconnect','conversations','voir','organisation'),('admin_imoconnect','conversations','creer','organisation'),
  ('admin_imoconnect','conversations','modifier','organisation'),('admin_imoconnect','conversations','supprimer','organisation'),
  ('admin_imoconnect','conversations','gerer','organisation')
) AS v(role_code, ressource_code, action_code, portee)
JOIN public.roles r ON r.code = v.role_code
JOIN public.ressources res ON res.code = v.ressource_code
JOIN public.actions a ON a.code = v.action_code
JOIN public.permissions p ON p.ressource_id = res.id AND p.action_id = a.id;

-- ── agence_users_roles (attribution réelle, remplace le champ texte agence_users.role) ──
CREATE TABLE public.agence_users_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agence_user_id uuid NOT NULL REFERENCES public.agence_users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id),
  attribue_par uuid REFERENCES public.profiles(id),
  attribue_le timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (agence_user_id, role_id)
);

-- ── RLS ──
ALTER TABLE public.ressources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agence_users_roles ENABLE ROW LEVEL SECURITY;

-- Catalogue plateforme (ressources/actions/permissions) : lecture pour tous, écriture réservée à l'éditeur.
CREATE POLICY ressources_select ON public.ressources FOR SELECT USING (true);
CREATE POLICY ressources_write_super_admin ON public.ressources FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY actions_select ON public.actions FOR SELECT USING (true);
CREATE POLICY actions_write_super_admin ON public.actions FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY permissions_select ON public.permissions FOR SELECT USING (true);
CREATE POLICY permissions_write_super_admin ON public.permissions FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- roles : les rôles système (agence_id null) sont visibles par tous ; un rôle
-- personnalisé n'est visible que par son organisation. Écriture (créer un
-- rôle personnalisé) réservée à qui a la permission roles.creer_role_personnalise
-- (Administrateur des rôles privilégiés) — appliqué plus tard côté application,
-- la policy RLS se limite ici au scope organisation + super_admin.
CREATE POLICY roles_select ON public.roles
  FOR SELECT
  USING (agence_id IS NULL OR is_my_agence(agence_id) OR is_super_admin());
CREATE POLICY roles_write ON public.roles
  FOR INSERT WITH CHECK (NOT est_systeme AND (is_my_agence(agence_id) OR is_super_admin()));
CREATE POLICY roles_update ON public.roles
  FOR UPDATE USING (NOT est_systeme AND (is_my_agence(agence_id) OR is_super_admin()));
CREATE POLICY roles_delete ON public.roles
  FOR DELETE USING (NOT est_systeme AND (is_my_agence(agence_id) OR is_super_admin()));

-- role_permissions : visible si le rôle associé est visible.
CREATE POLICY role_permissions_select ON public.role_permissions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.roles r WHERE r.id = role_permissions.role_id
    AND (r.agence_id IS NULL OR is_my_agence(r.agence_id) OR is_super_admin())
  ));
CREATE POLICY role_permissions_write ON public.role_permissions
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.roles r WHERE r.id = role_permissions.role_id
    AND NOT r.est_systeme AND (is_my_agence(r.agence_id) OR is_super_admin())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.roles r WHERE r.id = role_permissions.role_id
    AND NOT r.est_systeme AND (is_my_agence(r.agence_id) OR is_super_admin())
  ));

-- agence_users_roles : scope organisation, propriétaire ou membre d'équipe.
CREATE POLICY agence_users_roles_scope ON public.agence_users_roles
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.agence_users au WHERE au.id = agence_users_roles.agence_user_id
    AND (is_my_agence(au.agence_id) OR is_super_admin())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agence_users au WHERE au.id = agence_users_roles.agence_user_id
    AND (is_my_agence(au.agence_id) OR is_super_admin())
  ));
