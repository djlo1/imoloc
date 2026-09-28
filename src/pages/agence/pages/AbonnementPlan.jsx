import { useState, useEffect } from 'react'
import { Check, Mail } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'
import ProgressBar from '../../../components/ui/ProgressBar'
import PawapayCheckoutModal from '../components/PawapayCheckoutModal'

// Correspondance code plans.code (nouveau catalogue) -> valeur enum
// plan_abonnement (abonnements.plan / pawapay_transactions.plan_id), telle
// que definie par abonnements_map_plan_id() en base. "Imoloc Business
// Premium" n a pas de valeur enum moderne dediee (seule l ancienne valeur
// historique 'premium' y pointe) : non vendable en libre-service pour
// l instant, comme avant cette refonte.
const CODE_TO_ENUM = {
  organisation_starter: 'starter_o',
  organisation_business: 'business_o',
  organisation_business_premium: 'business_premium_o',
  organisation_enterprise: 'enterprise_o',
  particulier_starter: 'starter_p',
  particulier_pro: 'pro_p',
}
const PLAN_COULEURS = { organisation_starter:'#0078d4', organisation_business:'#00c896', organisation_business_premium:'#f59e0b', organisation_enterprise:'#8b5cf6', particulier_starter:'#0078d4', particulier_pro:'#00c896' }

const STATUT_CFG = {
  actif:      { color:'#00c896', bg:'rgba(0,200,150,0.1)', label:'Actif' },
  essai:      { color:'#0078d4', bg:'rgba(0,120,212,0.1)', label:'Essai gratuit' },
  expire:     { color:'#ef4444', bg:'rgba(239,68,68,0.1)', label:'Expire' },
  annule:     { color:'#8b949e', bg:'rgba(139,148,158,0.1)', label:'Annule' },
  en_attente: { color:'#f59e0b', bg:'rgba(245,158,11,0.1)', label:'En attente de paiement' },
  suspendu:   { color:'#ef4444', bg:'rgba(239,68,68,0.1)', label:'Suspendu' },
}

export default function AbonnementPlan() {
  const [tab, setTab]             = useState('plan')
  const [agence, setAgence]       = useState(null)
  const [abonnement, setAbonnement] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [periode, setPeriode]     = useState('mois')
  const [typeCompte, setTypeCompte] = useState('organisation')
  const [plansCatalogue, setPlansCatalogue] = useState([])

  useEffect(() => { init() }, [])

  const init = async () => {
    setLoading(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      const { data:ag } = await supabase.from('agences').select('*').eq('profile_id', user.id).single()
      setAgence(ag)
      if (ag?.id) {
        const { data:abList } = await supabase.from('abonnements').select('*').eq('agence_id', ag.id).order('created_at',{ascending:false}).limit(1)
        if (abList?.[0]) setAbonnement(abList[0])
      }
      const { data:prof } = await supabase.from('profiles').select('type_compte').eq('id', user.id).maybeSingle()
      if (prof?.type_compte) setTypeCompte(prof.type_compte === 'particulier' ? 'particulier' : 'organisation')

      // Vrai catalogue (remplace l ancien objet PLANS code en dur) — inclut
      // le nombre de licences Imoloc Manager incluses par palier, necessaire
      // pour calculer le prix des sieges supplementaires a l achat.
      const { data: plans } = await supabase.from('plans')
        .select('id, code, nom, famille, prix_mensuel, prix_mensuel_annuel, cout_utilisateur_supplementaire, quota_biens, quota_proprietaires, quota_stockage_go, est_sur_devis')
        .order('ordre_affichage')
      const { data: licenceManager } = await supabase.from('licences').select('id').eq('type', 'imoloc_standard').maybeSingle()
      let inclusMap = {}
      if (licenceManager?.id) {
        const { data: pl } = await supabase.from('plans_licences').select('plan_id, licences_incluses').eq('licence_id', licenceManager.id)
        ;(pl || []).forEach(r => { inclusMap[r.plan_id] = r.licences_incluses })
      }
      setPlansCatalogue((plans || []).map(p => ({ ...p, licences_incluses_manager: inclusMap[p.id] ?? 1 })))
    } catch(e) { console.error('Init error:', e) }
    finally { setLoading(false) }
  }

  const getPlanInfo = () => plansCatalogue.find(p => p.id === abonnement?.plan_id) || null

  const [selectedPlan, setSelectedPlan] = useState(null)
  const [nombreLicences, setNombreLicences] = useState(1)
  const [showSeatStep, setShowSeatStep] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)

  const souscirePlan = (plan) => {
    if (plan.est_sur_devis) {
      toast('Contactez-nous pour cette offre : contact@imoloc.lt', { icon: <Mail size={16}/> })
      return
    }
    setSelectedPlan(plan)
    if (plan.famille === 'organisation') {
      setNombreLicences(plan.licences_incluses_manager || 1)
      setShowSeatStep(true)
    } else {
      // Comptes particulier : mono-utilisateur, pas de selection de sieges.
      setNombreLicences(1)
      setShowPayModal(true)
    }
  }

  const seatsInclus = selectedPlan?.licences_incluses_manager ?? 1
  const extraSeats = Math.max(0, nombreLicences - seatsInclus)
  const prixBase = periode === 'mois' ? selectedPlan?.prix_mensuel : selectedPlan?.prix_mensuel_annuel
  const montantMensuelEquiv = Number(prixBase || 0) + extraSeats * Number(selectedPlan?.cout_utilisateur_supplementaire || 0)
  const montantTotal = periode === 'mois' ? montantMensuelEquiv : montantMensuelEquiv * 12

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
        <div style={{ fontSize:22, fontWeight:700, color:'#e6edf3', marginBottom:20 }}>Votre abonnement</div>

        <div style={{ display:'flex', gap:2, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:3, marginBottom:24, width:'fit-content' }}>
          {[['plan','Plan actuel'],['changer','Changer de plan']].map(([k,l])=>(
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
                {planInfo && <div style={{ fontSize:24, fontWeight:700, color:'#00c896' }}>{fmt(planInfo.prix_mensuel)} FCFA<span style={{ fontSize:14, color:'rgba(255,255,255,0.4)', fontWeight:400 }}>/mois</span></div>}
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
                  { label:'Biens', val:agence?._count?.biens||0, max:planInfo?.quota_biens ?? null },
                  { label:'Proprietaires', val:agence?._count?.proprietaires||0, max:planInfo?.quota_proprietaires ?? null },
                  { label:'Stockage', val:'—', max:planInfo?.quota_stockage_go ? planInfo.quota_stockage_go+' Go' : null, nobar:true },
                ].map(({label,val,max,nobar})=>{
                  const pct = !nobar && max ? Math.min((Number(val)/Number(max))*100,100) : 0
                  return (
                  <div key={label}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                      <span style={{ fontSize:13, color:'rgba(255,255,255,0.5)' }}>{label}</span>
                      <span style={{ fontSize:13, fontWeight:600, color: pct>=80?'#ef4444':'#e6edf3' }}>{val}{max&&!nobar?' / '+max:''}</span>
                    </div>
                    {!nobar && max && <ProgressBar value={Number(val)} max={Number(max)} height={5}/>}
                  </div>
                )})}
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

            {(() => {
              const liste = plansCatalogue.filter(p => p.famille === typeCompte && CODE_TO_ENUM[p.code])
              const RECOMMANDE = new Set(['particulier_pro','organisation_business'])
              return (
                <div style={{ display:'grid', gridTemplateColumns:`repeat(${liste.length||1},1fr)`, gap:16 }}>
                  {liste.map(plan => {
                    const isCurrent = abonnement?.plan_id === plan.id
                    const prix = periode === 'mois' ? plan.prix_mensuel : plan.prix_mensuel_annuel
                    const couleur = PLAN_COULEURS[plan.code] || '#0078d4'
                    const feats = plan.famille === 'organisation'
                      ? [`${plan.quota_biens ?? 'Illimite'} biens`, `${plan.quota_proprietaires ?? 'Illimite'} proprietaires`, `${plan.quota_stockage_go} Go de stockage`, `${plan.licences_incluses_manager} licence(s) Imoloc Manager incluse(s)`, `${fmt(plan.cout_utilisateur_supplementaire)} FCFA/licence supplementaire`]
                      : [`${plan.quota_biens ?? 'Illimite'} biens`, `${plan.quota_stockage_go} Go de stockage`]
                    return (
                      <div key={plan.id} className={'plan-card'+(isCurrent?' active':'')+(RECOMMANDE.has(plan.code)?' recommande':'')}>
                        {RECOMMANDE.has(plan.code) && <div style={{ position:'absolute', top:-11, left:'50%', transform:'translateX(-50%)', fontSize:11, fontWeight:700, padding:'2px 12px', borderRadius:100, background:couleur, color:'#fff', whiteSpace:'nowrap' }}>Recommande</div>}
                        {isCurrent && <div style={{ position:'absolute', top:-11, right:16, fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:100, background:'#0078d4', color:'#fff' }}>Actuel</div>}

                        <div style={{ fontSize:18, fontWeight:700, color:couleur, marginBottom:16 }}>{plan.nom}</div>

                        <div style={{ marginBottom:20 }}>
                          <span style={{ fontSize:30, fontWeight:800, color:'#e6edf3' }}>{fmt(prix)}</span>
                          <span style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginLeft:4 }}>FCFA{periode==='mois'?'/mois':'/mois (annuel)'}</span>
                        </div>

                        <div style={{ flex:1, marginBottom:20 }}>
                          {feats.map((f,i)=>(
                            <div key={i} className="feat-item">
                              <Check size={14} style={{ color:couleur, flexShrink:0 }}/> {f}
                            </div>
                          ))}
                        </div>

                        <button
                          style={{ ...bP, width:'100%', justifyContent:'center', background:isCurrent?'rgba(255,255,255,0.05)':couleur, borderColor:isCurrent?'rgba(255,255,255,0.1)':couleur, color:isCurrent?'rgba(255,255,255,0.4)':'#fff', cursor:isCurrent?'default':'pointer' }}
                          disabled={isCurrent}
                          onClick={()=>!isCurrent&&souscirePlan(plan)}>
                          {isCurrent?'Plan actuel':'Souscrire'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )
            })()}

            <div style={{ marginTop:20, padding:'14px 18px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8 }}>
              <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.4)', lineHeight:1.7 }}>
                Paiement securise via <strong style={{ color:'#00c896' }}>Mobile Money</strong> (MTN, Moov, Orange, Wave).
                Besoin d aide ? <span style={{ color:'#4da6ff', cursor:'pointer' }}>contact@imoloc.lt</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ETAPE INTERMEDIAIRE : NOMBRE DE LICENCES (organisation uniquement) */}
      {showSeatStep && selectedPlan && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:499,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:'#0d1117',border:'1px solid rgba(255,255,255,0.12)',borderRadius:14,width:'100%',maxWidth:420,padding:28}}>
            <div style={{fontSize:17,fontWeight:700,color:'#e6edf3',marginBottom:4}}>Nombre de licences Imoloc Manager</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:20,lineHeight:1.6}}>
              Plan {selectedPlan.nom} — {seatsInclus} incluse(s), {fmt(selectedPlan.cout_utilisateur_supplementaire)} FCFA/mois par licence supplementaire.
            </div>
            <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:20}}>
              <button style={bB} onClick={()=>setNombreLicences(n=>Math.max(seatsInclus,n-1))}>−</button>
              <div style={{fontSize:24,fontWeight:700,color:'#e6edf3',minWidth:44,textAlign:'center'}}>{nombreLicences}</div>
              <button style={bB} onClick={()=>setNombreLicences(n=>n+1)}>+</button>
              <span style={{fontSize:12,color:'rgba(255,255,255,0.35)'}}>licence(s) au total</span>
            </div>
            <div style={{padding:'12px 14px',background:'rgba(255,255,255,0.03)',borderRadius:8,marginBottom:20,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:13,color:'rgba(255,255,255,0.5)'}}>Total {periode==='mois'?'mensuel':'annuel'}</span>
              <span style={{fontSize:16,fontWeight:700,color:'#00c896'}}>{fmt(montantTotal)} FCFA</span>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button style={bB} onClick={()=>setShowSeatStep(false)}>Annuler</button>
              <button style={bP} onClick={()=>{setShowSeatStep(false);setShowPayModal(true)}}>Continuer</button>
            </div>
          </div>
        </div>
      )}

      <PawapayCheckoutModal
        open={showPayModal}
        planNom={selectedPlan?.nom}
        planCode={CODE_TO_ENUM[selectedPlan?.code]}
        montant={montantTotal}
        periode={periode==='mois'?'mensuel':'annuel'}
        nombreLicences={nombreLicences}
        agenceId={agence?.id}
        onClose={()=>setShowPayModal(false)}
        onSuccess={()=>{ init(); setTab('plan') }}
      />
    </>
  )
}
