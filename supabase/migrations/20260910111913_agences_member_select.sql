-- Cause racine trouvee en testant le compte membre : agence_users etait
-- lisible (migration precedente), mais la table agences elle-meme ne
-- laissait lire une ligne qu'a son proprietaire (profile_id = auth.uid()).
-- Un membre d'equipe qui retrouve correctement son agence_id via
-- agence_users se heurtait ensuite a "0 rows" en tentant de lire la
-- ligne agences correspondante — bloquant n'importe quelle page de
-- l'app pour un membre, pas seulement Loci.jsx.
--
-- Policy additive : la policy existante (proprietaire) n'est pas touchee,
-- celle-ci ajoute juste un second chemin de lecture pour les membres.
create policy "member_select_agences" on agences
  for select to authenticated
  using (
    exists (
      select 1 from agence_users au
      where au.agence_id = agences.id and au.user_id = auth.uid()
    )
  );
