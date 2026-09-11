-- Phase 9 — Regles & restrictions, Environnemental, Accessibilite,
-- Location courte duree, Champs personnalises (points 35-37, 39-40).
-- Additif uniquement : nouvelles colonnes nullables/par defaut,
-- nouvelle table, nouveaux equipements et schema pays. Rien
-- d'existant modifie ou supprime.

-- ─────────────────────────────────────────────────────────
-- 1. Point 37 — Regles et restrictions (politiques sur le bien,
--    pas des equipements physiques). restrictions_particulieres
--    reutilise la colonne "regles" deja existante (voir la
--    migration de nettoyage pays/multipays).
-- ─────────────────────────────────────────────────────────
alter table biens
  add column if not exists animaux_autorises            boolean not null default false,
  add column if not exists fumeurs_autorises             boolean not null default false,
  add column if not exists sous_location_autorisee       boolean not null default false,
  add column if not exists colocation_autorisee          boolean not null default false,
  add column if not exists activite_pro_autorisee        boolean not null default false,
  add column if not exists location_courte_duree_autorisee boolean not null default false;

-- ─────────────────────────────────────────────────────────
-- 2. Point 39 — Location courte duree : champs simples, geres
--    par location_courte_duree_autorisee ci-dessus. Le calendrier
--    de disponibilite reste un chantier separe (deja note).
--    Le nombre max de voyageurs reutilise capacite_max (Point 8).
-- ─────────────────────────────────────────────────────────
alter table biens
  add column if not exists checkin_heure   text,   -- ex: "14:00"
  add column if not exists checkout_heure  text,   -- ex: "11:00"
  add column if not exists tarif_nuitee    numeric(12,2),
  add column if not exists nuits_minimum   integer;

-- ─────────────────────────────────────────────────────────
-- 3. Point 36 — Accessibilite : nouvelle categorie d'equipements,
--    meme mecanisme que les autres categories (Point 9).
-- ─────────────────────────────────────────────────────────
insert into equipements (valeur, label, categorie, ordre) values
  ('acces_pmr','Acces PMR','accessibilite',10),
  ('rampe_acces','Rampe d''acces','accessibilite',20),
  ('ascenseur_accessible','Ascenseur accessible','accessibilite',30),
  ('sanitaires_adaptes','Sanitaires adaptes','accessibilite',40),
  ('parking_accessible','Parking accessible','accessibilite',50),
  ('signaletique_adaptee','Signaletique adaptee','accessibilite',60)
on conflict (agence_id, valeur) do nothing;

-- ─────────────────────────────────────────────────────────
-- 4. Point 35 — Environnemental : routes vers le moteur pays
--    (domaine 'environnemental', deja autorise par le check
--    constraint de country_field_schemas depuis la Phase 0).
--    Repli generique seulement pour l'instant : aucun equivalent
--    reglementaire type DPE identifie pour le Benin a ce jour.
-- ─────────────────────────────────────────────────────────
insert into country_field_schemas (pays, domaine, cle, label, obligatoire, ordre) values
  ('__generic__','environnemental','classe_energetique','Classe energetique', false, 10),
  ('__generic__','environnemental','emissions_ges','Emissions de gaz a effet de serre', false, 20)
on conflict (pays, domaine, cle) do nothing;

-- ─────────────────────────────────────────────────────────
-- 5. Point 40 — Champs personnalises (vague 1). Les valeurs
--    vivent dans biens.metadata->'champs_personnalises' (deja
--    en place depuis la Phase 0) plutot que dans une table de
--    valeurs separee.
-- ─────────────────────────────────────────────────────────
create table if not exists champs_personnalises (
  id                   uuid primary key default gen_random_uuid(),
  agence_id            uuid not null references agences(id) on delete cascade,
  nom                  text not null,
  type                 text not null check (type in (
                         'texte','texte_long','nombre','devise','pourcentage',
                         'date','date_heure','oui_non','liste','liste_multiple'
                       )),
  options              jsonb,             -- ['Choix A','Choix B',...] pour liste/liste_multiple
  type_bien_applicable text,              -- null = tous les types de biens
  obligatoire          boolean not null default false,
  ordre                integer not null default 0,
  statut               text not null default 'actif' check (statut in ('actif','archive')),
  created_at           timestamptz not null default now()
);
create index if not exists idx_champs_personnalises_agence on champs_personnalises(agence_id);

alter table champs_personnalises enable row level security;
do $do$
begin
  if not exists (select 1 from pg_policies where tablename = 'champs_personnalises' and policyname = 'champs_personnalises_all_authenticated') then
    create policy champs_personnalises_all_authenticated on champs_personnalises for all to authenticated using (true) with check (true);
  end if;
end;
$do$;
