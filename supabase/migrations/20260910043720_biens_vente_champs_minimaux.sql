-- Champs minimaux du module Vente necessaires pour que le wizard
-- (Phase 3, etape Finances) fonctionne des maintenant. Le reste du
-- module Vente (statut_vente catalogue, opportunites_vente, mandats
-- de vente...) reste prevu pour la Phase 4.
alter table biens
  add column if not exists prix_vente_demande numeric(14,2),
  add column if not exists date_mise_en_vente  date,
  add column if not exists prix_vente_final    numeric(14,2),
  add column if not exists date_vente          date;
