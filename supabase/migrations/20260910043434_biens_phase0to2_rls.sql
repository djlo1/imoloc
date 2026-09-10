-- RLS pour les tables ajoutees aux Phases 0-2.
-- Postgres bloque tout par defaut des que RLS est active sans policy —
-- ces tables etaient inaccessibles (200 OK mais toujours []) tant que
-- cette migration n'etait pas appliquee.
--
-- Portee actuelle : lecture/ecriture ouverte a tout utilisateur
-- authentifie, coherent avec le reste de l'app (le filtrage par agence
-- se fait cote client aujourd'hui, pas par policy). A durcir plus tard
-- si un vrai cloisonnement multi-tenant est mis en place au niveau DB.

alter table types_biens                       enable row level security;
alter table agence_types_biens_desactives     enable row level security;
alter table statuts_biens                     enable row level security;
alter table agence_statuts_biens_desactives   enable row level security;
alter table country_field_schemas             enable row level security;
alter table biens_proprietaires               enable row level security;
alter table mandats                           enable row level security;
alter table equipements                       enable row level security;
alter table agence_equipements_desactives     enable row level security;
alter table biens_equipements                 enable row level security;
alter table inventaire_items                  enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'types_biens','agence_types_biens_desactives',
    'statuts_biens','agence_statuts_biens_desactives',
    'country_field_schemas',
    'biens_proprietaires','mandats',
    'equipements','agence_equipements_desactives','biens_equipements',
    'inventaire_items'
  ]
  loop
    execute format('create policy "authenticated_all_%1$s" on %1$s for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
