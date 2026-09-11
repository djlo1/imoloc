-- Corrige le finding le plus grave du diagnostic imoloc (A1/A2/A10) :
-- generer_releve_proprietaire() ne trouvait jamais de commission
-- (mandats.commission_gestion n'est ecrit nulle part dans l'app),
-- retombait donc systematiquement sur agences.taux_commission_defaut_gestion
-- (jamais configure nulle part non plus) puis sur 0 — chaque releve
-- versait 100% du loyer au proprietaire sans le moindre avertissement.
-- Le cron mensuel selectionnait aussi les mandats actifs pour decider
-- qui recevait un releve : comme mandats est toujours vide, il ne
-- generait jamais rien, pour aucune agence, depuis son deploiement.
--
-- Corrige aussi : le revenu et les charges n'etaient jamais ponderes
-- par biens_proprietaires.pourcentage (double comptage sur un bien a
-- plusieurs proprietaires), et charges_bien.frequence etait ignoree
-- (une charge "unique" sans date_fin se recomptait integralement a
-- chaque generation mensuelle, sans limite).

create or replace function generer_releve_proprietaire(
  p_proprietaire_id uuid, p_agence_id uuid, p_periode_debut date, p_periode_fin date
) returns void language plpgsql as $$
declare
  v_revenu_brut  numeric(14,2);
  v_commission   numeric(14,2);
  v_charges      numeric(14,2);
  v_taux         numeric(6,3);
begin
  -- Revenu brut : paiements payes sur les biens de ce proprietaire, sur la
  -- periode, pondere par sa part de propriete (pourcentage) — evite de
  -- compter le loyer brut complet a chaque co-proprietaire d'un meme bien.
  select coalesce(sum(p.montant * bp.pourcentage / 100.0), 0) into v_revenu_brut
  from paiements p
  join biens_proprietaires bp on bp.bien_id = p.bien_id and bp.proprietaire_id = p_proprietaire_id and bp.statut = 'actif'
  where p.statut = 'paye' and p.date_paiement between p_periode_debut and p_periode_fin;

  -- Commission : taux du mandat de gestion locative actif si renseigne,
  -- sinon le taux negocie avec ce proprietaire (partenariats — la donnee
  -- reellement saisie a la creation/liaison du proprietaire), sinon le
  -- defaut de l'agence, sinon 0 (avec un avertissement applicatif plutot
  -- qu'un silence total, voir agences.taux_commission_defaut_gestion).
  select coalesce(
    (select m.commission_gestion from mandats m
      where m.proprietaire_id = p_proprietaire_id and m.agence_id = p_agence_id
        and m.categorie_mandat = 'gestion_locative' and m.statut = 'actif'
      order by m.created_at desc limit 1),
    (select pt.taux_commission from partenariats pt
      where pt.proprietaire_id = p_proprietaire_id and pt.agence_id = p_agence_id and pt.actif = true
      order by pt.id desc limit 1),
    (select a.taux_commission_defaut_gestion from agences a where a.id = p_agence_id),
    0
  ) into v_taux;
  v_commission := v_taux * v_revenu_brut / 100;

  -- Charges : ponderees par la part de propriete, et par la frequence de
  -- la charge (une charge "unique" ne compte qu'au mois ou elle a ete
  -- engagee, une charge trimestrielle/annuelle est ramenee a son
  -- equivalent mensuel puisque les releves sont toujours generes par mois).
  select coalesce(sum(
    bp.pourcentage / 100.0 * (
      case cb.frequence
        when 'unique'        then cb.montant
        when 'trimestrielle' then cb.montant / 3
        when 'annuelle'      then cb.montant / 12
        else cb.montant -- 'mensuelle' ou non renseignee
      end
    )
  ), 0) into v_charges
  from charges_bien cb
  join biens_proprietaires bp on bp.bien_id = cb.bien_id and bp.proprietaire_id = p_proprietaire_id and bp.statut = 'actif'
  where (
    cb.frequence = 'unique' and cb.date_debut between p_periode_debut and p_periode_fin
  ) or (
    cb.frequence is distinct from 'unique'
    and coalesce(cb.date_debut, p_periode_debut) <= p_periode_fin
    and coalesce(cb.date_fin, p_periode_fin) >= p_periode_debut
  );

  insert into releves_proprietaires (agence_id, proprietaire_id, periode_debut, periode_fin, revenu_brut, commission, charges, montant_net, statut)
  values (p_agence_id, p_proprietaire_id, p_periode_debut, p_periode_fin, v_revenu_brut, v_commission, v_charges, v_revenu_brut - v_commission - v_charges, 'brouillon')
  on conflict (proprietaire_id, periode_debut, periode_fin) do nothing;
end;
$$;

-- L'automatisation mensuelle se declenchait sur les mandats actifs — table
-- jamais alimentee par aucun code de l'app. Elle se declenche desormais sur
-- la propriete reelle (biens_proprietaires), qui elle est bien peuplee
-- depuis la Phase 1 (chaque bien y a une ligne des sa creation).
create or replace function generer_releves_proprietaires_mensuel() returns void language plpgsql as $$
declare
  v_periode_debut date := date_trunc('month', now() - interval '1 month')::date;
  v_periode_fin   date := (date_trunc('month', now()) - interval '1 day')::date;
  r record;
begin
  for r in
    select distinct bp.proprietaire_id, b.agence_id
    from biens_proprietaires bp
    join biens b on b.id = bp.bien_id
    where bp.statut = 'actif'
  loop
    perform generer_releve_proprietaire(r.proprietaire_id, r.agence_id, v_periode_debut, v_periode_fin);
  end loop;
end;
$$;
