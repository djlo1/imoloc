-- Phase 7 — Documents & medias (points 31-32) + Historique (point 33).
-- Association polymorphe (entite_type/entite_id) pour les deux tables,
-- reutilisable au-dela des biens (mandats, assurances, taxes, tickets,
-- ventes) sans colonne de FK dediee par type d'entite.

-- ─────────────────────────────────────────────────────────
-- 1. Documents (les photos sont des documents type_document='photo',
--    pas un systeme separe)
-- ─────────────────────────────────────────────────────────
create table if not exists documents (
  id               uuid primary key default gen_random_uuid(),
  agence_id        uuid not null references agences(id) on delete cascade,
  entite_type      text not null,
  entite_id        uuid not null,
  type_document    text not null,
  categorie        text check (categorie in ('propriete','technique','administratif','gestion')),
  nom              text not null,
  numero           text,
  date_document    date,
  date_expiration  date,
  autorite         text,
  fichier_url      text not null, -- chemin dans le bucket 'documents' (prive, URL signee a l'affichage)
  localisation     text, -- piece concernee, pour les photos
  version          integer not null default 1,
  commentaire      text,
  visibilite       text not null default 'interne_agence' check (visibilite in ('interne_agence','visible_proprietaire','visible_locataire','public')),
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now()
);
create index if not exists idx_documents_agence on documents(agence_id);
create index if not exists idx_documents_entite on documents(entite_type, entite_id);

-- ─────────────────────────────────────────────────────────
-- 2. Historique — evenements metier significatifs uniquement
--    (pas un trigger qui journalise chaque champ modifie)
-- ─────────────────────────────────────────────────────────
create table if not exists historique (
  id                uuid primary key default gen_random_uuid(),
  agence_id         uuid not null references agences(id) on delete cascade,
  entite_type       text not null,
  entite_id         uuid not null,
  action            text not null,
  champ_modifie     text,
  ancienne_valeur   text,
  nouvelle_valeur   text,
  utilisateur_id    uuid references auth.users(id),
  utilisateur_email text,
  created_at        timestamptz not null default now()
);
create index if not exists idx_historique_agence on historique(agence_id);
create index if not exists idx_historique_entite on historique(entite_type, entite_id);

-- ─────────────────────────────────────────────────────────
-- 3. Bucket de stockage prive pour les documents
-- ─────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────
-- 4. RLS — meme posture que le reste du projet
-- ─────────────────────────────────────────────────────────
alter table documents  enable row level security;
alter table historique enable row level security;

create policy "authenticated_all_documents"  on documents  for all to authenticated using (true) with check (true);
create policy "authenticated_all_historique" on historique for all to authenticated using (true) with check (true);

create policy "authenticated_all_documents_storage" on storage.objects
  for all to authenticated using (bucket_id = 'documents') with check (bucket_id = 'documents');
