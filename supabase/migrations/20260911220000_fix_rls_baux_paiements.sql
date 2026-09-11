-- Corrige la faille RLS trouvee au diagnostic (A8) : baux et paiements
-- avaient chacune une policy "auth_*" (for all, using(true)) qui autorisait
-- N'IMPORTE QUEL utilisateur authentifie a lire ET ecrire les baux/paiements
-- de TOUTES les agences, pas seulement la sienne — elle annulait de fait
-- la policy de lecture correctement scopee qui existait en parallele.
--
-- Autre bug trouve au passage : cette policy de lecture "correcte" testait
-- locataires.profile_id pour verifier qu'un locataire ne voit que ses
-- propres baux/paiements — mais l'application n'a jamais ecrit cette
-- colonne (elle utilise locataires.user_id, voir locataire/Dashboard.jsx).
-- Verifie en base : les 3 locataires existants ont profile_id ET user_id a
-- null, donc cette clause n'a jamais matche personne — seule la policy
-- grande ouverte "auth_paiements" permettait au portail locataire de voir
-- ses propres paiements. Desormais remplace par user_id (colonne reellement
-- alimentee depuis le correctif A9 de la meme session).
--
-- Choix de l'utilisateur pour l'ecriture (question posee explicitement) :
-- seul le compte agence proprietaire (agences.profile_id) peut creer/
-- modifier/supprimer des baux et des paiements de sa propre agence — les
-- membres d'equipe (agence_users) restent en lecture seule sur ces deux
-- tables, comme deja etabli pour biens/locataires. Exception necessaire :
-- le portail locataire (paiement Mobile Money PawaPay, pollPay() dans
-- locataire/Dashboard.jsx) insere lui-meme une ligne paiements depuis le
-- navigateur du locataire — sans exception, cette fonctionnalite reelle
-- serait cassee par la restriction "agence uniquement".

drop policy if exists "auth_baux" on baux;
drop policy if exists "auth_paiements" on paiements;
drop policy if exists "Baux visibles par les parties concernées" on baux;
drop policy if exists "Paiements visibles par les parties" on paiements;

-- Bug compagnon trouve en testant l'exception locataire ci-dessous : la
-- policy de lecture de locataires ne teste que agence_id/profile_id
-- (jamais alimentee) — jamais user_id, la colonne reellement utilisee par
-- l'app (locataire/Dashboard.jsx) et par le correctif A9 de cette session.
-- Sans ce complement, un locataire ne peut litteralement jamais voir sa
-- propre fiche via RLS, et la clause "locataire_id in (select ... where
-- user_id = auth.uid())" des policies paiements ci-dessous ne
-- resoudrait jamais rien non plus (la sous-requete est elle-meme filtree
-- par RLS sur locataires).
drop policy if exists "Locataires visibles par leur agence" on locataires;
create policy "Locataires visibles par leur agence" on locataires for select to authenticated using (
  agence_id in (select id from agences where profile_id = auth.uid())
  or profile_id = auth.uid()
  or user_id = auth.uid()
  or is_super_admin()
);

-- Lecture
create policy "baux_select_parties" on baux for select to authenticated using (
  agence_id in (select id from agences where profile_id = auth.uid())
  or locataire_id in (select id from locataires where user_id = auth.uid())
  or proprietaire_id in (select id from proprietaires where profile_id = auth.uid())
  or is_super_admin()
);
create policy "paiements_select_parties" on paiements for select to authenticated using (
  agence_id in (select id from agences where profile_id = auth.uid())
  or locataire_id in (select id from locataires where user_id = auth.uid())
  or is_super_admin()
);

-- Ecriture baux : agence proprietaire du compte uniquement
create policy "baux_insert_agence" on baux for insert to authenticated with check (
  agence_id in (select id from agences where profile_id = auth.uid()) or is_super_admin()
);
create policy "baux_update_agence" on baux for update to authenticated using (
  agence_id in (select id from agences where profile_id = auth.uid()) or is_super_admin()
) with check (
  agence_id in (select id from agences where profile_id = auth.uid()) or is_super_admin()
);
create policy "baux_delete_agence" on baux for delete to authenticated using (
  agence_id in (select id from agences where profile_id = auth.uid()) or is_super_admin()
);

-- Ecriture paiements : agence proprietaire du compte, plus le locataire
-- concerne pour la creation uniquement (son propre paiement Mobile Money)
create policy "paiements_insert_agence_ou_locataire" on paiements for insert to authenticated with check (
  agence_id in (select id from agences where profile_id = auth.uid())
  or locataire_id in (select id from locataires where user_id = auth.uid())
  or is_super_admin()
);
create policy "paiements_update_agence" on paiements for update to authenticated using (
  agence_id in (select id from agences where profile_id = auth.uid()) or is_super_admin()
) with check (
  agence_id in (select id from agences where profile_id = auth.uid()) or is_super_admin()
);
create policy "paiements_delete_agence" on paiements for delete to authenticated using (
  agence_id in (select id from agences where profile_id = auth.uid()) or is_super_admin()
);
