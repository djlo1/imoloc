-- Phase 0 — Fondations de la refonte "biens"
-- Purement additif : rien de ce qui existe n'est supprimé ou renomme ici.
-- Les colonnes dupliquees (type/type_bien, superficie/superficie_totale,
-- loyer/loyer_mensuel) seront nettoyees dans une migration ulterieure,
-- en meme temps que le code qui les ecrit.

-- ─────────────────────────────────────────────────────────
-- 1. Catalogue configurable : types de biens
-- ─────────────────────────────────────────────────────────
create table if not exists types_biens (
  id          uuid primary key default gen_random_uuid(),
  agence_id   uuid references agences(id) on delete cascade, -- null = catalogue global (platforme)
  valeur      text not null,
  label       text not null,
  categorie   text not null check (categorie in ('residentiel','terrain','professionnel','collectif','stationnement','specialise','autre')),
  ordre       integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (agence_id, valeur)
);

create table if not exists agence_types_biens_desactives (
  agence_id     uuid not null references agences(id) on delete cascade,
  type_bien_id  uuid not null references types_biens(id) on delete cascade,
  primary key (agence_id, type_bien_id)
);

insert into types_biens (valeur, label, categorie, ordre) values
  ('appartement','Appartement','residentiel',10),
  ('studio','Studio','residentiel',20),
  ('loft','Loft','residentiel',30),
  ('duplex','Duplex','residentiel',40),
  ('triplex','Triplex','residentiel',50),
  ('penthouse','Penthouse','residentiel',60),
  ('maison','Maison','residentiel',70),
  ('villa','Villa','residentiel',80),
  ('maison_mitoyenne','Maison mitoyenne','residentiel',90),
  ('maison_jumelee','Maison jumelee','residentiel',100),
  ('bungalow','Bungalow','residentiel',110),
  ('chalet','Chalet','residentiel',120),
  ('ferme','Ferme / propriete rurale','residentiel',130),
  ('residence','Residence','residentiel',140),
  ('residence_etudiante','Residence etudiante','residentiel',150),
  ('residence_senior','Residence senior','residentiel',160),
  ('residence_vacances','Residence de vacances','residentiel',170),
  ('chambre','Chambre','residentiel',180),
  ('colocation','Colocation','residentiel',190),

  ('parcelle','Parcelle','terrain',10),
  ('terrain_residentiel','Terrain residentiel','terrain',20),
  ('terrain_agricole','Terrain agricole','terrain',30),
  ('terrain_commercial','Terrain commercial','terrain',40),
  ('terrain_industriel','Terrain industriel','terrain',50),
  ('terrain_constructible','Terrain constructible','terrain',60),
  ('terrain_non_constructible','Terrain non constructible','terrain',70),
  ('terrain_forestier','Terrain forestier','terrain',80),
  ('terrain_mixte','Terrain mixte','terrain',90),
  ('terrain_avec_batiment','Terrain avec batiment','terrain',100),
  ('terrain_vacant','Terrain vacant','terrain',110),

  ('bureau','Bureau','professionnel',10),
  ('open_space','Open space','professionnel',20),
  ('centre_affaires','Centre d''affaires','professionnel',30),
  ('local_commercial','Local commercial','professionnel',40),
  ('boutique','Boutique','professionnel',50),
  ('magasin','Magasin','professionnel',60),
  ('restaurant','Restaurant','professionnel',70),
  ('bar','Bar','professionnel',80),
  ('hotel','Hotel','professionnel',90),
  ('entrepot','Entrepot','professionnel',100),
  ('hangar','Hangar','professionnel',110),
  ('atelier','Atelier','professionnel',120),
  ('usine','Usine','professionnel',130),
  ('laboratoire','Laboratoire','professionnel',140),
  ('cabinet','Cabinet','professionnel',150),
  ('clinique','Clinique','professionnel',160),
  ('etablissement_scolaire','Etablissement scolaire','professionnel',170),
  ('centre_formation','Centre de formation','professionnel',180),

  ('immeuble_residentiel','Immeuble residentiel','collectif',10),
  ('immeuble_commercial','Immeuble commercial','collectif',20),
  ('immeuble_mixte','Immeuble mixte','collectif',30),
  ('complexe_immobilier','Complexe immobilier','collectif',40),
  ('centre_commercial','Centre commercial','collectif',50),
  ('parc_activites','Parc d''activites','collectif',60),
  ('parc_industriel','Parc industriel','collectif',70),

  ('parking','Parking','stationnement',10),
  ('place_parking','Place de parking','stationnement',20),
  ('garage','Garage','stationnement',30),
  ('box','Box','stationnement',40),
  ('carport','Carport','stationnement',50),

  ('residence_hoteliere','Residence hoteliere','specialise',10),
  ('maison_hotes','Maison d''hotes','specialise',20),
  ('exploitation_agricole','Exploitation agricole','specialise',30),
  ('entrepot_frigorifique','Entrepot frigorifique','specialise',40),
  ('data_center','Data center','specialise',50),
  ('local_technique','Local technique','specialise',60),
  ('infrastructure_specialisee','Infrastructure specialisee','specialise',70),

  ('autre','Autre','autre',999)
on conflict (agence_id, valeur) do nothing;

-- ─────────────────────────────────────────────────────────
-- 2. Catalogue configurable : statuts de biens
-- ─────────────────────────────────────────────────────────
create table if not exists statuts_biens (
  id          uuid primary key default gen_random_uuid(),
  agence_id   uuid references agences(id) on delete cascade, -- null = catalogue global
  valeur      text not null,
  label       text not null,
  couleur     text,
  ordre       integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (agence_id, valeur)
);

create table if not exists agence_statuts_biens_desactives (
  agence_id      uuid not null references agences(id) on delete cascade,
  statut_bien_id uuid not null references statuts_biens(id) on delete cascade,
  primary key (agence_id, statut_bien_id)
);

insert into statuts_biens (valeur, label, couleur, ordre) values
  ('brouillon','Brouillon','#8b949e',5),
  ('disponible','Disponible','#00c896',10),
  ('occupe','Occupe','#0078d4',20),
  ('reserve','Reserve','#6c63ff',30),
  ('maintenance','Maintenance','#f59e0b',40),
  ('renovation','Renovation','#8b5cf6',50),
  ('en_construction','En construction','#f97316',60),
  ('hors_marche','Hors marche','#64748b',70),
  ('hors_service','Hors service','#ef4444',80),
  ('actif','Actif','#00c896',85),
  ('retire','Retire','#94a3b8',90),
  ('archive','Archive','#4b5563',100)
on conflict (agence_id, valeur) do nothing;

-- ─────────────────────────────────────────────────────────
-- 3. Moteur pays — schemas de champs par pays (domaine: adresse,
--    cadastre, fiscalite, environnemental — un seul catalogue,
--    plusieurs domaines)
-- ─────────────────────────────────────────────────────────
create table if not exists country_field_schemas (
  id          uuid primary key default gen_random_uuid(),
  pays        text not null, -- valeur libre, alignee sur agences.pays ; '__generic__' = repli universel
  domaine     text not null check (domaine in ('adresse','cadastre','fiscalite','environnemental')),
  cle         text not null,
  label       text not null,
  obligatoire boolean not null default false,
  ordre       integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (pays, domaine, cle)
);

-- Repli generique : fonctionne pour n'importe quel pays pas encore detaille
insert into country_field_schemas (pays, domaine, cle, label, obligatoire, ordre) values
  ('__generic__','adresse','region_etat','Region / Etat', false, 10),
  ('__generic__','adresse','ville','Ville', true, 20),
  ('__generic__','adresse','quartier_secteur','Quartier / Secteur', false, 30),
  ('__generic__','adresse','rue','Rue', false, 40),
  ('__generic__','adresse','complement_adresse','Complement d''adresse', false, 50),
  ('__generic__','adresse','code_postal','Code postal', false, 60)
on conflict (pays, domaine, cle) do nothing;

-- Benin : premier schema detaille
insert into country_field_schemas (pays, domaine, cle, label, obligatoire, ordre) values
  ('Benin','adresse','departement','Departement', false, 10),
  ('Benin','adresse','commune','Commune', true, 20),
  ('Benin','adresse','arrondissement','Arrondissement', false, 30),
  ('Benin','adresse','quartier','Quartier', true, 40),

  ('Benin','cadastre','titre_foncier','Titre foncier (TF)', false, 10),
  ('Benin','cadastre','numero_parcelle','Numero de parcelle', false, 20),
  ('Benin','cadastre','section','Section', false, 30),
  ('Benin','cadastre','ilot_lot','Ilot / Lot', false, 40),
  ('Benin','cadastre','autorite_enregistrement','Autorite d''enregistrement', false, 50),
  ('Benin','cadastre','date_enregistrement','Date d''enregistrement', false, 60)
on conflict (pays, domaine, cle) do nothing;

-- ─────────────────────────────────────────────────────────
-- 4. Nouvelles colonnes sur biens (toutes additives, nullable
--    ou avec valeur par defaut — aucune rupture pour le code
--    existant)
-- ─────────────────────────────────────────────────────────
alter table biens
  add column if not exists reference       text,
  add column if not exists created_by      uuid references auth.users(id),
  add column if not exists updated_by      uuid references auth.users(id),
  add column if not exists meuble          boolean not null default false,
  add column if not exists metadata        jsonb not null default '{}'::jsonb,
  add column if not exists parent_bien_id  uuid references biens(id) on delete set null,
  add column if not exists is_immeuble     boolean not null default false,
  add column if not exists en_copropriete  boolean not null default false,
  add column if not exists intention       text not null default 'location' check (intention in ('location','vente','les_deux')),
  add column if not exists latitude        double precision,
  add column if not exists longitude       double precision;

create index if not exists idx_biens_parent_bien_id on biens (parent_bien_id);
create index if not exists idx_biens_intention on biens (intention);

-- ─────────────────────────────────────────────────────────
-- 5. type_bien et statut : enum -> texte
--    Cast direct, aucune valeur ne change — le code existant
--    qui compare des chaines ('disponible', 'appartement', ...)
--    continue de fonctionner a l'identique.
-- ─────────────────────────────────────────────────────────
alter table biens alter column type_bien type text using type_bien::text;
alter table biens alter column statut type text using statut::text;
