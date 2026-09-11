-- Corrige le diagnostic A3 : aucun champ ne suivait le montant reellement
-- recu ni le reliquat d'une echeance partiellement payee. Consequences
-- observees : le dashboard comptait le montant PLEIN pour une echeance
-- "partiel" (surestime l'encaisse), le relevé proprietaire excluait
-- strictement les echeances "partiel" (statut='paye' uniquement — le
-- proprietaire ne voyait rien d'un loyer paye en partie), et
-- re-encaisser un "partiel" comparait au montant total d'origine, pas au
-- reliquat (impossible de completer un loyer regle en plusieurs fois).

alter table paiements
  add column if not exists montant_paye numeric(12,2);

-- Le releve proprietaire inclut desormais les echeances "partiel", au
-- prorata du montant reellement recu (montant_paye), pas du montant du.
create or replace function generer_releve_proprietaire(
  p_proprietaire_id uuid, p_agence_id uuid, p_periode_debut date, p_periode_fin date
) returns void language plpgsql as $$
declare
  v_revenu_brut  numeric(14,2);
  v_commission   numeric(14,2);
  v_charges      numeric(14,2);
  v_taux         numeric(6,3);
begin
  select coalesce(sum(coalesce(p.montant_paye, p.montant) * bp.pourcentage / 100.0), 0) into v_revenu_brut
  from paiements p
  join biens_proprietaires bp on bp.bien_id = p.bien_id and bp.proprietaire_id = p_proprietaire_id and bp.statut = 'actif'
  where p.statut in ('paye','partiel') and p.date_paiement between p_periode_debut and p_periode_fin;

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

  select coalesce(sum(
    bp.pourcentage / 100.0 * (
      case cb.frequence
        when 'unique'        then cb.montant
        when 'trimestrielle' then cb.montant / 3
        when 'annuelle'      then cb.montant / 12
        else cb.montant
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
