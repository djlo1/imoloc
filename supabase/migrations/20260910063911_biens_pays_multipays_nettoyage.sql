-- Nettoyage du schema legacy decouvert en testant, + support pays/multi-pays.
--
-- Colonnes de biens supprimees car remplacees par un systeme deja construit
-- (aucune n'est lue ni ecrite par le code actuel, verifie avant suppression) :
--   terrasse/jardin/piscine/garage -> systeme equipements (biens_equipements)
--   frais_agence_pct               -> mandats.commission_gestion (cascade Point 24)
--   acces                          -> trop ambigu, aucun concept decide ne lui correspond
--
-- Colonnes legacy conservees et reutilisees (deja les bonnes pour un concept
-- deja decide, pas de raison de les dupliquer sous un autre nom) :
--   depot_garantie, caution_mois, charges_incluses, montant_charges,
--   duree_min_location, disponible_immediatement, date_disponibilite,
--   nombre_etages (etages de l'immeuble, distinct de nombre_niveaux qui est
--   les niveaux internes d'une unite), nombre_balcons, nombre_parking,
--   nombre_salons, regles, video_url, devise, pays (voir ci-dessous)

alter table biens
  drop column if exists terrasse,
  drop column if exists jardin,
  drop column if exists piscine,
  drop column if exists garage,
  drop column if exists frais_agence_pct,
  drop column if exists acces;

-- ─────────────────────────────────────────────────────────
-- Pays actifs par organisation (multi-pays au niveau tenant)
-- ─────────────────────────────────────────────────────────
create table if not exists agence_pays_actifs (
  id         uuid primary key default gen_random_uuid(),
  agence_id  uuid not null references agences(id) on delete cascade,
  pays       text not null,
  created_at timestamptz not null default now(),
  unique (agence_id, pays)
);
alter table agence_pays_actifs enable row level security;
create policy "authenticated_all_agence_pays_actifs" on agence_pays_actifs
  for all to authenticated using (true) with check (true);

-- Chaque agence existante demarre avec son propre pays comme pays actif
insert into agence_pays_actifs (agence_id, pays)
select id, pays from agences where pays is not null
on conflict (agence_id, pays) do nothing;

-- ─────────────────────────────────────────────────────────
-- Villes par pays — liste de suggestion pour la recherche,
-- jamais bloquante (le champ accepte aussi une saisie libre)
-- ─────────────────────────────────────────────────────────
create table if not exists villes (
  id         uuid primary key default gen_random_uuid(),
  pays       text not null,
  nom        text not null,
  created_at timestamptz not null default now(),
  unique (pays, nom)
);
alter table villes enable row level security;
create policy "authenticated_select_villes" on villes for select to authenticated using (true);

insert into villes (pays, nom) values
  ('Benin','Cotonou'), ('Benin','Porto-Novo'), ('Benin','Parakou'), ('Benin','Djougou'),
  ('Benin','Bohicon'), ('Benin','Abomey'), ('Benin','Abomey-Calavi'), ('Benin','Natitingou'),
  ('Benin','Ouidah'), ('Benin','Lokossa'), ('Benin','Kandi'), ('Benin','Savalou'),
  ('Benin','Pobe'), ('Benin','Come'), ('Benin','Grand-Popo'), ('Benin','Save'),
  ('Benin','Dassa-Zoume'), ('Benin','Aplahoue'), ('Benin','Dogbo'), ('Benin','Athieme'),
  ('Benin','Banikoara'), ('Benin','Malanville'), ('Benin','Nikki'), ('Benin','Tchaourou'),
  ('Benin','Segbana'), ('Benin','Ze'), ('Benin','Sakete'), ('Benin','Kpomasse')
on conflict (pays, nom) do nothing;
