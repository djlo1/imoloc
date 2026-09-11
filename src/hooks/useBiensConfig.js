import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Charge les catalogues configurables (types, statuts, equipements) et le
// schema pays, en tenant compte des desactivations par agence.
// Reutilise par les deux espaces (agence et imoloc).
export function useBiensConfig(agenceId, pays) {
  const [loading, setLoading] = useState(true)
  const [typesBiens, setTypesBiens] = useState([])
  const [statutsBiens, setStatutsBiens] = useState([])
  const [statutsVente, setStatutsVente] = useState([])
  const [equipements, setEquipements] = useState([])
  const [adresseSchema, setAdresseSchema] = useState([])
  const [cadastreSchema, setCadastreSchema] = useState([])
  const [fiscaliteSchema, setFiscaliteSchema] = useState([])
  const [environnementalSchema, setEnvironnementalSchema] = useState([])
  const [paysActifs, setPaysActifs] = useState([])
  const [villes, setVilles] = useState([])
  const [champsPersonnalises, setChampsPersonnalises] = useState([])

  useEffect(() => {
    if (!agenceId) { setLoading(false); return }
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const [
          { data: types },
          { data: typesDesactives },
          { data: statuts },
          { data: statutsDesactives },
          { data: statutsVenteData },
          { data: statutsVenteDesactives },
          { data: equips },
          { data: equipsDesactives },
          { data: schemaPays },
          { data: schemaGeneric },
          { data: paysActifsData },
          { data: villesData },
          { data: champsPersoData },
        ] = await Promise.all([
          supabase.from('types_biens').select('*').or(`agence_id.is.null,agence_id.eq.${agenceId}`).order('categorie').order('ordre'),
          supabase.from('agence_types_biens_desactives').select('type_bien_id').eq('agence_id', agenceId),
          supabase.from('statuts_biens').select('*').or(`agence_id.is.null,agence_id.eq.${agenceId}`).order('ordre'),
          supabase.from('agence_statuts_biens_desactives').select('statut_bien_id').eq('agence_id', agenceId),
          supabase.from('statuts_vente').select('*').or(`agence_id.is.null,agence_id.eq.${agenceId}`).order('ordre'),
          supabase.from('agence_statuts_vente_desactives').select('statut_vente_id').eq('agence_id', agenceId),
          supabase.from('equipements').select('*').or(`agence_id.is.null,agence_id.eq.${agenceId}`).order('categorie').order('ordre'),
          supabase.from('agence_equipements_desactives').select('equipement_id').eq('agence_id', agenceId),
          pays ? supabase.from('country_field_schemas').select('*').eq('pays', pays).order('domaine').order('ordre') : Promise.resolve({ data: [] }),
          supabase.from('country_field_schemas').select('*').eq('pays', '__generic__').order('domaine').order('ordre'),
          supabase.from('agence_pays_actifs').select('pays').eq('agence_id', agenceId),
          pays ? supabase.from('villes').select('nom').eq('pays', pays).order('nom') : Promise.resolve({ data: [] }),
          supabase.from('champs_personnalises').select('*').eq('agence_id', agenceId).eq('statut', 'actif').order('ordre'),
        ])
        if (cancelled) return

        const typesOff = new Set((typesDesactives||[]).map(x=>x.type_bien_id))
        const statutsOff = new Set((statutsDesactives||[]).map(x=>x.statut_bien_id))
        const statutsVenteOff = new Set((statutsVenteDesactives||[]).map(x=>x.statut_vente_id))
        const equipsOff = new Set((equipsDesactives||[]).map(x=>x.equipement_id))

        setTypesBiens((types||[]).filter(t=>!typesOff.has(t.id)))
        setStatutsBiens((statuts||[]).filter(s=>!statutsOff.has(s.id)))
        setStatutsVente((statutsVenteData||[]).filter(s=>!statutsVenteOff.has(s.id)))
        setEquipements((equips||[]).filter(e=>!equipsOff.has(e.id)))

        // Schema pays si dispo, sinon repli generique — jamais bloque.
        const bySchema = (rows, domaine) => {
          const specific = (rows||[]).filter(r=>r.domaine===domaine)
          return specific.length>0 ? specific : (schemaGeneric||[]).filter(r=>r.domaine===domaine)
        }
        setAdresseSchema(bySchema(schemaPays, 'adresse'))
        setCadastreSchema(bySchema(schemaPays, 'cadastre'))
        setFiscaliteSchema(bySchema(schemaPays, 'fiscalite'))
        setEnvironnementalSchema(bySchema(schemaPays, 'environnemental'))
        setPaysActifs((paysActifsData||[]).map(p=>p.pays))
        setVilles((villesData||[]).map(v=>v.nom))
        setChampsPersonnalises(champsPersoData||[])
      } catch (e) {
        console.error('useBiensConfig', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [agenceId, pays])

  const typesParCategorie = typesBiens.reduce((acc, t) => {
    (acc[t.categorie] = acc[t.categorie] || []).push(t)
    return acc
  }, {})
  const equipementsParCategorie = equipements.reduce((acc, e) => {
    (acc[e.categorie] = acc[e.categorie] || []).push(e)
    return acc
  }, {})

  return {
    loading,
    typesBiens, typesParCategorie,
    statutsBiens, statutsVente,
    equipements, equipementsParCategorie,
    adresseSchema, cadastreSchema, fiscaliteSchema, environnementalSchema,
    paysActifs, villes,
    champsPersonnalises,
  }
}

export const CATEGORIE_LABELS = {
  residentiel:  'Residentiel',
  terrain:      'Terrain',
  professionnel:'Professionnel',
  collectif:    'Immobilier collectif',
  stationnement:'Stationnement',
  specialise:   'Specialise',
  autre:        'Autre',
}
