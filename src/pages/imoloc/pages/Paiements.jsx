import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../store/authStore'
import toast from 'react-hot-toast'

// statut_paiement enum: en_attente, paye, en_retard, partiel, annule
const S_CFG = {
  en_attente:{ color:'#f59e0b', bg:'rgba(245,158,11,0.12)', label:'A venir',    dot:'#f59e0b' },
  paye:      { color:'#00c896', bg:'rgba(0,200,150,0.12)',  label:'Paye',       dot:'#00c896' },
  en_retard: { color:'#ef4444', bg:'rgba(239,68,68,0.12)',  label:'En retard',  dot:'#ef4444' },
  partiel:   { color:'#6c63ff', bg:'rgba(108,99,255,0.12)', label:'Partiel',    dot:'#6c63ff' },
  annule:    { color:'rgba(255,255,255,0.3)', bg:'rgba(255,255,255,0.05)', label:'Annule', dot:'rgba(255,255,255,0.3)' },
}
const MODES = ['Mobile Money','Virement bancaire','Especes','Cheque']
const MOIS  = ['Janvier','Fevrier','Mars','Avril','Mai','Juin','Juillet','Aout','Septembre','Octobre','Novembre','Decembre']
const fmt   = (n) => n!=null ? Number(n).toLocaleString('fr-FR') : '—'

export default function ImolocPaiements() {
  const navigate   = useNavigate()
  const [agence, setAgence]       = useState(null)
  const [paiements, setPaiements] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterStatut, setFilter] = useState('tous')
  const [filterMois, setFilterMois]   = useState('')
  const [filterAnnee, setFilterAnnee] = useState(String(new Date().getFullYear()))
  const [selPaie, setSelPaie]     = useState(null)
  const [showPay, setShowPay]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [payForm, setPayForm]     = useState({ mode:'Mobile Money', operateur:'', reference:'', date_paiement:'', montant_paye:'', notes:'' })
  const setPF = (k,v) => setPayForm(f=>({...f,[k]:v}))

  useEffect(()=>{ initData() },[]) // eslint-disable-line

  const initData = async () => {
    setLoading(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      const { data:agList }   = await supabase.from('agences').select('*')
      const ag = agList?.find(a=>a.profile_id===user.id) || agList?.[0]
      setAgence(ag)
      if (!ag?.id) return
      const { data } = await supabase
        .from('paiements')
        .select('*, biens(nom,ville), locataires(nom,prenom), baux(date_debut,date_fin,loyer_mensuel)')
        .eq('agence_id', ag.id)
        .order('date_echeance', {ascending:true})
      // Mettre a jour automatiquement en_retard
      const today = new Date()
      const toUpdate = (data||[]).filter(p => p.statut==='en_attente' && p.date_echeance && new Date(p.date_echeance) < today)
      if (toUpdate.length > 0) {
        await supabase.from('paiements').update({ statut:'en_retard' }).in('id', toUpdate.map(p=>p.id))
        toUpdate.forEach(p=>{ p.statut='en_retard' })
      }
      setPaiements(data||[])
    } catch(e){ console.error(e) }
    finally{ setLoading(false) }
  }

  const marquerPaye = async () => {
    if (!selPaie) return
    setSaving(true)
    try {
      const montantPaye = parseFloat(payForm.montant_paye) || selPaie.montant
      const isPartiel   = montantPaye < selPaie.montant
      const { error } = await supabase.from('paiements').update({
        statut:              isPartiel ? 'partiel' : 'paye',
        date_paiement:       payForm.date_paiement || new Date().toISOString(),
        mode_paiement:       payForm.mode,
        operateur:           payForm.operateur || null,
        reference_transaction: payForm.reference || null,
        notes:               payForm.notes || null,
      }).eq('id', selPaie.id)
      if (error) throw new Error(error.message + ' [' + error.code + ']')
      toast.success(isPartiel ? 'Paiement partiel enregistre !' : 'Paiement enregistre !')
      setShowPay(false)
      setSelPaie(null)
      setPayForm({ mode:'Mobile Money', operateur:'', reference:'', date_paiement:'', montant_paye:'', notes:'' })
      initData()
    } catch(e){ toast.error(e.message) }
    finally{ setSaving(false) }
  }

  const annulerPaiement = async (p) => {
    if (!confirm('Annuler ce paiement ?')) return
    const { error } = await supabase.from('paiements').update({ statut:'annule' }).eq('id', p.id)
    if (error) { toast.error(error.message); return }
    toast.success('Paiement annule'); setSelPaie(null); initData()
  }

  const remettreEnAttente = async (p) => {
    if (!confirm('Remettre en attente ?')) return
    const { error } = await supabase.from('paiements').update({ statut:'en_attente', date_paiement:null, reference_transaction:null }).eq('id', p.id)
    if (error) { toast.error(error.message); return }
    toast.success('Remis en attente'); setSelPaie(x=>x?{...x,statut:'en_attente'}:null); initData()
  }

  const annees = [...new Set(paiements.map(p=>p.periode_annee).filter(Boolean))].sort((a,b)=>b-a)

  const filtered = paiements.filter(p => {
    const ms = `${p.biens?.nom||''} ${p.locataires?.prenom||''} ${p.locataires?.nom||''}`.toLowerCase().includes(search.toLowerCase())
    const fs = filterStatut==='tous' || p.statut===filterStatut
    const fm = !filterMois || p.periode_mois===parseInt(filterMois)
    const fa = !filterAnnee || p.periode_annee===parseInt(filterAnnee)
    return ms && fs && fm && fa
  })

  const stats = {
    attendu:  paiements.filter(p=>p.statut!=='annule').reduce((a,p)=>a+(p.montant||0),0),
    encaisse: paiements.filter(p=>p.statut==='paye'||p.statut==='partiel').reduce((a,p)=>a+(p.montant||0),0),
    retard:   paiements.filter(p=>p.statut==='en_retard').length,
    attente:  paiements.filter(p=>p.statut==='en_attente').length,
  }

  const SBadge = ({s}) => { const c=S_CFG[s]||S_CFG.en_attente; return <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'2px 9px',borderRadius:'100px',fontSize:11,fontWeight:600,background:c.bg,color:c.color}}><span style={{width:6,height:6,borderRadius:'50%',background:c.dot,flexShrink:0}}/>{c.label}</span> }

  return (
    <>
      <style>{`
        .px-page{min-height:100%;animation:px-in 0.2s ease}
        @keyframes px-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        .px-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:4px;font-size:13px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.6);font-family:Inter,sans-serif;transition:all 0.15s;white-space:nowrap}
        .px-btn:hover:not(:disabled){background:rgba(255,255,255,0.09);color:#e6edf3}
        .px-btn-p{background:#0078d4;border-color:#0078d4;color:#fff}.px-btn-p:hover:not(:disabled){background:#006cc1}
        .px-btn-g{background:rgba(0,200,150,0.08);border-color:rgba(0,200,150,0.22);color:#00c896}
        .px-btn-r{background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.22);color:#ef4444}
        .px-btn-y{background:rgba(245,158,11,0.08);border-color:rgba(245,158,11,0.22);color:#f59e0b}
        .px-ov{position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:300;display:flex;justify-content:flex-end}
        .px-panel{background:#161b22;border-left:1px solid rgba(255,255,255,0.07);display:flex;flex-direction:column;animation:px-sl 0.22s ease;height:100%;overflow:hidden}
        @keyframes px-sl{from{transform:translateX(100%)}to{transform:translateX(0)}}
        .px-inp{width:100%;padding:9px 13px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:6px;font-family:Inter,sans-serif;font-size:14px;color:#e6edf3;outline:none;transition:border-color 0.15s;color-scheme:dark}
        .px-inp:focus{border-color:#0078d4}
        .px-lbl{display:block;font-size:12.5px;font-weight:600;color:rgba(255,255,255,0.5);margin-bottom:7px}
        .px-g2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
        .px-fld{margin-bottom:14px}
        .px-ftab{padding:5px 14px;border-radius:100px;font-size:12.5px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.09);background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.45);font-family:Inter,sans-serif;transition:all 0.15s}
        .px-ftab.on{background:rgba(0,120,212,0.12);border-color:rgba(0,120,212,0.3);color:#4da6ff}
        .px-row{display:flex;align-items:center;justify-content:space-between;padding:13px 18px;border-bottom:1px solid rgba(255,255,255,0.04);transition:background 0.08s;cursor:pointer}
        .px-row:hover{background:rgba(255,255,255,0.025)}
        .px-row:last-child{border-bottom:none}
        .px-row.retard{border-left:3px solid #ef4444}
        .px-row.paye{border-left:3px solid #00c896}
        @media(max-width:700px){.px-g2{grid-template-columns:1fr}}
      `}</style>

      <div className='px-page'>
        <div style={{display:'flex',alignItems:'center',gap:7,fontSize:12.5,color:'rgba(255,255,255,0.4)',marginBottom:18}}>
          <span style={{cursor:'pointer'}} onClick={()=>navigate('/imoloc')}>Centre Imoloc</span>
          <span style={{color:'rgba(255,255,255,0.2)'}}>›</span>
          <span style={{color:'rgba(255,255,255,0.65)'}}>Paiements</span>
        </div>
        <div style={{fontSize:26,fontWeight:700,color:'#e6edf3',letterSpacing:'-0.02em',marginBottom:4}}>Paiements</div>
        <div style={{fontSize:13.5,color:'rgba(255,255,255,0.4)',marginBottom:22}}>{paiements.length} echeance{paiements.length!==1?'s':''} — {agence?.nom||'votre agence'}</div>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
          {[
            {ic:'💰',l:'Total attendu',     v:fmt(stats.attendu)+' FCFA',   c:'#e6edf3',sm:true},
            {ic:'✅',l:'Encaisse',          v:fmt(stats.encaisse)+' FCFA',  c:'#00c896',sm:true},
            {ic:'⚠️',l:'En retard',         v:stats.retard,                  c:stats.retard>0?'#ef4444':'rgba(255,255,255,0.3)'},
            {ic:'⏳',l:'A venir',           v:stats.attente,                 c:'#f59e0b'},
          ].map((s,i)=>(
            <div key={i} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:'14px 16px'}}>
              <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:7}}><span style={{fontSize:15}}>{s.ic}</span><span style={{fontSize:11.5,color:'rgba(255,255,255,0.35)'}}>{s.l}</span></div>
              <div style={{fontSize:s.sm?14:22,fontWeight:800,color:s.c}}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,flexWrap:'wrap'}}>
          <button className='px-btn' onClick={initData}>🔄</button>
          {/* Filtre annee */}
          <select value={filterAnnee} onChange={e=>setFilterAnnee(e.target.value)} style={{padding:'6px 12px',borderRadius:6,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'#e6edf3',fontSize:13,fontFamily:'Inter,sans-serif',cursor:'pointer',colorScheme:'dark'}}>
            <option value='' style={{background:'#161b22'}}>Toutes les annees</option>
            {annees.map(a=><option key={a} value={a} style={{background:'#161b22'}}>{a}</option>)}
          </select>
          {/* Filtre mois */}
          <select value={filterMois} onChange={e=>setFilterMois(e.target.value)} style={{padding:'6px 12px',borderRadius:6,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'#e6edf3',fontSize:13,fontFamily:'Inter,sans-serif',cursor:'pointer',colorScheme:'dark'}}>
            <option value='' style={{background:'#161b22'}}>Tous les mois</option>
            {MOIS.map((m,i)=><option key={i+1} value={i+1} style={{background:'#161b22'}}>{m}</option>)}
          </select>
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:4,padding:'7px 12px'}}>
            <svg width='13' height='13' fill='none' stroke='rgba(255,255,255,0.3)' strokeWidth='1.5' viewBox='0 0 24 24'><path strokeLinecap='round' d='M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z'/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Bien, locataire...' style={{background:'none',border:'none',outline:'none',fontFamily:'Inter,sans-serif',fontSize:13,color:'#e6edf3',width:180}}/>
            {search&&<button onClick={()=>setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',fontSize:16,padding:0}}>×</button>}
          </div>
        </div>
        <div style={{display:'flex',gap:4,marginBottom:16,flexWrap:'wrap'}}>
          {[['tous','Tous'],['en_attente','A venir'],['en_retard','En retard'],['paye','Payes'],['partiel','Partiels'],['annule','Annules']].map(([v,l])=>(
            <button key={v} className={'px-ftab'+(filterStatut===v?' on':'')} onClick={()=>setFilter(v)}>{l}</button>
          ))}
        </div>

        {/* Liste */}
        <div style={{border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,overflow:'hidden'}}>
          <div style={{padding:'9px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)',background:'rgba(255,255,255,0.02)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:12,color:'rgba(255,255,255,0.3)'}}>{filtered.length} echeance{filtered.length!==1?'s':''}</span>
            <span style={{fontSize:12,color:'rgba(255,255,255,0.3)'}}>Total filtre : {fmt(filtered.reduce((a,p)=>a+(p.montant||0),0))} FCFA</span>
          </div>
          {loading ? (
            <div style={{textAlign:'center',padding:50,color:'rgba(255,255,255,0.3)'}}>Chargement...</div>
          ) : filtered.length===0 ? (
            <div style={{textAlign:'center',padding:'60px 20px'}}>
              <div style={{fontSize:44,marginBottom:14,opacity:0.3}}>💰</div>
              <div style={{fontSize:16,fontWeight:600,color:'rgba(255,255,255,0.4)'}}>Aucun paiement dans ce filtre</div>
            </div>
          ) : filtered.map(p => {
            const cfg = S_CFG[p.statut]||S_CFG.en_attente
            const moisLabel = p.periode_mois ? MOIS[p.periode_mois-1] : '—'
            return (
              <div key={p.id} className={'px-row '+(p.statut||'')} onClick={()=>setSelPaie(p)}>
                <div style={{display:'flex',alignItems:'center',gap:14,flex:1,minWidth:0}}>
                  <div style={{width:42,height:42,borderRadius:10,background:cfg.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <span style={{fontSize:18}}>{p.statut==='paye'?'✅':p.statut==='en_retard'?'🔴':'⏳'}</span>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                      <span style={{fontSize:13.5,fontWeight:600,color:'#e6edf3'}}>{moisLabel} {p.periode_annee}</span>
                      <SBadge s={p.statut}/>
                    </div>
                    <div style={{fontSize:12.5,color:'rgba(255,255,255,0.35)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      🏠 {p.biens?.nom||'—'} · 👤 {p.locataires?.prenom||''} {p.locataires?.nom||'—'}
                    </div>
                    <div style={{fontSize:12,color:'rgba(255,255,255,0.25)',marginTop:2}}>
                      Echeance : {p.date_echeance?new Date(p.date_echeance).toLocaleDateString('fr-FR'):'—'}
                      {p.statut==='en_retard'&&p.date_echeance&&' · Retard : '+Math.floor((new Date()-new Date(p.date_echeance))/(1000*60*60*24))+' j'}
                    </div>
                  </div>
                </div>
                <div style={{textAlign:'right',flexShrink:0,marginLeft:16}}>
                  <div style={{fontSize:16,fontWeight:800,color:p.statut==='paye'?'#00c896':p.statut==='en_retard'?'#ef4444':'#e6edf3'}}>{fmt(p.montant)} FCFA</div>
                  {p.statut==='paye'&&p.date_paiement&&<div style={{fontSize:11.5,color:'rgba(255,255,255,0.3)',marginTop:2}}>Paye le {new Date(p.date_paiement).toLocaleDateString('fr-FR')}</div>}
                  {['en_attente','en_retard','partiel'].includes(p.statut)&&(
                    <button className='px-btn px-btn-g' style={{marginTop:6,padding:'5px 12px',fontSize:12}} onClick={e=>{e.stopPropagation();setSelPaie(p);setPayForm({mode:'Mobile Money',operateur:'',reference:'',date_paiement:new Date().toISOString().split('T')[0],montant_paye:String(p.montant),notes:''});setShowPay(true)}}> Encaisser</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── PANEL ENCAISSER ── */}
      {showPay&&selPaie&&(
        <div className='px-ov' onClick={e=>e.target===e.currentTarget&&setShowPay(false)}>
          <div className='px-panel' style={{width:'min(460px,96vw)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px',borderBottom:'1px solid rgba(255,255,255,0.07)',flexShrink:0}}>
              <div>
                <div style={{fontSize:17,fontWeight:700,color:'#e6edf3'}}>Encaisser le paiement</div>
                <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginTop:3}}>{MOIS[(selPaie.periode_mois||1)-1]} {selPaie.periode_annee} · {fmt(selPaie.montant)} FCFA</div>
              </div>
              <button onClick={()=>setShowPay(false)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)',padding:5,borderRadius:4,display:'flex'}}><svg width='18' height='18' fill='none' stroke='currentColor' strokeWidth='1.5' viewBox='0 0 24 24'><path strokeLinecap='round' d='M6 18L18 6M6 6l12 12'/></svg></button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'24px 28px'}}>
              <div style={{padding:'12px 16px',borderRadius:8,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',marginBottom:20}}>
                <div style={{fontSize:13,color:'rgba(255,255,255,0.5)',marginBottom:3}}>🏠 {selPaie.biens?.nom||'—'}</div>
                <div style={{fontSize:13,color:'rgba(255,255,255,0.5)'}}>👤 {selPaie.locataires?.prenom||''} {selPaie.locataires?.nom||'—'}</div>
              </div>
              <div className='px-fld'>
                <label className='px-lbl'>Montant encaisse (FCFA)</label>
                <input autoFocus className='px-inp' type='number' min='0' value={payForm.montant_paye} onChange={e=>setPF('montant_paye',e.target.value)}/>
                {payForm.montant_paye && parseFloat(payForm.montant_paye) < selPaie.montant && <div style={{fontSize:12,color:'#6c63ff',marginTop:5}}>⚠️ Montant partiel — sera marque comme Partiel</div>}
              </div>
              <div className='px-g2'>
                <div>
                  <label className='px-lbl'>Mode de paiement</label>
                  <select className='px-inp' value={payForm.mode} onChange={e=>setPF('mode',e.target.value)}>
                    {MODES.map(m=><option key={m} style={{background:'#161b22'}}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className='px-lbl'>Date de paiement</label>
                  <input className='px-inp' type='date' value={payForm.date_paiement} onChange={e=>setPF('date_paiement',e.target.value)}/>
                </div>
              </div>
              {(payForm.mode==='Mobile Money')&&(
                <div className='px-g2'>
                  <div><label className='px-lbl'>Operateur</label><input className='px-inp' value={payForm.operateur} onChange={e=>setPF('operateur',e.target.value)} placeholder='MTN / Moov...'/></div>
                  <div><label className='px-lbl'>Reference transaction</label><input className='px-inp' value={payForm.reference} onChange={e=>setPF('reference',e.target.value)} placeholder='TXN...'/></div>
                </div>
              )}
              {(payForm.mode!=='Mobile Money')&&(
                <div className='px-fld'><label className='px-lbl'>Reference</label><input className='px-inp' value={payForm.reference} onChange={e=>setPF('reference',e.target.value)} placeholder='N° cheque, virement...'/></div>
              )}
              <div className='px-fld'><label className='px-lbl'>Notes (optionnel)</label><textarea className='px-inp' rows={2} value={payForm.notes} onChange={e=>setPF('notes',e.target.value)} placeholder='Remarques...' style={{resize:'vertical',minHeight:60}}/></div>
            </div>
            <div style={{padding:'16px 24px',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',gap:10,flexShrink:0}}>
              <button onClick={()=>setShowPay(false)} style={{flex:1,padding:11,borderRadius:5,fontSize:14,fontWeight:600,cursor:'pointer',background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.6)',border:'1px solid rgba(255,255,255,0.1)',fontFamily:'Inter,sans-serif'}}>Annuler</button>
              <button onClick={marquerPaye} disabled={saving||!payForm.montant_paye} style={{flex:2,padding:11,borderRadius:5,fontSize:14,fontWeight:600,cursor:'pointer',background:'#00c896',color:'#fff',border:'none',fontFamily:'Inter,sans-serif',opacity:saving||!payForm.montant_paye?0.4:1}}>{saving?'Enregistrement...':'✅ Confirmer le paiement'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DRAWER DETAIL ── */}
      {selPaie&&!showPay&&(
        <div className='px-ov' onClick={e=>e.target===e.currentTarget&&setSelPaie(null)}>
          <div className='px-panel' style={{width:'min(500px,96vw)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px',borderBottom:'1px solid rgba(255,255,255,0.07)',flexShrink:0}}>
              <div>
                <div style={{fontSize:17,fontWeight:700,color:'#e6edf3'}}>{MOIS[(selPaie.periode_mois||1)-1]} {selPaie.periode_annee}</div>
                <div style={{marginTop:6}}><SBadge s={selPaie.statut}/></div>
              </div>
              <button onClick={()=>setSelPaie(null)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)',padding:5,borderRadius:4,display:'flex'}}><svg width='18' height='18' fill='none' stroke='currentColor' strokeWidth='1.5' viewBox='0 0 24 24'><path strokeLinecap='round' d='M6 18L18 6M6 6l12 12'/></svg></button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'24px 28px'}}>
              {/* Montant */}
              <div style={{textAlign:'center',padding:'20px 0 28px',borderBottom:'1px solid rgba(255,255,255,0.07)',marginBottom:24}}>
                <div style={{fontSize:36,fontWeight:800,color:selPaie.statut==='paye'?'#00c896':selPaie.statut==='en_retard'?'#ef4444':'#e6edf3',marginBottom:6}}>{fmt(selPaie.montant)} FCFA</div>
                <div style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>Echeance du {selPaie.date_echeance?new Date(selPaie.date_echeance).toLocaleDateString('fr-FR'):'—'}</div>
                {selPaie.statut==='en_retard'&&selPaie.date_echeance&&<div style={{fontSize:12.5,color:'#ef4444',marginTop:4}}>⚠️ Retard de {Math.floor((new Date()-new Date(selPaie.date_echeance))/(1000*60*60*24))} jours</div>}
              </div>
              {/* Infos */}
              {[['Bien',`🏠 ${selPaie.biens?.nom||'—'}`],['Locataire',`👤 ${selPaie.locataires?.prenom||''} ${selPaie.locataires?.nom||'—'}`],['Periode',`${MOIS[(selPaie.periode_mois||1)-1]} ${selPaie.periode_annee||'—'}`],['Mode bail',selPaie.mode||'—'],['Ref. transaction',selPaie.reference_transaction||null],['Operateur',selPaie.operateur||null],['Date paiement',selPaie.date_paiement?new Date(selPaie.date_paiement).toLocaleDateString('fr-FR'):null],['Notes',selPaie.notes||null]].map(([k,v])=>v?(
                <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                  <span style={{fontSize:13,color:'rgba(255,255,255,0.4)',width:140}}>{k}</span>
                  <span style={{fontSize:13.5,color:'#e6edf3',fontWeight:500,textAlign:'right'}}>{v}</span>
                </div>
              ):null)}
              {/* Actions */}
              <div style={{marginTop:24,display:'flex',flexDirection:'column',gap:8}}>
                {['en_attente','en_retard','partiel'].includes(selPaie.statut)&&(
                  <button className='px-btn px-btn-g' style={{justifyContent:'center',padding:'11px'}} onClick={()=>{setPayForm({mode:'Mobile Money',operateur:'',reference:'',date_paiement:new Date().toISOString().split('T')[0],montant_paye:String(selPaie.montant),notes:''});setShowPay(true)}}>✅ Encaisser ce paiement</button>
                )}
                {selPaie.statut==='paye'&&(
                  <button className='px-btn px-btn-y' style={{justifyContent:'center',padding:'11px'}} onClick={()=>remettreEnAttente(selPaie)}>↩️ Remettre en attente</button>
                )}
                {selPaie.statut!=='annule'&&selPaie.statut!=='paye'&&(
                  <button className='px-btn px-btn-r' style={{justifyContent:'center',padding:'11px'}} onClick={()=>annulerPaiement(selPaie)}>🚫 Annuler ce paiement</button>
                )}
                <button className='px-btn' style={{justifyContent:'center',padding:'11px'}} onClick={()=>{setSelPaie(null);navigate('/imoloc/baux')}}>📄 Voir le bail associe</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}