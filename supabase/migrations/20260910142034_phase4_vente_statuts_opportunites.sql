-- Phase 4 — Module Vente : catalogue de statut de vente (separe du statut
-- locatif) et pipeline d'opportunites (acheteurs potentiels, lie a
-- contacts). Le reste du module (intention, prix_vente_demande, mandats
-- de vente) est deja en place depuis les Phases 1 et 3.

-- ─────────────────────────────────────────────────────────
-- 1. Catalogue configurable : statuts de vente
-- ─────────────────────────────────────────────────────────
create table if not exists statuts_vente (
  id          uuid primary key default gen_random_uuid(),
  agence_id   uuid references agences(id) on delete cascade, -- null = catalogue global
  valeur      text not null,
  label       text not null,
  couleur     text,
  ordre       integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (agence_id, valeur)
);

create table if not exists agence_statuts_vente_desactives (
  agence_id       uuid not null references agences(id) on delete cascade,
  statut_vente_id uuid not null references statuts_vente(id) on delete cascade,
  primary key (agence_id, statut_vente_id)
);

insert into statuts_vente (valeur, label, couleur, ordre) values
  ('a_vendre',          'A vendre',              '#00c896', 10),
  ('offre_en_cours',    'Offre en cours',        '#f59e0b', 20),
  ('compromis_signe',   'Compromis signe',       '#6c63ff', 30),
  ('vendu',             'Vendu',                 '#0078d4', 40),
  ('retire_de_la_vente','Retire de la vente',    '#8b949e', 50)
on conflict (agence_id, valeur) do nothing;

alter table biens add column if not exists statut_vente text;

-- ─────────────────────────────────────────────────────────
-- 2. Pipeline d'opportunites de vente (acheteurs potentiels)
-- ─────────────────────────────────────────────────────────
create table if not exists opportunites_vente (
  id             uuid primary key default gen_random_uuid(),
  bien_id        uuid not null references biens(id) on delete cascade,
  contact_id     uuid references contacts(id) on delete set null,
  statut         text not null default 'visite_prevue' check (statut in ('visite_prevue','offre_faite','negociation','accepte','refuse','annule')),
  montant_offre  numeric(14,2),
  date_offre     date,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_opportunites_vente_bien on opportunites_vente(bien_id);

-- ─────────────────────────────────────────────────────────
-- 3. RLS — meme posture que les autres tables nouvelles de ce projet
--    (acces ouvert a tout utilisateur authentifie, coherent avec le
--    cloisonnement cote client actuel, pas de donnee sensible nouvelle)
-- ─────────────────────────────────────────────────────────
alter table statuts_vente                     enable row level security;
alter table agence_statuts_vente_desactives   enable row level security;
alter table opportunites_vente                enable row level security;

create policy "authenticated_all_statuts_vente" on statuts_vente for all to authenticated using (true) with check (true);
create policy "authenticated_all_agence_statuts_vente_desactives" on agence_statuts_vente_desactives for all to authenticated using (true) with check (true);
create policy "authenticated_all_opportunites_vente" on opportunites_vente for all to authenticated using (true) with check (true);
