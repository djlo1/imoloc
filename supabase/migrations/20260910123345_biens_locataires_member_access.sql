-- Meme cause racine que la migration precedente (agences/agence_users) :
-- RLS sur biens et locataires ne connait que le proprietaire direct de
-- l'agence, jamais l'appartenance via agence_users. Confirme en testant
-- avec un vrai compte membre : biens et locataires revenaient vides
-- alors que les lignes existent reellement.
--
-- Portee volontairement limitee a la LECTURE pour l'instant : l'ecriture
-- (ajout/modification/suppression par un membre) est reportee tant que
-- les permissions par role n'ont pas ete discutees plus en detail.
--
-- Policies additives uniquement : les policies existantes (proprietaire)
-- ne sont ni modifiees ni remplacees.

create policy "member_select_biens" on biens
  for select to authenticated
  using (
    exists (select 1 from agence_users au where au.agence_id = biens.agence_id and au.user_id = auth.uid())
  );

create policy "member_select_locataires" on locataires
  for select to authenticated
  using (
    exists (select 1 from agence_users au where au.agence_id = locataires.agence_id and au.user_id = auth.uid())
  );
