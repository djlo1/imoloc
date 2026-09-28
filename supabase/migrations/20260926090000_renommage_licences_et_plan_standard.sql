-- Lève la confusion "Imoloc Standard" (qui désignait à la fois un plan et
-- une licence) : chaque licence porte désormais exactement le nom de son
-- produit, et le plan organisation qui s'appelait "Imoloc Starter" devient
-- "Imoloc Standard" (le code interne 'organisation_starter' ne change pas,
-- pour ne rien casser côté abonnements.plan_id).

UPDATE public.licences SET nom = 'Imoloc Manager'      WHERE type = 'imoloc_standard';
UPDATE public.licences SET nom = 'Imo Assist'           WHERE type = 'imo_assist_agent';
UPDATE public.licences SET nom = 'Imoloc Insights'      WHERE type = 'imoloc_insights_viewer';
UPDATE public.licences SET nom = 'Loci AI'              WHERE type = 'loci_ai_pro';
-- ImoField gardait déjà exactement le nom de son produit.

UPDATE public.plans SET nom = 'Imoloc Standard' WHERE code = 'organisation_starter';

-- Table unique "plan + licence -> licences incluses gratuitement", qui
-- remplace le champ ambigu plans.quota_utilisateurs_inclus (il ne précisait
-- pas pour quel produit) : chaque produit a désormais son propre nombre de
-- licences incluses par palier. Les licences achetées en plus (à la
-- souscription ou depuis le centre d'admin) restent suivies séparément dans
-- agence_licences_achetees, comme avant ; total réel = les deux additionnés.
CREATE TABLE public.plans_licences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  licence_id uuid NOT NULL REFERENCES public.licences(id) ON DELETE CASCADE,
  licences_incluses integer NOT NULL DEFAULT 0,
  UNIQUE (plan_id, licence_id)
);

COMMENT ON TABLE public.plans_licences IS
  'Nombre de licences incluses gratuitement par palier, pour chaque produit — remplace plans.quota_utilisateurs_inclus (ambigu, ne précisait pas le produit). Total réel pour une agence = licences_incluses (ici) + agence_licences_achetees.quantite.';

ALTER TABLE public.plans_licences ENABLE ROW LEVEL SECURITY;
CREATE POLICY plans_licences_select ON public.plans_licences FOR SELECT USING (true);
CREATE POLICY plans_licences_write_super_admin ON public.plans_licences FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Renseigné pour l'instant : "Imoloc Standard" (ex-Starter organisation),
-- validé plan par plan avec l'utilisateur — 3 Imoloc Manager inclus, aucun
-- autre produit disponible à ce palier. Les autres plans organisation sont
-- à compléter au fur et à mesure de la revue.
INSERT INTO public.plans_licences (plan_id, licence_id, licences_incluses)
SELECT p.id, l.id, CASE WHEN l.type = 'imoloc_standard' THEN 3 ELSE 0 END
FROM public.plans p
CROSS JOIN public.licences l
WHERE p.code = 'organisation_starter';
