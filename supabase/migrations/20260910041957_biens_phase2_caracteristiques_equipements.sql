-- Phase 2 — Caracteristiques & equipements
-- Additif : nouvelles tables + nouvelles colonnes nullables/par defaut,
-- rien d'existant modifie.

-- ─────────────────────────────────────────────────────────
-- 1. Catalogue configurable : equipements
-- ─────────────────────────────────────────────────────────
create table if not exists equipements (
  id          uuid primary key default gen_random_uuid(),
  agence_id   uuid references agences(id) on delete cascade, -- null = catalogue global
  valeur      text not null,
  label       text not null,
  categorie   text not null,
  ordre       integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (agence_id, valeur)
);

create table if not exists agence_equipements_desactives (
  agence_id     uuid not null references agences(id) on delete cascade,
  equipement_id uuid not null references equipements(id) on delete cascade,
  primary key (agence_id, equipement_id)
);

create table if not exists biens_equipements (
  id            uuid primary key default gen_random_uuid(),
  bien_id       uuid not null references biens(id) on delete cascade,
  equipement_id uuid not null references equipements(id) on delete cascade,
  valeur        text, -- optionnel : "3" places de parking, "2" ascenseurs, etc.
  created_at    timestamptz not null default now(),
  unique (bien_id, equipement_id)
);
create index if not exists idx_biens_equipements_bien on biens_equipements(bien_id);

insert into equipements (valeur, label, categorie, ordre) values
  -- Eau
  ('eau_courante','Eau courante','eau',10),
  ('eau_municipale','Eau municipale','eau',20),
  ('forage','Forage','eau',30),
  ('puits','Puits','eau',40),
  ('reservoir','Reservoir','eau',50),
  ('citerne','Citerne','eau',60),
  ('pompe_eau','Pompe a eau','eau',70),
  ('eau_chaude','Eau chaude','eau',80),

  -- Electricite
  ('reseau_electrique','Reseau electrique','electricite',10),
  ('generateur','Generateur','electricite',20),
  ('groupe_electrogene','Groupe electrogene','electricite',30),
  ('onduleur','Onduleur','electricite',40),
  ('batteries','Batteries','electricite',50),
  ('solaire','Energie solaire','electricite',60),
  ('compteur_individuel','Compteur individuel','electricite',70),
  ('compteur_collectif','Compteur collectif','electricite',80),

  -- Energie
  ('gaz','Gaz','energie',10),
  ('gaz_naturel','Gaz naturel','energie',20),
  ('gpl','GPL','energie',30),
  ('fioul','Fioul','energie',40),

  -- Climatisation / chauffage
  ('climatisation','Climatisation','climatisation_chauffage',10),
  ('climatisation_centrale','Climatisation centrale','climatisation_chauffage',20),
  ('chauffage','Chauffage','climatisation_chauffage',30),
  ('chauffage_central','Chauffage central','climatisation_chauffage',40),
  ('ventilation','Ventilation','climatisation_chauffage',50),
  ('pompe_chaleur','Pompe a chaleur','climatisation_chauffage',60),

  -- Securite
  ('gardien','Gardien','securite',10),
  ('gardiennage_24_7','Gardiennage 24/7','securite',20),
  ('securite_privee','Securite privee','securite',30),
  ('videosurveillance','Videosurveillance','securite',40),
  ('alarme','Alarme','securite',50),
  ('controle_acces','Controle d''acces (badge/carte)','securite',60),
  ('code_acces','Code d''acces','securite',70),
  ('interphone','Interphone','securite',80),
  ('serrure_intelligente','Serrure intelligente','securite',90),
  ('detecteur_fumee','Detecteur de fumee','securite',100),
  ('detecteur_gaz','Detecteur de gaz','securite',110),
  ('extincteurs','Extincteurs','securite',120),
  ('portail','Portail','securite',130),
  ('cloture','Cloture','securite',140),
  ('mur','Mur','securite',150),
  ('eclairage_exterieur','Eclairage exterieur','securite',160),

  -- Parking et acces
  ('parking_disponible','Parking disponible','parking_acces',10),
  ('parking_couvert','Parking couvert','parking_acces',20),
  ('parking_exterieur','Parking exterieur','parking_acces',30),
  ('garage','Garage','parking_acces',40),
  ('box','Box','parking_acces',50),
  ('carport','Carport','parking_acces',60),
  ('ascenseur','Ascenseur','parking_acces',70),
  ('escalier','Escalier','parking_acces',80),

  -- Espaces exterieurs
  ('jardin','Jardin','espaces_exterieurs',10),
  ('cour','Cour','espaces_exterieurs',20),
  ('terrasse','Terrasse','espaces_exterieurs',30),
  ('balcon','Balcon','espaces_exterieurs',40),
  ('veranda','Veranda','espaces_exterieurs',50),
  ('piscine','Piscine','espaces_exterieurs',60),
  ('jacuzzi','Jacuzzi','espaces_exterieurs',70),
  ('patio','Patio','espaces_exterieurs',80),
  ('rooftop','Rooftop','espaces_exterieurs',90),
  ('terrain_sport','Terrain de sport','espaces_exterieurs',100),
  ('aire_jeux','Aire de jeux','espaces_exterieurs',110),
  ('potager','Potager','espaces_exterieurs',120),
  ('espace_barbecue','Espace barbecue','espaces_exterieurs',130),
  ('dependance','Dependance','espaces_exterieurs',140),
  ('local_exterieur_abri','Local exterieur / abri','espaces_exterieurs',150),

  -- Pieces annexes
  ('cave','Cave','pieces_annexes',10),
  ('local_velo','Local velo','pieces_annexes',20),
  ('local_stockage','Local stockage','pieces_annexes',30),
  ('buanderie','Buanderie','pieces_annexes',40),
  ('grenier','Grenier','pieces_annexes',50),
  ('sous_sol','Sous-sol','pieces_annexes',60),
  ('maison_gardien','Maison de gardien','pieces_annexes',70),

  -- Reseaux (terrain)
  ('reseau_eau_terrain','Eau (reseau)','reseaux_terrain',10),
  ('reseau_electricite_terrain','Electricite (reseau)','reseaux_terrain',20),
  ('reseau_gaz_terrain','Gaz (reseau)','reseaux_terrain',30),
  ('telecom_fibre','Telecommunications / Fibre','reseaux_terrain',40),
  ('egouts','Egouts','reseaux_terrain',50),
  ('assainissement','Assainissement','reseaux_terrain',60),

  -- Acces terrain
  ('route_goudronnee','Route goudronnee','acces_terrain',10),
  ('route_non_goudronnee','Route non goudronnee','acces_terrain',20),
  ('acces_prive','Acces prive','acces_terrain',30),
  ('acces_public','Acces public','acces_terrain',40),
  ('servitude','Servitude','acces_terrain',50),
  ('droit_passage','Droit de passage','acces_terrain',60),

  -- Amenagements bureau
  ('salle_reunion','Salle de reunion','amenagements_bureau',10),
  ('accueil_reception','Accueil / Reception','amenagements_bureau',20),
  ('salle_serveur','Salle serveur','amenagements_bureau',30),
  ('cuisine_bureau','Cuisine','amenagements_bureau',40),
  ('sanitaires_bureau','Sanitaires','amenagements_bureau',50),

  -- Amenagements commerce
  ('rideau_metallique','Rideau metallique','amenagements_commerce',10),
  ('acces_livraison','Acces livraison','amenagements_commerce',20),
  ('quai_chargement_commerce','Quai de chargement','amenagements_commerce',30),
  ('chambre_froide','Chambre froide','amenagements_commerce',40),
  ('cuisine_commerce','Cuisine','amenagements_commerce',50),
  ('extraction','Extraction','amenagements_commerce',60),
  ('enseigne','Enseigne','amenagements_commerce',70),

  -- Amenagements entrepot
  ('porte_industrielle','Porte industrielle','amenagements_entrepot',10),
  ('acces_camion','Acces camion','amenagements_entrepot',20),
  ('aire_manoeuvre','Aire de manoeuvre','amenagements_entrepot',30),
  ('rayonnage','Rayonnage','amenagements_entrepot',40),
  ('temperature_controlee','Temperature controlee','amenagements_entrepot',50),

  -- Accessibilite
  ('acces_pmr','Acces PMR','accessibilite',10),
  ('rampe','Rampe','accessibilite',20),
  ('ascenseur_accessible','Ascenseur accessible','accessibilite',30),
  ('sanitaires_accessibles','Sanitaires accessibles','accessibilite',40),
  ('parking_accessible','Parking accessible','accessibilite',50),
  ('signaletique_adaptee','Signaletique adaptee','accessibilite',60)
on conflict (agence_id, valeur) do nothing;

-- ─────────────────────────────────────────────────────────
-- 2. Nouvelles colonnes de caracteristiques sur biens
-- ─────────────────────────────────────────────────────────
alter table biens
  -- Point 8 : caracteristiques generales
  add column if not exists nombre_toilettes     integer,
  add column if not exists nombre_niveaux        integer,
  add column if not exists etage                 integer,
  add column if not exists annee_construction    integer,
  add column if not exists etat_general           text,
  add column if not exists capacite_max          integer,

  -- Point 7 : superficies (le socle existant garde superficie/superficie_totale ;
  -- ici on ajoute les variantes qui manquaient)
  add column if not exists superficie_habitable   numeric(10,2),
  add column if not exists superficie_terrain     numeric(10,2),
  add column if not exists superficie_construite  numeric(10,2),
  add column if not exists superficie_commerciale numeric(10,2),
  add column if not exists superficie_stockage    numeric(10,2),

  -- Point 17 : terrain
  add column if not exists usage_actuel   text,
  add column if not exists usage_prevu    text,
  add column if not exists constructible  boolean,
  add column if not exists longueur       numeric(10,2),
  add column if not exists largeur        numeric(10,2),
  add column if not exists perimetre      numeric(10,2),
  add column if not exists facade         numeric(10,2),
  add column if not exists profondeur     numeric(10,2),
  add column if not exists forme_terrain  text,
  add column if not exists nature_sol     text,

  -- Point 18 : bureau
  add column if not exists nombre_postes        integer,
  add column if not exists nombre_bureaux_fermes integer,
  add column if not exists open_space           boolean,
  add column if not exists horaires_acces       text,

  -- Point 19 : commerce
  add column if not exists type_activite_autorisee text,
  add column if not exists nombre_vitrines         integer,
  add column if not exists hauteur_sous_plafond    numeric(6,2),

  -- Point 20 : entrepot
  add column if not exists nombre_quais    integer,
  add column if not exists largeur_portes  numeric(6,2),
  add column if not exists hauteur_portes  numeric(6,2),

  -- Point 13 : identifiant d'unite (appartement)
  add column if not exists numero_appartement text,
  add column if not exists numero_lot         text,

  -- Point 22 : copropriete (par unite ; en_copropriete est deja sur l'immeuble
  -- parent depuis la Phase 0)
  add column if not exists copropriete_nom     text,
  add column if not exists copropriete_numero  text,
  add column if not exists syndic_nom          text,
  add column if not exists syndic_contact      text,
  add column if not exists fonds_travaux       numeric(12,2),
  add column if not exists quote_part          numeric(6,3),
  add column if not exists tantiemes           numeric(10,2);

-- ─────────────────────────────────────────────────────────
-- 3. Inventaire (biens meubles — Point 14)
-- ─────────────────────────────────────────────────────────
create table if not exists inventaire_items (
  id             uuid primary key default gen_random_uuid(),
  bien_id        uuid not null references biens(id) on delete cascade,
  nom            text not null,
  categorie      text,
  quantite       integer not null default 1,
  etat           text,
  valeur_estimee numeric(12,2),
  date_achat     date,
  numero_serie   text,
  photo_url      text,
  commentaire    text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_inventaire_items_bien on inventaire_items(bien_id);
