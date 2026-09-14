-- Domaine C — le catalogue des applications de la suite Imoloc. Prérequis du
-- domaine E (chaque ressource et chaque rôle applicatif s'y rattache).

CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  nom text NOT NULL,
  description text,
  est_transverse boolean NOT NULL DEFAULT false,
  ordre_affichage integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.applications IS
  'Catalogue des 10 applications de la suite Imoloc. est_transverse=true uniquement pour Imoloc ID et Imoloc Admin — jamais licenciées séparément, toujours accessibles.';

INSERT INTO public.applications (code, nom, description, est_transverse, ordre_affichage) VALUES
  ('imoloc_id', 'Imoloc ID', 'Identité, connexion, sessions, comptes.', true, 1),
  ('imoloc_admin', 'Imoloc Admin', 'Administration de l''organisation — surface partagée, filtrée par rôle.', true, 2),
  ('imoloc_manager', 'Imoloc Manager', 'Gestion immobilière : biens, baux, propriétaires, locataires, paiements, tickets. Le socle de l''abonnement.', false, 3),
  ('imodrive', 'ImoDrive', 'Documents, contrats, états des lieux, signature électronique.', false, 4),
  ('imoconnect', 'ImoConnect', 'Communication — chat, groupes, réunions.', false, 5),
  ('imo_assist', 'Imo Assist', 'Support & tickets, façon Zoho Desk.', false, 6),
  ('imofield', 'ImoField', 'Terrain — techniciens internes et prestataires externes.', false, 7),
  ('imoloc_hub', 'Imoloc Hub', 'API, webhooks, intégrations tierces.', false, 8),
  ('imoloc_insights', 'Imoloc Insights', 'Analytique et rapports.', false, 9),
  ('loci_ai', 'Loci AI', 'Assistant IA immobilier.', false, 10);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Catalogue plateforme : lecture pour tout authentifié, écriture réservée à l'éditeur.
CREATE POLICY applications_select ON public.applications
  FOR SELECT
  USING (true);
CREATE POLICY applications_write_super_admin ON public.applications
  FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());
