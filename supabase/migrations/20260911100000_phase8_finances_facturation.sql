-- Phase 8 — Finances & Facturation (points 26, 38). Pas de comptabilite
-- en partie double : uniquement les documents/vues qu'une agence utilise
-- au quotidien (factures, releves proprietaires, charges operationnelles).
--
-- IMPORTANT : une table `factures` existe deja (facturation de
-- l'abonnement Imoloc lui-meme, utilisee par Abonnement.jsx) — les
-- factures diverses (frais ponctuels sur un bien) vivent dans une
-- table separee `factures_diverses` pour ne jamais s'y confondre.
--
-- Les "factures locataires" (loyers) NE sont PAS une nouvelle table :
-- l'app genere deja une ligne `paiements` par echeance de loyer a la
-- creation du bail (voir Baux.jsx, insert echeances). Cette automatisation
-- existe depuis le debut du projet ; ce module se contente de la
-- presenter comme des factures dans le nouveau menu Facturation.

-- ─────────────────────────────────────────────────────────
-- 1. Finances du bien (point 26) — champs complementaires
-- ─────────────────────────────────────────────────────────
alter table biens
  add column if not exists frequence_paiement     text default 'mensuel' check (frequence_paiement in ('mensuel','trimestriel','semestriel','annuel')),
  add column if not exists indexation_type        text check (indexation_type in ('fixe','indexee_irl','indexee_libre')),
  add column if not exists date_prochaine_revision date;

-- ─────────────────────────────────────────────────────────
-- 2. Charges operationnelles (distinct des taxes/assurances,
--    qui ont deja leur propre table depuis la Phase 5)
-- ─────────────────────────────────────────────────────────
create table if not exists charges_bien (
  id           uuid primary key default gen_random_uuid(),
  bien_id      uuid not null references biens(id) on delete cascade,
  type_charge  text not null, -- eau/electricite/gaz/internet/entretien/securite/nettoyage/maintenance/autre
  montant      numeric(12,2),
  frequence    text check (frequence in ('mensuelle','trimestrielle','annuelle','unique')),
  date_debut   date,
  date_fin     date,
  created_at   timestamptz not null default now()
);
create index if not exists idx_charges_bien_bien on charges_bien(bien_id);

-- ─────────────────────────────────────────────────────────
-- 3. Factures diverses — frais ponctuels sur un bien (pas les loyers,
--    deja couverts par paiements)
-- ─────────────────────────────────────────────────────────
create table if not exists factures_diverses (
  id             uuid primary key default gen_random_uuid(),
  agence_id      uuid not null references agences(id) on delete cascade,
  bien_id        uuid references biens(id) on delete set null,
  locataire_id   uuid references locataires(id) on delete set null,
  numero         text,
  montant        numeric(12,2) not null,
  date_emission  date not null default current_date,
  date_echeance  date,
  statut         text not null default 'brouillon' check (statut in ('brouillon','envoyee','payee','en_retard','annulee')),
  description    text,
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now()
);
create index if not exists idx_factures_diverses_agence on factures_diverses(agence_id);
create index if not exists idx_factures_diverses_bien on factures_diverses(bien_id);

-- ─────────────────────────────────────────────────────────
-- 4. Releves proprietaires — revenu brut - commission - charges
--    = net reverse, par periode
-- ─────────────────────────────────────────────────────────
create table if not exists releves_proprietaires (
  id              uuid primary key default gen_random_uuid(),
  agence_id       uuid not null references agences(id) on delete cascade,
  proprietaire_id uuid not null references proprietaires(id) on delete cascade,
  periode_debut   date not null,
  periode_fin     date not null,
  revenu_brut     numeric(14,2) not null default 0,
  commission      numeric(14,2) not null default 0,
  charges         numeric(14,2) not null default 0,
  montant_net     numeric(14,2) not null default 0,
  statut          text not null default 'brouillon' check (statut in ('brouillon','envoye','verse')),
  date_versement  date,
  notes           text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  unique (proprietaire_id, periode_debut, periode_fin)
);
create index if not exists idx_releves_proprietaires_agence on releves_proprietaires(agence_id);
create index if not exists idx_releves_proprietaires_proprietaire on releves_proprietaires(proprietaire_id);

-- ─────────────────────────────────────────────────────────
-- 5. Automatisation — generation mensuelle des releves proprietaires
--    (brouillon a valider/verser manuellement, jamais envoye tout seul)
-- ─────────────────────────────────────────────────────────
create extension if not exists pg_cron;

create or replace function generer_releve_proprietaire(
  p_proprietaire_id uuid, p_agence_id uuid, p_periode_debut date, p_periode_fin date
) returns void language plpgsql as $$
declare
  v_revenu_brut  numeric(14,2);
  v_commission   numeric(14,2);
  v_charges      numeric(14,2);
begin
  -- Revenu brut : paiements payes sur les biens de ce proprietaire, sur la periode
  select coalesce(sum(p.montant), 0) into v_revenu_brut
  from paiements p
  join biens_proprietaires bp on bp.bien_id = p.bien_id and bp.proprietaire_id = p_proprietaire_id and bp.statut = 'actif'
  where p.statut = 'paye' and p.date_paiement between p_periode_debut and p_periode_fin;

  -- Commission : taux du mandat de gestion locative actif, sinon defaut agence,
  -- applique au revenu brut (simplification : un seul taux, pas de ventilation par bien)
  select coalesce(
    (select m.commission_gestion from mandats m
      where m.proprietaire_id = p_proprietaire_id and m.agence_id = p_agence_id
        and m.categorie_mandat = 'gestion_locative' and m.statut = 'actif'
      order by m.created_at desc limit 1),
    (select a.taux_commission_defaut_gestion from agences a where a.id = p_agence_id),
    0
  ) * v_revenu_brut / 100 into v_commission;

  -- Charges : charges operationnelles actives sur les biens de ce proprietaire
  select coalesce(sum(cb.montant), 0) into v_charges
  from charges_bien cb
  join biens_proprietaires bp on bp.bien_id = cb.bien_id and bp.proprietaire_id = p_proprietaire_id and bp.statut = 'actif'
  where coalesce(cb.date_debut, p_periode_debut) <= p_periode_fin
    and coalesce(cb.date_fin, p_periode_fin) >= p_periode_debut;

  insert into releves_proprietaires (agence_id, proprietaire_id, periode_debut, periode_fin, revenu_brut, commission, charges, montant_net, statut)
  values (p_agence_id, p_proprietaire_id, p_periode_debut, p_periode_fin, v_revenu_brut, v_commission, v_charges, v_revenu_brut - v_commission - v_charges, 'brouillon')
  on conflict (proprietaire_id, periode_debut, periode_fin) do nothing;
end;
$$;

create or replace function generer_releves_proprietaires_mensuel() returns void language plpgsql as $$
declare
  v_periode_debut date := date_trunc('month', now() - interval '1 month')::date;
  v_periode_fin   date := (date_trunc('month', now()) - interval '1 day')::date;
  r record;
begin
  for r in
    select distinct m.proprietaire_id, m.agence_id
    from mandats m
    where m.categorie_mandat = 'gestion_locative' and m.statut = 'actif'
      and coalesce(m.frequence_reporting, 'mensuel') = 'mensuel'
  loop
    perform generer_releve_proprietaire(r.proprietaire_id, r.agence_id, v_periode_debut, v_periode_fin);
  end loop;
end;
$$;

do $do$
begin
  if not exists (select 1 from cron.job where jobname = 'generer-releves-proprietaires-mensuel') then
    perform cron.schedule(
      'generer-releves-proprietaires-mensuel',
      '0 2 1 * *', -- le 1er de chaque mois a 2h du matin
      $cron$select generer_releves_proprietaires_mensuel();$cron$
    );
  end if;
end;
$do$;

-- ─────────────────────────────────────────────────────────
-- 6. RLS — meme posture que le reste du projet
-- ─────────────────────────────────────────────────────────
alter table charges_bien          enable row level security;
alter table factures_diverses     enable row level security;
alter table releves_proprietaires enable row level security;

create policy "authenticated_all_charges_bien"          on charges_bien          for all to authenticated using (true) with check (true);
create policy "authenticated_all_factures_diverses"     on factures_diverses     for all to authenticated using (true) with check (true);
create policy "authenticated_all_releves_proprietaires" on releves_proprietaires for all to authenticated using (true) with check (true);
