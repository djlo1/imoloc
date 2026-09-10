-- Phase 6 — Tickets (generalisation de Maintenance) + Sinistres (points 30, 34).
-- La table `maintenances` existante est migree vers `tickets` (donnees
-- reelles preservees) puis laissee en place, non referencee par le code,
-- en attente d'une suppression ulterieure une fois le nouveau chemin
-- confirme stable (meme prudence que le nettoyage de colonnes legacy
-- fait plus tot dans ce projet).

-- ─────────────────────────────────────────────────────────
-- 1. Prestataires
-- ─────────────────────────────────────────────────────────
create table if not exists prestataires (
  id          uuid primary key default gen_random_uuid(),
  agence_id   uuid not null references agences(id) on delete cascade,
  nom         text not null,
  specialite  text,
  telephone   text,
  email       text,
  notes       text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_prestataires_agence on prestataires(agence_id);

-- ─────────────────────────────────────────────────────────
-- 2. Tickets — generalise `maintenances` : multi-types, multi-origines,
--    notion de responsabilite (qui doit agir).
-- ─────────────────────────────────────────────────────────
create table if not exists tickets (
  id                  uuid primary key default gen_random_uuid(),
  agence_id           uuid not null references agences(id) on delete cascade,
  bien_id             uuid references biens(id) on delete set null,
  locataire_id        uuid references locataires(id) on delete set null,
  type_ticket         text not null default 'maintenance' check (type_ticket in ('maintenance','reclamation','demande_administrative','signalement_degat','autre')),
  specialite          text, -- plomberie/electricite/peinture/... (reprend l'ancien champ "type" de maintenances)
  origine             text not null default 'agence' check (origine in ('agence','locataire')),
  responsabilite      text check (responsabilite in ('agence','proprietaire','locataire')),
  titre               text not null,
  description         text,
  notes               text,
  priorite            text not null default 'normale' check (priorite in ('urgente','haute','normale','faible')),
  statut              text not null default 'ouvert' check (statut in ('ouvert','en_cours','en_attente','resolu','ferme')),
  assigne_a           uuid references auth.users(id),
  prestataire_id      uuid references prestataires(id),
  cout_estime         numeric(12,2),
  date_debut_travaux  date,
  date_fin_travaux    date,
  commentaires        jsonb not null default '[]',
  created_by          uuid references auth.users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_tickets_agence on tickets(agence_id);
create index if not exists idx_tickets_bien   on tickets(bien_id);

-- Migration des donnees existantes (memes id, pour tracabilite)
insert into tickets (
  id, agence_id, bien_id, locataire_id, type_ticket, specialite, origine, responsabilite,
  titre, description, notes, priorite, statut, cout_estime,
  date_debut_travaux, date_fin_travaux, commentaires, created_by, created_at, updated_at
)
select
  id, agence_id, bien_id, locataire_id, 'maintenance', type, 'agence', 'agence',
  titre, description, notes, priorite, statut, cout_estime,
  date_debut_travaux, date_fin_travaux, coalesce(commentaires,'[]'::jsonb), cree_par, created_at, updated_at
from maintenances
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────
-- 3. Sinistres — lie a une assurance, un prestataire, et
--    eventuellement au ticket "Signalement de degat" d'origine.
-- ─────────────────────────────────────────────────────────
create table if not exists sinistres (
  id                uuid primary key default gen_random_uuid(),
  bien_id           uuid not null references biens(id) on delete cascade,
  type_sinistre     text,
  date_sinistre     date,
  description       text,
  gravite           text check (gravite in ('mineure','moderee','majeure')),
  zone_concernee    text,
  assurance_id      uuid references assurances(id) on delete set null,
  numero_dossier    text,
  prestataire_id    uuid references prestataires(id) on delete set null,
  cout              numeric(12,2),
  statut            text not null default 'declare' check (statut in ('declare','en_cours','resolu','clos')),
  date_resolution   date,
  ticket_origine_id uuid references tickets(id) on delete set null,
  created_at        timestamptz not null default now()
);
create index if not exists idx_sinistres_bien on sinistres(bien_id);

-- ─────────────────────────────────────────────────────────
-- 4. RLS — meme posture que le reste du projet
-- ─────────────────────────────────────────────────────────
alter table prestataires enable row level security;
alter table tickets      enable row level security;
alter table sinistres    enable row level security;

create policy "authenticated_all_prestataires" on prestataires for all to authenticated using (true) with check (true);
create policy "authenticated_all_tickets"      on tickets      for all to authenticated using (true) with check (true);
create policy "authenticated_all_sinistres"    on sinistres    for all to authenticated using (true) with check (true);
