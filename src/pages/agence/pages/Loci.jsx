import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../store/authStore'

const SUGGESTIONS = [
  "Quel est mon taux d'occupation ce mois ?",
  "Quels biens génèrent le plus de revenus ?",
  "Y a-t-il des loyers en retard ?",
  "Donne-moi une analyse de mes locataires",
  "Quelles sont mes prévisions de revenus ?",
]

const SAMPLE_MESSAGES = [
  {
    role: 'assistant',
    content: "Bonjour ! Je suis **Loci**, votre assistant IA immobilier. Je peux analyser vos données, vous donner des insights sur vos biens, locataires et paiements, et vous aider à prendre de meilleures décisions. Comment puis-je vous aider aujourd'hui ?",
  }
]

export default function Loci() {
  const { profile } = useAuthStore()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [messages, setMessages] = useState(SAMPLE_MESSAGES)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ biens:0, locataires:0, revenus:0, retards:0, taux:0 })
  const [agence, setAgence] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    const init = async () => {
      try {
        const { data:{ user } } = await supabase.auth.getUser()
        const { data:ag } = await supabase.from('agences').select('*').eq('profile_id', user.id).single()
        setAgence(ag)
        if (ag?.id) {
          const [{ data:b },{ data:l },{ data:p }] = await Promise.all([
            supabase.from('biens').select('*').eq('agence_id', ag.id),
            supabase.from('locataires').select('*').eq('agence_id', ag.id),
            supabase.from('paiements').select('*').eq('agence_id', ag.id),
          ])
          const bD=b||[], lD=l||[], pD=p||[]
          const rev = pD.filter(x=>x.statut==='payé').reduce((s,x)=>s+Number(x.montant||0),0)
          const ret = pD.filter(x=>x.statut==='retard').length
          const occ = bD.length>0 ? Math.round((lD.length/bD.length)*100) : 0
          setStats({ biens:bD.length, locataires:lD.length, revenus:rev, retards:ret, taux:occ })
        }
      } catch(e) { console.error(e) }
    }
    init()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [messages])

  const sendMessage = async (text) => {
    const msg = text || input.trim()
    if (!msg) return
    setInput('')
    setMessages(prev => [...prev, { role:'user', content:msg }])
    setLoading(true)

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `Tu es Loci, un assistant IA spécialisé en gestion immobilière pour la plateforme Imoloc. 
Tu aides ${profile?.prenom || 'l\'utilisateur'} à gérer son organisation immobilière ${agence?.nom || ''}.
Données actuelles de l'organisation:
- Biens immobiliers: ${stats.biens}
- Locataires actifs: ${stats.locataires}
- Revenus totaux: ${stats.revenus.toLocaleString()} FCFA
- Loyers en retard: ${stats.retards}
- Taux d'occupation: ${stats.taux}%
Réponds en français, de façon concise, professionnelle et utile. Utilise des emojis appropriés.`,
          messages: [
            ...messages.filter(m=>m.role!=='assistant'||messages.indexOf(m)>0).map(m=>({
              role: m.role,
              content: m.content.replace(/\*\*/g,'')
            })),
            { role: 'user', content: msg }
          ]
        })
      })
      const data = await response.json()
      const reply = data.content?.[0]?.text || "Je n'ai pas pu générer une réponse."
      setMessages(prev => [...prev, { role:'assistant', content:reply }])
    } catch(e) {
      setMessages(prev => [...prev, { role:'assistant', content:"Désolé, une erreur est survenue. Veuillez réessayer." }])
    } finally {
      setLoading(false)
    }
  }

  const KPI = [
    { label:'Biens gérés', val:stats.biens, color:'#0078d4', icon:'🏢', trend:'+2 ce mois', up:true },
    { label:'Locataires actifs', val:stats.locataires, color:'#6c63ff', icon:'👥', trend:'Stable', up:null },
    { label:"Taux d'occupation", val:`${stats.taux}%`, color: stats.taux>70?'#00c896':'#f59e0b', icon:'📊', trend: stats.taux>70?'Bon niveau':'À améliorer', up:stats.taux>70 },
    { label:'Loyers en retard', val:stats.retards, color:stats.retards>0?'#ef4444':'#00c896', icon:'⚠️', trend:stats.retards>0?'Action requise':'Tout à jour', up:stats.retards===0 },
    { label:'Revenus totaux', val:`${(stats.revenus/1000).toFixed(0)}K FCFA`, color:'#00c896', icon:'💰', trend:'Ce mois', up:true },
  ]

  const INSIGHTS = [
    {
      type:'info', icon:'💡', title:'Optimisation des loyers',
      desc:`Votre taux d'occupation est de ${stats.taux}%. ${stats.taux<80?'Des biens libres représentent un manque à gagner. Analysez votre positionnement tarifaire.':'Excellent niveau ! Envisagez une révision des loyers à la hausse.'}`,
      action:'Analyser', color:'#0078d4'
    },
    {
      type: stats.retards>0?'warning':'success', icon: stats.retards>0?'⚠️':'✅',
      title: stats.retards>0?`${stats.retards} loyer${stats.retards>1?'s':''} en retard`:'Paiements à jour',
      desc: stats.retards>0?'Des locataires ont des impayés. Une relance automatique est recommandée.':'Tous les loyers ont été payés. Excellente gestion des paiements !',
      action:'Voir les détails', color:stats.retards>0?'#f59e0b':'#00c896'
    },
    {
      type:'info', icon:'📈', title:'Prévision revenus',
      desc:`Sur la base de vos ${stats.locataires} locataires actifs, votre revenu mensuel estimé est de ${(stats.revenus).toLocaleString()} FCFA. Potentiel d'optimisation détecté.`,
      action:'Voir la prévision', color:'#6c63ff'
    },
    {
      type:'tip', icon:'🎯', title:'Recommandation IA',
      desc:'Ajoutez des photos et descriptions détaillées à vos biens libres pour augmenter votre taux d\'occupation de 25% en moyenne.',
      action:'Appliquer', color:'#00c896'
    },
  ]

  const OUTILS = [
    { icon:'📊', title:'Rapport de performance', desc:'Analyse complète de vos KPIs immobiliers', color:'#0078d4' },
    { icon:'🔮', title:'Prévisions de revenus', desc:'Projection sur 3, 6, 12 mois', color:'#6c63ff' },
    { icon:'📍', title:'Analyse du marché', desc:'Comparaison avec le marché local', color:'#00c896' },
    { icon:'⚖️', title:'Optimisation des loyers', desc:'Suggestions de révision tarifaire', color:'#f59e0b' },
    { icon:'🔔', title:'Alertes intelligentes', desc:'Notifications proactives et prioritaires', color:'#ef4444' },
    { icon:'📋', title:'Rapport locataires', desc:'Scoring et analyse comportementale', color:'#4da6ff' },
  ]

  return (
    <>
      <style>{`
        .loci-header{margin-bottom:24px}
        .loci-brand{display:flex;align-items:center;gap:12px;margin-bottom:6px}
        .loci-brand-icon{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#6c63ff,#00c896);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
        .loci-brand-name{font-size:26px;font-weight:800;background:linear-gradient(135deg,#a78bfa,#34d399);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-0.02em}
        .loci-brand-badge{font-size:11px;padding:2px 8px;border-radius:100px;background:linear-gradient(135deg,rgba(108,99,255,0.2),rgba(0,200,150,0.2));color:#a78bfa;border:1px solid rgba(108,99,255,0.3)}
        .loci-sub{font-size:14px;color:rgba(255,255,255,0.4);margin-bottom:16px}
        .loci-tabs{display:flex;gap:4px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:4px;margin-bottom:24px;width:fit-content}
        .loci-tab{padding:8px 18px;border-radius:6px;font-size:13.5px;font-weight:500;cursor:pointer;border:none;background:none;font-family:'Inter',sans-serif;color:rgba(255,255,255,0.45);transition:all 0.15s;display:flex;align-items:center;gap:7px}
        .loci-tab:hover{color:rgba(255,255,255,0.75)}
        .loci-tab.active{background:rgba(255,255,255,0.07);color:#e6edf3}

        /* KPIs */
        .loci-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:24px}
        .loci-kpi{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:16px;transition:all 0.2s;cursor:pointer}
        .loci-kpi:hover{border-color:rgba(255,255,255,0.12);transform:translateY(-2px)}
        .loci-kpi-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
        .loci-kpi-icon{font-size:20px}
        .loci-kpi-trend{font-size:11px;font-weight:500;padding:2px 7px;border-radius:100px}
        .loci-kpi-val{font-size:22px;font-weight:800;margin-bottom:3px;letter-spacing:-0.02em}
        .loci-kpi-lbl{font-size:12px;color:rgba(255,255,255,0.35)}

        /* Grid */
        .loci-grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
        .loci-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:16px}
        .loci-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:20px}
        .loci-card-title{font-size:13px;font-weight:600;color:rgba(255,255,255,0.5);margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;text-transform:uppercase;letter-spacing:0.06em}
        .loci-card-link{font-size:12px;color:#4da6ff;cursor:pointer;font-weight:400;text-transform:none;letter-spacing:0}

        /* Insights */
        .loci-insight{display:flex;gap:12px;padding:14px;border-radius:8px;margin-bottom:10px;border:1px solid;cursor:pointer;transition:all 0.15s}
        .loci-insight:hover{transform:translateY(-1px)}
        .loci-insight-icon{font-size:20px;flex-shrink:0;margin-top:2px}
        .loci-insight-title{font-size:13.5px;font-weight:600;color:#e6edf3;margin-bottom:4px}
        .loci-insight-desc{font-size:12.5px;color:rgba(255,255,255,0.45);line-height:1.6}
        .loci-insight-action{font-size:12px;font-weight:600;margin-top:8px;display:inline-block}

        /* Bar chart simulé */
        .loci-bars{display:flex;align-items:flex-end;gap:6px;height:100px;margin-bottom:8px}
        .loci-bar{flex:1;border-radius:4px 4px 0 0;min-height:8px;transition:height 0.3s}
        .loci-bar-lbl{font-size:10px;color:rgba(255,255,255,0.3);text-align:center}
        .loci-bar-labels{display:flex;gap:6px}
        .loci-bar-label{flex:1;text-align:center}

        /* Donut */
        .loci-donut{position:relative;width:100px;height:100px;margin:0 auto 12px}
        .loci-donut svg{transform:rotate(-90deg)}
        .loci-donut-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#e6edf3}
        .loci-donut-sub{font-size:10px;color:rgba(255,255,255,0.35)}

        /* Outils */
        .loci-outil{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid rgba(255,255,255,0.07);border-radius:8px;cursor:pointer;transition:all 0.15s}
        .loci-outil:hover{border-color:rgba(255,255,255,0.14);background:rgba(255,255,255,0.03);transform:translateY(-1px)}
        .loci-outil-icon{width:38px;height:38px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}

        /* Chat */
        .loci-chat{display:flex;flex-direction:column;height:calc(100vh - 280px);min-height:500px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:12px;overflow:hidden}
        .loci-chat-header{padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;gap:10px;flex-shrink:0}
        .loci-chat-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#6c63ff,#00c896);display:flex;align-items:center;justify-content:center;font-size:14px}
        .loci-chat-name{font-size:14px;font-weight:600;background:linear-gradient(135deg,#a78bfa,#34d399);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .loci-chat-status{font-size:11px;color:#00c896;display:flex;align-items:center;gap:4px}
        .loci-chat-status::before{content:'';width:6px;height:6px;border-radius:50%;background:#00c896;display:inline-block}
        .loci-messages{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:14px}
        .loci-messages::-webkit-scrollbar{width:4px}
        .loci-messages::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        .loci-msg{display:flex;gap:10px;max-width:85%}
        .loci-msg.user{align-self:flex-end;flex-direction:row-reverse}
        .loci-msg-avatar{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;margin-top:2px}
        .loci-msg-bubble{padding:12px 16px;border-radius:12px;font-size:13.5px;line-height:1.65;max-width:100%}
        .loci-msg.assistant .loci-msg-bubble{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.8);border-radius:2px 12px 12px 12px}
        .loci-msg.user .loci-msg-bubble{background:linear-gradient(135deg,rgba(108,99,255,0.25),rgba(0,200,150,0.15));border:1px solid rgba(108,99,255,0.3);color:#e6edf3;border-radius:12px 2px 12px 12px}
        .loci-typing{display:flex;gap:4px;align-items:center;padding:14px 16px}
        .loci-typing span{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,0.3);animation:loci-bounce 1.2s infinite}
        .loci-typing span:nth-child(2){animation-delay:0.2s}
        .loci-typing span:nth-child(3){animation-delay:0.4s}
        @keyframes loci-bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
        .loci-suggestions{display:flex;gap:6px;flex-wrap:wrap;padding:12px 20px;border-top:1px solid rgba(255,255,255,0.06)}
        .loci-sug{padding:6px 12px;border-radius:100px;font-size:12.5px;cursor:pointer;border:1px solid rgba(108,99,255,0.25);background:rgba(108,99,255,0.08);color:rgba(167,139,250,0.9);transition:all 0.15s;white-space:nowrap}
        .loci-sug:hover{background:rgba(108,99,255,0.18);color:#a78bfa}
        .loci-input-area{padding:14px 16px;border-top:1px solid rgba(255,255,255,0.07);display:flex;gap:10px;align-items:flex-end;flex-shrink:0}
        .loci-input{flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px 14px;font-family:'Inter',sans-serif;font-size:13.5px;color:#e6edf3;outline:none;resize:none;min-height:42px;max-height:120px;transition:border-color 0.15s;line-height:1.5}
        .loci-input:focus{border-color:rgba(108,99,255,0.4)}
        .loci-input::placeholder{color:rgba(255,255,255,0.25)}
        .loci-send{width:38px;height:38px;border-radius:8px;background:linear-gradient(135deg,#6c63ff,#00c896);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity 0.15s}
        .loci-send:hover{opacity:0.85}
        .loci-send:disabled{opacity:0.35;cursor:not-allowed}

        @media(max-width:1200px){.loci-kpis{grid-template-columns:repeat(3,1fr)}}
        @media(max-width:900px){.loci-grid2,.loci-grid3{grid-template-columns:1fr}.loci-kpis{grid-template-columns:1fr 1fr}}
        @media(max-width:600px){.loci-kpis{grid-template-columns:1fr}}
      `}</style>

      {/* Header */}
      <div className="loci-header">
        <div className="loci-brand">
          <div className="loci-brand-icon">✨</div>
          <span className="loci-brand-name">Loci</span>
          <span className="loci-brand-badge">IA Imoloc</span>
        </div>
        <div className="loci-sub">
          Intelligence artificielle dédiée à votre gestion immobilière · Bonjour, {profile?.prenom || 'Admin'} 👋
        </div>

        {/* Tabs */}
        <div className="loci-tabs">
          <button className={`loci-tab ${activeTab==='dashboard'?'active':''}`} onClick={()=>setActiveTab('dashboard')}>
            📊 Tableau de bord
          </button>
          <button className={`loci-tab ${activeTab==='chat'?'active':''}`} onClick={()=>setActiveTab('chat')}>
            💬 Discuter avec Loci
          </button>
          <button className={`loci-tab ${activeTab==='outils'?'active':''}`} onClick={()=>setActiveTab('outils')}>
            🛠️ Outils décisionnels
          </button>
        </div>
      </div>

      {/* ══ TABLEAU DE BORD ══ */}
      {activeTab==='dashboard' && (
        <>
          {/* KPIs */}
          <div className="loci-kpis">
            {KPI.map((k,i)=>(
              <div key={i} className="loci-kpi">
                <div className="loci-kpi-top">
                  <span className="loci-kpi-icon">{k.icon}</span>
                  <span className="loci-kpi-trend" style={{
                    background:k.up===true?'rgba(0,200,150,0.12)':k.up===false?'rgba(239,68,68,0.12)':'rgba(255,255,255,0.06)',
                    color:k.up===true?'#00c896':k.up===false?'#ef4444':'rgba(255,255,255,0.4)'
                  }}>{k.trend}</span>
                </div>
                <div className="loci-kpi-val" style={{color:k.color}}>{k.val}</div>
                <div className="loci-kpi-lbl">{k.label}</div>
              </div>
            ))}
          </div>

          <div className="loci-grid2">
            {/* Insights IA */}
            <div className="loci-card">
              <div className="loci-card-title">
                ✨ Insights IA
                <span className="loci-card-link" onClick={()=>setActiveTab('chat')}>Demander à Loci →</span>
              </div>
              {INSIGHTS.map((ins,i)=>(
                <div key={i} className="loci-insight" style={{
                  borderColor:ins.type==='warning'?'rgba(245,158,11,0.2)':ins.type==='success'?'rgba(0,200,150,0.2)':'rgba(0,120,212,0.15)',
                  background:ins.type==='warning'?'rgba(245,158,11,0.05)':ins.type==='success'?'rgba(0,200,150,0.05)':'rgba(0,120,212,0.04)'
                }}>
                  <div className="loci-insight-icon">{ins.icon}</div>
                  <div style={{flex:1}}>
                    <div className="loci-insight-title">{ins.title}</div>
                    <div className="loci-insight-desc">{ins.desc}</div>
                    <span className="loci-insight-action" style={{color:ins.color}}>{ins.action} →</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              {/* Occupation donut */}
              <div className="loci-card">
                <div className="loci-card-title">Taux d'occupation</div>
                <div className="loci-donut">
                  <svg width="100" height="100" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10"/>
                    <circle cx="50" cy="50" r="38" fill="none"
                      stroke={stats.taux>70?'#00c896':'#f59e0b'}
                      strokeWidth="10"
                      strokeDasharray={`${(stats.taux/100)*239} 239`}
                      strokeLinecap="round"/>
                  </svg>
                  <div className="loci-donut-center">
                    <span>{stats.taux}%</span>
                    <span className="loci-donut-sub">occupation</span>
                  </div>
                </div>
                <div style={{display:'flex',justifyContent:'center',gap:16,fontSize:12,color:'rgba(255,255,255,0.4)'}}>
                  <span style={{color:'#0078d4'}}>■ Occupés: {stats.locataires}</span>
                  <span style={{color:'rgba(255,255,255,0.3)'}}>■ Libres: {Math.max(0,stats.biens-stats.locataires)}</span>
                </div>
              </div>

              {/* Revenus simulés */}
              <div className="loci-card">
                <div className="loci-card-title">Revenus (6 derniers mois)</div>
                <div className="loci-bars">
                  {['Oct','Nov','Déc','Jan','Fév','Mar'].map((m,i)=>{
                    const heights = [40,55,45,70,60,100]
                    const colors = ['rgba(0,120,212,0.4)','rgba(0,120,212,0.5)','rgba(0,120,212,0.45)','rgba(0,120,212,0.6)','rgba(0,120,212,0.65)','#0078d4']
                    return <div key={i} className="loci-bar" style={{height:`${heights[i]}px`,background:colors[i]}}/>
                  })}
                </div>
                <div className="loci-bar-labels">
                  {['Oct','Nov','Déc','Jan','Fév','Mar'].map((m,i)=>(
                    <span key={i} className="loci-bar-lbl">{m}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Prévisions */}
          <div className="loci-card" style={{marginBottom:16}}>
            <div className="loci-card-title">
              🔮 Prévisions de revenus
              <span className="loci-card-link">Voir l'analyse complète →</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
              {[
                { periode:'Ce mois', val: stats.revenus, color:'#0078d4' },
                { periode:'3 mois', val: stats.revenus*3*1.02, color:'#6c63ff' },
                { periode:'6 mois', val: stats.revenus*6*1.04, color:'#00c896' },
                { periode:'12 mois', val: stats.revenus*12*1.06, color:'#f59e0b' },
              ].map((p,i)=>(
                <div key={i} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:8,padding:'14px 16px'}}>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.35)',marginBottom:6}}>{p.periode}</div>
                  <div style={{fontSize:18,fontWeight:700,color:p.color,letterSpacing:'-0.02em'}}>{Math.round(p.val/1000)}K FCFA</div>
                  {i>0&&<div style={{fontSize:11,color:'#00c896',marginTop:4}}>+{((i)*2).toFixed(0)}% estimé</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Analyse rapide */}
          <div className="loci-grid3">
            {[
              { title:'Score de gestion', val:'87/100', icon:'⭐', desc:'Excellente gestion globale', color:'#f59e0b' },
              { title:'Risque locataire', val:stats.retards>0?'Moyen':'Faible', icon:'🛡️', desc:stats.retards>0?`${stats.retards} impayés détectés`:'Aucun risque détecté', color:stats.retards>0?'#f59e0b':'#00c896' },
              { title:'Potentiel d\'optimisation', val:'+15%', icon:'📈', desc:'Revenus supplémentaires possibles', color:'#6c63ff' },
            ].map((item,i)=>(
              <div key={i} className="loci-card" style={{cursor:'pointer'}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                  <span style={{fontSize:24}}>{item.icon}</span>
                  <span style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.5)'}}>{item.title}</span>
                </div>
                <div style={{fontSize:24,fontWeight:800,color:item.color,marginBottom:4,letterSpacing:'-0.02em'}}>{item.val}</div>
                <div style={{fontSize:12.5,color:'rgba(255,255,255,0.35)'}}>{item.desc}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ══ CHAT LOCI ══ */}
      {activeTab==='chat' && (
        <div className="loci-chat">
          <div className="loci-chat-header">
            <div className="loci-chat-avatar">✨</div>
            <div>
              <div className="loci-chat-name">Loci</div>
              <div className="loci-chat-status">En ligne · Prêt à vous aider</div>
            </div>
          </div>

          <div className="loci-messages">
            {messages.map((msg,i)=>(
              <div key={i} className={`loci-msg ${msg.role}`}>
                {msg.role==='assistant' ? (
                  <div className="loci-msg-avatar" style={{background:'linear-gradient(135deg,#6c63ff,#00c896)',color:'#fff'}}>✨</div>
                ) : (
                  <div className="loci-msg-avatar" style={{background:'linear-gradient(135deg,#0078d4,#6c63ff)',color:'#fff'}}>
                    {profile?.prenom?.[0]?.toUpperCase()||'A'}
                  </div>
                )}
                <div className="loci-msg-bubble">
                  {msg.content.split('\n').map((line,j)=>(
                    <span key={j}>
                      {line.split('**').map((part,k)=>k%2===1?<strong key={k}>{part}</strong>:part)}
                      {j<msg.content.split('\n').length-1&&<br/>}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {loading && (
              <div className="loci-msg assistant">
                <div className="loci-msg-avatar" style={{background:'linear-gradient(135deg,#6c63ff,#00c896)',color:'#fff'}}>✨</div>
                <div className="loci-msg-bubble" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)'}}>
                  <div className="loci-typing">
                    <span/><span/><span/>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef}/>
          </div>

          <div className="loci-suggestions">
            {SUGGESTIONS.map((s,i)=>(
              <button key={i} className="loci-sug" onClick={()=>sendMessage(s)}>{s}</button>
            ))}
          </div>

          <div className="loci-input-area">
            <textarea
              className="loci-input"
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}}}
              placeholder="Posez une question à Loci... (Entrée pour envoyer)"
              rows={1}
            />
            <button className="loci-send" onClick={()=>sendMessage()} disabled={loading||!input.trim()}>
              <svg width="16" height="16" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ══ OUTILS DÉCISIONNELS ══ */}
      {activeTab==='outils' && (
        <>
          <div style={{marginBottom:20}}>
            <div style={{fontSize:16,fontWeight:700,color:'#e6edf3',marginBottom:6}}>Outils d'analyse et de décision</div>
            <div style={{fontSize:13.5,color:'rgba(255,255,255,0.4)'}}>Exploitez vos données immobilières pour prendre de meilleures décisions stratégiques.</div>
          </div>
          <div className="loci-grid3">
            {OUTILS.map((o,i)=>(
              <div key={i} className="loci-outil">
                <div className="loci-outil-icon" style={{background:`${o.color}18`}}>{o.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13.5,fontWeight:600,color:'#e6edf3',marginBottom:3}}>{o.title}</div>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.35)'}}>{o.desc}</div>
                </div>
                <svg width="14" height="14" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
                </svg>
              </div>
            ))}
          </div>

          {/* BI Section */}
          <div className="loci-card" style={{marginTop:8}}>
            <div className="loci-card-title">📊 Business Intelligence — Vue globale</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
              {[
                { label:'Rentabilité brute', val:'8.2%', trend:'+0.3%', color:'#00c896' },
                { label:'Délai moyen de paiement', val:'3.2 jours', trend:'-0.5j', color:'#0078d4' },
                { label:'Taux d\'impayés', val:stats.retards>0?`${((stats.retards/Math.max(stats.locataires,1))*100).toFixed(1)}%`:'0%', trend:stats.retards>0?'À surveiller':'Excellent', color:stats.retards>0?'#f59e0b':'#00c896' },
                { label:'Valeur locative estimée', val:`${(stats.revenus*12/1000).toFixed(0)}K FCFA/an`, trend:'Estimation', color:'#6c63ff' },
                { label:'Parc immobilier', val:`${stats.biens} biens`, trend:`${Math.max(0,stats.biens-stats.locataires)} libres`, color:'#4da6ff' },
                { label:'Score Loci', val:'87/100', trend:'Excellent', color:'#f59e0b' },
              ].map((item,i)=>(
                <div key={i} style={{background:'rgba(255,255,255,0.03)',borderRadius:8,padding:'14px 16px',border:'1px solid rgba(255,255,255,0.06)'}}>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.35)',marginBottom:6}}>{item.label}</div>
                  <div style={{fontSize:20,fontWeight:700,color:item.color,marginBottom:4}}>{item.val}</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.3)'}}>{item.trend}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}
