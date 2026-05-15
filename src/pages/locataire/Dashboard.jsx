import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const TABS = [
  { id:'accueil',    icon:'🏠', label:'Accueil' },
  { id:'paiements',  icon:'💰', label:'Paiements' },
  { id:'documents',  icon:'📄', label:'Documents' },
  { id:'plaintes',   icon:'📢', label:'Plaintes' },
  { id:'profil',     icon:'👤', label:'Profil' },
]

const STATUT_PAY = {
  paye:       { color:'#10b981', bg:'rgba(16,185,129,0.1)', label:'Paye' },
  en_attente: { color:'#f59e0b', bg:'rgba(245,158,11,0.1)', label:'En attente' },
  en_retard:  { color:'#ef4444', bg:'rgba(239,68,68,0.1)',  label:'En retard' },
  partiel:    { color:'#8b5cf6', bg:'rgba(139,92,246,0.1)', label:'Partiel' },
}

function Badge({ statut }) {
  const c = STATUT_PAY[statut] || STATUT_PAY.en_attente
  return <span style={{fontSize:11,padding:'2px 9px',borderRadius:100,fontWeight:600,background:c.bg,color:c.color,border:`1px solid ${c.color}33`}}>{c.label}</span>
}

export default function DashboardLocataire() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('accueil')
  const [loading, setLoading] = useState(true)
  const [locataire, setLocataire] = useState(null)
  const [bail, setBail] = useState(null)
  const [paiements, setPaiements] = useState([])
  const [plaintes, setPlaintes] = useState([])
  const [notifications, setNotifications] = useState([])
  const [showPayModal, setShowPayModal] = useState(false)
  const [showPlainteModal, setShowPlainteModal] = useState(false)
  const [payPhone, setPayPhone] = useState("")
  const [payCorr, setPayCorr] = useState("MTN_MOMO_BEN")
  const [payStatus, setPayStatus] = useState(null)
  const [paying, setPaying] = useState(false)
  const [plainteForm, setPlainteForm] = useState({ titre:"", description:"", categorie:"maintenance" })
  const [submitting, setSubmitting] = useState(false)
  const [unread, setUnread] = useState(0)

  useEffect(() => { initData() }, [])

  const initData = async () => {
    setLoading(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }

      const { data:loc } = await supabase.from('locataires')
        .select('*').eq('user_id', user.id).maybeSingle()

      if (!loc) {
        const { data:locByEmail } = await supabase.from('locataires')
          .select('*').eq('email', user.email).maybeSingle()
        setLocataire(locByEmail)
        if (locByEmail?.id) await loadBail(locByEmail.id, user.id)
      } else {
        setLocataire(loc)
        await loadBail(loc.id, user.id)
      }

      const { data:notifs } = await supabase.from('notifications')
        .select('*').eq('profile_id', user.id).order('created_at',{ascending:false}).limit(20)
      setNotifications(notifs||[])
      setUnread((notifs||[]).filter(n=>!n.lu).length)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const loadBail = async (locId, userId) => {
    const { data:b } = await supabase.from('baux')
      .select('*,biens(*),agences(*)')
      .eq('locataire_id', locId)
      .eq('statut','actif')
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle()
    setBail(b)
    if (b?.id) {
      const { data:p } = await supabase.from('paiements')
        .select('*').eq('bail_id', b.id).order('date_echeance',{ascending:false})
      setPaiements(p||[])
    }
    if (locId) {
      const { data:pl } = await supabase.from('plaintes')
        .select('*').eq('locataire_id', locId).order('created_at',{ascending:false})
      setPlaintes(pl||[])
    }
  }

  const paiementDuMois = () => {
    if (!paiements.length) return null
    const now = new Date()
    return paiements.find(p => {
      const d = new Date(p.date_echeance)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }) || paiements[0]
  }

  const payerLoyer = async () => {
    if (!payPhone || payPhone.length < 8) { toast.error('Numero invalide'); return }
    if (!bail) { toast.error('Aucun bail actif'); return }
    setPaying(true); setPayStatus('pending')
    try {
      const { data, error } = await supabase.functions.invoke('pawapay-deposit', {
        body: {
          amount: bail.loyer_mensuel,
          currency: 'XOF',
          phone: payPhone.replace(/\s/g,''),
          correspondent: payCorr,
          agence_id: bail.agence_id,
          plan_id: 'loyer',
          description: 'Loyer ' + (bail.biens?.nom||'')
        }
      })
      if (error || !data?.success) { toast.error(data?.error || 'Erreur'); setPayStatus('failed'); setPaying(false); return }
      toast.success('Demande envoyee ! Approuvez sur votre telephone.')
      pollPay(data.depositId)
    } catch(e) { toast.error(e.message); setPayStatus('failed'); setPaying(false) }
  }

  const pollPay = (depId) => {
    let n = 0
    const iv = setInterval(async () => {
      n++
      try {
        const { data } = await supabase.functions.invoke('pawapay-status', { body:{ depositId:depId } })
        if (data?.status === 'COMPLETED') {
          clearInterval(iv)
          await supabase.from('paiements').insert({
            bail_id: bail.id, locataire_id: locataire?.id,
            bien_id: bail.bien_id, agence_id: bail.agence_id,
            montant: bail.loyer_mensuel, devise: bail.devise||'FCFA',
            periode_mois: new Date().getMonth()+1, periode_annee: new Date().getFullYear(),
            date_echeance: new Date().toISOString().split('T')[0],
            date_paiement: new Date().toISOString(),
            statut: 'paye', mode_paiement: 'Mobile Money',
            operateur: payCorr, reference_transaction: depId,
          })
          setPayStatus('success'); setPaying(false)
          toast.success('Paiement confirme !')
          setTimeout(()=>{ setShowPayModal(false); setPayStatus(null); initData() }, 2000)
        } else if (data?.status==='FAILED'||data?.status==='REJECTED') {
          clearInterval(iv); setPayStatus('failed'); setPaying(false)
          toast.error('Paiement echoue')
        } else if (n>=20) {
          clearInterval(iv); setPayStatus('failed'); setPaying(false)
          toast.error('Timeout - verifez votre telephone')
        }
      } catch(e) { console.error(e) }
    }, 5000)
  }

  const soumettrePlaynte = async () => {
    if (!plainteForm.titre || !plainteForm.description) { toast.error('Remplissez tous les champs'); return }
    setSubmitting(true)
    try {
      await supabase.from('plaintes').insert({
        locataire_id: locataire?.id,
        bien_id: bail?.bien_id,
        bail_id: bail?.id,
        agence_id: bail?.agence_id,
        titre: plainteForm.titre,
        description: plainteForm.description,
        categorie: plainteForm.categorie,
        statut: 'ouverte', priorite: 'normale',
      })
      toast.success('Plainte soumise avec succes !')
      setShowPlainteModal(false)
      setPlainteForm({ titre:"", description:"", categorie:"maintenance" })
      initData()
    } catch(e) { toast.error(e.message) }
    finally { setSubmitting(false) }
  }

  const marquerLu = async (id) => {
    await supabase.from('notifications').update({lu:true}).eq('id',id)
    setNotifications(prev => prev.map(n => n.id===id?{...n,lu:true}:n))
    setUnread(prev => Math.max(0, prev-1))
  }

  const deconnexion = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const fmt = n => Number(n||0).toLocaleString('fr-FR')
  const paieMois = paiementDuMois()
  const prochainPaie = bail ? new Date(new Date().getFullYear(), new Date().getMonth(), 1) : null

  const inp = {width:'100%',padding:'12px 14px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:10,color:'#e6edf3',fontFamily:'Inter,sans-serif',fontSize:14,outline:'none',colorScheme:'dark',boxSizing:'border-box'}
  const lbl = {display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.5)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}
  const bP = {width:'100%',padding:'14px',borderRadius:12,border:'none',background:'linear-gradient(135deg,#10b981,#059669)',color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer',fontFamily:'Inter,sans-serif'}
  const bS = {width:'100%',padding:'14px',borderRadius:12,border:'1px solid rgba(255,255,255,0.12)',background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.7)',fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:'Inter,sans-serif'}

  if (loading) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100vh',background:'#0a0f1a',gap:16}}>
      <div style={{width:48,height:48,border:'3px solid rgba(16,185,129,0.2)',borderTop:'3px solid #10b981',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <div style={{color:'rgba(255,255,255,0.4)',fontSize:14,fontFamily:'Inter,sans-serif'}}>Chargement...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{maxWidth:480,margin:'0 auto',minHeight:'100vh',background:'#0a0f1a',fontFamily:'Inter,sans-serif',paddingBottom:80,position:'relative'}}>
      <style>{`
        *{box-sizing:border-box}
        .tab-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 4px;border:none;background:none;cursor:pointer;transition:all 0.15s;font-family:Inter,sans-serif}
        .tab-icon{font-size:20px;line-height:1}
        .tab-label{font-size:10px;font-weight:500}
        .card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;margin-bottom:14px}
        .pay-item{display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.06)}
        .pay-item:last-child{border-bottom:none}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .fade-in{animation:fadeIn 0.25s ease}
        @keyframes pulse2{0%,100%{opacity:0.4;transform:scale(0.85)}50%{opacity:1;transform:scale(1)}}
      `}</style>

      {/* HEADER */}
      <div style={{padding:'20px 20px 0',position:'sticky',top:0,background:'#0a0f1a',zIndex:10,paddingTop:'env(safe-area-inset-top,20px)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:36,height:36,borderRadius:12,background:'linear-gradient(135deg,#10b981,#059669)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:700,color:'#fff'}}>
              {locataire?.prenom?.[0]?.toUpperCase()||'L'}
            </div>
            <div>
              <div style={{fontSize:16,fontWeight:700,color:'#e6edf3',lineHeight:1.2}}>
                {locataire ? locataire.prenom+' '+locataire.nom : 'Locataire'}
              </div>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>
                {bail?.agences?.nom||'Espace locataire'}
              </div>
            </div>
          </div>
          <div style={{position:'relative'}}>
            <button onClick={()=>setTab('profil')} style={{width:36,height:36,borderRadius:10,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.05)',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>🔔</button>
            {unread > 0 && <div style={{position:'absolute',top:-4,right:-4,width:18,height:18,borderRadius:'50%',background:'#ef4444',fontSize:10,fontWeight:700,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}>{unread}</div>}
          </div>
        </div>
        <div style={{height:1,background:'rgba(255,255,255,0.06)',marginTop:16}}/>
      </div>

      {/* CONTENT */}
      <div style={{padding:'16px 20px'}} className="fade-in">

        {/* ── ACCUEIL ── */}
        {tab==='accueil' && (
          <div>
            {bail ? (
              <>
                {/* Carte bail */}
                <div style={{background:'linear-gradient(135deg,rgba(16,185,129,0.15),rgba(5,150,105,0.08))',border:'1px solid rgba(16,185,129,0.25)',borderRadius:20,padding:22,marginBottom:16}}>
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14}}>
                    <div>
                      <div style={{fontSize:12,color:'rgba(16,185,129,0.8)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>Bail actif</div>
                      <div style={{fontSize:20,fontWeight:800,color:'#e6edf3',lineHeight:1.2}}>{bail.biens?.nom||'Bien'}</div>
                      <div style={{fontSize:13,color:'rgba(255,255,255,0.45)',marginTop:3}}>{bail.biens?.ville||''}</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:22,fontWeight:800,color:'#10b981'}}>{fmt(bail.loyer_mensuel)}</div>
                      <div style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>FCFA/mois</div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:10}}>
                    {[['📅','Debut',bail.date_debut?new Date(bail.date_debut).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'}):'—'],['📅','Fin',bail.date_fin?new Date(bail.date_fin).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'}):'Indefinie']].map(([ic,l,v])=>(
                      <div key={l} style={{flex:1,background:'rgba(0,0,0,0.2)',borderRadius:10,padding:'10px 12px'}}>
                        <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',marginBottom:2}}>{l}</div>
                        <div style={{fontSize:12.5,fontWeight:600,color:'#e6edf3'}}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prochain paiement */}
                <div className="card">
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                    <div>
                      <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:4}}>Loyer du mois</div>
                      <div style={{fontSize:22,fontWeight:800,color:'#e6edf3'}}>{fmt(bail.loyer_mensuel)} <span style={{fontSize:13,fontWeight:400,color:'rgba(255,255,255,0.4)'}}>FCFA</span></div>
                    </div>
                    {paieMois ? <Badge statut={paieMois.statut}/> : <Badge statut="en_attente"/>}
                  </div>
                  {(!paieMois || paieMois.statut!=='paye') && (
                    <button style={bP} onClick={()=>setShowPayModal(true)}>💳 Payer maintenant</button>
                  )}
                  {paieMois?.statut==='paye' && (
                    <div style={{padding:'12px',background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:10,textAlign:'center',fontSize:13,color:'#10b981',fontWeight:600}}>✅ Loyer paye ce mois</div>
                  )}
                </div>

                {/* Dernier paiement */}
                {paiements.length > 0 && (
                  <div className="card">
                    <div style={{fontSize:14,fontWeight:600,color:'#e6edf3',marginBottom:12}}>Historique recent</div>
                    {paiements.slice(0,3).map(p=>(
                      <div key={p.id} className="pay-item">
                        <div>
                          <div style={{fontSize:13.5,fontWeight:500,color:'#e6edf3'}}>{p.periode_mois?String(p.periode_mois).padStart(2,'0')+'/'+p.periode_annee:new Date(p.date_echeance).toLocaleDateString('fr-FR')}</div>
                          <div style={{fontSize:11.5,color:'rgba(255,255,255,0.35)',marginTop:2}}>{p.mode_paiement||'—'}</div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontSize:14,fontWeight:700,color:'#10b981'}}>{fmt(p.montant)} F</div>
                          <Badge statut={p.statut}/>
                        </div>
                      </div>
                    ))}
                    <button style={{...bS,marginTop:10,padding:'10px'}} onClick={()=>setTab('paiements')}>Voir tout l historique →</button>
                  </div>
                )}

                {/* Actions rapides */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
                  {[
                    {icon:'📢',label:'Signaler un probleme',color:'#f59e0b',action:()=>setShowPlainteModal(true)},
                    {icon:'📄',label:'Mes documents',color:'#0078d4',action:()=>setTab('documents')},
                  ].map(({icon,label,color,action})=>(
                    <button key={label} onClick={action} style={{padding:'16px 12px',borderRadius:14,border:`1px solid ${color}33`,background:color+'0d',cursor:'pointer',textAlign:'center',fontFamily:'Inter,sans-serif'}}>
                      <div style={{fontSize:26,marginBottom:6}}>{icon}</div>
                      <div style={{fontSize:12,fontWeight:600,color,lineHeight:1.3}}>{label}</div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div style={{textAlign:'center',padding:'60px 20px'}}>
                <div style={{fontSize:48,marginBottom:16,opacity:0.3}}>🏠</div>
                <div style={{fontSize:16,fontWeight:600,color:'rgba(255,255,255,0.5)',marginBottom:8}}>Aucun bail actif</div>
                <div style={{fontSize:13,color:'rgba(255,255,255,0.3)',lineHeight:1.7}}>Votre agence n a pas encore cree de bail pour vous.</div>
              </div>
            )}
          </div>
        )}

        {/* ── PAIEMENTS ── */}
        {tab==='paiements' && (
          <div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <div style={{fontSize:18,fontWeight:700,color:'#e6edf3'}}>Paiements</div>
              {bail && <button style={{padding:'8px 16px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#10b981,#059669)',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer'}} onClick={()=>setShowPayModal(true)}>+ Payer</button>}
            </div>
            {paiements.length===0 ? (
              <div style={{textAlign:'center',padding:'50px 20px',color:'rgba(255,255,255,0.3)',fontSize:14}}>
                <div style={{fontSize:36,marginBottom:12,opacity:0.3}}>💰</div>
                Aucun paiement enregistre
              </div>
            ) : paiements.map(p=>(
              <div key={p.id} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:'16px',marginBottom:10,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:42,height:42,borderRadius:12,background:(STATUT_PAY[p.statut]||STATUT_PAY.en_attente).color+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>
                    {p.statut==='paye'?'✅':'⏳'}
                  </div>
                  <div>
                    <div style={{fontSize:14,fontWeight:600,color:'#e6edf3'}}>{p.periode_mois?'Loyer '+String(p.periode_mois).padStart(2,'0')+'/'+p.periode_annee:new Date(p.date_echeance).toLocaleDateString('fr-FR')}</div>
                    <div style={{fontSize:11.5,color:'rgba(255,255,255,0.35)',marginTop:2}}>{p.mode_paiement||'—'} {p.operateur?'• '+p.operateur:''}</div>
                  </div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:15,fontWeight:700,color:'#10b981'}}>{fmt(p.montant)} F</div>
                  <Badge statut={p.statut}/>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── DOCUMENTS ── */}
        {tab==='documents' && (
          <div>
            <div style={{fontSize:18,fontWeight:700,color:'#e6edf3',marginBottom:16}}>Documents</div>
            {[
              {icon:'📑',label:'Contrat de bail',sub:bail?'Signe':'Non disponible',available:!!bail?.contrat_html,color:'#0078d4'},
              {icon:'🔑',label:'Etat des lieux entree',sub:'Document PDF',available:false,color:'#10b981'},
              {icon:'🚪',label:'Etat des lieux sortie',sub:'Non encore realise',available:false,color:'#f59e0b'},
            ].map(({icon,label,sub,available,color})=>(
              <div key={label} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:'16px',marginBottom:10,display:'flex',alignItems:'center',gap:14,opacity:available?1:0.5}}>
                <div style={{width:46,height:46,borderRadius:12,background:color+'18',border:`1px solid ${color}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600,color:'#e6edf3'}}>{label}</div>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.35)',marginTop:2}}>{sub}</div>
                </div>
                {available && <button style={{padding:'8px 14px',borderRadius:8,border:`1px solid ${color}33`,background:color+'12',color:color,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>Voir</button>}
              </div>
            ))}
            <div className="card" style={{marginTop:20}}>
              <div style={{fontSize:14,fontWeight:600,color:'#e6edf3',marginBottom:12}}>Quittances</div>
              {paiements.filter(p=>p.statut==='paye').length===0 ? (
                <div style={{textAlign:'center',padding:'20px',color:'rgba(255,255,255,0.3)',fontSize:13}}>Aucune quittance disponible</div>
              ) : paiements.filter(p=>p.statut==='paye').map(p=>(
                <div key={p.id} className="pay-item">
                  <div>
                    <div style={{fontSize:13.5,fontWeight:500,color:'#e6edf3'}}>Quittance {p.periode_mois?String(p.periode_mois).padStart(2,'0')+'/'+p.periode_annee:new Date(p.date_echeance).toLocaleDateString('fr-FR')}</div>
                    <div style={{fontSize:11.5,color:'rgba(255,255,255,0.35)',marginTop:2}}>{fmt(p.montant)} FCFA</div>
                  </div>
                  <span style={{fontSize:20}}>📥</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PLAINTES ── */}
        {tab==='plaintes' && (
          <div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <div style={{fontSize:18,fontWeight:700,color:'#e6edf3'}}>Mes plaintes</div>
              <button style={{padding:'8px 16px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#f59e0b,#d97706)',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer'}} onClick={()=>setShowPlainteModal(true)}>+ Signaler</button>
            </div>
            {plaintes.length===0 ? (
              <div style={{textAlign:'center',padding:'50px 20px'}}>
                <div style={{fontSize:40,marginBottom:12,opacity:0.3}}>📢</div>
                <div style={{fontSize:15,fontWeight:600,color:'rgba(255,255,255,0.4)',marginBottom:8}}>Aucune plainte</div>
                <div style={{fontSize:13,color:'rgba(255,255,255,0.3)'}}>Signalez un probleme dans votre logement</div>
              </div>
            ) : plaintes.map(p=>{
              const sc = {ouverte:{color:'#f59e0b',label:'Ouverte'},en_cours:{color:'#0078d4',label:'En cours'},resolue:{color:'#10b981',label:'Resolue'},fermee:{color:'#8b949e',label:'Fermee'}}[p.statut]||{color:'#8b949e',label:p.statut}
              return (
                <div key={p.id} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:'16px',marginBottom:10}}>
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8}}>
                    <div style={{fontSize:14,fontWeight:600,color:'#e6edf3',flex:1,marginRight:10}}>{p.titre}</div>
                    <span style={{fontSize:11,padding:'2px 9px',borderRadius:100,fontWeight:600,background:sc.color+'18',color:sc.color,border:`1px solid ${sc.color}33`,whiteSpace:'nowrap'}}>{sc.label}</span>
                  </div>
                  <div style={{fontSize:13,color:'rgba(255,255,255,0.45)',lineHeight:1.5,marginBottom:8}}>{p.description}</div>
                  <div style={{fontSize:11.5,color:'rgba(255,255,255,0.3)'}}>{new Date(p.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}</div>
                  {p.commentaire_agence && (
                    <div style={{marginTop:10,padding:'10px 12px',background:'rgba(0,120,212,0.08)',border:'1px solid rgba(0,120,212,0.15)',borderRadius:8}}>
                      <div style={{fontSize:11,color:'#4da6ff',fontWeight:600,marginBottom:4}}>Reponse de l agence</div>
                      <div style={{fontSize:12.5,color:'rgba(255,255,255,0.6)'}}>{p.commentaire_agence}</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── PROFIL ── */}
        {tab==='profil' && (
          <div>
            <div style={{fontSize:18,fontWeight:700,color:'#e6edf3',marginBottom:20}}>Mon profil</div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginBottom:24}}>
              <div style={{width:72,height:72,borderRadius:20,background:'linear-gradient(135deg,#10b981,#059669)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:30,fontWeight:700,color:'#fff',marginBottom:10}}>
                {locataire?.prenom?.[0]?.toUpperCase()||'L'}
              </div>
              <div style={{fontSize:18,fontWeight:700,color:'#e6edf3'}}>{locataire?locataire.prenom+' '+locataire.nom:'Locataire'}</div>
              <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginTop:3}}>{locataire?.email||''}</div>
            </div>

            {locataire && (
              <div className="card" style={{marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.4)',marginBottom:12,textTransform:'uppercase',letterSpacing:'0.05em'}}>Informations</div>
                {[['📱','Telephone',locataire.telephone||'—'],['🪪','CIN',locataire.cin||'—'],['💼','Profession',locataire.profession||'—'],['🏙️','Ville',locataire.ville||'—']].map(([ic,l,v])=>(
                  <div key={l} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                    <span style={{fontSize:18,width:28,textAlign:'center'}}>{ic}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11.5,color:'rgba(255,255,255,0.35)'}}>{l}</div>
                      <div style={{fontSize:13.5,color:'#e6edf3',fontWeight:500}}>{v}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {notifications.length>0 && (
              <div className="card" style={{marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.4)',marginBottom:12,textTransform:'uppercase',letterSpacing:'0.05em'}}>Notifications ({unread} non lues)</div>
                {notifications.slice(0,5).map(n=>(
                  <div key={n.id} onClick={()=>marquerLu(n.id)} style={{padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.05)',display:'flex',gap:10,alignItems:'flex-start',cursor:'pointer',opacity:n.lu?0.6:1}}>
                    {!n.lu && <div style={{width:6,height:6,borderRadius:'50%',background:'#10b981',marginTop:6,flexShrink:0}}/>}
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:n.lu?400:600,color:'#e6edf3'}}>{n.titre}</div>
                      <div style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginTop:2}}>{n.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={deconnexion} style={{...bS,color:'#ef4444',borderColor:'rgba(239,68,68,0.2)',background:'rgba(239,68,68,0.06)'}}>Se deconnecter</button>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:480,background:'rgba(10,15,26,0.95)',backdropFilter:'blur(20px)',borderTop:'1px solid rgba(255,255,255,0.08)',display:'flex',paddingBottom:'env(safe-area-inset-bottom,0px)',zIndex:100}}>
        {TABS.map(t=>(
          <button key={t.id} className="tab-btn" onClick={()=>setTab(t.id)}
            style={{color:tab===t.id?'#10b981':'rgba(255,255,255,0.35)'}}>
            <span className="tab-icon" style={{filter:tab===t.id?'none':'grayscale(1)',opacity:tab===t.id?1:0.5}}>{t.icon}</span>
            <span className="tab-label" style={{fontWeight:tab===t.id?700:400}}>{t.label}</span>
            {t.id==='plaintes'&&plaintes.filter(p=>p.statut==='ouverte').length>0&&<div style={{position:'absolute',top:6,right:'calc(50% - 14px)',width:7,height:7,borderRadius:'50%',background:'#f59e0b'}}/>}
          </button>
        ))}
      </div>

      {/* MODAL PAIEMENT */}
      {showPayModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:200,display:'flex',alignItems:'flex-end',padding:'0'}} onClick={e=>e.target===e.currentTarget&&!paying&&(setShowPayModal(false),setPayStatus(null))}>
          <div style={{width:'100%',maxWidth:480,margin:'0 auto',background:'#111827',borderRadius:'20px 20px 0 0',padding:'20px 20px 40px',paddingBottom:'calc(40px + env(safe-area-inset-bottom))'}}>
            <div style={{width:36,height:4,borderRadius:2,background:'rgba(255,255,255,0.2)',margin:'0 auto 20px'}}/>
            {payStatus===null && (
              <div>
                <div style={{fontSize:18,fontWeight:700,color:'#e6edf3',marginBottom:4}}>Payer le loyer</div>
                <div style={{fontSize:14,color:'rgba(255,255,255,0.4)',marginBottom:20}}>{fmt(bail?.loyer_mensuel)} FCFA</div>
                <div style={{marginBottom:16}}>
                  <label style={lbl}>Operateur Mobile Money</label>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    {[['MTN_MOMO_BEN','MTN MoMo','Benin','#f59e0b'],['MOOV_BEN','Moov Money','Benin','#0078d4'],['MTN_MOMO_TGO','MTN MoMo','Togo','#f59e0b'],['MOOV_TGO','Moov Money','Togo','#0078d4']].map(([id,name,pays,color])=>(
                      <div key={id} onClick={()=>setPayCorr(id)} style={{padding:'10px',borderRadius:10,border:`1.5px solid ${payCorr===id?color:'rgba(255,255,255,0.08)'}`,background:payCorr===id?color+'12':'rgba(255,255,255,0.03)',cursor:'pointer',textAlign:'center'}}>
                        <div style={{fontSize:12.5,fontWeight:600,color:payCorr===id?color:'rgba(255,255,255,0.6)'}}>{name}</div>
                        <div style={{fontSize:10.5,color:'rgba(255,255,255,0.3)'}}>{pays}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{marginBottom:20}}>
                  <label style={lbl}>Votre numero Mobile Money</label>
                  <input style={{...inp,fontSize:16,letterSpacing:'0.05em'}} type="tel" placeholder="Ex: 22996000000" value={payPhone} onChange={e=>setPayPhone(e.target.value)}/>
                  <div style={{fontSize:11.5,color:'rgba(255,255,255,0.3)',marginTop:6}}>Code pays inclus (229 Benin, 228 Togo)</div>
                </div>
                <button style={bP} disabled={paying} onClick={payerLoyer}>{paying?'Envoi...':'Payer '+fmt(bail?.loyer_mensuel)+' FCFA'}</button>
              </div>
            )}
            {payStatus==='pending' && (
              <div style={{textAlign:'center',padding:'20px 0'}}>
                <div style={{fontSize:48,marginBottom:16}}>📱</div>
                <div style={{fontSize:17,fontWeight:700,color:'#e6edf3',marginBottom:8}}>En attente de confirmation</div>
                <div style={{fontSize:14,color:'rgba(255,255,255,0.45)',lineHeight:1.7,marginBottom:24}}>Approuvez le paiement USSD sur votre telephone pour finaliser.</div>
                <div style={{display:'flex',justifyContent:'center',gap:8}}>
                  {[0,1,2].map(i=><div key={i} style={{width:10,height:10,borderRadius:'50%',background:'#10b981',animation:`pulse2 1.4s ease-in-out ${i*0.2}s infinite`}}/>)}
                </div>
              </div>
            )}
            {payStatus==='success' && (
              <div style={{textAlign:'center',padding:'20px 0'}}>
                <div style={{fontSize:52,marginBottom:14}}>✅</div>
                <div style={{fontSize:18,fontWeight:700,color:'#10b981',marginBottom:8}}>Paiement confirme !</div>
                <div style={{fontSize:14,color:'rgba(255,255,255,0.4)'}}>Votre loyer a ete paye avec succes.</div>
              </div>
            )}
            {payStatus==='failed' && (
              <div style={{textAlign:'center',padding:'20px 0'}}>
                <div style={{fontSize:52,marginBottom:14}}>❌</div>
                <div style={{fontSize:18,fontWeight:700,color:'#ef4444',marginBottom:8}}>Paiement echoue</div>
                <div style={{fontSize:14,color:'rgba(255,255,255,0.4)',marginBottom:20}}>Le paiement n a pas pu etre traite.</div>
                <button style={bP} onClick={()=>setPayStatus(null)}>Reessayer</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL PLAINTE */}
      {showPlainteModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:200,display:'flex',alignItems:'flex-end'}} onClick={e=>e.target===e.currentTarget&&setShowPlainteModal(false)}>
          <div style={{width:'100%',maxWidth:480,margin:'0 auto',background:'#111827',borderRadius:'20px 20px 0 0',padding:'20px 20px 40px',paddingBottom:'calc(40px + env(safe-area-inset-bottom))'}}>
            <div style={{width:36,height:4,borderRadius:2,background:'rgba(255,255,255,0.2)',margin:'0 auto 20px'}}/>
            <div style={{fontSize:18,fontWeight:700,color:'#e6edf3',marginBottom:20}}>Signaler un probleme</div>
            <div style={{marginBottom:14}}>
              <label style={lbl}>Categorie</label>
              <select style={{...inp,cursor:'pointer',background:'rgba(10,15,26,0.9)'}} value={plainteForm.categorie} onChange={e=>setPlainteForm(p=>({...p,categorie:e.target.value}))}>
                {[['maintenance','Maintenance / Travaux'],['plomberie','Plomberie'],['electricite','Electricite'],['securite','Securite'],['voisinage','Voisinage'],['autre','Autre']].map(([v,l])=><option key={v} value={v} style={{background:'#111827'}}>{l}</option>)}
              </select>
            </div>
            <div style={{marginBottom:14}}>
              <label style={lbl}>Titre</label>
              <input style={inp} placeholder="Decrivez brievement le probleme" value={plainteForm.titre} onChange={e=>setPlainteForm(p=>({...p,titre:e.target.value}))}/>
            </div>
            <div style={{marginBottom:20}}>
              <label style={lbl}>Description</label>
              <textarea style={{...inp,minHeight:100,resize:'vertical'}} placeholder="Donnez plus de details..." value={plainteForm.description} onChange={e=>setPlainteForm(p=>({...p,description:e.target.value}))}/>
            </div>
            <button style={{...bP,background:'linear-gradient(135deg,#f59e0b,#d97706)',opacity:submitting?0.6:1}} disabled={submitting} onClick={soumettrePlaynte}>{submitting?'Envoi...':'Soumettre la plainte'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
