-- Domaine F — secteurs (un ensemble nommé de biens confiés à un ou
-- plusieurs agents). Rend enfin réel le rôle Agent, dont le
-- role_permissions (portee='secteur') attendait cette table depuis le
-- domaine E.

CREATE TABLE public.secteurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agence_id uuid NOT NULL REFERENCES public.agences(id) ON DELETE CASCADE,
  nom text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.secteur_biens (
  secteur_id uuid NOT NULL REFERENCES public.secteurs(id) ON DELETE CASCADE,
  bien_id uuid NOT NULL REFERENCES public.biens(id) ON DELETE CASCADE,
  PRIMARY KEY (secteur_id, bien_id)
);

CREATE TABLE public.secteur_agents (
  secteur_id uuid NOT NULL REFERENCES public.secteurs(id) ON DELETE CASCADE,
  agence_user_id uuid NOT NULL REFERENCES public.agence_users(id) ON DELETE CASCADE,
  PRIMARY KEY (secteur_id, agence_user_id)
);

COMMENT ON TABLE public.secteurs IS
  'Un bien peut appartenir à plusieurs secteurs, un agent à plusieurs secteurs. Un bien sans secteur reste invisible à tout rôle scopé "secteur" (Agent) — visible seulement aux rôles scopés "organisation".';

ALTER TABLE public.secteurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secteur_biens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secteur_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY secteurs_scope ON public.secteurs
  FOR ALL
  USING (is_my_agence(agence_id) OR is_super_admin())
  WITH CHECK (is_my_agence(agence_id) OR is_super_admin());

CREATE POLICY secteur_biens_scope ON public.secteur_biens
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.secteurs s WHERE s.id = secteur_biens.secteur_id
    AND (is_my_agence(s.agence_id) OR is_super_admin())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.secteurs s WHERE s.id = secteur_biens.secteur_id
    AND (is_my_agence(s.agence_id) OR is_super_admin())
  ));

CREATE POLICY secteur_agents_scope ON public.secteur_agents
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.secteurs s WHERE s.id = secteur_agents.secteur_id
    AND (is_my_agence(s.agence_id) OR is_super_admin())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.secteurs s WHERE s.id = secteur_agents.secteur_id
    AND (is_my_agence(s.agence_id) OR is_super_admin())
  ));
