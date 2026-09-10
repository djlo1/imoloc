-- Reference de bien generee automatiquement (Point 3, amendement) :
-- l'organisation peut definir un format (jetons {ANNEE}, {MOIS}, {SEQ},
-- {SEQ:04} pour du zero-padding), sinon un format par defaut s'applique.
-- Le compteur est incremente de facon atomique cote base pour eviter
-- toute collision entre deux creations simultanees.

alter table agences
  add column if not exists format_reference text,
  add column if not exists reference_seq integer not null default 0;

create or replace function next_reference_seq(p_agence_id uuid)
returns integer
language sql
as $$
  update agences set reference_seq = reference_seq + 1
  where id = p_agence_id
  returning reference_seq;
$$;
