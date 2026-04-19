import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'

const STATUT_CFG = {
  en_attente:{ color:'#f59e0b', bg:'rgba(245,158,11,0.12)', label:'En attente', dot:'#f59e0b' },
  actif:     { color:'#00c896', bg:'rgba(0,200,150,0.12)',  label:'Actif',      dot:'#00c896' },
  expire:    { color:'#6c63ff', bg:'rgba(108,99,255,0.12)', label:'Expire',     dot:'#6c63ff' },
  resilie:   { color:'#ef4444', bg:'rgba(239,68,68,0.12)',  label:'Resilie',    dot:'#ef4444' },
}
const ETAPES = [
  { key:'brouillon',  label:'Brouillon',     desc:'Bail en cours de redaction' },
  { key:'genere',     label:'Genere',        desc:'Contrat genere' },
  { key:'envoye',     label:'Envoye',        desc:'Envoye au locataire' },
  { key:'validation', label:'En validation', desc:'En attente de validation' },
  { key:'valide',     label:'Valide',        desc:'Valide par les deux parties' },
  { key:'signe',      label:'Signe',         desc:'Signe et officialise' },
  { key:'actif',      label:'Actif',         desc:'Bail en cours' },
  { key:'archive',    label:'Archive',       desc:'Bail archive' },
]
const ETAPE_NEXT = { brouillon:'genere', genere:'envoye', envoye:'validation', validation:'valide', valide:'signe', signe:'actif', actif:'archive' }
const TYPE_ICONS = { habitation:'H', commercial:'C', bureau:'B', terrain:'T', garage:'G', autre:'A' }
const TYPES_BAIL = ['habitation','commercial','bureau','terrain','garage','autre']
const MODES_PAI  = ['Mobile Money','Virement bancaire','Especes','Cheque']
const fmt = (n) => n!=null ? Number(n).toLocaleString('fr-FR') : '-'
const addMonths = (d,n) => { const x=new Date(d); x.setMonth(x.getMonth()+n); return x.toISOString().split('T')[0] }

export default function ImolocBaux() {
  const navigate   = useNavigate()
  const [agence,setAgence]       = useState(null)
  const [baux,setBaux]           = useState([])
  const [loading,setLoading]     = useState(true)
  const [search,setSearch]       = useState('')
  const [filterStatut,setFilter] = useState('tous')
  const [filterEtape,setFEtape]  = useState('')
  const [showAdd,setShowAdd]     = useState(false)
  const [selBail,setSelBail]     = useState(null)
  const [detailTab,setTab]       = useState('infos')
  const [step,setStep]           = useState(1)
  const [saving,setSaving]       = useState(false)
  const [paiements,setPaiements] = useState([])
  const [contrat,setContrat]     = useState(null)   // HTML du contrat genere
  const [loadingContrat,setLoadingContrat] = useState(false)
  const [modeleActif,setModeleActif] = useState(null)
  const [biens,setBiens]         = useState([])
  const [locs,setLocs]           = useState([])
  const [bienSearch,setBSrch]    = useState('')
  const [locSearch,setLSrch]     = useState('')
  const [selBienF,setSelBienF]   = useState(null)
  const [selLocF,setSelLocF]     = useState(null)
  const [showWorkflow,setShowWF] = useState(false)
  const [showRenew,setShowRenew] = useState(false)
  const [renewForm,setRenewForm] = useState({ duree_mois:'12', date_debut:'', loyer_mensuel:'' })
  const setRF = (k,v) => setRenewForm(f=>({...f,[k]:v}))
  const [form,setForm] = useState({
    type_bail:'habitation', titre:'',
    date_debut:new Date().toISOString().split('T')[0],
    duree_mois:'12', date_fin:'', type_duree:'determinee',
    delai_preavis_jours:'30', loyer_mensuel:'', devise:'FCFA',
    caution:'', taux_commission:'10', mode_commission:'mensuel',
    mode_paiement:'Mobile Money', renouvellement_auto:false, notes:'',
  })
  const setF = (k,v) => setForm(f=>({...f,[k]:v}))

  useEffect(()=>{ initData() },[]) // eslint-disable-line
  useEffect(()=>{
    if(form.date_debut&&form.duree_mois&&form.type_duree==='determinee')
      setF('date_fin',addMonths(form.date_debut,parseInt(form.duree_mois)||0))
  },[form.date_debut,form.duree_mois,form.type_duree]) // eslint-disable-line

  const initData = async () => {
    setLoading(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      const { data:agList }   = await supabase.from('agences').select('*')
      const ag = agList?.find(a=>a.profile_id===user.id)||agList?.[0]
      setAgence(ag)
      if (!ag?.id) return
      const { data:b } = await supabase.from('baux')
        .select('*, biens(id,nom,ville,type,type_bien), locataires(id,nom,prenom,telephone), proprietaires(id,nom,prenom)')
        .eq('agence_id',ag.id).order('created_at',{ascending:false})
      setBaux(b||[])
      const { data:bi } = await supabase.from('biens').select('id,nom,ville,type,type_bien,statut,loyer,loyer_mensuel,proprietaire_id').eq('agence_id',ag.id).in('statut',['disponible','reserve'])
      setBiens(bi||[])
      const { data:lo } = await supabase.from('locataires').select('id,nom,prenom,telephone,email,statut_global').eq('agence_id',ag.id).eq('statut_global','actif')
      setLocs(lo||[])
    } catch(e){console.error(e)}
    finally{setLoading(false)}
  }

  const loadModeleActif = async () => {
    try {
      const {data:{user}} = await supabase.auth.getUser()
      const {data:agList} = await supabase.from('agences').select('*')
      const ag = agList?.find(a=>a.profile_id===user.id)||agList?.[0]
      if (!ag?.id) return null
      const {data:p} = await supabase.from('parametres_organisation').select('*').eq('agence_id',ag.id).single()
      if (!p?.mes_modeles||!p.modele_actif_id) return null
      const modele = p.mes_modeles.find(m=>m.id===p.modele_actif_id)
      return modele||null
    } catch(e){ return null }
  }

  const genererContrat = async (bail) => {
    setLoadingContrat(true)
    setContrat(null)
    try {
      const modele = await loadModeleActif()
      setModeleActif(modele)
      if (!modele) {
        setContrat('<p style="color:#ef4444;text-align:center;padding:40px">Aucun modele actif. Allez dans Admin Center → Parametres → Modeles de Documents pour activer un modele.</p>')
        return
      }
      const rawContent = modele.content || ''
      const vars = {
        '{{locataire.nom}}':   `${bail.locataires?.prenom||''} ${bail.locataires?.nom||''}`.trim(),
        '{{proprietaire.nom}}':bail.proprietaires?.nom ? `${bail.proprietaires.prenom||''} ${bail.proprietaires.nom}`.trim() : '—',
        '{{bien.adresse}}':    bail.biens?.nom ? `${bail.biens.nom}, ${bail.biens?.ville||''}`.trim() : '—',
        '{{loyer}}':           bail.loyer_mensuel ? Number(bail.loyer_mensuel).toLocaleString('fr-FR') : '—',
        '{{caution}}':         bail.caution ? Number(bail.caution).toLocaleString('fr-FR') : '—',
        '{{date_debut}}':      bail.date_debut ? new Date(bail.date_debut).toLocaleDateString('fr-FR') : '—',
        '{{date_fin}}':        bail.date_fin ? new Date(bail.date_fin).toLocaleDateString('fr-FR') : 'Indefinie',
        '{{duree_mois}}':      String(bail.duree_mois||'—'),
        '{{bien.type}}':       bail.biens?.type||bail.biens?.type_bien||'—',
        '{{devise}}':          bail.devise||'FCFA',
      }
      let html = rawContent
      Object.entries(vars).forEach(([k,v])=>{ html = html.replaceAll(k,`<strong>${v}</strong>`) })
      setContrat(html)
    } catch(e){ setContrat('<p style="color:#ef4444">Erreur generation: '+e.message+'</p>') }
    finally{ setLoadingContrat(false) }
  }

  const exporterPDF = async (bail) => {
    if (!contrat || !modeleActif) return
    // Charger html2pdf si pas deja charge
    if (!window.html2pdf) {
      await new Promise((res,rej)=>{
        const s=document.createElement('script')
        s.src='https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
        s.onload=res; s.onerror=rej
        document.head.appendChild(s)
      })
    }
    const col  = modeleActif.couleur||'#0078d4'
    const nom  = modeleActif.nom_agence||'Agence'
    const logo = modeleActif.logo_url||''
    const sz   = parseInt(modeleActif.taille_logo)||65
    const pied = modeleActif.pied_page||''
    const adr  = modeleActif.adresse||''
    const tel  = modeleActif.telephone||''
    const mail = modeleActif.email||''
    const sl   = modeleActif.slogan||''
    const L    = logo ? `<img src="${logo}" style="height:${sz}px;width:auto;object-fit:contain"/>` : ''
    const cts  = [tel,mail].filter(Boolean).map(x=>`<div>${x}</div>`).join('')
    const foot = pied ? `<div style="padding:10px 32px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:10px;color:#aaa;margin-top:40px"><span>${nom}</span><span>${pied}</span><span>Page 1/1</span></div>` : ''
    const header = `<div style="background:${col};padding:20px 32px;display:flex;align-items:center;justify-content:space-between"><div style="display:flex;align-items:center;gap:14px">${L}<div><div style="font-size:20px;font-weight:700;color:#fff">${nom}</div>${sl?`<div style="font-size:12px;color:rgba(255,255,255,0.8);margin-top:2px">${sl}</div>`:''}</div></div><div style="text-align:right;font-size:12px;color:rgba(255,255,255,0.9);line-height:1.9">${cts}</div></div>${adr?`<div style="background:${col}22;padding:7px 32px;font-size:11px;color:#555;border-bottom:2px solid ${col}">${adr}</div>`:''}`
    const titleHtml = `<div style="text-align:center;margin:28px 0 32px"><div style="font-size:18px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${col};border-bottom:2px solid ${col};display:inline-block;padding-bottom:6px">CONTRAT DE BAIL</div></div>`
    const fullHtml = `<div style="font-family:Arial,sans-serif;background:#fff;color:#333">${header}${titleHtml}<div style="padding:20px 32px;font-size:13.5px;line-height:1.9">${contrat}</div>${foot}</div>`
    const el = document.createElement('div')
    el.innerHTML = fullHtml
    document.body.appendChild(el)
    const filename = 'Bail_'+((bail.biens?.nom||'contrat').replace(/\s+/g,'_'))+'_'+(bail.locataires?.nom||'').replace(/\s+/g,'_')+'.pdf'
    await window.html2pdf().set({
      margin:0, filename, image:{type:'jpeg',quality:0.98},
      html2canvas:{scale:2,useCORS:true},
      jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}
    }).from(el).save()
    document.body.removeChild(el)
    toast.success('PDF telecharge !')
  }

  const loadPaiements = async (id) => {
    const {data} = await supabase.from('paiements').select('*').eq('bail_id',id).order('date_echeance',{ascending:true})
    setPaiements(data||[])
  }

  const createBail = async () => {
    if (!agence?.id||!selBienF||!selLocF||!form.loyer_mensuel) return
    setSaving(true)
    try {
      const loyer = parseFloat(form.loyer_mensuel)||0
      const duree = parseInt(form.duree_mois)||12
      const dateFin = form.type_duree==='determinee'?form.date_fin:null
      const titre = form.titre || ('Bail '+form.type_bail+' - '+selBienF.nom)
      const {data:nb,error:be} = await supabase.from('baux').insert({
        bien_id:selBienF.id, locataire_id:selLocF.id, agence_id:agence.id,
        proprietaire_id:selBienF.proprietaire_id||null,
        statut:'en_attente', etape:'brouillon', titre,
        date_debut:form.date_debut, date_fin:dateFin, duree_mois:duree,
        loyer_mensuel:loyer, devise:form.devise,
        caution:parseFloat(form.caution)||null,
        taux_commission:parseFloat(form.taux_commission)||10,
        mode_commission:form.mode_commission,
        renouvellement_auto:form.renouvellement_auto,
        delai_preavis_jours:parseInt(form.delai_preavis_jours)||30,
        notes:form.notes||null,
      }).select().single()
      if (be) throw new Error('Bail: '+be.message+' ['+be.code+']')
      const echeances = Array.from({length:duree},(_,i)=>({
        bail_id:nb.id, locataire_id:selLocF.id, bien_id:selBienF.id, agence_id:agence.id,
        montant:loyer, devise:form.devise,
        periode_mois:new Date(addMonths(form.date_debut,i)).getMonth()+1,
        periode_annee:new Date(addMonths(form.date_debut,i)).getFullYear(),
        date_echeance:addMonths(form.date_debut,i),
        statut:'en_attente', mode:form.mode_paiement,
      }))
      if (echeances.length) {
        const {error:pe} = await supabase.from('paiements').insert(echeances)
        if (pe) console.warn('[paiements]',pe.message)
      }
      await supabase.from('biens').update({statut:'reserve'}).eq('id',selBienF.id)
      toast.success('Bail cree en brouillon ! '+duree+' echeances generees.')
      setShowAdd(false); resetForm(); initData()
    } catch(e){ console.error(e); toast.error(e.message||'Erreur') }
    finally{setSaving(false)}
  }

  const avancerEtape = async (bail, nouvelleEtape) => {
    setSaving(true)
    try {
      const updates = { etape: nouvelleEtape }
      if (nouvelleEtape==='actif') { updates.statut='actif'; await supabase.from('biens').update({statut:'occupe'}).eq('id',bail.bien_id) }
      if (nouvelleEtape==='signe') { updates.signe_agence=true; updates.signe_locataire=true; updates.date_signature_complete=new Date().toISOString() }
      if (nouvelleEtape==='archive') { updates.statut='expire'; await supabase.from('biens').update({statut:'disponible'}).eq('id',bail.bien_id) }
      const {error} = await supabase.from('baux').update(updates).eq('id',bail.id)
      if (error) throw new Error(error.message)
      toast.success('Bail passe en : '+(ETAPES.find(e=>e.key===nouvelleEtape)?.label||nouvelleEtape))
      setSelBail(b=>b?{...b,...updates}:null)
      initData()
    } catch(e){ toast.error(e.message) }
    finally{setSaving(false)}
  }

  const resilierBail = async (bail) => {
    if (!confirm('Resilier ce bail ?')) return
    await supabase.from('baux').update({statut:'resilie',etape:'archive'}).eq('id',bail.id)
    if (bail.bien_id) await supabase.from('biens').update({statut:'disponible'}).eq('id',bail.bien_id)
    toast.success('Bail resilie.'); setSelBail(null); initData()
  }

  const renouvelerBail = async () => {
    if (!selBail||!renewForm.duree_mois||!renewForm.date_debut||!renewForm.loyer_mensuel) return
    setSaving(true)
    try {
      const duree = parseInt(renewForm.duree_mois)||12
      const loyer = parseFloat(renewForm.loyer_mensuel)||selBail.loyer_mensuel
      const dateFin = addMonths(renewForm.date_debut, duree)
      const {data:nb,error:be} = await supabase.from('baux').insert({
        bien_id:selBail.bien_id, locataire_id:selBail.locataire_id,
        agence_id:agence.id, proprietaire_id:selBail.proprietaire_id||null,
        statut:'en_attente', etape:'brouillon',
        titre:(selBail.titre||'Bail')+' - Renouvellement',
        date_debut:renewForm.date_debut, date_fin:dateFin, duree_mois:duree,
        loyer_mensuel:loyer, devise:selBail.devise||'FCFA',
        caution:selBail.caution, taux_commission:selBail.taux_commission||10,
        mode_commission:selBail.mode_commission||'mensuel',
        renouvellement_auto:selBail.renouvellement_auto,
        delai_preavis_jours:selBail.delai_preavis_jours||30,
        notes:'Renouvellement du bail du '+new Date(selBail.date_debut).toLocaleDateString('fr-FR'),
      }).select().single()
      if (be) throw new Error(be.message)
      const echeances = Array.from({length:duree},(_,i)=>({
        bail_id:nb.id, locataire_id:selBail.locataire_id, bien_id:selBail.bien_id, agence_id:agence.id,
        montant:loyer, devise:selBail.devise||'FCFA',
        periode_mois:new Date(addMonths(renewForm.date_debut,i)).getMonth()+1,
        periode_annee:new Date(addMonths(renewForm.date_debut,i)).getFullYear(),
        date_echeance:addMonths(renewForm.date_debut,i),
        statut:'en_attente', mode:selBail.mode_paiement||'Mobile Money',
      }))
      if (echeances.length) await supabase.from('paiements').insert(echeances)
      await supabase.from('baux').update({statut:'expire',etape:'archive'}).eq('id',selBail.id)
      toast.success('Bail renouvele ! '+duree+' nouvelles echeances.')
      setShowRenew(false); setSelBail(null); initData()
    } catch(e){ toast.error(e.message) }
    finally{setSaving(false)}
  }

  const resetForm = () => {
    setStep(1); setSelBienF(null); setSelLocF(null); setBSrch(''); setLSrch('')
    setForm({ type_bail:'habitation', titre:'', date_debut:new Date().toISOString().split('T')[0],
      duree_mois:'12', date_fin:'', type_duree:'determinee', delai_preavis_jours:'30',
      loyer_mensuel:'', devise:'FCFA', caution:'', taux_commission:'10',
      mode_commission:'mensuel', mode_paiement:'Mobile Money', renouvellement_auto:false, notes:'',
    })
  }

  const now = new Date()
  const in30 = new Date(); in30.setDate(in30.getDate()+30)
  const filtered = baux.filter(b=>{
    const ms = (b.titre||b.biens?.nom||b.locataires?.nom||'').toLowerCase().includes(search.toLowerCase())
    if(filterStatut==='expiration'){const f=b.date_fin?new Date(b.date_fin):null;return ms&&b.statut==='actif'&&f&&f<=in30&&f>=now}
    const fs = filterStatut==='tous'||b.statut===filterStatut
    const fe = !filterEtape||b.etape===filterEtape
    return ms&&fs&&fe
  })
  const filtBiens = biens.filter(b=>(b.nom+' '+(b.ville||'')).toLowerCase().includes(bienSearch.toLowerCase()))
  const filtLocs  = locs.filter(l=>((l.prenom||'')+' '+l.nom+' '+(l.telephone||'')).toLowerCase().includes(locSearch.toLowerCase()))
  const stats = {
    total:baux.length,
    actifs:baux.filter(b=>b.statut==='actif').length,
    brouillons:baux.filter(b=>b.etape==='brouillon').length,
    expiration:baux.filter(b=>{ const f=b.date_fin?new Date(b.date_fin):null; return b.statut==='actif'&&f&&f<=in30&&f>=now }).length,
    revenus:baux.filter(b=>b.statut==='actif').reduce((a,b)=>a+(b.loyer_mensuel||0),0),
  }
  const SBadge = ({s}) => { const c=STATUT_CFG[s]||STATUT_CFG.en_attente; return <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'2px 8px',borderRadius:'100px',fontSize:11,fontWeight:600,background:c.bg,color:c.color}}><span style={{width:6,height:6,borderRadius:'50%',background:c.dot}}/>{c.label}</span> }
  const EBadge = ({e}) => { const cfg=ETAPES.find(x=>x.key===e); if(!cfg) return null; return <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'2px 8px',borderRadius:'100px',fontSize:10,fontWeight:600,background:'rgba(255,255,255,0.07)',color:'rgba(255,255,255,0.5)'}}>{cfg.label}</span> }
  const etapeIdx = (e) => ETAPES.findIndex(x=>x.key===e)

  const css = `
    .bx-page{min-height:100%;animation:bx-in 0.2s ease}
    @keyframes bx-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
    .bx-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:4px;font-size:13px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.6);font-family:Inter,sans-serif;transition:all 0.15s;white-space:nowrap}
    .bx-btn:hover:not(:disabled){background:rgba(255,255,255,0.09);color:#e6edf3}
    .bx-btn-p{background:#0078d4;border-color:#0078d4;color:#fff}.bx-btn-p:hover:not(:disabled){background:#006cc1}
    .bx-btn-g{background:rgba(0,200,150,0.08);border-color:rgba(0,200,150,0.22);color:#00c896}
    .bx-btn-r{background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.22);color:#ef4444}
    .bx-btn-y{background:rgba(245,158,11,0.08);border-color:rgba(245,158,11,0.22);color:#f59e0b}
    .bx-ov{position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:300;display:flex;justify-content:flex-end}
    .bx-panel{background:#161b22;border-left:1px solid rgba(255,255,255,0.07);display:flex;flex-direction:column;animation:bx-sl 0.22s ease;height:100%;overflow:hidden}
    @keyframes bx-sl{from{transform:translateX(100%)}to{transform:translateX(0)}}
    .bx-ph{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0}
    .bx-cls{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);padding:5px;border-radius:4px;display:flex}
    .bx-cls:hover{background:rgba(255,255,255,0.07);color:#e6edf3}
    .bx-sb{flex:1;overflow-y:auto;padding:24px 28px}
    .bx-sb::-webkit-scrollbar{width:4px}.bx-sb::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
    .bx-pf{padding:16px 24px;border-top:1px solid rgba(255,255,255,0.07);display:flex;gap:10px;flex-shrink:0}
    .bx-pfb{flex:1;padding:11px;border-radius:5px;font-size:14px;font-weight:600;cursor:pointer;border:none;font-family:Inter,sans-serif;transition:all 0.15s}
    .bx-pfb-b{background:#0078d4;color:#fff}.bx-pfb-b:hover{background:#006cc1}.bx-pfb-b:disabled{opacity:0.4;cursor:not-allowed}
    .bx-pfb-g{background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);border:1px solid rgba(255,255,255,0.1)}
    .bx-inp{width:100%;padding:9px 13px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:6px;font-family:Inter,sans-serif;font-size:14px;color:#e6edf3;outline:none;transition:border-color 0.15s;color-scheme:dark}
    .bx-inp:focus{border-color:#0078d4}
    .bx-lbl{display:block;font-size:12.5px;font-weight:600;color:rgba(255,255,255,0.5);margin-bottom:7px}
    .bx-g2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
    .bx-g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:16px}
    .bx-fld{margin-bottom:16px}
    .bx-sec{font-size:11.5px;font-weight:700;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.09em;margin:22px 0 14px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.07)}
    .bx-pick{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:8px;border:1.5px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.02);margin-bottom:7px;cursor:pointer;transition:all 0.15s}
    .bx-pick:hover{border-color:rgba(0,120,212,0.25);background:rgba(0,120,212,0.04)}
    .bx-pick.on{border-color:#0078d4;background:rgba(0,120,212,0.08)}
    .bx-stv{width:175px;flex-shrink:0;border-right:1px solid rgba(255,255,255,0.07);padding:18px 0;display:flex;flex-direction:column;gap:2px;background:rgba(0,0,0,0.15)}
    .bx-si{display:flex;align-items:flex-start;gap:11px;padding:11px 18px;cursor:pointer;transition:background 0.15s;border-left:3px solid transparent}
    .bx-si:hover{background:rgba(255,255,255,0.04)}
    .bx-si.active{background:rgba(0,120,212,0.07);border-left-color:#0078d4}
    .bx-si.done{border-left-color:#00c896}
    .bx-sn{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.4)}
    .bx-sn.active{background:#0078d4;color:#fff}
    .bx-sn.done{background:#00c896;color:#fff}
    .bx-sc{flex:1;overflow-y:auto;padding:28px 30px}
    .bx-sc::-webkit-scrollbar{width:4px}
    .bx-ftab{padding:5px 14px;border-radius:100px;font-size:12.5px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.09);background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.45);font-family:Inter,sans-serif;transition:all 0.15s}
    .bx-ftab.on{background:rgba(0,120,212,0.12);border-color:rgba(0,120,212,0.3);color:#4da6ff}
    .bx-tr{width:100%;border-collapse:collapse;table-layout:fixed}
    .bx-tr th{font-size:11.5px;font-weight:600;color:rgba(255,255,255,0.4);padding:9px 14px;text-align:left;background:rgba(255,255,255,0.02);border-bottom:1px solid rgba(255,255,255,0.07)}
    .bx-tr td{padding:12px 14px;font-size:13px;color:rgba(255,255,255,0.65);border-bottom:1px solid rgba(255,255,255,0.04);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .bx-tr tr:hover td{background:rgba(255,255,255,0.025);cursor:pointer}
    .bx-tr tr:last-child td{border-bottom:none}
    .bx-dtab{padding:10px 16px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:none;font-family:Inter,sans-serif;color:rgba(255,255,255,0.45);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.15s}
    .bx-dtab:hover{color:rgba(255,255,255,0.75)}
    .bx-dtab.active{color:#e6edf3;border-bottom-color:#0078d4}
    .bx-blk{margin-bottom:20px}
    .bx-bl{font-size:13px;font-weight:600;color:#e6edf3;margin-bottom:5px}
    .bx-bv{font-size:13.5px;color:rgba(255,255,255,0.5)}
    .bx-dg{display:grid;grid-template-columns:1fr 1fr;gap:0 2.5rem}
    .bx-pr{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:7px;margin-bottom:5px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05)}
    .bx-pr.paye{border-color:rgba(0,200,150,0.18);background:rgba(0,200,150,0.04)}
    .bx-pr.en_retard{border-color:rgba(239,68,68,0.18);background:rgba(239,68,68,0.04)}
    .wf-step{display:flex;align-items:flex-start;gap:14px;padding:14px 0;position:relative}
    .wf-step:not(:last-child)::after{content:'';position:absolute;left:17px;top:48px;width:2px;height:calc(100% - 20px);background:rgba(255,255,255,0.07)}
    .wf-dot{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;border:2px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);z-index:1;color:rgba(255,255,255,0.4)}
    .wf-dot.done{background:rgba(0,200,150,0.15);border-color:#00c896;color:#00c896}
    .wf-dot.current{background:rgba(0,120,212,0.15);border-color:#0078d4;color:#0078d4;box-shadow:0 0 0 3px rgba(0,120,212,0.15)}
    @media(max-width:960px){.bx-g2,.bx-g3{grid-template-columns:1fr}}
    @media(max-width:600px){.bx-stv{display:none}}
  `

  return (
    <>
      <style>{css}</style>

      <div className="bx-page">
        <div style={{display:'flex',alignItems:'center',gap:7,fontSize:12.5,color:'rgba(255,255,255,0.4)',marginBottom:18}}>
          <span style={{cursor:'pointer'}} onClick={()=>navigate('/imoloc')}>Centre Imoloc</span>
          <span style={{color:'rgba(255,255,255,0.2)'}}>›</span>
          <span style={{color:'rgba(255,255,255,0.65)'}}>Baux et Contrats</span>
        </div>
        <div style={{fontSize:26,fontWeight:700,color:'#e6edf3',letterSpacing:'-0.02em',marginBottom:4}}>Baux et Contrats</div>
        <div style={{fontSize:13.5,color:'rgba(255,255,255,0.4)',marginBottom:22}}>{baux.length} bail{baux.length!==1?'x':''} — {agence?.nom||'votre agence'}</div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:24}}>
          {[{l:'Total',v:stats.total,c:'#e6edf3'},{l:'Actifs',v:stats.actifs,c:'#00c896'},{l:'Brouillons',v:stats.brouillons,c:'#f59e0b'},{l:'Expiration <30j',v:stats.expiration,c:stats.expiration>0?'#f59e0b':'rgba(255,255,255,0.3)'},{l:'Revenus/mois',v:fmt(stats.revenus)+' FCFA',c:'#00c896',sm:true}].map((s,i)=>(
            <div key={i} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:'14px 16px'}}>
              <div style={{fontSize:11.5,color:'rgba(255,255,255,0.35)',marginBottom:7}}>{s.l}</div>
              <div style={{fontSize:s.sm?13:20,fontWeight:800,color:s.c}}>{s.v}</div>
            </div>
          ))}
        </div>

        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:14,flexWrap:'wrap'}}>
          <button className="bx-btn bx-btn-p" onClick={()=>{resetForm();setShowAdd(true)}}>+ Nouveau bail</button>
          <button className="bx-btn" onClick={initData}>Actualiser</button>
          <select value={filterEtape} onChange={e=>setFEtape(e.target.value)} style={{padding:'7px 12px',borderRadius:4,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'#e6edf3',fontSize:13,fontFamily:'Inter,sans-serif',colorScheme:'dark'}}>
            <option value="" style={{background:'#161b22'}}>Toutes les etapes</option>
            {ETAPES.map(e=><option key={e.key} value={e.key} style={{background:'#161b22'}}>{e.label}</option>)}
          </select>
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:4,padding:'7px 12px'}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Bien, locataire, titre..." style={{background:'none',border:'none',outline:'none',fontFamily:'Inter,sans-serif',fontSize:13,color:'#e6edf3',width:200}}/>
            {search&&<button onClick={()=>setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',fontSize:16,padding:0}}>x</button>}
          </div>
        </div>
        <div style={{display:'flex',gap:4,marginBottom:16,flexWrap:'wrap'}}>
          {[['tous','Tous'],['actif','Actifs'],['en_attente','En attente'],['expiration','Expiration proche'],['expire','Expires'],['resilie','Resilies']].map(([v,l])=>(
            <button key={v} className={'bx-ftab'+(filterStatut===v?' on':'')} onClick={()=>setFilter(v)}>{l}</button>
          ))}
        </div>

        <div style={{border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,overflow:'hidden'}}>
          <div style={{padding:'9px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)',background:'rgba(255,255,255,0.02)',fontSize:12,color:'rgba(255,255,255,0.3)'}}>{filtered.length} bail{filtered.length!==1?'x':''}</div>
          <div style={{overflowX:'auto'}}>
            <table className="bx-tr">
              <thead><tr>
                <th style={{width:220}}>Bail</th>
                <th style={{width:160}}>Locataire</th>
                <th style={{width:130}}>Loyer</th>
                <th style={{width:100}}>Debut</th>
                <th style={{width:100}}>Fin</th>
                <th style={{width:115}}>Statut</th>
                <th style={{width:115}}>Etape</th>
                <th style={{width:50}}></th>
              </tr></thead>
              <tbody>
                {loading?(
                  <tr><td colSpan={8} style={{textAlign:'center',padding:50,color:'rgba(255,255,255,0.3)'}}>Chargement...</td></tr>
                ):filtered.length===0?(
                  <tr><td colSpan={8}>
                    <div style={{textAlign:'center',padding:'60px 20px'}}>
                      <div style={{fontSize:16,fontWeight:600,color:'rgba(255,255,255,0.4)',marginBottom:16}}>{search?'Aucun resultat':filterStatut!=='tous'?'Aucun bail dans ce filtre':'Aucun bail cree'}</div>
                      {!search&&filterStatut==='tous'&&<button className="bx-btn bx-btn-p" style={{margin:'0 auto'}} onClick={()=>{resetForm();setShowAdd(true)}}>+ Nouveau bail</button>}
                    </div>
                  </td></tr>
                ):filtered.map(b=>{
                  const fin=b.date_fin?new Date(b.date_fin):null
                  const exp=b.statut==='actif'&&fin&&fin<=in30&&fin>=now
                  return(
                    <tr key={b.id} onClick={()=>{setSelBail(b);setTab('infos');setContrat(null);setModeleActif(null);loadPaiements(b.id)}}>
                      <td><div style={{fontWeight:600,color:'#e6edf3',fontSize:13}}>{b.titre||b.biens?.nom||'—'}</div><div style={{fontSize:11.5,color:'rgba(255,255,255,0.3)'}}>{b.biens?.nom||'—'} · {b.biens?.ville||'—'}</div></td>
                      <td style={{fontSize:12.5}}>{b.locataires?.prenom||''} {b.locataires?.nom||'—'}</td>
                      <td style={{fontSize:13,fontWeight:600,color:'#0078d4'}}>{fmt(b.loyer_mensuel)} FCFA</td>
                      <td style={{fontSize:12,color:'rgba(255,255,255,0.5)'}}>{b.date_debut?new Date(b.date_debut).toLocaleDateString('fr-FR'):'—'}</td>
                      <td><span style={{fontSize:12,color:exp?'#f59e0b':'rgba(255,255,255,0.5)'}}>{b.date_fin?new Date(b.date_fin).toLocaleDateString('fr-FR'):'Indef.'}{exp&&' !'}</span></td>
                      <td><SBadge s={b.statut}/></td>
                      <td><EBadge e={b.etape}/></td>
                      <td><button style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',padding:'5px 7px',fontSize:15}} onMouseOver={e=>e.currentTarget.style.color='#e6edf3'} onMouseOut={e=>e.currentTarget.style.color='rgba(255,255,255,0.3)'} onClick={e=>{e.stopPropagation();setSelBail(b);setTab('infos');loadPaiements(b.id)}}>...</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{padding:'10px 16px',borderTop:'1px solid rgba(255,255,255,0.06)',fontSize:12,color:'rgba(255,255,255,0.3)'}}>{filtered.length} bail{filtered.length!==1?'x':''} affiche{filtered.length!==1?'s':''}</div>
        </div>
      </div>

      {showAdd&&(
        <div className="bx-ov" onClick={e=>e.target===e.currentTarget&&(setShowAdd(false)||resetForm())}>
          <div className="bx-panel" style={{width:'min(800px,96vw)'}}>
            <div className="bx-ph"><span style={{fontSize:17,fontWeight:700,color:'#e6edf3'}}>Nouveau bail</span>
              <button className="bx-cls" onClick={()=>{setShowAdd(false);resetForm()}}><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            <div style={{display:'flex',flex:1,overflow:'hidden'}}>
              <div className="bx-stv">
                {[{n:1,l:'Bien',d:'Choisir le bien'},{n:2,l:'Locataire',d:'Choisir'},{n:3,l:'Conditions',d:'Loyer et duree'},{n:4,l:'Recap',d:'Verification'}].map(s=>(
                  <div key={s.n} className={'bx-si'+(step===s.n?' active':step>s.n?' done':'')} onClick={()=>s.n<step&&setStep(s.n)}>
                    <div className={'bx-sn'+(step===s.n?' active':step>s.n?' done':'')}>
                      {step>s.n?'v':s.n}
                    </div>
                    <div><div style={{fontSize:12.5,fontWeight:600,color:step===s.n?'#e6edf3':'rgba(255,255,255,0.5)'}}>{s.l}</div><div style={{fontSize:11,color:'rgba(255,255,255,0.25)',marginTop:2}}>{s.d}</div></div>
                  </div>
                ))}
              </div>
              <div className="bx-sc">
                {step===1&&(<>
                  <div style={{fontSize:18,fontWeight:700,color:'#e6edf3',marginBottom:6}}>Choisir le bien</div>
                  <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:18}}>Selectionnez le bien concerne par ce bail.</div>
                  <input autoFocus className="bx-inp" style={{marginBottom:12}} value={bienSearch} onChange={e=>setBSrch(e.target.value)} placeholder="Filtrer les biens disponibles..."/>
                  {biens.length===0&&<div style={{padding:'14px 16px',borderRadius:8,background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.18)',fontSize:13,color:'rgba(255,255,255,0.45)'}}>Aucun bien disponible. <span style={{color:'#4da6ff',cursor:'pointer'}} onClick={()=>{setShowAdd(false);navigate('/imoloc/biens')}}>Ajouter un bien</span></div>}
                  {filtBiens.map(b=>(
                    <div key={b.id} className={'bx-pick'+(selBienF?.id===b.id?' on':'')} onClick={()=>{setSelBienF(b);setF('loyer_mensuel',String(b.loyer_mensuel||b.loyer||''))}}>
                      <div style={{flex:1}}><div style={{fontSize:13.5,fontWeight:600,color:'#e6edf3'}}>{b.nom}</div><div style={{fontSize:12,color:'rgba(255,255,255,0.35)',marginTop:1}}>{b.ville||'—'} · {fmt(b.loyer_mensuel||b.loyer)} FCFA/mois</div></div>
                      <span style={{color:selBienF?.id===b.id?'#00c896':'rgba(255,255,255,0.15)',fontSize:16}}>{selBienF?.id===b.id?'v':'o'}</span>
                    </div>
                  ))}
                  <div className="bx-sec">Type de bail</div>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
                    {TYPES_BAIL.map(t=>(
                      <div key={t} onClick={()=>setF('type_bail',t)} style={{padding:'7px 14px',borderRadius:7,border:'1.5px solid '+(form.type_bail===t?'#0078d4':'rgba(255,255,255,0.08)'),background:form.type_bail===t?'rgba(0,120,212,0.1)':'rgba(255,255,255,0.02)',cursor:'pointer',fontSize:13,color:form.type_bail===t?'#e6edf3':'rgba(255,255,255,0.5)'}}>{t.charAt(0).toUpperCase()+t.slice(1)}</div>
                    ))}
                  </div>
                  <div className="bx-fld"><label className="bx-lbl">Titre du bail (optionnel)</label><input className="bx-inp" value={form.titre} onChange={e=>setF('titre',e.target.value)} placeholder={'Bail '+form.type_bail+' — '+(selBienF?.nom||'...')}/></div>
                </>)}
                {step===2&&(<>
                  <div style={{fontSize:18,fontWeight:700,color:'#e6edf3',marginBottom:6}}>Choisir le locataire</div>
                  <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:18}}>Selectionnez le locataire pour ce bail.</div>
                  <input autoFocus className="bx-inp" style={{marginBottom:12}} value={locSearch} onChange={e=>setLSrch(e.target.value)} placeholder="Nom, telephone..."/>
                  {locs.length===0&&<div style={{padding:'14px 16px',borderRadius:8,background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.18)',fontSize:13,color:'rgba(255,255,255,0.45)'}}>Aucun locataire actif. <span style={{color:'#4da6ff',cursor:'pointer'}} onClick={()=>{setShowAdd(false);navigate('/imoloc/locataires')}}>Ajouter un locataire</span></div>}
                  {filtLocs.map((l,i)=>{ const cl=['#0078d4','#6c63ff','#00c896','#f59e0b'][i%4]; return(
                    <div key={l.id} className={'bx-pick'+(selLocF?.id===l.id?' on':'')} onClick={()=>setSelLocF(l)}>
                      <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,'+cl+','+cl+'88)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#fff',flexShrink:0}}>{((l.prenom?.[0]||'')+(l.nom?.[0]||'')).toUpperCase()||'?'}</div>
                      <div style={{flex:1}}><div style={{fontSize:13.5,fontWeight:600,color:'#e6edf3'}}>{l.prenom} {l.nom}</div><div style={{fontSize:12,color:'rgba(255,255,255,0.35)',marginTop:1}}>{l.telephone||'Pas de tel'}</div></div>
                      <span style={{color:selLocF?.id===l.id?'#00c896':'rgba(255,255,255,0.15)',fontSize:16}}>{selLocF?.id===l.id?'v':'o'}</span>
                    </div>
                  )})}
                </>)}
                {step===3&&(<>
                  <div style={{fontSize:18,fontWeight:700,color:'#e6edf3',marginBottom:6}}>Conditions financieres</div>
                  <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:18}}>Loyer, duree, caution.</div>
                  <div className="bx-sec">Duree</div>
                  <div className="bx-g2">
                    <div><label className="bx-lbl">Date de debut *</label><input className="bx-inp" type="date" autoFocus value={form.date_debut} onChange={e=>setF('date_debut',e.target.value)}/></div>
                    <div><label className="bx-lbl">Type de duree</label><select className="bx-inp" value={form.type_duree} onChange={e=>setF('type_duree',e.target.value)}><option value="determinee" style={{background:'#161b22'}}>Determinee</option><option value="indeterminee" style={{background:'#161b22'}}>Indeterminee</option></select></div>
                  </div>
                  {form.type_duree==='determinee'&&<div className="bx-g2">
                    <div><label className="bx-lbl">Duree (mois) *</label><input className="bx-inp" type="number" min="1" value={form.duree_mois} onChange={e=>setF('duree_mois',e.target.value)}/></div>
                    <div><label className="bx-lbl">Date de fin (auto)</label><input className="bx-inp" type="date" value={form.date_fin} onChange={e=>setF('date_fin',e.target.value)} style={{opacity:0.7}}/></div>
                  </div>}
                  <div className="bx-sec">Finances</div>
                  <div className="bx-g2">
                    <div><label className="bx-lbl">Loyer mensuel (FCFA) *</label><input className="bx-inp" type="number" min="0" value={form.loyer_mensuel} onChange={e=>setF('loyer_mensuel',e.target.value)}/></div>
                    <div><label className="bx-lbl">Caution (FCFA)</label><input className="bx-inp" type="number" min="0" value={form.caution} onChange={e=>setF('caution',e.target.value)}/></div>
                  </div>
                  <div className="bx-g3">
                    <div><label className="bx-lbl">Commission (%)</label><input className="bx-inp" type="number" min="0" value={form.taux_commission} onChange={e=>setF('taux_commission',e.target.value)}/></div>
                    <div><label className="bx-lbl">Mode commission</label><select className="bx-inp" value={form.mode_commission} onChange={e=>setF('mode_commission',e.target.value)}>{['mensuel','annuel','journalier'].map(m=><option key={m} style={{background:'#161b22'}}>{m}</option>)}</select></div>
                    <div><label className="bx-lbl">Mode paiement</label><select className="bx-inp" value={form.mode_paiement} onChange={e=>setF('mode_paiement',e.target.value)}>{MODES_PAI.map(m=><option key={m} style={{background:'#161b22'}}>{m}</option>)}</select></div>
                  </div>
                  <div className="bx-fld"><label className="bx-lbl">Notes</label><textarea className="bx-inp" rows={2} value={form.notes} onChange={e=>setF('notes',e.target.value)} placeholder="Conditions particulieres..." style={{resize:'vertical',minHeight:60}}/></div>
                </>)}
                {step===4&&(<>
                  <div style={{fontSize:18,fontWeight:700,color:'#e6edf3',marginBottom:6}}>Recapitulatif</div>
                  <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:18}}>Verifiez avant de creer le bail en brouillon.</div>
                  <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,overflow:'hidden',marginBottom:16}}>
                    {[['Bien',selBienF?.nom||'—'],['Locataire',(selLocF?(selLocF.prenom||'')+' '+selLocF.nom:'—').trim()],['Titre',form.titre||('Bail '+form.type_bail+' — '+(selBienF?.nom||'...'))],['Debut',form.date_debut?new Date(form.date_debut).toLocaleDateString('fr-FR'):'—'],['Duree',form.type_duree==='indeterminee'?'Indeterminee':form.duree_mois+' mois'],['Loyer',form.loyer_mensuel?fmt(form.loyer_mensuel)+' FCFA/mois':'Non renseigne'],['Caution',form.caution?fmt(form.caution)+' FCFA':'—'],['Commission',form.taux_commission+'% / '+form.mode_commission],['Paiement',form.mode_paiement]].map(([k,v],i,a)=>(
                      <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'10px 16px',borderBottom:i<a.length-1?'1px solid rgba(255,255,255,0.05)':'none'}}><span style={{fontSize:13,color:'rgba(255,255,255,0.4)',width:130}}>{k}</span><span style={{fontSize:13.5,color:'#e6edf3',fontWeight:500,textAlign:'right'}}>{v}</span></div>
                    ))}
                  </div>
                  <div style={{padding:'12px 14px',borderRadius:8,background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.15)',fontSize:12.5,color:'rgba(255,255,255,0.5)'}}>Le bail sera cree en brouillon. Utilisez le bouton Workflow pour le faire avancer.</div>
                </>)}
              </div>
            </div>
            <div className="bx-pf">
              <button className="bx-pfb bx-pfb-g" onClick={()=>{if(step===1){setShowAdd(false);resetForm()}else setStep(step-1)}}>{step===1?'Annuler':'Precedent'}</button>
              {step<4?<button className="bx-pfb bx-pfb-b" disabled={(step===1&&!selBienF)||(step===2&&!selLocF)||(step===3&&!form.loyer_mensuel)} style={{opacity:(step===1&&!selBienF)||(step===2&&!selLocF)||(step===3&&!form.loyer_mensuel)?0.4:1}} onClick={()=>setStep(step+1)}>Suivant</button>
              :<button className="bx-pfb bx-pfb-b" disabled={saving||!selBienF||!selLocF||!form.loyer_mensuel} style={{opacity:saving||!selBienF||!selLocF||!form.loyer_mensuel?0.4:1}} onClick={createBail}>{saving?'Creation...':'Creer le bail (brouillon)'}</button>}
            </div>
          </div>
        </div>
      )}

      {showWorkflow&&selBail&&(
        <div className="bx-ov" onClick={e=>e.target===e.currentTarget&&setShowWF(false)}>
          <div className="bx-panel" style={{width:'min(520px,96vw)'}}>
            <div className="bx-ph"><span style={{fontSize:17,fontWeight:700,color:'#e6edf3'}}>Workflow du bail</span><button className="bx-cls" onClick={()=>setShowWF(false)}><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg></button></div>
            <div className="bx-sb">
              <div style={{padding:'14px 16px',borderRadius:8,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',marginBottom:24}}>
                <div style={{fontSize:14,fontWeight:600,color:'#e6edf3',marginBottom:3}}>{selBail.titre||selBail.biens?.nom||'—'}</div>
                <div style={{fontSize:12.5,color:'rgba(255,255,255,0.4)'}}>{selBail.locataires?.prenom} {selBail.locataires?.nom} · {fmt(selBail.loyer_mensuel)} FCFA/mois</div>
              </div>
              {ETAPES.map((e,i)=>{
                const iCurrent = etapeIdx(selBail.etape)
                const isDone   = i < iCurrent
                const isCurrent= i === iCurrent
                const isNext   = i === iCurrent + 1
                return (
                  <div key={e.key} className="wf-step">
                    <div className={'wf-dot'+(isDone?' done':isCurrent?' current':'')}>
                      {isDone?'v':(i+1)}
                    </div>
                    <div style={{flex:1,paddingTop:6}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                        <span style={{fontSize:13.5,fontWeight:700,color:isCurrent?'#e6edf3':isDone?'rgba(255,255,255,0.6)':'rgba(255,255,255,0.3)'}}>{e.label}</span>
                        {isCurrent&&<span style={{fontSize:10,padding:'1px 7px',borderRadius:'100px',background:'rgba(0,120,212,0.2)',color:'#4da6ff',fontWeight:600}}>ACTUEL</span>}
                      </div>
                      <div style={{fontSize:12.5,color:'rgba(255,255,255,0.3)'}}>{e.desc}</div>
                      {isNext&&ETAPE_NEXT[selBail.etape]&&(
                        <button className="bx-btn bx-btn-p" style={{marginTop:10,fontSize:12,padding:'6px 14px'}} disabled={saving} onClick={()=>{avancerEtape(selBail,e.key);setShowWF(false)}}>
                          Passer a : {e.label}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="bx-pf">
              {selBail.statut!=='resilie'&&selBail.etape!=='archive'&&(
                <button className="bx-pfb" style={{background:'rgba(239,68,68,0.08)',color:'#ef4444',border:'1px solid rgba(239,68,68,0.22)'}} onClick={()=>{resilierBail(selBail);setShowWF(false)}}>Resilier le bail</button>
              )}
              <button className="bx-pfb bx-pfb-g" onClick={()=>setShowWF(false)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {showRenew&&selBail&&(
        <div className="bx-ov" onClick={e=>e.target===e.currentTarget&&setShowRenew(false)}>
          <div className="bx-panel" style={{width:'min(460px,96vw)'}}>
            <div className="bx-ph"><span style={{fontSize:17,fontWeight:700,color:'#e6edf3'}}>Renouveler le bail</span><button className="bx-cls" onClick={()=>setShowRenew(false)}><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg></button></div>
            <div className="bx-sb">
              <div style={{padding:'14px 16px',borderRadius:8,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',marginBottom:20}}>
                <div style={{fontSize:14,fontWeight:600,color:'#e6edf3',marginBottom:3}}>{selBail.titre||selBail.biens?.nom||'—'}</div>
                <div style={{fontSize:12.5,color:'rgba(255,255,255,0.4)'}}>Expire le {selBail.date_fin?new Date(selBail.date_fin).toLocaleDateString('fr-FR'):'—'}</div>
              </div>
              <div style={{padding:'12px 14px',borderRadius:8,background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.15)',fontSize:12.5,color:'rgba(255,255,255,0.5)',lineHeight:1.7,marginBottom:20}}>
                Un nouveau bail en brouillon sera cree. L ancien bail sera archive.
              </div>
              <div className="bx-g2">
                <div><label className="bx-lbl">Nouvelle date de debut *</label><input autoFocus className="bx-inp" type="date" value={renewForm.date_debut} onChange={e=>setRF('date_debut',e.target.value)}/></div>
                <div><label className="bx-lbl">Nouvelle duree (mois) *</label><input className="bx-inp" type="number" min="1" value={renewForm.duree_mois} onChange={e=>setRF('duree_mois',e.target.value)}/></div>
              </div>
              <div className="bx-fld"><label className="bx-lbl">Nouveau loyer (FCFA) *</label><input className="bx-inp" type="number" min="0" value={renewForm.loyer_mensuel} onChange={e=>setRF('loyer_mensuel',e.target.value)} placeholder={String(selBail.loyer_mensuel)}/></div>
            </div>
            <div className="bx-pf">
              <button className="bx-pfb bx-pfb-g" onClick={()=>setShowRenew(false)}>Annuler</button>
              <button className="bx-pfb bx-pfb-b" disabled={saving||!renewForm.date_debut||!renewForm.loyer_mensuel} style={{opacity:saving||!renewForm.date_debut||!renewForm.loyer_mensuel?0.4:1}} onClick={renouvelerBail}>{saving?'Creation...':'Renouveler le bail'}</button>
            </div>
          </div>
        </div>
      )}

      {selBail&&!showWorkflow&&!showRenew&&(
        <div className="bx-ov" onClick={e=>e.target===e.currentTarget&&setSelBail(null)}>
          <div className="bx-panel" style={{width:'min(640px,96vw)'}}>
            <div style={{padding:'24px 28px 0',borderBottom:'1px solid rgba(255,255,255,0.07)',flexShrink:0}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16}}>
                <div>
                  <div style={{fontSize:18,fontWeight:700,color:'#e6edf3',marginBottom:3}}>{selBail.titre||selBail.biens?.nom||'—'}</div>
                  <div style={{fontSize:13,color:'rgba(255,255,255,0.35)',marginBottom:8}}>{selBail.locataires?.prenom} {selBail.locataires?.nom} · {fmt(selBail.loyer_mensuel)} FCFA/mois</div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}><SBadge s={selBail.statut}/><EBadge e={selBail.etape}/></div>
                </div>
                <button className="bx-cls" onClick={()=>setSelBail(null)}><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
              </div>
              <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
                <button className="bx-btn bx-btn-p" onClick={()=>setShowWF(true)}>Workflow</button>
                {['actif','expire','signe'].includes(selBail.etape)&&<button className="bx-btn bx-btn-y" onClick={()=>{setRenewForm({duree_mois:'12',date_debut:selBail.date_fin||'',loyer_mensuel:String(selBail.loyer_mensuel||'')});setShowRenew(true)}}>Renouveler</button>}
                {selBail.statut!=='resilie'&&selBail.etape!=='archive'&&<button className="bx-btn bx-btn-r" onClick={()=>resilierBail(selBail)}>Resilier</button>}
              </div>
              <div style={{display:'flex'}}>
                {[['infos','Informations'],['paiements','Paiements'],['contrat','Contrat'],['edl','Etat des lieux']].map(([k,l])=>(
                  <button key={k} className={'bx-dtab'+(detailTab===k?' active':'')} onClick={()=>{setTab(k);if(k==='contrat'&&!contrat&&selBail)genererContrat(selBail)}}>{l}</button>
                ))}
              </div>
            </div>
            <div className="bx-sb">
              {detailTab==='infos'&&(
                <><div className="bx-dg">
                  <div>{[['Bien',selBail.biens?.nom],['Locataire',((selBail.locataires?.prenom||'')+' '+(selBail.locataires?.nom||'')).trim()],['Debut',selBail.date_debut?new Date(selBail.date_debut).toLocaleDateString('fr-FR'):null],['Duree',selBail.duree_mois?selBail.duree_mois+' mois':null]].map(([k,v])=>(<div key={k} className="bx-blk"><div className="bx-bl">{k}</div><div className="bx-bv">{v||'—'}</div></div>))}</div>
                  <div>{[['Loyer',fmt(selBail.loyer_mensuel)+' FCFA/mois'],['Caution',selBail.caution?fmt(selBail.caution)+' FCFA':'—'],['Fin',selBail.date_fin?new Date(selBail.date_fin).toLocaleDateString('fr-FR'):'Indefinie'],['Commission',(selBail.taux_commission||10)+'% / '+(selBail.mode_commission||'mensuel')]].map(([k,v])=>(<div key={k} className="bx-blk"><div className="bx-bl">{k}</div><div className="bx-bv">{v||'—'}</div></div>))}</div>
                </div>
                {selBail.notes&&<div style={{padding:'12px 14px',borderRadius:8,background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',fontSize:13.5,color:'rgba(255,255,255,0.45)',fontStyle:'italic'}}>{selBail.notes}</div>}
                </>
              )}
              {detailTab==='paiements'&&(
                <><div style={{display:'flex',justifyContent:'space-between',marginBottom:14}}>
                  <span style={{fontSize:14,fontWeight:700,color:'#e6edf3'}}>{paiements.length} echeances</span>
                  <span style={{fontSize:12,display:'flex',gap:8}}><span style={{color:'#00c896'}}>{paiements.filter(p=>p.statut==='paye').length} payes</span><span style={{color:'#ef4444'}}>{paiements.filter(p=>p.statut==='en_retard').length} retards</span></span>
                </div>
                {paiements.map(p=>{ const PC={paye:{c:'#00c896',l:'Paye'},en_retard:{c:'#ef4444',l:'Retard'},en_attente:{c:'rgba(255,255,255,0.35)',l:'A venir'},partiel:{c:'#f59e0b',l:'Partiel'},annule:{c:'rgba(255,255,255,0.2)',l:'Annule'}}; const cfg=PC[p.statut]||PC.en_attente; const M=['Jan','Fev','Mar','Avr','Mai','Jun','Jul','Aou','Sep','Oct','Nov','Dec']; return(
                  <div key={p.id} className={'bx-pr '+(p.statut||'')}>
                    <div><div style={{fontSize:13,fontWeight:600,color:'#e6edf3',marginBottom:2}}>{p.periode_mois?M[p.periode_mois-1]:'-'} {p.periode_annee}</div><div style={{fontSize:12,color:'rgba(255,255,255,0.35)'}}>{p.date_echeance?new Date(p.date_echeance).toLocaleDateString('fr-FR'):'—'}</div></div>
                    <div style={{display:'flex',alignItems:'center',gap:10}}><span style={{fontSize:13.5,fontWeight:700,color:'#e6edf3'}}>{fmt(p.montant)} FCFA</span><span style={{fontSize:11,fontWeight:600,color:cfg.c,padding:'2px 8px',borderRadius:'100px',background:cfg.c+'18'}}>{cfg.l}</span></div>
                  </div>
                )})}
                </>
              )}
              {detailTab==='contrat'&&(
                <div>
                  {loadingContrat?(
                    <div style={{textAlign:'center',padding:40,color:'rgba(255,255,255,0.3)'}}>Generation du contrat...</div>
                  ):contrat?(
                    <div>
                      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
                        <button className='bx-btn bx-btn-p' onClick={()=>exporterPDF(selBail)}>Telecharger PDF</button>
                        <button className='bx-btn' onClick={()=>{setContrat(null);genererContrat(selBail)}}>Regenerer</button>
                        {!modeleActif&&<div style={{fontSize:12,color:'#ef4444',display:'flex',alignItems:'center'}}>Aucun modele actif</div>}
                        {modeleActif&&<div style={{fontSize:12,color:'rgba(255,255,255,0.4)',display:'flex',alignItems:'center'}}>Modele : {modeleActif.nom}</div>}
                      </div>
                      <div style={{background:'#f5f5f5',borderRadius:8,overflow:'hidden',maxHeight:500,overflowY:'auto'}}>
                        <div style={{transform:'scale(0.7)',transformOrigin:'top left',width:'142.8%',minHeight:400,background:'#fff',padding:'20px 32px',fontFamily:'Arial',fontSize:13.5,lineHeight:1.9,color:'#333'}} dangerouslySetInnerHTML={{__html:contrat}}/>
                      </div>
                    </div>
                  ):(
                    <div style={{textAlign:'center',padding:'40px 20px'}}>
                      <div style={{fontSize:15,fontWeight:600,color:'rgba(255,255,255,0.4)',marginBottom:12}}>Contrat de bail</div>
                      <div style={{fontSize:13,color:'rgba(255,255,255,0.25)',marginBottom:20}}>Generez le contrat a partir du modele actif de votre organisation</div>
                      <button className='bx-btn bx-btn-p' style={{margin:'0 auto'}} onClick={()=>genererContrat(selBail)}>Generer le contrat</button>
                    </div>
                  )}
                </div>
              )}
              {detailTab==='edl'&&(
                <div style={{textAlign:'center',padding:'60px 20px'}}><div style={{fontSize:15,fontWeight:600,color:'rgba(255,255,255,0.4)',marginBottom:8}}>Etat des lieux</div><div style={{fontSize:13,color:'rgba(255,255,255,0.25)'}}>Module etat des lieux — Phase 2C.</div></div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
