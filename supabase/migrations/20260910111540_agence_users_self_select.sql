-- Un membre d'equipe doit pouvoir lire sa PROPRE ligne dans agence_users
-- pour que l'app puisse resoudre "a quelle agence est-ce que j'appartiens"
-- (utilise par agence/pages/Loci.jsx). Decouvert en testant le correctif
-- proprietaire-ou-membre : l'insertion fonctionnait (faite par le
-- proprietaire de l'agence), mais le membre lui-meme ne pouvait pas
-- relire sa propre ligne, la requete de resolution revenait vide.
--
-- Policy additive uniquement : les policies RLS existantes sur cette
-- table (ex: le proprietaire/admin gere toute la liste) ne sont ni
-- modifiees ni remplacees, elles restent en vigueur en plus de celle-ci.
create policy "self_select_agence_users" on agence_users
  for select to authenticated
  using (user_id = auth.uid());
