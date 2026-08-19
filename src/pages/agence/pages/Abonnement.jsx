import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'

const FACTURE_STATUT_CFG = {
  paye:    { color:'#00c896', bg:'rgba(0,200,150,0.1)', label:'Payee' },
  en_attente: { color:'#f59e0b', bg:'rgba(245,158,11,0.1)', label:'En attente' },
  echoue:  { color:'#ef4444', bg:'rgba(239,68,68,0.1)', label:'Echouee' },
  annulee: { color:'#8b949e', bg:'rgba(139,148,158,0.1)', label:'Annulee' },
}

const PAYS = [
  { nom:'Benin', indicatif:'229', longueur:8 },
  { nom:'Togo', indicatif:'228', longueur:8 },
  { nom:'Senegal', indicatif:'221', longueur:9 },
]

const OPERATEURS = [
  { id:'MTN', label:'MTN Mobile Money', pays:['Benin'], codes:{ Benin:'MTN_MOMO_BEN' } },
  { id:'MOOV', label:'Moov Money', pays:['Benin','Togo'], codes:{ Benin:'MOOV_BEN', Togo:'MOOV_TGO' }, logo:'/logos/moov-money.png' },
  { id:'ORANGE', label:'Orange Money', pays:['Senegal'], codes:{ Senegal:'ORANGE_SEN' }, logo:'/logos/orange-money.png' },
  { id:'WAVE', label:'Wave', pays:['Senegal'], codes:{ Senegal:'WAVE_SEN' }, logo:'/logos/wave.png' },
]

const DEPARTEMENTS_VILLES = {
  Benin: {
    'Alibori': ['Banikoara','Gogounou','Kandi','Karimama','Malanville','Segbana'],
    'Atacora': ['Boukoumbe','Cobly','Kerou','Kouande','Materi','Natitingou','Pehunco','Tanguieta','Toucountouna'],
    'Atlantique': ['Abomey-Calavi','Allada','Kpomasse','Ouidah','So-Ava','Toffo','Tori-Bossito','Ze'],
    'Borgou': ['Bembereke','Kalale','Ndali','Nikki','Parakou','Perere','Sinende','Tchaourou'],
    'Collines': ['Bante','Dassa-Zoume','Glazoue','Ouesse','Savalou','Save'],
    'Couffo': ['Aplahoue','Djakotomey','Dogbo','Klouekanme','Lalo','Toviklin'],
    'Donga': ['Bassila','Copargo','Djougou','Ouake'],
    'Littoral': ['Cotonou'],
    'Mono': ['Athieme','Bopa','Come','Grand-Popo','Houeyogbe','Lokossa'],
    'Oueme': ['Adjarra','Adjohoun','Agueagues','Akpro-Misserete','Avrankou','Bonou','Dangbo','Porto-Novo','Seme-Kpodji'],
    'Plateau': ['Adja-Ouere','Ifangni','Ketou','Pobe','Sakete'],
    'Zou': ['Abomey','Agbangnizoun','Bohicon','Cove','Djidja','Ouinhi','Za-Kpota','Zagnanado','Zogbodomey'],
  },
  Togo: {
    'Maritime': ['Lome','Tsevie','Aneho','Tabligbo','Vogan'],
    'Plateaux': ['Atakpame','Kpalime','Notse','Amlame','Badou'],
    'Centrale': ['Sokode','Sotouboua','Tchamba','Bassar'],
    'Kara': ['Kara','Bafilo','Niamtougou','Pagouda'],
    'Savanes': ['Dapaong','Mango','Cinkasse'],
  },
  Senegal: {
    'Dakar': ['Dakar','Pikine','Guediawaye','Rufisque','Bargny'],
    'Thies': ['Thies','Mbour','Tivaouane','Joal-Fadiouth'],
    'Diourbel': ['Diourbel','Touba','Mbacke','Bambey'],
    'Fatick': ['Fatick','Foundiougne','Gossas'],
    'Kaolack': ['Kaolack','Guinguineo','Nioro du Rip'],
    'Kaffrine': ['Kaffrine','Birkelane','Koungheul','Malem Hodar'],
    'Louga': ['Louga','Kebemer','Linguere'],
    'Saint-Louis': ['Saint-Louis','Dagana','Podor','Richard-Toll'],
    'Matam': ['Matam','Kanel','Ranerou'],
    'Tambacounda': ['Tambacounda','Bakel','Goudiry','Koumpentoum'],
    'Kedougou': ['Kedougou','Salemata','Saraya'],
    'Kolda': ['Kolda','Velingara','Medina Yoro Foula'],
    'Sedhiou': ['Sedhiou','Bounkiling','Goudomp'],
    'Ziguinchor': ['Ziguinchor','Bignona','Oussouye'],
  },
}

const validerMethode = (m) => {
  if (!m.pays) return 'Selectionnez un pays'
  if (!m.operateur) return 'Selectionnez un operateur'
  if (!m.nomTitulaire.trim()) return 'Le nom du titulaire est requis'
  const clean = (m.telephone || '').replace(/[\s-]/g, '')
  const paysInfo = PAYS.find(p => p.nom === m.pays)
  if (!clean) return 'Le numero de telephone est requis'
  if (!/^\d+$/.test(clean)) return 'Le numero ne doit contenir que des chiffres'
  if (clean.length !== paysInfo.longueur) return `Le numero doit contenir ${paysInfo.longueur} chiffres (hors indicatif)`
  if (!m.adresse1.trim()) return 'La ligne d adresse 1 est requise'
  if (!m.departement) return 'Selectionnez un departement'
  if (!m.ville.trim()) return 'Renseignez une ville'
  return null
}

const bB = { display:'inline-flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:6,fontSize:13,fontWeight:500,cursor:'pointer',border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.6)',fontFamily:'Inter,sans-serif',transition:'all 0.15s' }
const bP = { ...bB, background:'#0078d4', borderColor:'#0078d4', color:'#fff' }
const fmt = n => Number(n||0).toLocaleString('fr-FR')

function OperateurBadge({ operateurId, size=32 }) {
  const op = OPERATEURS.find(o => o.id === operateurId)
  if (op?.logo) return <img src={op.logo} alt={op.label} style={{ width:size, height:size, objectFit:'contain', borderRadius:6, background:'#fff', padding:3, flexShrink:0 }}/>
  return <div style={{ width:size, height:size, borderRadius:'50%', background:'#ffcc00', display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.26, fontWeight:800, color:'#111', flexShrink:0 }}>MTN</div>
}

function Combobox({ value, onChange, options, placeholder, freeText=false, disabled=false }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)
  useEffect(() => {
    const onClick = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])
  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <input
        disabled={disabled}
        value={open ? query : (value || '')}
        onFocus={() => { setOpen(true); setQuery('') }}
        onChange={e => { setQuery(e.target.value); if (freeText) onChange(e.target.value) }}
        placeholder={placeholder}
        style={{ width:'100%', padding:'10px 12px', background:disabled?'rgba(255,255,255,0.02)':'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:7, color:'#e6edf3', fontFamily:'Inter,sans-serif', fontSize:14, outline:'none', colorScheme:'dark', boxSizing:'border-box' }}
      />
      {open && filtered.length > 0 && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, maxHeight:200, overflowY:'auto', background:'#161b22', border:'1px solid rgba(255,255,255,0.12)', borderRadius:7, zIndex:20, boxShadow:'0 8px 24px rgba(0,0,0,0.4)' }}>
          {filtered.map(o => (
            <div key={o} onMouseDown={() => { onChange(o); setOpen(false); setQuery('') }}
              style={{ padding:'8px 12px', fontSize:13.5, color:'#e6edf3', cursor:'pointer' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'}
              onMouseLeave={e=>e.currentTarget.style.background='none'}>{o}</div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Abonnement() {
  const location = useLocation()
  const navigate = useNavigate()
  const tab = location.pathname.endsWith('/modes') ? 'paiement' : 'factures'
  const setTab = (t) => navigate(t === 'paiement' ? '/agence/abonnement/modes' : '/agence/abonnement')

  const [agence, setAgence]       = useState(null)
  const [factures, setFactures]   = useState([])
  const [methodes, setMethodes]   = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => { init() }, [])

  const init = async () => {
    setLoading(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      const { data:agList } = await supabase.from('agences').select('*')
      const ag = agList?.find(a => a.profile_id === user.id) || agList?.[0]
      setAgence(ag)
      if (ag?.id) {
        const { data:f } = await supabase.from('factures').select('*').eq('agence_id', ag.id).order('created_at',{ascending:false})
        setFactures(f||[])
        const { data:m } = await supabase.from('methodes_paiement').select('*').eq('agence_id', ag.id)
        setMethodes(m||[])
      }
    } catch(e) { console.error('Init error:', e) }
    finally { setLoading(false) }
  }

  const [factureSearch, setFactureSearch] = useState('')
  const [factureStatutFilter, setFactureStatutFilter] = useState('tout')
  const [factureDuree, setFactureDuree] = useState('12mois')
  const [exclureZero, setExclureZero] = useState(false)
  const [selectedFactures, setSelectedFactures] = useState([])

  const toggleSelectFacture = (id) => setSelectedFactures(s => s.includes(id) ? s.filter(x=>x!==id) : [...s, id])
  const toggleSelectAllFactures = (list) => setSelectedFactures(s => s.length===list.length ? [] : list.map(f=>f.id))

  const exporterCSV = (list) => {
    const lignes = [
      ['ID de facture','Date de facture','Periode de facturation','Profil de facturation','Montant total','Etat'],
      ...list.map(f => [f.numero, new Date(f.created_at).toLocaleDateString('fr-FR'), f.periode_debut?new Date(f.periode_debut).toLocaleDateString('fr-FR'):'', agence?.nom||'', `${fmt(f.montant)} ${f.devise||'FCFA'}`, FACTURE_STATUT_CFG[f.statut]?.label||f.statut])
    ]
    const csv = lignes.map(l => l.map(c => `"${String(c??'').replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿'+csv], { type:'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `factures-${agence?.nom||'imoloc'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const [showAddMethod, setShowAddMethod] = useState(false)
  const emptyMethod = (pays='Benin') => ({
    pays, indicatif: PAYS.find(p=>p.nom===pays)?.indicatif || '229', operateur: '',
    nomTitulaire: '', telephone: '', adresse1: '', adresse2: '', departement: '', ville: '', codePostal: '',
  })
  const [newMethod, setNewMethod] = useState(emptyMethod())
  const [methodError, setMethodError] = useState('')
  const [savingMethod, setSavingMethod] = useState(false)

  const ouvrirAjoutMethode = () => {
    const paysDefaut = PAYS.find(p => p.nom === agence?.pays)?.nom || 'Benin'
    setNewMethod(emptyMethod(paysDefaut))
    setMethodError('')
    setShowAddMethod(true)
  }

  const choisirPays = (paysNom) => {
    setNewMethod(p => ({
      ...p,
      pays: paysNom,
      indicatif: PAYS.find(x => x.nom === paysNom)?.indicatif || p.indicatif,
      operateur: OPERATEURS.find(o => o.id === p.operateur)?.pays.includes(paysNom) ? p.operateur : '',
      departement: '', ville: '',
    }))
    setMethodError('')
  }

  const ajouterMethode = async () => {
    const err = validerMethode(newMethod)
    if (err) { setMethodError(err); return }
    setSavingMethod(true)
    const op = OPERATEURS.find(o => o.id === newMethod.operateur)
    const clean = newMethod.telephone.replace(/[\s-]/g, '')
    const numeroComplet = newMethod.indicatif + clean
    const masque = '•'.repeat(Math.max(clean.length - 4, 0)) + clean.slice(-4)
    const { error } = await supabase.from('methodes_paiement').insert({
      agence_id: agence.id,
      type: 'Mobile Money',
      nom_titulaire: newMethod.nomTitulaire.trim(),
      par_defaut: methodes.length === 0,
      statut: 'actif',
      details: {
        correspondent: op.codes[newMethod.pays],
        operateurId: op.id,
        operateur: op.label,
        pays: newMethod.pays,
        phone: numeroComplet,
        phoneMasque: masque,
        adresse1: newMethod.adresse1.trim(),
        adresse2: newMethod.adresse2.trim(),
        departement: newMethod.departement,
        ville: newMethod.ville.trim(),
        codePostal: newMethod.codePostal.trim(),
      },
    })
    setSavingMethod(false)
    if (error) { toast.error(error.message); return }
    toast.success('Methode de paiement ajoutee')
    setShowAddMethod(false)
    init()
  }

  const definirParDefaut = async (id) => {
    await supabase.from('methodes_paiement').update({ par_defaut: false }).eq('agence_id', agence.id)
    const { error } = await supabase.from('methodes_paiement').update({ par_defaut: true }).eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Methode par defaut mise a jour')
    init()
  }

  const supprimerMethode = async (id) => {
    const { error } = await supabase.from('methodes_paiement').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Methode de paiement supprimee')
    init()
  }

  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:400,color:'rgba(255,255,255,0.3)' }}>Chargement...</div>

  const montantDu = factures.filter(f=>f.statut!=='paye').reduce((s,f)=>s+Number(f.montant||0),0)
  const dureeLimite = { '3mois':3, '12mois':12, 'tout':null }[factureDuree]
  const facturesFiltrees = factures
    .filter(f => factureStatutFilter==='tout' || f.statut===factureStatutFilter)
    .filter(f => !factureSearch || f.numero?.toLowerCase().includes(factureSearch.toLowerCase()))
    .filter(f => !exclureZero || Number(f.montant||0) > 0)
    .filter(f => !dureeLimite || new Date(f.created_at) >= new Date(Date.now() - dureeLimite*30*24*60*60*1000))
  const methodeParDefaut = methodes.find(m=>m.par_defaut)

  return (
    <>
      <div style={{ maxWidth:1300, margin:'0 auto' }}>

        <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:14 }}>
          Accueil <span style={{ margin:'0 4px' }}>&gt;</span> <span style={{ color:'rgba(255,255,255,0.6)' }}>Factures et paiements</span>
        </div>

        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:10, marginBottom:20 }}>
          <div style={{ fontSize:26, fontWeight:700, color:'#e6edf3' }}>Factures et paiements</div>
          <a href="#" onClick={e=>e.preventDefault()} style={{ fontSize:12.5, color:'#4da6ff', textDecoration:'none', display:'flex', alignItems:'center', gap:6, marginTop:6 }}>📖 Decouvrez plus d informations sur la nouvelle experience de facturation.</a>
        </div>

        <div style={{ display:'flex', gap:24, borderBottom:'1px solid rgba(255,255,255,0.08)', marginBottom:20 }}>
          {[['factures','Factures'],['paiement','Methodes de paiement']].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{ background:'none', border:'none', borderBottom:tab===k?'2px solid #4da6ff':'2px solid transparent', padding:'0 0 10px', fontSize:14, fontWeight:tab===k?700:500, color:tab===k?'#e6edf3':'rgba(255,255,255,0.5)', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>{l}</button>
          ))}
        </div>

        {/* ── FACTURES ── */}
        {tab==='factures' && (
          <div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.55)', marginBottom:20, lineHeight:1.7 }}>
              Les factures fournissent un recapitulatif de vos frais et des instructions pour effectuer des paiements. Certaines sont generees dans les 24 heures suivant un paiement individuel, d autres sont generees a la fin de la periode de facturation.{' '}
              <a href="#" onClick={e=>e.preventDefault()} style={{ color:'#4da6ff' }}>En savoir plus sur les factures</a>
            </div>

            <div style={{ fontSize:13, fontWeight:700, color:'#e6edf3', marginBottom:8 }}>Affichage du compte de facturation</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.55)', marginBottom:20 }}>
              Factures connectees a <span style={{ color:'#4da6ff', fontWeight:600 }}>{agence?.nom}</span>
            </div>

            <div style={{ display:'flex', gap:10, padding:'14px 16px', background:'rgba(0,120,212,0.06)', border:'1px solid rgba(0,120,212,0.2)', borderRadius:8, marginBottom:24 }}>
              <span style={{ fontSize:14, flexShrink:0 }}>ℹ️</span>
              <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.6)', lineHeight:1.7 }}>
                Les factures sont generees automatiquement a chaque paiement Mobile Money confirme (essai gratuit, souscription ou renouvellement d abonnement). Retrouvez le detail de chaque transaction ci-dessous.
              </div>
            </div>

            <div style={{ display:'flex', gap:32, marginBottom:20 }}>
              <div style={{ borderLeft:'3px solid #d6249f', paddingLeft:14 }}>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:4 }}>Total invoices</div>
                <div style={{ fontSize:22, fontWeight:700, color:'#e6edf3' }}>{factures.length}</div>
              </div>
              <div style={{ borderLeft:'3px solid #0078d4', paddingLeft:14 }}>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:4 }}>Montant du</div>
                <div style={{ fontSize:22, fontWeight:700, color:'#e6edf3' }}>{fmt(montantDu)} FCFA</div>
              </div>
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:18, marginBottom:14, flexWrap:'wrap', paddingBottom:14, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={init} style={{ background:'none', border:'none', color:'#4da6ff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'Inter,sans-serif', display:'flex', alignItems:'center', gap:6 }}>↻ Actualiser</button>
              <button onClick={()=>exporterCSV(selectedFactures.length?facturesFiltrees.filter(f=>selectedFactures.includes(f.id)):facturesFiltrees)} style={{ background:'none', border:'none', color:'#4da6ff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'Inter,sans-serif', display:'flex', alignItems:'center', gap:6 }}>⬇ Exporter vers un fichier CSV</button>
              <span style={{ fontSize:13, color:'rgba(255,255,255,0.25)', cursor:'default', display:'flex', alignItems:'center', gap:6 }}>📄 Telecharger</span>
              <span style={{ fontSize:13, color:'rgba(255,255,255,0.25)', cursor:'default', display:'flex', alignItems:'center', gap:6 }}>👥 Gerer l acces</span>
              <input value={factureSearch} onChange={e=>setFactureSearch(e.target.value)} placeholder="🔍 Rechercher"
                style={{ padding:'7px 12px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:6, color:'#e6edf3', fontSize:12.5, fontFamily:'Inter,sans-serif', outline:'none', minWidth:180 }}/>
              <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:16 }}>
                <a href="#" onClick={e=>e.preventDefault()} style={{ fontSize:12.5, color:'#4da6ff', textDecoration:'none' }}>M aider a comprendre ce tableau</a>
                <select value="liste" onChange={()=>{}} style={{ padding:'6px 10px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:6, color:'#e6edf3', fontSize:12.5, fontFamily:'Inter,sans-serif', outline:'none' }}>
                  <option value="liste">Liste</option>
                </select>
              </div>
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18, flexWrap:'wrap' }}>
              <select value={factureStatutFilter} onChange={e=>setFactureStatutFilter(e.target.value)}
                style={{ padding:'6px 12px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:100, color:'#e6edf3', fontSize:12, fontWeight:600, fontFamily:'Inter,sans-serif', outline:'none' }}>
                <option value="tout">Etat : Tout</option>
                {Object.entries(FACTURE_STATUT_CFG).map(([k,v])=><option key={k} value={k}>Etat : {v.label}</option>)}
              </select>
              <span style={{ padding:'6px 12px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:100, color:'#e6edf3', fontSize:12, fontWeight:600 }}>Profil de facturation : {agence?.nom}</span>
              <select value={factureDuree} onChange={e=>setFactureDuree(e.target.value)}
                style={{ padding:'6px 12px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:100, color:'#e6edf3', fontSize:12, fontWeight:600, fontFamily:'Inter,sans-serif', outline:'none' }}>
                <option value="3mois">Duree : 3 derniers mois</option>
                <option value="12mois">Duree : 12 derniers mois</option>
                <option value="tout">Duree : Tout</option>
              </select>
              <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12.5, color:'rgba(255,255,255,0.5)', cursor:'pointer', marginLeft:8 }}>
                <input type="checkbox" checked={exclureZero} onChange={e=>setExclureZero(e.target.checked)} />
                Exclure les factures a 0 $
              </label>
            </div>

            <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, overflow:'hidden' }}>
              {facturesFiltrees.length === 0 ? (
                <div style={{ textAlign:'center', padding:'60px', color:'rgba(255,255,255,0.3)' }}>
                  <div style={{ fontSize:32, marginBottom:12, opacity:0.3 }}>📄</div>
                  <div style={{ fontSize:14 }}>{factures.length===0 ? 'Aucune facture pour le moment' : 'Aucune facture ne correspond a ce filtre'}</div>
                  {factures.length===0 && <div style={{ fontSize:12.5, marginTop:6, color:'rgba(255,255,255,0.25)' }}>Vos factures apparaitront ici des qu un paiement sera effectue.</div>}
                </div>
              ) : (
                <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', minWidth:900 }}>
                  <thead><tr>
                    <th style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                      <input type="checkbox" checked={selectedFactures.length>0 && selectedFactures.length===facturesFiltrees.length} onChange={()=>toggleSelectAllFactures(facturesFiltrees)} />
                    </th>
                    {['ID de facture','Date de facture (UTC)','Periode de facturation','Profil de facturation','Montant total','Etat','Paie','Telecharger la facture'].map(h=>(
                      <th key={h} style={{ textAlign:'left', padding:'12px 16px', fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', borderBottom:'1px solid rgba(255,255,255,0.06)', whiteSpace:'nowrap' }}>{h} ⌄</th>
                    ))}
                  </tr></thead>
                  <tbody>{facturesFiltrees.map(f=>{
                    const sc = FACTURE_STATUT_CFG[f.statut] || FACTURE_STATUT_CFG.en_attente
                    return <tr key={f.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding:'12px 16px' }}>
                        <input type="checkbox" checked={selectedFactures.includes(f.id)} onChange={()=>toggleSelectFacture(f.id)} />
                      </td>
                      <td style={{ padding:'12px 16px', fontSize:13, fontWeight:600, color:'#4da6ff', whiteSpace:'nowrap' }}>{f.numero} <span style={{ color:'rgba(255,255,255,0.25)' }}>ⓘ</span></td>
                      <td style={{ padding:'12px 16px', fontSize:13, color:'rgba(255,255,255,0.6)', whiteSpace:'nowrap' }}>{new Date(f.created_at).toLocaleDateString('fr-FR')}</td>
                      <td style={{ padding:'12px 16px', fontSize:13, color:'rgba(255,255,255,0.6)', whiteSpace:'nowrap' }}>
                        {f.periode_debut ? new Date(f.periode_debut).toLocaleDateString('fr-FR') : new Date(f.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td style={{ padding:'12px 16px', fontSize:13, color:'#4da6ff', whiteSpace:'nowrap' }}>{agence?.nom}</td>
                      <td style={{ padding:'12px 16px', fontSize:13, fontWeight:600, color:'#e6edf3', whiteSpace:'nowrap' }}>{fmt(f.montant)} {f.devise||'FCFA'}</td>
                      <td style={{ padding:'12px 16px', whiteSpace:'nowrap' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          {f.statut==='paye' && <span style={{ color:'#00c896', fontSize:13 }}>✓</span>}
                          <span style={{ fontSize:12.5, color:sc.color }}>{f.statut==='paye' ? `Paye le ${f.date_paiement?new Date(f.date_paiement).toLocaleDateString('fr-FR'):new Date(f.created_at).toLocaleDateString('fr-FR')}` : sc.label}</span>
                        </div>
                      </td>
                      <td style={{ padding:'12px 16px', fontSize:13, color:'rgba(255,255,255,0.3)' }}>N/A</td>
                      <td style={{ padding:'12px 16px', fontSize:12.5, color:'rgba(255,255,255,0.25)', whiteSpace:'nowrap' }}>⬇ Telecharger</td>
                    </tr>
                  })}</tbody>
                </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── METHODES DE PAIEMENT ── */}
        {tab==='paiement' && (
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'#e6edf3', marginBottom:8 }}>Affichage du compte de facturation</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.55)', marginBottom:4 }}>
              Modes de paiement connectes a <span style={{ color:'#4da6ff', fontWeight:600 }}>{agence?.nom}</span>
            </div>
            <a href="#" onClick={e=>e.preventDefault()} style={{ fontSize:13, color:'#4da6ff', display:'inline-block', marginBottom:20 }}>Changer de compte de facturation</a>

            <div>
              <a href="#" onClick={e=>e.preventDefault()} style={{ fontSize:13, color:'#4da6ff' }}>En savoir plus sur la gestion des modes de paiement.</a>
            </div>

            <div style={{ fontSize:20, fontWeight:700, color:'#e6edf3', margin:'28px 0 6px' }}>Vos modes de paiement</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.55)', marginBottom:16, lineHeight:1.7 }}>
              Voici les modes de paiement dont vous etes proprietaire. Ils ne sont pas automatiquement affectes a un comptes de facturation.
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:24, marginBottom:16, paddingBottom:14, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={ouvrirAjoutMethode} style={{ background:'none', border:'none', color:'#4da6ff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'Inter,sans-serif', display:'flex', alignItems:'center', gap:6 }}>+ Ajouter une methode de paiement</button>
              <button onClick={init} style={{ background:'none', border:'none', color:'#4da6ff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'Inter,sans-serif', display:'flex', alignItems:'center', gap:6 }}>↻ Actualiser</button>
            </div>

            <div style={{ marginBottom:36 }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr>{['Mode de paiement','Date d expiration ↑','Statut d expiration','Type'].map(h=>(
                  <th key={h} style={{ textAlign:'left', padding:'10px 16px 10px 0', fontSize:12.5, fontWeight:400, color:'rgba(255,255,255,0.45)', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>{h}</th>
                ))}<th style={{ borderBottom:'1px solid rgba(255,255,255,0.1)' }}/></tr></thead>
                {methodes.length > 0 && <tbody>{methodes.map(m=>(
                  <tr key={m.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding:'14px 16px 14px 0' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <OperateurBadge operateurId={m.details?.operateurId} size={32}/>
                        <div>
                          <div style={{ fontSize:14, fontWeight:600, color:'#e6edf3' }}>{m.details?.operateur || 'Mobile Money'}</div>
                          <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>{m.nom_titulaire} &middot; {m.details?.phoneMasque || m.details?.phone} &middot; {m.details?.pays}</div>
                        </div>
                        {m.par_defaut && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:100, background:'rgba(0,200,150,0.1)', color:'#00c896', border:'1px solid rgba(0,200,150,0.2)', marginLeft:4 }}>Par defaut</span>}
                      </div>
                    </td>
                    <td style={{ padding:'14px 16px 14px 0', fontSize:13, color:'rgba(255,255,255,0.4)' }}>&mdash;</td>
                    <td style={{ padding:'14px 16px 14px 0', fontSize:13, color:'rgba(255,255,255,0.4)' }}>Sans expiration</td>
                    <td style={{ padding:'14px 16px 14px 0', fontSize:13, color:'rgba(255,255,255,0.6)' }}>{m.type}</td>
                    <td style={{ padding:'14px 0', textAlign:'right', whiteSpace:'nowrap' }}>
                      {!m.par_defaut && <button onClick={()=>definirParDefaut(m.id)} style={{ background:'none', border:'none', color:'#4da6ff', fontSize:12, cursor:'pointer', fontFamily:'Inter,sans-serif', marginRight:14 }}>Definir par defaut</button>}
                      <button onClick={()=>supprimerMethode(m.id)} style={{ background:'none', border:'none', color:'#ef4444', fontSize:12, cursor:'pointer', fontFamily:'Inter,sans-serif' }}>Supprimer</button>
                    </td>
                  </tr>
                ))}</tbody>}
              </table>
              {methodes.length === 0 && (
                <div style={{ textAlign:'center', padding:'50px' }}>
                  <div style={{ fontSize:14, color:'rgba(255,255,255,0.85)', marginBottom:10 }}>Vous n avez ajoute aucun mode de paiement</div>
                  <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)' }}>Ajoutez un mode de paiement, puis vous pouvez l afficher et le gerer ici.</div>
                </div>
              )}
            </div>

            <div style={{ fontSize:20, fontWeight:700, color:'#e6edf3', marginBottom:6 }}>Modes de paiement par defaut &mdash; {agence?.nom}</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.55)', marginBottom:16, lineHeight:1.7 }}>
              Vous pouvez remplacer le mode de paiement de ce compte en selectionnant les points, puis en selectionnant Remplacer.
            </div>
            <div style={{ marginBottom:16 }}>
              <span style={{ fontSize:12.5, color:'rgba(255,255,255,0.4)' }}>Filtres : </span>
              <span style={{ fontSize:12, fontWeight:600, padding:'4px 10px', borderRadius:100, background:'rgba(255,255,255,0.06)', color:'#e6edf3' }}>Profil de facturation : Tous</span>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr>{['Mode de paiement par defaut','Profil de facturation','Date d expiration ↑','Type'].map(h=>(
                <th key={h} style={{ textAlign:'left', padding:'10px 16px 10px 0', fontSize:12.5, fontWeight:400, color:'rgba(255,255,255,0.45)', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>{h}</th>
              ))}</tr></thead>
              {methodeParDefaut && <tbody>
                <tr>
                  <td style={{ padding:'14px 16px 14px 0' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <OperateurBadge operateurId={methodeParDefaut.details?.operateurId} size={28}/>
                      <div style={{ fontSize:13.5, fontWeight:600, color:'#e6edf3' }}>{methodeParDefaut.details?.operateur || 'Mobile Money'} &middot; {methodeParDefaut.nom_titulaire}</div>
                    </div>
                  </td>
                  <td style={{ padding:'14px 16px 14px 0', fontSize:13, color:'#4da6ff' }}>{agence?.nom}</td>
                  <td style={{ padding:'14px 16px 14px 0', fontSize:13, color:'rgba(255,255,255,0.4)' }}>&mdash;</td>
                  <td style={{ padding:'14px 16px 14px 0', fontSize:13, color:'rgba(255,255,255,0.6)' }}>{methodeParDefaut.type}</td>
                </tr>
              </tbody>}
            </table>
            {!methodeParDefaut && (
              <div style={{ textAlign:'center', padding:'40px' }}>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.3)' }}>Aucun mode de paiement par defaut defini</div>
              </div>
            )}
          </div>
        )}

        {/* PANNEAU LATERAL AJOUT METHODE DE PAIEMENT (style Microsoft admin) */}
        {showAddMethod && (
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:500}} onClick={()=>setShowAddMethod(false)}>
            <div onClick={e=>e.stopPropagation()} style={{position:'absolute',top:0,right:0,height:'100%',width:'100%',maxWidth:440,background:'#0d1117',borderLeft:'1px solid rgba(255,255,255,0.12)',boxShadow:'-8px 0 32px rgba(0,0,0,0.4)',display:'flex',flexDirection:'column',animation:'slideInRight 0.2s ease-out'}}>
              <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                <div style={{fontSize:18,fontWeight:700,color:'#e6edf3'}}>Ajouter une methode de paiement</div>
                <button onClick={()=>setShowAddMethod(false)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)',fontSize:20}}>x</button>
              </div>

              <div style={{padding:'20px 24px',overflowY:'auto',flex:1}}>
                <div style={{fontSize:12.5,color:'rgba(255,255,255,0.4)',lineHeight:1.6,marginBottom:24}}>
                  Ce mode de paiement sera enregistre sur votre compte pour vos prochains abonnements. Rien n est debite automatiquement : chaque paiement doit etre approuve sur votre telephone.
                </div>

                <div style={{fontSize:11.5,fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10}}>Nous prenons en charge les operateurs suivants</div>
                <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24,flexWrap:'wrap'}}>
                  {OPERATEURS.map(op=>(
                    <div key={op.id} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,width:60}}>
                      <OperateurBadge operateurId={op.id} size={36}/>
                    </div>
                  ))}
                </div>

                <div style={{marginBottom:16}}>
                  <label style={{display:'block',fontSize:11.5,fontWeight:600,color:'rgba(255,255,255,0.4)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Pays</label>
                  <Combobox value={newMethod.pays} onChange={choisirPays} options={PAYS.map(p=>p.nom)} placeholder="Rechercher un pays"/>
                </div>

                <div style={{marginBottom:20}}>
                  <label style={{display:'block',fontSize:11.5,fontWeight:600,color:'rgba(255,255,255,0.4)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Operateur Mobile Money</label>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    {OPERATEURS.filter(op=>op.pays.includes(newMethod.pays)).map(op=>(
                      <div key={op.id} onClick={()=>{setNewMethod(p=>({...p,operateur:op.id}));setMethodError('')}}
                        style={{padding:'8px 12px',borderRadius:8,border:`1.5px solid ${newMethod.operateur===op.id?'#4da6ff':'rgba(255,255,255,0.08)'}`,background:newMethod.operateur===op.id?'rgba(77,166,255,0.08)':'rgba(255,255,255,0.02)',cursor:'pointer',transition:'all 0.15s',display:'flex',alignItems:'center',gap:10}}>
                        <OperateurBadge operateurId={op.id} size={26}/>
                        <div style={{fontSize:12.5,fontWeight:600,color:newMethod.operateur===op.id?'#4da6ff':'rgba(255,255,255,0.7)'}}>{op.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{fontSize:11.5,fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10,marginTop:24}}>Coordonnees de paiement</div>

                <div style={{marginBottom:14}}>
                  <label style={{display:'block',fontSize:12.5,color:'rgba(255,255,255,0.6)',marginBottom:6}}>Nom du titulaire du moyen de paiement *</label>
                  <input value={newMethod.nomTitulaire} onChange={e=>{setNewMethod(p=>({...p,nomTitulaire:e.target.value}));setMethodError('')}}
                    placeholder="Ex: Jeanne Testeuse"
                    style={{width:'100%',padding:'10px 12px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:7,color:'#e6edf3',fontFamily:'Inter,sans-serif',fontSize:14,outline:'none',boxSizing:'border-box'}}/>
                </div>

                <div style={{marginBottom:20}}>
                  <label style={{display:'block',fontSize:12.5,color:'rgba(255,255,255,0.6)',marginBottom:6}}>Numero de telephone *</label>
                  <div style={{display:'flex',gap:8}}>
                    <select value={newMethod.indicatif} onChange={e=>setNewMethod(p=>({...p,indicatif:e.target.value}))}
                      style={{width:88,padding:'10px 8px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:7,color:'#e6edf3',fontFamily:'Inter,sans-serif',fontSize:14,outline:'none',colorScheme:'dark'}}>
                      {PAYS.map(p=><option key={p.nom} value={p.indicatif}>+{p.indicatif}</option>)}
                    </select>
                    <input type="tel" value={newMethod.telephone} onChange={e=>{setNewMethod(p=>({...p,telephone:e.target.value}));setMethodError('')}}
                      placeholder="96000000"
                      style={{flex:1,padding:'10px 12px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:7,color:'#e6edf3',fontFamily:'Inter,sans-serif',fontSize:14,outline:'none',colorScheme:'dark',boxSizing:'border-box'}}/>
                  </div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.25)',marginTop:5}}>Indicatif pre-rempli selon le pays, modifiable si besoin</div>
                </div>

                <div style={{fontSize:11.5,fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10,marginTop:24}}>Adresse</div>

                <div style={{marginBottom:14}}>
                  <label style={{display:'block',fontSize:12.5,color:'rgba(255,255,255,0.6)',marginBottom:6}}>Ligne d adresse 1 *</label>
                  <input value={newMethod.adresse1} onChange={e=>{setNewMethod(p=>({...p,adresse1:e.target.value}));setMethodError('')}}
                    style={{width:'100%',padding:'10px 12px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:7,color:'#e6edf3',fontFamily:'Inter,sans-serif',fontSize:14,outline:'none',boxSizing:'border-box'}}/>
                </div>

                <div style={{marginBottom:14}}>
                  <label style={{display:'block',fontSize:12.5,color:'rgba(255,255,255,0.6)',marginBottom:6}}>Ligne d adresse 2 (en option)</label>
                  <input value={newMethod.adresse2} onChange={e=>setNewMethod(p=>({...p,adresse2:e.target.value}))}
                    style={{width:'100%',padding:'10px 12px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:7,color:'#e6edf3',fontFamily:'Inter,sans-serif',fontSize:14,outline:'none',boxSizing:'border-box'}}/>
                </div>

                <div style={{marginBottom:14}}>
                  <label style={{display:'block',fontSize:12.5,color:'rgba(255,255,255,0.6)',marginBottom:6}}>Departement *</label>
                  <Combobox value={newMethod.departement}
                    onChange={d=>{setNewMethod(p=>({...p,departement:d,ville:''}));setMethodError('')}}
                    options={Object.keys(DEPARTEMENTS_VILLES[newMethod.pays]||{})}
                    placeholder="Rechercher un departement" disabled={!newMethod.pays}/>
                </div>

                <div style={{marginBottom:14}}>
                  <label style={{display:'block',fontSize:12.5,color:'rgba(255,255,255,0.6)',marginBottom:6}}>Ville *</label>
                  <Combobox value={newMethod.ville}
                    onChange={v=>{setNewMethod(p=>({...p,ville:v}));setMethodError('')}}
                    options={DEPARTEMENTS_VILLES[newMethod.pays]?.[newMethod.departement] || []}
                    placeholder="Rechercher ou saisir une ville" freeText disabled={!newMethod.departement}/>
                </div>

                <div style={{marginBottom:8}}>
                  <label style={{display:'block',fontSize:12.5,color:'rgba(255,255,255,0.6)',marginBottom:6}}>Code postal (facultatif)</label>
                  <input value={newMethod.codePostal} onChange={e=>setNewMethod(p=>({...p,codePostal:e.target.value}))}
                    style={{width:'50%',padding:'10px 12px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:7,color:'#e6edf3',fontFamily:'Inter,sans-serif',fontSize:14,outline:'none',boxSizing:'border-box'}}/>
                </div>

                {methodError && <div style={{fontSize:12.5,color:'#ef4444',marginTop:10,padding:'8px 12px',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:6}}>{methodError}</div>}
              </div>

              <div style={{display:'flex',gap:8,justifyContent:'flex-end',padding:'16px 24px',borderTop:'1px solid rgba(255,255,255,0.07)'}}>
                <button style={bB} onClick={()=>setShowAddMethod(false)}>Annuler</button>
                <button style={{...bP,opacity:savingMethod?0.6:1}} disabled={savingMethod} onClick={ajouterMethode}>{savingMethod?'Ajout...':'Ajouter'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
