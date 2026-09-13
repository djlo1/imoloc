-- Fusion architecture : "licences" devient le vrai catalogue plateforme
-- (types_licence du domaine D), pas un catalogue par organisation.
--
-- agence_id était déjà nullable et les 4 lignes existantes avaient déjà
-- agence_id = null — la table était donc déjà pensée comme globale, mais sa
-- policy RLS (is_my_agence(agence_id)) rendait ces lignes invisibles à tout
-- le monde sauf super_admin (is_my_agence(null) est toujours faux). C'est
-- la vraie raison pour laquelle "licences" n'était interrogée nulle part :
-- même en la lisant, la RLS ne renvoyait jamais rien.
--
-- licences_utilisateurs n'est utilisée qu'en lecture nulle part en écriture
-- (0 ligne en prod) : aucun risque à réamorcer le catalogue.

-- Catalogue en lecture pour tout utilisateur authentifié (comme types_biens/
-- statuts_biens), écriture réservée à l'éditeur (super_admin) : ce sont les
-- types de licences Imoloc, pas une donnée que chaque organisation invente.
DROP POLICY IF EXISTS licences_scope ON public.licences;
CREATE POLICY licences_select ON public.licences
  FOR SELECT
  USING (true);
CREATE POLICY licences_write_super_admin ON public.licences
  FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Les 4 lignes existantes (Imoloc Pro/Standard/Loci IA/Lecteur, jamais
-- assignées à personne) ne correspondent pas au catalogue validé —
-- remplacées par les 5 types de sièges réels du domaine D.
DELETE FROM public.licences;

INSERT INTO public.licences (agence_id, nom, description, type, max_utilisateurs, actif, prix_mensuel, devise) VALUES
  (null, 'Imoloc Standard', 'Accès à Imoloc Manager, ImoDrive, ImoConnect — utilisateur interne classique. Prix dépendant du palier de l''organisation.', 'imoloc_standard', null, true, null, 'FCFA'),
  (null, 'ImoField', 'Accès à ImoField pour techniciens internes et prestataires.', 'imoloc_field', null, true, 2500, 'FCFA'),
  (null, 'Imo Assist Agent', 'Accès à Imo Assist — support et gestion des tickets.', 'imo_assist_agent', null, true, 4000, 'FCFA'),
  (null, 'Imoloc Insights Viewer', 'Accès en lecture à Imoloc Insights.', 'imoloc_insights_viewer', null, true, 2000, 'FCFA'),
  (null, 'Loci AI Pro', 'Fonctions avancées de Loci AI.', 'loci_ai_pro', null, true, 10000, 'FCFA');
