import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'

const PLANS = {
  particulier: [
    { id:'starter_p', nom:'Starter', prix_mois:5, prix_mois_fcfa:3000, prix_an:4, prix_an_fcfa:2400, desc:'Pour les proprietaires independants', couleur:'#0078d4',
      features:['10 biens','30 locataires','Baux et contrats','Gestion factures','Modeles basiques','Support email'] },
    { id:'pro_p', nom:'Pro', prix_mois:12, prix_mois_fcfa:7200, prix_an:10, prix_an_fcfa:6000, desc:'Pour les proprietaires actifs', couleur:'#00c896', recommande:true,
      features:['Biens illimites','Locataires illimites','Baux et contrats','Modeles avances','Rapports','Gestion locataire','Signature electronique','Loci IA','Support prioritaire'] },
  ],
  organisation: [
    { id:'starter_o', nom:'Starter', prix_mois:30, prix_mois_fcfa:18000, prix_an:25, prix_an_fcfa:15000, desc:'Pour les petites agences', couleur:'#0078d4',
      features:['50 biens','3 utilisateurs','20 proprietaires','Baux et contrats','Modeles documents','Rapports basiques','Support email'] },
    { id:'business_o', nom:'Business', prix_mois:65, prix_mois_fcfa:39000, prix_an:54, prix_an_fcfa:32400, desc:'Pour les agences en croissance', couleur:'#00c896', recommande:true,
      features:['500 biens','10 utilisateurs','60 proprietaires','Rapports avances','Signature electronique','Loci IA','Portail mobile locataire','API','Support prioritaire'] },
    { id:'enterprise_o', nom:'Enterprise', prix_mois:null, prix_mois_fcfa:null, prix_an:null, prix_an_fcfa:null, desc:'Pour les grandes organisations', couleur:'#8b5cf6',
      features:['Biens illimites','Utilisateurs illimites','Multi-agences','Rapports personnalises','SLA garanti','Support 24/7 dedie','Formation incluse','API avancee'] },
  ],
}

const STATUT_CFG = {
  actif:   { color:'#00c896', bg:'rgba(0,200,150,0.1)', label:'Actif' },
  essai:   { color:'#0078d4', bg:'rgba(0,120,212,0.1)', label:'Essai gratuit' },
  expire:  { color:'#ef4444', bg:'rgba(239,68,68,0.1)', label:'Expire' },
  annule:  { color:'#8b949e', bg:'rgba(139,148,158,0.1)', label:'Annule' },
  en_attente: { color:'#f59e0b', bg:'rgba(245,158,11,0.1)', label:'En attente' },
}

export default function Abonnement() {
  const [tab, setTab]             = useState('plan')
  const [agence, setAgence]       = useState(null)
  const [abonnement, setAbonnement] = useState(null)
  const [factures, setFactures]   = useState([])
  const [methodes, setMethodes]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [periode, setPeriode]     = useState('mois')
  const [typeCompte, setTypeCompte] = useState('organisation')
  const [paying, setPaying]       = useState(null)

  useEffect(() => { init() }, [])

  const init = async () => {
    setLoading(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      const { data:agList } = await supabase.from('agences').select('*')
      const ag = agList?.find(a => a.profile_id === user.id) || agList?.[0]
      setAgence(ag)
      if (ag?.id) {
        const { data:abList } = await supabase.from('abonnements').select('*').eq('agence_id', ag.id).order('created_at',{ascending:false}).limit(1)
        if (abList?.[0]) setAbonnement(abList[0])
        const { data:f } = await supabase.from('factures').select('*').eq('agence_id', ag.id).order('created_at',{ascending:false})
        setFactures(f||[])
        const { data:m } = await supabase.from('methodes_paiement').select('*').eq('agence_id', ag.id)
        setMethodes(m||[])
      }
      const { data:prof } = await supabase.from('profiles').select('type_compte').eq('id', user.id).maybeSingle()
      if (prof?.type_compte) setTypeCompte(prof.type_compte === 'particulier' ? 'particulier' : 'organisation')
    } catch(e) { console.error('Init error:', e) }
    finally { setLoading(false) }
  }

  const getPlanInfo = () => {
    if (!abonnement) return null
    const allPlans = [...PLANS.particulier, ...PLANS.organisation]
    return allPlans.find(p => p.id === abonnement.plan) || null
  }

  const [showPayModal, setShowPayModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [payForm, setPayForm] = useState({ phone: '', correspondent: 'MTN_MOMO_BEN' })
  const [payStatus, setPayStatus] = useState(null) // null | 'pending' | 'success' | 'failed'
  const [depositId, setDepositId] = useState(null)

  const CORRESPONDENTS = [
    { id: 'MTN_MOMO_BEN', label: 'MTN Mobile Money', pays: 'Benin', icon: '📱', color: '#f59e0b' },
    { id: 'MOOV_BEN', label: 'Moov Money', pays: 'Benin', icon: '📱', color: '#0078d4' },
    { id: 'MTN_MOMO_TGO', label: 'MTN Mobile Money', pays: 'Togo', icon: '📱', color: '#f59e0b' },
    { id: 'MOOV_TGO', label: 'Moov Money', pays: 'Togo', icon: '📱', color: '#0078d4' },
    { id: 'ORANGE_MON_SEN', label: 'Orange Money', pays: 'Senegal', icon: '📱', color: '#f97316' },
    { id: 'WAVE_SEN', label: 'Wave', pays: 'Senegal', icon: '📱', color: '#00c896' },
  ]

  const souscirePlan = (plan) => {
    if (!plan.prix_mois_fcfa) {
      toast('Contactez-nous pour l offre Enterprise : contact@imoloc.lt', { icon: '📧' })
      return
    }
    setSelectedPlan(plan)
    setPayStatus(null)
    setDepositId(null)
    setPayForm({ phone: '', correspondent: 'MTN_MOMO_BEN' })
    setShowPayModal(true)
  }

  const lancerPaiement = async () => {
    if (!payForm.phone || payForm.phone.length < 8) { toast.error('Numero de telephone invalide'); return }
    setPaying(selectedPlan.id)
    setPayStatus('pending')
    try {
      const montant = periode === 'mois' ? selectedPlan.prix_mois_fcfa : selectedPlan.prix_an_fcfa * 12
      const { data, error } = await supabase.functions.invoke('pawapay-deposit', {
        body: {
          amount: montant,
          currency: 'XOF',
          phone: payForm.phone.replace(/\s/g, ''),
          correspondent: payForm.correspondent,
          agence_id: agence?.id,
          plan_id: selectedPlan.id,
        }
      })
      if (error) { toast.error('Erreur reseau: ' + error.message); setPayStatus('failed'); setPaying(null); return }
      if (!data?.success) { toast.error(data?.error || 'Paiement rejete'); setPayStatus('failed'); setPaying(null); return }
      setDepositId(data.depositId)
      toast.success('Demande envoyee ! Approuvez sur votre telephone.')
      pollStatus(data.depositId, selectedPlan, agence)
    } catch(e) { toast.error(e.message); setPayStatus('failed'); setPaying(null) }
  }

  const pollStatus = async (depId, plan, ag) => {
    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      try {
        const { data } = await supabase.functions.invoke('pawapay-status', { body: { depositId: depId } })
        if (data?.status === 'COMPLETED') {
          clearInterval(interval)
          // Activer l abonnement directement
          try {
            const dateDebut = new Date()
            const dateFin = new Date()
            dateFin.setMonth(dateFin.getMonth() + (periode === 'an' ? 12 : 1))
            const montant = periode === 'mois' ? selectedPlan.prix_mois_fcfa : selectedPlan.prix_an_fcfa * 12
            const { data: upsertData, error: upsertError } = await supabase.from('abonnements').upsert({
              agence_id: ag.id,
              plan: plan.id,
              statut: 'actif',
              date_debut: dateDebut.toISOString().split('T')[0],
              date_fin: dateFin.toISOString().split('T')[0],
              prix_mensuel: plan.prix_mois_fcfa,
              renouvellement_auto: true,
              reference_paiement: depId,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'agence_id' })
            console.log('Upsert result:', upsertData, 'Error:', upsertError)
            if (upsertError) toast.error('Upsert error: ' + upsertError.message + ' code:' + upsertError.code)
            await supabase.from('factures').insert({
              agence_id: ag.id,
              numero: 'IMO-' + new Date().getFullYear() + '-' + depId.slice(0,6).toUpperCase(),
              montant,
              devise: 'XOF',
              statut: 'paye',
              date_paiement: new Date().toISOString(),
              details: { plan: selectedPlan.id, periode, operateur: payForm.correspondent, phone: payForm.phone },
            })
          } catch(e) { 
            console.error('Activation error:', e)
            toast.error('Erreur activation: ' + JSON.stringify(e))
          }
          setPayStatus('success')
          setPaying(null)
          toast.success('Paiement confirme ! Abonnement active.')
          setTimeout(() => { setShowPayModal(false); init(); setTab('plan') }, 2000)
        } else if (data?.status === 'FAILED' || data?.status === 'REJECTED') {
          clearInterval(interval)
          setPayStatus('failed')
          setPaying(null)
          toast.error('Paiement echoue. Veuillez reessayer.')
        } else if (attempts >= 20) {
          clearInterval(interval)
          setPayStatus('failed')
          setPaying(null)
          toast.error('Timeout - verifiez votre telephone et reessayez.')
        }
      } catch(e) { console.error(e) }
    }, 5000)
  }

  const fmt = n => Number(n||0).toLocaleString('fr-FR')
  const planInfo = getPlanInfo()
  const sc = STATUT_CFG[abonnement?.statut || 'essai']

  const bB = { display:'inline-flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:6,fontSize:13,fontWeight:500,cursor:'pointer',border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.6)',fontFamily:'Inter,sans-serif',transition:'all 0.15s' }
  const bP = { ...bB, background:'#0078d4', borderColor:'#0078d4', color:'#fff' }

  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:400,color:'rgba(255,255,255,0.3)' }}>Chargement...</div>

  return (
    <>
      <style>{`
        .ab-tab{padding:10px 18px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:none;font-family:Inter,sans-serif;color:rgba(255,255,255,0.4);transition:all 0.15s;white-space:nowrap}
        .ab-tab.on{background:rgba(255,255,255,0.08);color:#e6edf3}
        .plan-card{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:24px;display:flex;flex-direction:column;gap:0;transition:all 0.2s;position:relative}
        .plan-card:hover{border-color:rgba(255,255,255,0.15);transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.3)}
        .plan-card.active{border-color:#0078d4;background:rgba(0,120,212,0.04)}
        .plan-card.recommande{border-color:#00c896}
        .feat-item{display:flex;align-items:center;gap:8px;padding:5px 0;font-size:12.5px;color:rgba(255,255,255,0.65)}
      `}</style>

      <div style={{ maxWidth:1000, margin:'0 auto' }}>
        <div style={{ fontSize:22, fontWeight:700, color:'#e6edf3', marginBottom:20 }}>Abonnement</div>

        <div style={{ display:'flex', gap:2, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:3, marginBottom:24, width:'fit-content' }}>
          {[['plan','Plan actuel'],['changer','Changer de plan'],['factures','Factures'],['paiement','Modes de paiement']].map(([k,l])=>(
            <button key={k} className={'ab-tab'+(tab===k?' on':'')} onClick={()=>setTab(k)}>{l}</button>
          ))}
        </div>

        {/* ── PLAN ACTUEL ── */}
        {tab==='plan' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
              {/* Plan actif */}
              <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:24 }}>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginBottom:8, fontWeight:500 }}>Plan actuel</div>
                <div style={{ fontSize:28, fontWeight:800, color:'#e6edf3', marginBottom:6 }}>
                  {planInfo?.nom || (abonnement?.plan || 'Essai gratuit')}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                  <span style={{ fontSize:12, padding:'3px 10px', borderRadius:100, fontWeight:600, background:sc.bg, color:sc.color }}>{sc.label}</span>
                  {abonnement?.date_fin && <span style={{ fontSize:12, color:'rgba(255,255,255,0.35)' }}>Expire le {new Date(abonnement.date_fin).toLocaleDateString('fr-FR')}</span>}
                </div>
                {planInfo && <div style={{ fontSize:24, fontWeight:700, color:'#00c896' }}>{fmt(planInfo.prix_mois_fcfa)} FCFA<span style={{ fontSize:14, color:'rgba(255,255,255,0.4)', fontWeight:400 }}>/mois</span></div>}
                <button style={{ ...bP, marginTop:16, width:'100%', justifyContent:'center' }} onClick={()=>setTab('changer')}>
                  Changer de plan
                </button>
              </div>

              {/* Facturation */}
              <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:24 }}>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginBottom:8, fontWeight:500 }}>Prochaine facture</div>
                {abonnement?.date_fin ? (
                  <div>
                    <div style={{ fontSize:24, fontWeight:700, color:'#e6edf3', marginBottom:6 }}>{fmt(abonnement.prix_mensuel)} FCFA</div>
                    <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)' }}>Prelevee le {new Date(abonnement.date_fin).toLocaleDateString('fr-FR')}</div>
                    <div style={{ marginTop:16, display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:12, color:'rgba(255,255,255,0.35)' }}>Renouvellement automatique</span>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:100, background:abonnement.renouvellement_auto?'rgba(0,200,150,0.1)':'rgba(255,255,255,0.05)', color:abonnement.renouvellement_auto?'#00c896':'rgba(255,255,255,0.3)', border:'1px solid rgba(255,255,255,0.08)' }}>{abonnement.renouvellement_auto?'Actif':'Inactif'}</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize:16, color:'rgba(255,255,255,0.5)', marginBottom:8 }}>Essai gratuit en cours</div>
                    <div style={{ fontSize:13, color:'rgba(255,255,255,0.35)', lineHeight:1.6 }}>Aucune facturation pendant l essai. Souscrivez a un plan pour continuer apres la periode d essai.</div>
                  </div>
                )}
              </div>
            </div>

            {/* Usage */}
            <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:24 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'#e6edf3', marginBottom:16 }}>Utilisation de votre plan</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:16 }}>
                {[
                  { label:'Biens', val:agence?._count?.biens||0, max:planInfo?.id?.includes('starter')?50:planInfo?.id?.includes('pro')?null:500, color:'#0078d4' },
                  { label:'Utilisateurs', val:1, max:planInfo?.id?.includes('starter_o')?3:planInfo?.id?.includes('business')?10:null, color:'#00c896' },
                  { label:'Stockage', val:'2.1 GB', max:'5 GB', color:'#f59e0b', nobar:true },
                ].map(({label,val,max,color,nobar})=>(
                  <div key={label}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                      <span style={{ fontSize:13, color:'rgba(255,255,255,0.5)' }}>{label}</span>
                      <span style={{ fontSize:13, fontWeight:600, color:'#e6edf3' }}>{val}{max&&!nobar?' / '+max:''}</span>
                    </div>
                    {!nobar && max && <div style={{ height:5, background:'rgba(255,255,255,0.06)', borderRadius:3 }}>
                      <div style={{ height:'100%', width:`${Math.min((Number(val)/Number(max))*100,100)}%`, background:color, borderRadius:3 }}/>
                    </div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CHANGER DE PLAN ── */}
        {tab==='changer' && (
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
              <div style={{ display:'flex', gap:8 }}>
                {[['particulier','Particulier'],['organisation','Organisation']].map(([k,l])=>(
                  <button key={k} style={{ ...bB, background:typeCompte===k?'rgba(0,120,212,0.12)':'rgba(255,255,255,0.03)', borderColor:typeCompte===k?'#0078d4':'rgba(255,255,255,0.1)', color:typeCompte===k?'#4da6ff':'rgba(255,255,255,0.5)' }} onClick={()=>setTypeCompte(k)}>{l}</button>
                ))}
              </div>
              <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:6, padding:3 }}>
                {[['mois','Mensuel'],['an','Annuel (-17%)']].map(([k,l])=>(
                  <button key={k} style={{ ...bB, fontSize:12, padding:'5px 12px', border:'none', background:periode===k?'rgba(255,255,255,0.08)':'none', color:periode===k?'#e6edf3':'rgba(255,255,255,0.4)' }} onClick={()=>setPeriode(k)}>{l}</button>
                ))}
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:`repeat(${PLANS[typeCompte].length},1fr)`, gap:16 }}>
              {PLANS[typeCompte].map(plan => {
                const isCurrent = abonnement?.plan === plan.id
                const prix = periode === 'mois' ? plan.prix_mois_fcfa : plan.prix_an_fcfa
                const prixLabel = periode === 'mois' ? '/mois' : '/mois (annuel)'
                return (
                  <div key={plan.id} className={'plan-card'+(isCurrent?' active':'')+(plan.recommande?' recommande':'')}>
                    {plan.recommande && <div style={{ position:'absolute', top:-11, left:'50%', transform:'translateX(-50%)', fontSize:11, fontWeight:700, padding:'2px 12px', borderRadius:100, background:plan.couleur, color:'#fff', whiteSpace:'nowrap' }}>Recommande</div>}
                    {isCurrent && <div style={{ position:'absolute', top:-11, right:16, fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:100, background:'#0078d4', color:'#fff' }}>Actuel</div>}

                    <div style={{ fontSize:18, fontWeight:700, color:plan.couleur, marginBottom:6 }}>{plan.nom}</div>
                    <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:16 }}>{plan.desc}</div>

                    {prix ? (
                      <div style={{ marginBottom:20 }}>
                        <span style={{ fontSize:30, fontWeight:800, color:'#e6edf3' }}>{fmt(prix)}</span>
                        <span style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginLeft:4 }}>FCFA{prixLabel}</span>
                        <div style={{ fontSize:11.5, color:'rgba(255,255,255,0.3)', marginTop:3 }}>≈ {periode==='mois'?plan.prix_mois:plan.prix_an} USD</div>
                      </div>
                    ) : (
                      <div style={{ fontSize:22, fontWeight:700, color:'rgba(255,255,255,0.5)', marginBottom:20 }}>Sur devis</div>
                    )}

                    <div style={{ flex:1, marginBottom:20 }}>
                      {plan.features.map((f,i)=>(
                        <div key={i} className="feat-item">
                          <span style={{ color:plan.couleur, flexShrink:0 }}>✓</span> {f}
                        </div>
                      ))}
                    </div>

                    <button
                      style={{ ...bP, width:'100%', justifyContent:'center', background:isCurrent?'rgba(255,255,255,0.05)':plan.couleur, borderColor:isCurrent?'rgba(255,255,255,0.1)':plan.couleur, color:isCurrent?'rgba(255,255,255,0.4)':'#fff', cursor:isCurrent?'default':'pointer', opacity:paying===plan.id?0.6:1 }}
                      disabled={isCurrent || paying===plan.id}
                      onClick={()=>!isCurrent&&souscirePlan(plan)}>
                      {paying===plan.id?'Redirection..':isCurrent?'Plan actuel':!prix?'Nous contacter':'Souscrire'}
                    </button>
                  </div>
                )
              })}
            </div>

            <div style={{ marginTop:20, padding:'14px 18px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8 }}>
              <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.4)', lineHeight:1.7 }}>
                Paiement securise via <strong style={{ color:'#00c896' }}>FedaPay</strong> (Mobile Money) et <strong style={{ color:'#0078d4' }}>Stripe</strong> (cartes).
                Annulation possible a tout moment. Remboursement pro-rata sous 7 jours.
                Besoin d aide ? <span style={{ color:'#4da6ff', cursor:'pointer' }}>contact@imoloc.lt</span>
              </div>
            </div>
          </div>
        )}

        {/* ── FACTURES ── */}
        {tab==='factures' && (
          <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, overflow:'hidden' }}>
            {factures.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px', color:'rgba(255,255,255,0.3)' }}>
                <div style={{ fontSize:32, marginBottom:12, opacity:0.3 }}>📄</div>
                <div style={{ fontSize:14 }}>Aucune facture pour le moment</div>
              </div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr>{['Numero','Periode','Montant','Statut','Date'].map(h=>(
                  <th key={h} style={{ textAlign:'left', padding:'12px 16px', fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                ))}</tr></thead>
                <tbody>{factures.map(f=>{
                  const sc = STATUT_CFG[f.statut] || STATUT_CFG.en_attente
                  return <tr key={f.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding:'12px 16px', fontSize:13, fontWeight:600, color:'#4da6ff' }}>{f.numero}</td>
                    <td style={{ padding:'12px 16px', fontSize:13, color:'rgba(255,255,255,0.6)' }}>{f.periode_debut ? new Date(f.periode_debut).toLocaleDateString('fr-FR') : '—'}</td>
                    <td style={{ padding:'12px 16px', fontSize:13, fontWeight:600, color:'#e6edf3' }}>{fmt(f.montant)} {f.devise||'FCFA'}</td>
                    <td style={{ padding:'12px 16px' }}><span style={{ fontSize:11.5, padding:'2px 9px', borderRadius:100, fontWeight:600, background:sc.bg, color:sc.color }}>{f.statut}</span></td>
                    <td style={{ padding:'12px 16px', fontSize:12.5, color:'rgba(255,255,255,0.4)' }}>{new Date(f.created_at).toLocaleDateString('fr-FR')}</td>
                  </tr>
                })}</tbody>
              </table>
            )}
          </div>
        )}

        {/* ── METHODES DE PAIEMENT ── */}
        {tab==='paiement' && (
          <div>
            <div style={{ fontSize:14, fontWeight:600, color:'#e6edf3', marginBottom:16 }}>Methodes de paiement configurees</div>
            {methodes.length === 0 ? (
              <div style={{ textAlign:'center', padding:'50px', border:'1px dashed rgba(255,255,255,0.08)', borderRadius:12 }}>
                <div style={{ fontSize:32, marginBottom:12, opacity:0.3 }}>💳</div>
                <div style={{ fontSize:14, color:'rgba(255,255,255,0.3)', marginBottom:16 }}>Aucune methode de paiement configuree</div>
                <button style={bP} onClick={()=>setTab('changer')}>Souscrire a un plan</button>
              </div>
            ) : methodes.map(m=>(
              <div key={m.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, marginBottom:10 }}>
                <div style={{ width:44, height:44, borderRadius:8, background:'rgba(0,120,212,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>💳</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13.5, fontWeight:600, color:'#e6edf3' }}>{m.nom_titulaire}</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>{m.type}</div>
                </div>
                {m.par_defaut && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:100, background:'rgba(0,200,150,0.1)', color:'#00c896', border:'1px solid rgba(0,200,150,0.2)' }}>Par defaut</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* MODAL PAIEMENT PAWAPAY */}
      {showPayModal && selectedPlan && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:'#0d1117',border:'1px solid rgba(255,255,255,0.12)',borderRadius:14,width:'100%',maxWidth:480,padding:28}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <div>
                <div style={{fontSize:17,fontWeight:700,color:'#e6edf3'}}>Paiement Mobile Money</div>
                <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginTop:2}}>Plan {selectedPlan.nom} — {periode==='mois'?selectedPlan.prix_mois_fcfa?.toLocaleString('fr-FR'):selectedPlan.prix_an_fcfa?.toLocaleString('fr-FR')} FCFA/{periode==='mois'?'mois':'mois (annuel)'}</div>
              </div>
              {payStatus!=='pending' && <button onClick={()=>{setShowPayModal(false);setPaying(null)}} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)',fontSize:22}}>x</button>}
            </div>

            {payStatus===null && (
              <div>
                <div style={{marginBottom:14}}>
                  <label style={{display:'block',fontSize:11.5,fontWeight:600,color:'rgba(255,255,255,0.4)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}}>Operateur Mobile Money</label>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    {CORRESPONDENTS.map(op=>(
                      <div key={op.id} onClick={()=>setPayForm(p=>({...p,correspondent:op.id}))} style={{padding:'10px 12px',borderRadius:8,border:`1.5px solid ${payForm.correspondent===op.id?op.color:'rgba(255,255,255,0.08)'}`,background:payForm.correspondent===op.id?op.color+'12':'rgba(255,255,255,0.02)',cursor:'pointer',transition:'all 0.15s'}}>
                        <div style={{fontSize:12.5,fontWeight:600,color:payForm.correspondent===op.id?op.color:'rgba(255,255,255,0.6)'}}>{op.label}</div>
                        <div style={{fontSize:11,color:'rgba(255,255,255,0.3)'}}>{op.pays}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{marginBottom:20}}>
                  <label style={{display:'block',fontSize:11.5,fontWeight:600,color:'rgba(255,255,255,0.4)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}}>Numero de telephone</label>
                  <input style={{width:'100%',padding:'10px 12px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:7,color:'#e6edf3',fontFamily:'Inter,sans-serif',fontSize:15,outline:'none',colorScheme:'dark',boxSizing:'border-box'}}
                    type="tel" placeholder="Ex: 22996000000" value={payForm.phone} onChange={e=>setPayForm(p=>({...p,phone:e.target.value}))}/>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.25)',marginTop:5}}>Incluez le code pays (229 pour Benin, 228 pour Togo)</div>
                </div>
                <div style={{padding:'10px 14px',background:'rgba(0,120,212,0.06)',border:'1px solid rgba(0,120,212,0.15)',borderRadius:8,marginBottom:16}}>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.5)',lineHeight:1.6}}>Vous allez recevoir une notification USSD sur votre telephone. Approuvez le paiement pour activer votre abonnement.</div>
                </div>
                <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                  <button style={{...bB}} onClick={()=>{setShowPayModal(false);setPaying(null)}}>Annuler</button>
                  <button style={{...bP,opacity:paying?0.6:1}} disabled={!!paying} onClick={lancerPaiement}>{paying?'Envoi...':'Payer '+((periode==='mois'?selectedPlan.prix_mois_fcfa:selectedPlan.prix_an_fcfa)||0).toLocaleString('fr-FR')+' FCFA'}</button>
                </div>
              </div>
            )}

            {payStatus==='pending' && (
              <div style={{textAlign:'center',padding:'20px 0'}}>
                <div style={{fontSize:40,marginBottom:16}}>📱</div>
                <div style={{fontSize:16,fontWeight:600,color:'#e6edf3',marginBottom:8}}>En attente de confirmation</div>
                <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:20,lineHeight:1.7}}>Une notification USSD a ete envoyee sur votre telephone.<br/>Approuvez le paiement pour continuer.</div>
                <div style={{display:'flex',justifyContent:'center',gap:6}}>
                  {[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:'50%',background:'#0078d4',animation:`pulse 1.4s ease-in-out ${i*0.2}s infinite`}}/>)}
                </div>
                <style>{`@keyframes pulse{0%,80%,100%{opacity:0.3;transform:scale(0.8)}40%{opacity:1;transform:scale(1)}}`}</style>
                <div style={{marginTop:20,fontSize:12,color:'rgba(255,255,255,0.25)'}}>Ref: {depositId?.slice(0,8)}...</div>
              </div>
            )}

            {payStatus==='success' && (
              <div style={{textAlign:'center',padding:'20px 0'}}>
                <div style={{fontSize:40,marginBottom:16}}>✅</div>
                <div style={{fontSize:16,fontWeight:600,color:'#00c896',marginBottom:8}}>Paiement confirme !</div>
                <div style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>Votre abonnement {selectedPlan.nom} est maintenant actif.</div>
              </div>
            )}

            {payStatus==='failed' && (
              <div style={{textAlign:'center',padding:'20px 0'}}>
                <div style={{fontSize:40,marginBottom:16}}>❌</div>
                <div style={{fontSize:16,fontWeight:600,color:'#ef4444',marginBottom:8}}>Paiement echoue</div>
                <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:16}}>Le paiement n a pas pu etre traite.</div>
                <button style={{...bP,margin:'0 auto'}} onClick={()=>setPayStatus(null)}>Reessayer</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
