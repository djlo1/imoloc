-- Sécurité : deux problèmes trouvés lors de l'audit de refonte de l'architecture.
--
-- 1. is_my_agence() ne reconnaissait que le créateur du compte agence
--    (agences.profile_id), jamais un membre d'équipe ajouté via agence_users —
--    même bug que B4 (déjà corrigé pour le dashboard imoloc), mais jamais
--    réaudité pour les policies RLS. Corrigé une seule fois, à la source :
--    ça répare d'un coup appareils_utilisateurs, contacts, driveloc_fichiers,
--    driveloc_stats, equipes, equipe_membres, invitations, licences,
--    licences_utilisateurs, utilisateurs_invites (toutes ses policies
--    appellent déjà is_my_agence(agence_id)).
--
-- 2. Cinq tables avaient une policy "qual = true" — lisible/modifiable par
--    n'importe quel compte authentifié, toutes agences confondues. Même
--    classe de bug que A8 (baux/paiements/plaintes, déjà corrigé) : jamais
--    suivies dans le workflow de migration, jamais réauditées depuis.
--    historique (le journal d'audit) devient en plus non modifiable/non
--    supprimable par quiconque (aucune policy UPDATE/DELETE).
--
-- pawapay_transactions utilisait une sous-requête brute au lieu de
-- is_my_agence() — même bug que 1., corrigé directement dessus.

CREATE OR REPLACE FUNCTION public.is_my_agence(check_agence_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM agences WHERE id = check_agence_id AND profile_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM agence_users WHERE agence_id = check_agence_id AND user_id = auth.uid()
  );
$function$;

DROP POLICY IF EXISTS pawapay_policy ON public.pawapay_transactions;
CREATE POLICY pawapay_policy ON public.pawapay_transactions
  FOR ALL
  USING (is_my_agence(agence_id) OR is_super_admin())
  WITH CHECK (is_my_agence(agence_id) OR is_super_admin());

DROP POLICY IF EXISTS champs_personnalises_all_authenticated ON public.champs_personnalises;
CREATE POLICY champs_personnalises_scope ON public.champs_personnalises
  FOR ALL
  USING (is_my_agence(agence_id) OR is_super_admin())
  WITH CHECK (is_my_agence(agence_id) OR is_super_admin());

DROP POLICY IF EXISTS authenticated_all_prestataires ON public.prestataires;
CREATE POLICY prestataires_scope ON public.prestataires
  FOR ALL
  USING (is_my_agence(agence_id) OR is_super_admin())
  WITH CHECK (is_my_agence(agence_id) OR is_super_admin());

DROP POLICY IF EXISTS auth_params_org ON public.parametres_organisation;
CREATE POLICY parametres_organisation_scope ON public.parametres_organisation
  FOR ALL
  USING (is_my_agence(agence_id) OR is_super_admin())
  WITH CHECK (is_my_agence(agence_id) OR is_super_admin());

DROP POLICY IF EXISTS authenticated_all_opportunites_vente ON public.opportunites_vente;
CREATE POLICY opportunites_vente_scope ON public.opportunites_vente
  FOR ALL
  USING (is_my_agence((SELECT b.agence_id FROM biens b WHERE b.id = opportunites_vente.bien_id)) OR is_super_admin())
  WITH CHECK (is_my_agence((SELECT b.agence_id FROM biens b WHERE b.id = opportunites_vente.bien_id)) OR is_super_admin());

DROP POLICY IF EXISTS authenticated_all_historique ON public.historique;
CREATE POLICY historique_select ON public.historique
  FOR SELECT
  USING (is_my_agence(agence_id) OR is_super_admin());
CREATE POLICY historique_insert ON public.historique
  FOR INSERT
  WITH CHECK (is_my_agence(agence_id) OR is_super_admin());
