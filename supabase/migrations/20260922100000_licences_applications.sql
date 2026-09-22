-- Domaine D — pièce manquante repérée en câblant l'assistant "Ajouter un
-- utilisateur" : quelles applications un type de licence donne par défaut.
-- Décrite dans la conception (types_licence_applications) mais jamais
-- construite comme une vraie table — corrigé ici plutôt que codé en dur
-- côté front, pour rester cohérent avec "les rôles/licences sont des
-- données, pas du code".

CREATE TABLE public.licences_applications (
  licence_id uuid NOT NULL REFERENCES public.licences(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.applications(id),
  PRIMARY KEY (licence_id, application_id)
);

INSERT INTO public.licences_applications (licence_id, application_id)
SELECT l.id, a.id
FROM (VALUES
  ('imoloc_standard','imoloc_manager'),
  ('imoloc_standard','imodrive'),
  ('imoloc_standard','imoconnect'),
  ('imoloc_field','imofield'),
  ('imoloc_field','imoconnect'),
  ('imo_assist_agent','imo_assist'),
  ('imoloc_insights_viewer','imoloc_insights'),
  ('loci_ai_pro','loci_ai')
) AS v(licence_type, app_code)
JOIN public.licences l ON l.type = v.licence_type
JOIN public.applications a ON a.code = v.app_code;

ALTER TABLE public.licences_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY licences_applications_select ON public.licences_applications FOR SELECT USING (true);
CREATE POLICY licences_applications_write_super_admin ON public.licences_applications FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
