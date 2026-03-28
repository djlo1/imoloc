import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../store/authStore'

const SUPABASE_URL = 'https://zecyfnurrcslukxvmpca.supabase.co'

const SUGGESTIONS = [
  "Quel est mon taux d'occupation ?",
  "Analyse mes revenus ce mois",
  "Y a-t-il des loyers en retard ?",
  "Donne-moi des recommandations",
  "Prévisions de revenus sur 6 mois",
  "Comment optimiser mes loyers ?",
]

export default function Loci() {
  const { profile } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ biens:0, biensLibres:0, biensOccupes:0, biensMaintenance:0, locataires:0, revenus:0, revenusMois:0, retards:0, enAttente:0, taux:0, utilisateurs:0, equipes:0, invitationsEnAttente:0, totalPaiements:0, paiementsPayes:0, _biens:[], _utilisateurs:[], _equipes:[], _invitations:[], _monRole:'agent' })
  const [agence, setAgence] = useState(null)
  const [messages, setMessages] = useState([{
    role:'assistant',
    content:`Bonjour ${profile?.prenom || ''} ! Je suis **Loci**, votre assistant IA immobilier. Je connais vos données en temps réel et je suis là pour vous aider à prendre de meilleures décisions. Posez-moi n'importe quelle question sur vos biens, locataires ou finances ! 🏠✨`,
    model:'loci'
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [thinking, setThinking] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const currentTab = location.pathname.includes('/chat') ? 'chat'
    : location.pathname.includes('/outils') ? 'outils'
    : 'dashboard'

  useEffect(() => {
    const init = async () => {
      try {
        const { data:{ user } } = await supabase.auth.getUser()

        // Profil de l'utilisateur connecté
        const { data:myProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

        // Agence
        const { data:ag } = await supabase.from('agences').select('*').eq('profile_id', user.id).single()
        setAgence(ag)

        if (ag?.id) {
          const [
            { data:b },{ data:l },{ data:p },
            { data:au },{ data:eq },{ data:inv },{ data:baux }
          ] = await Promise.all([
            supabase.from('biens').select('*').eq('agence_id', ag.id),
            supabase.from('locataires').select('*').eq('agence_id', ag.id),
            supabase.from('paiements').select('*').eq('agence_id', ag.id),
            supabase.from('agence_users').select('*').eq('agence_id', ag.id),
            supabase.from('equipes').select('*, equipe_membres(*)').eq('agence_id', ag.id),
            supabase.from('invitations').select('*').eq('agence_id', ag.id),
            supabase.from('baux').select('*').limit(100),
          ])

          const bD=b||[], lD=l||[], pD=p||[], auD=au||[], eqD=eq||[], invD=inv||[]

          const rev = pD.filter(x=>x.statut==='payé').reduce((s,x)=>s+Number(x.montant||0),0)
          const ret = pD.filter(x=>x.statut==='retard').length
          const attente = pD.filter(x=>x.statut==='en attente').length
          const occ = bD.length>0 ? Math.round((lD.length/bD.length)*100) : 0
          const revMois = pD.filter(x=>x.statut==='payé'&&new Date(x.date_paiement).getMonth()===new Date().getMonth()).reduce((s,x)=>s+Number(x.montant||0),0)

          setStats({
            biens:bD.length,
            biensLibres: bD.filter(x=>x.statut==='libre').length,
            biensOccupes: bD.filter(x=>x.statut==='occupé').length,
            biensMaintenance: bD.filter(x=>x.statut==='maintenance').length,
            locataires:lD.length,
            revenus:rev,
            revenusMois:revMois,
            retards:ret,
            enAttente:attente,
            taux:occ,
            utilisateurs: auD.length + 1, // +1 pour l'admin
            equipes: eqD.length,
            invitationsEnAttente: invD.filter(x=>x.statut==='en_attente').length,
            totalPaiements: pD.length,
            paiementsPayes: pD.filter(x=>x.statut==='payé').length,
            // Données détaillées pour le contexte IA
            _biens: bD.map(x=>({nom:x.nom,type:x.type,ville:x.ville,loyer:x.loyer,statut:x.statut})),
            _utilisateurs: auD.map(x=>({role:x.role,poste:x.poste,departement:x.departement,statut:x.statut})),
            _equipes: eqD.map(x=>({nom:x.nom,confidentialite:x.confidentialite,membres:x.equipe_membres?.length||0})),
            _invitations: invD.map(x=>({email:x.email,role:x.role,statut:x.statut})),
            _monRole: myProfile?.role || 'agent',
          })
        }
      } catch(e) { console.error(e) }
    }
    init()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [messages, loading])

  const sendMessage = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')
    const newMessages = [...messages, { role:'user', content:msg }]
    setMessages(newMessages)
    setLoading(true)
    setThinking(true)

    // Filtrer les données selon le rôle
    const monRole = stats._monRole || 'agent'
    const isAdmin = ['global_admin','user_admin','admin'].includes(monRole)
    const isBilling = ['global_admin','billing_admin','admin'].includes(monRole)
    const isReports = ['global_admin','reports_reader','admin'].includes(monRole)

    const systemPrompt = `Tu es Loci, l'assistant IA de la plateforme Imoloc, spécialisé en gestion immobilière en Afrique de l'Ouest.
Tu assistes ${profile?.prenom || 'l\'utilisateur'} ${profile?.nom || ''} (rôle: ${monRole}) de l'organisation "${agence?.nom || 'Mon organisation'}".

🏢 DONNÉES COMPLÈTES DE L'ORGANISATION (temps réel):

📦 BIENS IMMOBILIERS:
- Total: ${stats.biens} biens
- Occupés: ${stats.biensOccupes || 0}
- Libres: ${stats.biensLibres || 0}
- En maintenance: ${stats.biensMaintenance || 0}
- Taux d'occupation: ${stats.taux}%
- Détail: ${JSON.stringify(stats._biens || [])}

👥 LOCATAIRES:
- Total locataires actifs: ${stats.locataires}

💰 PAIEMENTS & FINANCES:
- Total paiements enregistrés: ${stats.totalPaiements || 0}
- Paiements effectués: ${stats.paiementsPayes || 0}
- Loyers en retard: ${stats.retards}
- Paiements en attente: ${stats.enAttente || 0}
- Revenus totaux encaissés: ${stats.revenus.toLocaleString()} FCFA
- Revenus ce mois: ${(stats.revenusMois||0).toLocaleString()} FCFA

${isAdmin ? `👤 UTILISATEURS & ÉQUIPES (visible car rôle: ${monRole}):
- Utilisateurs dans l'organisation: ${stats.utilisateurs || 1}
- Équipes créées: ${stats.equipes || 0}
- Invitations en attente: ${stats.invitationsEnAttente || 0}
- Détail utilisateurs: ${JSON.stringify(stats._utilisateurs || [])}
- Détail équipes: ${JSON.stringify(stats._equipes || [])}
- Invitations: ${JSON.stringify(stats._invitations || [])}` : `⚠️ ACCÈS RESTREINT: Les informations sur les utilisateurs, équipes et invitations ne sont pas accessibles avec le rôle "${monRole}". Redirige poliment vers un administrateur.`}

${isBilling ? `🧾 FACTURATION (visible car rôle: ${monRole}):
- Abonnement actif: Plan Standard
- Prochaine facturation: 1er du mois prochain` : ''}

🎯 RÈGLES STRICTES:
1. Réponds TOUJOURS en français
2. Utilise UNIQUEMENT les données ci-dessus pour répondre
3. Respecte les niveaux d'accès selon le rôle "${monRole}"
4. Sois précis avec les chiffres réels (ne pas inventer)
5. Si une info n'est pas disponible dans les données, dis-le clairement
6. Utilise des emojis pour structurer les réponses
7. Propose des actions concrètes adaptées au marché africain
8. Pour les retards de paiement, suggère des stratégies de recouvrement (relance SMS, Mobile Money, etc.)
9. Formate avec des listes et sections claires`

    try {
      const apiMessages = newMessages
        .filter((m, i) => !(m.role==='assistant' && i===0))
        .map(m => ({ role: m.role, content: m.content.replace(/\*\*/g,'') }))

      const res = await fetch(`${SUPABASE_URL}/functions/v1/loci-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, systemPrompt })
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`HTTP ${res.status}: ${err}`)
      }

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setThinking(false)
      setMessages(prev => [...prev, {
        role:'assistant',
        content: data.reply,
        model: data.model,
      }])
    } catch(e) {
      console.error('Loci error:', e)
      setThinking(false)
      setMessages(prev => [...prev, {
        role:'assistant',
        content:`⚠️ Erreur: ${e.message}. Réessayez dans un instant.`
      }])
    } finally {
      setLoading(false)
    }
  }

  const KPI = [
    { label:'Biens gérés', val:stats.biens, color:'#0078d4', icon:'🏢', sub:`${Math.max(0,stats.biens-stats.locataires)} libres` },
    { label:'Locataires', val:stats.locataires, color:'#a78bfa', icon:'👥', sub:'actifs' },
    { label:'Taux occupation', val:`${stats.taux}%`, color:stats.taux>70?'#34d399':'#f59e0b', icon:'📊', sub:stats.taux>70?'Bon niveau':'À améliorer' },
    { label:'Loyers en retard', val:stats.retards, color:stats.retards>0?'#ef4444':'#34d399', icon:'⚡', sub:stats.retards>0?'Action requise':'Tout à jour' },
    { label:'Revenus encaissés', val:`${(stats.revenus/1000).toFixed(0)}K`, color:'#34d399', icon:'💰', sub:'FCFA' },
  ]

  const INSIGHTS = [
    { icon:'💡', title:'Optimisation des loyers', desc:`Taux d'occupation ${stats.taux}%. ${stats.taux<80?'Potentiel d\'amélioration détecté.':'Excellent niveau !'}`, color:'#0078d4', action:'Analyser avec Loci' },
    { icon:stats.retards>0?'⚠️':'✅', title:stats.retards>0?`${stats.retards} loyer(s) en retard`:'Paiements à jour', desc:stats.retards>0?'Relance automatique recommandée.':'Excellente gestion des encaissements !', color:stats.retards>0?'#f59e0b':'#34d399', action:stats.retards>0?'Voir les impayés':'Voir les détails' },
    { icon:'🔮', title:'Prévision mensuelle', desc:`Revenu estimé : ${(stats.revenus).toLocaleString()} FCFA/mois si taux stable.`, color:'#a78bfa', action:'Voir les projections' },
    { icon:'🎯', title:'Recommandation IA', desc:'Ajoutez des photos HD à vos annonces pour +25% de demandes de visite.', color:'#34d399', action:'Appliquer' },
  ]

  const OUTILS_BI = [
    { icon:'📊', title:'Rapport de performance', desc:'KPIs complets, tendances et benchmarks du marché local', color:'#0078d4', badge:'Disponible' },
    { icon:'🔮', title:'Prévisions de revenus', desc:'Modèle prédictif sur 3, 6 et 12 mois avec intervalles de confiance', color:'#a78bfa', badge:'IA' },
    { icon:'🗺️', title:'Analyse géographique', desc:'Cartographie de vos biens et analyse de la demande par zone', color:'#34d399', badge:'Disponible' },
    { icon:'⚖️', title:'Optimisation des loyers', desc:'Comparaison avec le marché et suggestions de révision tarifaire', color:'#f59e0b', badge:'IA' },
    { icon:'👤', title:'Scoring locataires', desc:'Analyse comportementale et score de fiabilité de paiement', color:'#ef4444', badge:'IA' },
    { icon:'📋', title:'Rapport d\'audit', desc:'Audit complet de votre portefeuille immobilier', color:'#4da6ff', badge:'Disponible' },
    { icon:'🔔', title:'Alertes intelligentes', desc:'Notifications proactives basées sur vos données en temps réel', color:'#34d399', badge:'Actif' },
    { icon:'📈', title:'Dashboard exécutif', desc:'Vue synthétique pour la prise de décision rapide', color:'#a78bfa', badge:'Disponible' },
    { icon:'🤝', title:'Analyse locataires', desc:'Historique, comportement et recommandations par locataire', color:'#0078d4', badge:'IA' },
  ]

  return (
    <>
      <style>{`
        @keyframes loci-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(1.05)}}
        @keyframes loci-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes loci-glow{0%,100%{box-shadow:0 0 20px rgba(108,99,255,0.3)}50%{box-shadow:0 0 40px rgba(108,99,255,0.6),0 0 60px rgba(0,200,150,0.2)}}
        @keyframes loci-shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
        @keyframes loci-bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-8px)}}
        @keyframes loci-fade-up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes loci-spin{to{transform:rotate(360deg)}}
        @keyframes loci-bar{from{height:0}to{height:var(--h)}}

        .loci-page{min-height:calc(100vh - 120px)}

        /* Header */
        .loci-hero{display:flex;align-items:center;gap:16px;margin-bottom:24px;padding:22px 26px;background:linear-gradient(135deg,rgba(108,99,255,0.08),rgba(0,200,150,0.05));border:1px solid rgba(108,99,255,0.2);border-radius:14px;position:relative;overflow:hidden;animation:loci-fade-up 0.4s ease}
        .loci-hero::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,transparent,rgba(108,99,255,0.03));pointer-events:none}
        .loci-hero-orb{width:52px;height:52px;border-radius:16px;background:linear-gradient(135deg,#6c63ff,#00c896);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;animation:loci-glow 3s ease infinite,loci-float 4s ease infinite}
        .loci-hero-name{font-size:28px;font-weight:900;background:linear-gradient(135deg,#a78bfa,#34d399,#a78bfa);background-size:200%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:loci-shimmer 4s linear infinite;letter-spacing:-0.03em}
        .loci-hero-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:100px;background:linear-gradient(135deg,rgba(108,99,255,0.2),rgba(0,200,150,0.2));border:1px solid rgba(108,99,255,0.3);font-size:11px;color:#a78bfa;font-weight:600}
        .loci-hero-badge::before{content:'';width:6px;height:6px;border-radius:50%;background:#00c896;animation:loci-pulse 2s ease infinite}
        .loci-hero-sub{font-size:13.5px;color:rgba(255,255,255,0.45);margin-top:4px}
        .loci-hero-right{margin-left:auto;text-align:right}
        .loci-hero-stat{font-size:11px;color:rgba(255,255,255,0.3);margin-bottom:2px}
        .loci-hero-stat-val{font-size:13px;font-weight:600;color:rgba(255,255,255,0.6)}

        /* Tabs */
        .loci-nav{display:flex;gap:4px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:4px;margin-bottom:24px;width:fit-content}
        .loci-nav-tab{display:flex;align-items:center;gap:7px;padding:9px 20px;border-radius:7px;font-size:13.5px;font-weight:500;cursor:pointer;border:none;background:none;font-family:'Inter',sans-serif;color:rgba(255,255,255,0.4);transition:all 0.2s}
        .loci-nav-tab:hover{color:rgba(255,255,255,0.7);background:rgba(255,255,255,0.04)}
        .loci-nav-tab.active{background:linear-gradient(135deg,rgba(108,99,255,0.2),rgba(0,200,150,0.1));color:#e6edf3;border:1px solid rgba(108,99,255,0.25)}

        /* KPIs */
        .loci-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:20px}
        .loci-kpi{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:16px;transition:all 0.25s;cursor:pointer;animation:loci-fade-up 0.4s ease both}
        .loci-kpi:hover{border-color:rgba(108,99,255,0.3);transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,0.3)}
        .loci-kpi:nth-child(1){animation-delay:0.05s}
        .loci-kpi:nth-child(2){animation-delay:0.1s}
        .loci-kpi:nth-child(3){animation-delay:0.15s}
        .loci-kpi:nth-child(4){animation-delay:0.2s}
        .loci-kpi:nth-child(5){animation-delay:0.25s}
        .loci-kpi-icon{font-size:22px;margin-bottom:10px;display:block}
        .loci-kpi-val{font-size:26px;font-weight:800;letter-spacing:-0.03em;margin-bottom:2px}
        .loci-kpi-lbl{font-size:12px;color:rgba(255,255,255,0.4);margin-bottom:2px}
        .loci-kpi-sub{font-size:11px;color:rgba(255,255,255,0.25)}

        /* Cards */
        .loci-grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
        .loci-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:16px}
        .loci-card{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px;animation:loci-fade-up 0.4s ease both}
        .loci-card-title{font-size:12px;font-weight:700;color:rgba(255,255,255,0.4);margin-bottom:16px;text-transform:uppercase;letter-spacing:0.08em;display:flex;align-items:center;justify-content:space-between}
        .loci-card-action{font-size:12px;color:#a78bfa;cursor:pointer;font-weight:500;text-transform:none;letter-spacing:0;background:none;border:none;font-family:'Inter',sans-serif}

        /* Insights */
        .loci-insight{display:flex;gap:12px;padding:14px;border-radius:10px;margin-bottom:10px;cursor:pointer;border:1px solid;transition:all 0.2s;animation:loci-fade-up 0.4s ease both}
        .loci-insight:hover{transform:translateX(4px)}
        .loci-insight-icon{font-size:20px;flex-shrink:0;margin-top:2px}
        .loci-insight-title{font-size:13.5px;font-weight:600;color:#e6edf3;margin-bottom:4px}
        .loci-insight-desc{font-size:12.5px;color:rgba(255,255,255,0.45);line-height:1.6}
        .loci-insight-cta{font-size:12px;font-weight:600;margin-top:8px;display:inline-flex;align-items:center;gap:4px;transition:gap 0.15s}
        .loci-insight:hover .loci-insight-cta{gap:8px}

        /* Chart bars animées */
        .loci-bars{display:flex;align-items:flex-end;gap:7px;height:110px;padding:0 4px}
        .loci-bar{flex:1;border-radius:5px 5px 0 0;animation:loci-fade-up 0.5s ease both;position:relative;cursor:pointer;transition:opacity 0.15s}
        .loci-bar:hover{opacity:0.8}
        .loci-bar-tooltip{position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:#1c2434;border:1px solid rgba(255,255,255,0.1);border-radius:5px;padding:4px 8px;font-size:11px;color:#e6edf3;white-space:nowrap;opacity:0;transition:opacity 0.15s;pointer-events:none}
        .loci-bar:hover .loci-bar-tooltip{opacity:1}
        .loci-bar-labels{display:flex;gap:7px;padding:6px 4px 0;margin-bottom:4px}
        .loci-bar-lbl{flex:1;text-align:center;font-size:10px;color:rgba(255,255,255,0.25)}

        /* Donut */
        .loci-donut-wrap{display:flex;flex-direction:column;align-items:center;margin-bottom:14px}
        .loci-donut{position:relative;width:110px;height:110px}
        .loci-donut svg{transform:rotate(-90deg)}
        .loci-donut-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
        .loci-donut-val{font-size:22px;font-weight:800;letter-spacing:-0.03em}
        .loci-donut-sub{font-size:10px;color:rgba(255,255,255,0.35)}
        .loci-donut-legend{display:flex;justify-content:center;gap:14px;font-size:11.5px;color:rgba(255,255,255,0.4)}

        /* Prévisions */
        .loci-previsions{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
        .loci-prev-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:14px;text-align:center;animation:loci-fade-up 0.4s ease both;transition:all 0.2s;cursor:pointer}
        .loci-prev-card:hover{border-color:rgba(108,99,255,0.3);transform:translateY(-2px)}
        .loci-prev-lbl{font-size:11px;color:rgba(255,255,255,0.35);margin-bottom:8px}
        .loci-prev-val{font-size:18px;font-weight:800;letter-spacing:-0.02em;margin-bottom:4px}
        .loci-prev-trend{font-size:11px;color:#34d399;font-weight:500}

        /* Score cards */
        .loci-score-card{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:18px;animation:loci-fade-up 0.4s ease both;transition:all 0.2s;cursor:pointer}
        .loci-score-card:hover{border-color:rgba(108,99,255,0.25);transform:translateY(-2px)}

        /* ── CHAT ── */
        .loci-chat-page{display:flex;flex-direction:column;height:calc(100vh - 200px);min-height:550px}
        .loci-chat-wrap{display:flex;flex:1;gap:16px;overflow:hidden}
        .loci-chat-main{flex:1;display:flex;flex-direction:column;background:rgba(255,255,255,0.02);border:1px solid rgba(108,99,255,0.2);border-radius:14px;overflow:hidden;animation:loci-glow 4s ease infinite}
        .loci-chat-header{padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,rgba(108,99,255,0.08),rgba(0,200,150,0.05));flex-shrink:0}
        .loci-chat-avatar{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#6c63ff,#00c896);display:flex;align-items:center;justify-content:center;font-size:16px;animation:loci-pulse 3s ease infinite}
        .loci-chat-status{font-size:11px;color:#34d399;display:flex;align-items:center;gap:5px}
        .loci-chat-status::before{content:'';width:6px;height:6px;border-radius:50%;background:#34d399;animation:loci-pulse 2s ease infinite}
        .loci-messages{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:16px}
        .loci-messages::-webkit-scrollbar{width:4px}
        .loci-messages::-webkit-scrollbar-thumb{background:rgba(108,99,255,0.2);border-radius:2px}
        .loci-msg{display:flex;gap:10px;animation:loci-fade-up 0.3s ease}
        .loci-msg.user{flex-direction:row-reverse}
        .loci-msg-av{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0;margin-top:2px}
        .loci-bubble{padding:12px 16px;border-radius:14px;font-size:13.5px;line-height:1.7;max-width:80%}
        .loci-msg.assistant .loci-bubble{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.85);border-radius:4px 14px 14px 14px}
        .loci-msg.user .loci-bubble{background:linear-gradient(135deg,rgba(108,99,255,0.3),rgba(0,200,150,0.15));border:1px solid rgba(108,99,255,0.35);color:#e6edf3;border-radius:14px 4px 14px 14px}
        .loci-model-tag{font-size:10px;color:rgba(167,139,250,0.5);margin-bottom:5px;display:flex;align-items:center;gap:4px}
        .loci-thinking{display:flex;gap:4px;align-items:center;padding:14px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:4px 14px 14px 14px;width:fit-content}
        .loci-thinking span{width:7px;height:7px;border-radius:50%;background:linear-gradient(135deg,#a78bfa,#34d399);animation:loci-bounce 1.2s infinite}
        .loci-thinking span:nth-child(2){animation-delay:0.15s}
        .loci-thinking span:nth-child(3){animation-delay:0.3s}
        .loci-sugs{display:flex;gap:6px;flex-wrap:wrap;padding:10px 16px;border-top:1px solid rgba(255,255,255,0.06);flex-shrink:0}
        .loci-sug{padding:5px 12px;border-radius:100px;font-size:12px;cursor:pointer;border:1px solid rgba(108,99,255,0.25);background:rgba(108,99,255,0.07);color:rgba(167,139,250,0.85);transition:all 0.15s;white-space:nowrap;font-family:'Inter',sans-serif}
        .loci-sug:hover{background:rgba(108,99,255,0.2);color:#a78bfa;transform:translateY(-1px)}
        .loci-input-row{display:flex;gap:8px;align-items:flex-end;padding:12px 16px;border-top:1px solid rgba(255,255,255,0.07);flex-shrink:0}
        .loci-input{flex:1;background:rgba(255,255,255,0.05);border:1.5px solid rgba(108,99,255,0.2);border-radius:10px;padding:10px 14px;font-family:'Inter',sans-serif;font-size:13.5px;color:#e6edf3;outline:none;resize:none;min-height:42px;max-height:120px;transition:border-color 0.2s;line-height:1.5}
        .loci-input:focus{border-color:rgba(108,99,255,0.5);box-shadow:0 0 0 3px rgba(108,99,255,0.08)}
        .loci-input::placeholder{color:rgba(255,255,255,0.25)}
        .loci-send{width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#6c63ff,#00c896);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.2s}
        .loci-send:hover:not(:disabled){transform:scale(1.05);box-shadow:0 4px 14px rgba(108,99,255,0.4)}
        .loci-send:disabled{opacity:0.35;cursor:not-allowed}

        /* Sidebar chat */
        .loci-chat-sidebar{width:220px;display:flex;flex-direction:column;gap:12px;flex-shrink:0}
        .loci-chat-stat{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:14px;text-align:center;cursor:pointer;transition:all 0.2s}
        .loci-chat-stat:hover{border-color:rgba(108,99,255,0.3);transform:translateY(-2px)}
        .loci-chat-stat-icon{font-size:22px;margin-bottom:8px}
        .loci-chat-stat-val{font-size:20px;font-weight:800;letter-spacing:-0.02em;margin-bottom:2px}
        .loci-chat-stat-lbl{font-size:11.5px;color:rgba(255,255,255,0.35)}

        /* Outils BI */
        .loci-bi-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px}
        .loci-bi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px}
        .loci-bi-card{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px;cursor:pointer;transition:all 0.25s;animation:loci-fade-up 0.4s ease both;position:relative;overflow:hidden}
        .loci-bi-card::after{content:'';position:absolute;inset:0;background:linear-gradient(135deg,transparent,rgba(255,255,255,0.02));opacity:0;transition:opacity 0.2s}
        .loci-bi-card:hover{transform:translateY(-3px);box-shadow:0 10px 28px rgba(0,0,0,0.4)}
        .loci-bi-card:hover::after{opacity:1}
        .loci-bi-card-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px}
        .loci-bi-icon{width:42px;height:42px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
        .loci-bi-badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:100px}
        .loci-bi-title{font-size:14px;font-weight:600;color:#e6edf3;margin-bottom:6px}
        .loci-bi-desc{font-size:12.5px;color:rgba(255,255,255,0.4);line-height:1.6;margin-bottom:14px}
        .loci-bi-action{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;transition:gap 0.15s}
        .loci-bi-card:hover .loci-bi-action{gap:10px}

        /* BI Stats */
        .loci-bi-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
        .loci-bi-stat{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:16px;animation:loci-fade-up 0.4s ease both;transition:all 0.2s;cursor:pointer}
        .loci-bi-stat:hover{border-color:rgba(108,99,255,0.25);transform:translateY(-2px)}

        @media(max-width:1200px){.loci-kpis{grid-template-columns:repeat(3,1fr)}.loci-bi-grid{grid-template-columns:1fr 1fr}}
        @media(max-width:900px){.loci-grid2,.loci-grid3,.loci-bi-grid,.loci-bi-stats{grid-template-columns:1fr}.loci-kpis{grid-template-columns:1fr 1fr}.loci-chat-sidebar{display:none}}
        @media(max-width:600px){.loci-kpis{grid-template-columns:1fr}.loci-previsions{grid-template-columns:1fr 1fr}}
      `}</style>

      <div className="loci-page">
        {/* ── HERO ── */}
        <div className="loci-hero">
          <div className="loci-hero-orb">✨</div>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
              <span className="loci-hero-name">Loci</span>
              <span className="loci-hero-badge">IA Immobilier</span>
            </div>
            <div className="loci-hero-sub">Intelligence artificielle · {agence?.nom || 'Mon organisation'} · Bonjour, {profile?.prenom || 'Admin'} 👋</div>
          </div>
          <div className="loci-hero-right">
            <div className="loci-hero-stat">Modèles actifs</div>
            <div className="loci-hero-stat-val">Claude · Llama · Gemini</div>
          </div>
        </div>

        {/* ── NAVIGATION ── */}
        <div className="loci-nav">
          {[
            { path:'/agence/loci', label:'📊 Tableau de bord', id:'dashboard' },
            { path:'/agence/loci/chat', label:'💬 Loci Chat', id:'chat' },
            { path:'/agence/loci/outils', label:'🛠️ Outils BI', id:'outils' },
          ].map(tab => (
            <button key={tab.id}
              className={`loci-nav-tab ${currentTab===tab.id?'active':''}`}
              onClick={()=>navigate(tab.path)}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══ TABLEAU DE BORD ══ */}
        {currentTab==='dashboard' && (
          <>
            {/* KPIs */}
            <div className="loci-kpis">
              {KPI.map((k,i)=>(
                <div key={i} className="loci-kpi" onClick={()=>navigate('/agence/loci/chat')}>
                  <span className="loci-kpi-icon">{k.icon}</span>
                  <div className="loci-kpi-val" style={{color:k.color}}>{k.val}</div>
                  <div className="loci-kpi-lbl">{k.label}</div>
                  <div className="loci-kpi-sub">{k.sub}</div>
                </div>
              ))}
            </div>

            <div className="loci-grid2">
              {/* Insights */}
              <div className="loci-card">
                <div className="loci-card-title">
                  ✨ Insights IA temps réel
                  <button className="loci-card-action" onClick={()=>navigate('/agence/loci/chat')}>Demander à Loci →</button>
                </div>
                {INSIGHTS.map((ins,i)=>(
                  <div key={i} className="loci-insight"
                    style={{borderColor:ins.color==='#f59e0b'?'rgba(245,158,11,0.2)':ins.color==='#34d399'?'rgba(52,211,153,0.2)':'rgba(108,99,255,0.15)',background:ins.color==='#f59e0b'?'rgba(245,158,11,0.04)':ins.color==='#34d399'?'rgba(52,211,153,0.04)':'rgba(108,99,255,0.04)'}}
                    onClick={()=>navigate('/agence/loci/chat')}>
                    <span className="loci-insight-icon">{ins.icon}</span>
                    <div style={{flex:1}}>
                      <div className="loci-insight-title">{ins.title}</div>
                      <div className="loci-insight-desc">{ins.desc}</div>
                      <span className="loci-insight-cta" style={{color:ins.color}}>{ins.action} <span>→</span></span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                {/* Donut occupation */}
                <div className="loci-card">
                  <div className="loci-card-title">Taux d'occupation</div>
                  <div className="loci-donut-wrap">
                    <div className="loci-donut">
                      <svg width="110" height="110" viewBox="0 0 110 110">
                        <circle cx="55" cy="55" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12"/>
                        <circle cx="55" cy="55" r="42" fill="none"
                          stroke={stats.taux>70?'url(#g1)':'#f59e0b'}
                          strokeWidth="12"
                          strokeDasharray={`${(stats.taux/100)*264} 264`}
                          strokeLinecap="round"
                          style={{transition:'stroke-dasharray 1s ease'}}/>
                        <defs>
                          <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#6c63ff"/>
                            <stop offset="100%" stopColor="#00c896"/>
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="loci-donut-center">
                        <span className="loci-donut-val" style={{color:stats.taux>70?'#34d399':'#f59e0b'}}>{stats.taux}%</span>
                        <span className="loci-donut-sub">occupation</span>
                      </div>
                    </div>
                    <div className="loci-donut-legend">
                      <span style={{color:'#a78bfa'}}>■ Occupés: {stats.locataires}</span>
                      <span>■ Libres: {Math.max(0,stats.biens-stats.locataires)}</span>
                    </div>
                  </div>
                </div>

                {/* Bars revenus */}
                <div className="loci-card">
                  <div className="loci-card-title">Revenus (6 mois)</div>
                  <div className="loci-bars">
                    {[
                      {m:'Oct',h:40,val:'12K'},
                      {m:'Nov',h:55,val:'16K'},
                      {m:'Déc',h:45,val:'14K'},
                      {m:'Jan',h:70,val:'21K'},
                      {m:'Fév',h:60,val:'18K'},
                      {m:'Mar',h:90,val:'27K'},
                    ].map((b,i)=>(
                      <div key={i} className="loci-bar" style={{height:`${b.h}px`,background:i===5?'linear-gradient(to top,#6c63ff,#00c896)':'rgba(108,99,255,0.3)',animationDelay:`${i*0.1}s`}}>
                        <span className="loci-bar-tooltip">{b.val} FCFA</span>
                      </div>
                    ))}
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
                🔮 Prévisions de revenus IA
                <button className="loci-card-action" onClick={()=>navigate('/agence/loci/outils')}>Voir l'analyse complète →</button>
              </div>
              <div className="loci-previsions">
                {[
                  {p:'Ce mois',v:stats.revenus,c:'#0078d4',t:'Base'},
                  {p:'3 mois',v:stats.revenus*3*1.02,c:'#a78bfa',t:'+2%'},
                  {p:'6 mois',v:stats.revenus*6*1.04,c:'#34d399',t:'+4%'},
                  {p:'12 mois',v:stats.revenus*12*1.06,c:'#f59e0b',t:'+6%'},
                ].map((p,i)=>(
                  <div key={i} className="loci-prev-card" style={{animationDelay:`${i*0.1}s`}} onClick={()=>navigate('/agence/loci/outils')}>
                    <div className="loci-prev-lbl">{p.p}</div>
                    <div className="loci-prev-val" style={{color:p.c}}>{Math.round(p.v/1000)}K <span style={{fontSize:12,fontWeight:400}}>FCFA</span></div>
                    <div className="loci-prev-trend">{p.t} estimé</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Score cards */}
            <div className="loci-grid3">
              {[
                {icon:'⭐',title:'Score de gestion',val:'87/100',desc:'Excellente performance globale',color:'#f59e0b'},
                {icon:'🛡️',title:'Risque locataire',val:stats.retards>0?'Moyen':'Faible',desc:stats.retards>0?`${stats.retards} impayé(s) détecté(s)`:'Aucun risque détecté',color:stats.retards>0?'#f59e0b':'#34d399'},
                {icon:'📈',title:'Potentiel optimisation',val:'+15%',desc:'Revenus supplémentaires possibles',color:'#a78bfa'},
              ].map((s,i)=>(
                <div key={i} className="loci-score-card" style={{animationDelay:`${i*0.1}s`}} onClick={()=>navigate('/agence/loci/chat')}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                    <span style={{fontSize:24}}>{s.icon}</span>
                    <span style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.4)'}}>{s.title}</span>
                  </div>
                  <div style={{fontSize:22,fontWeight:800,color:s.color,marginBottom:4,letterSpacing:'-0.02em'}}>{s.val}</div>
                  <div style={{fontSize:12.5,color:'rgba(255,255,255,0.35)'}}>{s.desc}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ══ CHAT LOCI ══ */}
        {currentTab==='chat' && (
          <div className="loci-chat-page">
            <div className="loci-chat-wrap">
              {/* Chat principal */}
              <div className="loci-chat-main">
                <div className="loci-chat-header">
                  <div className="loci-chat-avatar">✨</div>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,background:'linear-gradient(135deg,#a78bfa,#34d399)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Loci</div>
                    <div className="loci-chat-status">En ligne · Multi-modèles actifs</div>
                  </div>
                  <div style={{marginLeft:'auto',fontSize:11,color:'rgba(255,255,255,0.25)',textAlign:'right'}}>
                    <div>Claude · Llama · Gemini</div>
                    <div>Données org. en temps réel</div>
                  </div>
                </div>

                <div className="loci-messages">
                  {messages.map((msg,i)=>(
                    <div key={i} className={`loci-msg ${msg.role}`}>
                      {msg.role==='assistant'
                        ? <div className="loci-msg-av" style={{background:'linear-gradient(135deg,#6c63ff,#00c896)'}}>✨</div>
                        : <div className="loci-msg-av" style={{background:'linear-gradient(135deg,#0078d4,#6c63ff)'}}>{profile?.prenom?.[0]?.toUpperCase()||'A'}</div>
                      }
                      <div className="loci-bubble">
                        {msg.model && msg.role==='assistant' && (
                          <div className="loci-model-tag">✨ {msg.model}</div>
                        )}
                        {msg.content.split('\n').map((line,j)=>(
                          <span key={j}>
                            {line.split('**').map((part,k)=>k%2===1?<strong key={k} style={{color:'#e6edf3'}}>{part}</strong>:part)}
                            {j<msg.content.split('\n').length-1&&<br/>}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {thinking && (
                    <div className="loci-msg assistant">
                      <div className="loci-msg-av" style={{background:'linear-gradient(135deg,#6c63ff,#00c896)'}}>✨</div>
                      <div className="loci-thinking">
                        <span/><span/><span/>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef}/>
                </div>

                <div className="loci-sugs">
                  {SUGGESTIONS.map((s,i)=>(
                    <button key={i} className="loci-sug" onClick={()=>sendMessage(s)}>{s}</button>
                  ))}
                </div>

                <div className="loci-input-row">
                  <textarea
                    className="loci-input"
                    value={input}
                    onChange={e=>setInput(e.target.value)}
                    onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}}}
                    placeholder="Posez une question à Loci... (Entrée pour envoyer, Maj+Entrée pour saut de ligne)"
                    rows={1}
                    ref={inputRef}
                  />
                  <button className="loci-send" onClick={()=>sendMessage()} disabled={loading||!input.trim()}>
                    {loading
                      ? <svg width="14" height="14" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24" style={{animation:'loci-spin 1s linear infinite'}}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
                      : <svg width="15" height="15" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/></svg>
                    }
                  </button>
                </div>
              </div>

              {/* Sidebar stats */}
              <div className="loci-chat-sidebar">
                <div style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4}}>Données org.</div>
                {[
                  {icon:'🏢',val:stats.biens,lbl:'Biens',color:'#0078d4'},
                  {icon:'👥',val:stats.locataires,lbl:'Locataires',color:'#a78bfa'},
                  {icon:'📊',val:`${stats.taux}%`,lbl:'Occupation',color:stats.taux>70?'#34d399':'#f59e0b'},
                  {icon:'⚡',val:stats.retards,lbl:'Retards',color:stats.retards>0?'#ef4444':'#34d399'},
                  {icon:'💰',val:`${(stats.revenus/1000).toFixed(0)}K`,lbl:'FCFA',color:'#34d399'},
                ].map((s,i)=>(
                  <div key={i} className="loci-chat-stat">
                    <div className="loci-chat-stat-icon">{s.icon}</div>
                    <div className="loci-chat-stat-val" style={{color:s.color}}>{s.val}</div>
                    <div className="loci-chat-stat-lbl">{s.lbl}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ OUTILS BI ══ */}
        {currentTab==='outils' && (
          <>
            <div className="loci-bi-header">
              <div>
                <div style={{fontSize:20,fontWeight:800,color:'#e6edf3',marginBottom:6,letterSpacing:'-0.02em'}}>🛠️ Outils décisionnels & BI</div>
                <div style={{fontSize:13.5,color:'rgba(255,255,255,0.4)',maxWidth:600}}>Exploitez vos données immobilières avec des outils d'analyse avancés alimentés par l'IA.</div>
              </div>
              <button onClick={()=>navigate('/agence/loci/chat')}
                style={{display:'flex',alignItems:'center',gap:8,padding:'10px 18px',borderRadius:8,background:'linear-gradient(135deg,rgba(108,99,255,0.2),rgba(0,200,150,0.1))',border:'1px solid rgba(108,99,255,0.3)',color:'#a78bfa',fontSize:13.5,fontWeight:600,cursor:'pointer',fontFamily:'Inter',flexShrink:0}}>
                ✨ Analyser avec Loci
              </button>
            </div>

            {/* Stats BI */}
            <div className="loci-bi-stats">
              {[
                {lbl:'Rentabilité brute',val:'8.2%',trend:'+0.3%',color:'#34d399',icon:'📈'},
                {lbl:'Délai moyen paiement',val:'3.2j',trend:'-0.5j',color:'#0078d4',icon:'⏱️'},
                {lbl:'Taux d\'impayés',val:stats.retards>0?`${((stats.retards/Math.max(stats.locataires,1))*100).toFixed(1)}%`:'0%',trend:stats.retards>0?'À surveiller':'Excellent',color:stats.retards>0?'#f59e0b':'#34d399',icon:'🛡️'},
                {lbl:'Valeur parc/an',val:`${(stats.revenus*12/1000).toFixed(0)}K FCFA`,trend:'Estimation',color:'#a78bfa',icon:'💎'},
                {lbl:'Score Loci',val:'87/100',trend:'Excellent',color:'#f59e0b',icon:'⭐'},
                {lbl:'Potentiel non réalisé',val:'+15%',trend:'Optimisable',color:'#34d399',icon:'🎯'},
              ].map((s,i)=>(
                <div key={i} className="loci-bi-stat" style={{animationDelay:`${i*0.08}s`}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                    <span style={{fontSize:18}}>{s.icon}</span>
                    <span style={{fontSize:12,color:'rgba(255,255,255,0.35)',fontWeight:500}}>{s.lbl}</span>
                  </div>
                  <div style={{fontSize:20,fontWeight:800,color:s.color,marginBottom:3,letterSpacing:'-0.02em'}}>{s.val}</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.25)'}}>{s.trend}</div>
                </div>
              ))}
            </div>

            {/* Outils cards */}
            <div className="loci-bi-grid">
              {OUTILS_BI.map((o,i)=>(
                <div key={i} className="loci-bi-card" style={{animationDelay:`${i*0.08}s`,borderColor:`${o.color}22`}}
                  onMouseOver={e=>e.currentTarget.style.borderColor=`${o.color}44`}
                  onMouseOut={e=>e.currentTarget.style.borderColor=`${o.color}22`}>
                  <div className="loci-bi-card-top">
                    <div className="loci-bi-icon" style={{background:`${o.color}18`}}>{o.icon}</div>
                    <span className="loci-bi-badge" style={{
                      background:o.badge==='IA'?'linear-gradient(135deg,rgba(108,99,255,0.2),rgba(0,200,150,0.2))':o.badge==='Actif'?'rgba(52,211,153,0.1)':'rgba(255,255,255,0.06)',
                      color:o.badge==='IA'?'#a78bfa':o.badge==='Actif'?'#34d399':'rgba(255,255,255,0.4)',
                      border:`1px solid ${o.badge==='IA'?'rgba(108,99,255,0.3)':o.badge==='Actif'?'rgba(52,211,153,0.2)':'rgba(255,255,255,0.08)'}`
                    }}>{o.badge}</span>
                  </div>
                  <div className="loci-bi-title">{o.title}</div>
                  <div className="loci-bi-desc">{o.desc}</div>
                  <div className="loci-bi-action" style={{color:o.color}}>
                    Lancer l'analyse <span>→</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Note IA */}
            <div style={{padding:'18px 22px',borderRadius:12,background:'linear-gradient(135deg,rgba(108,99,255,0.08),rgba(0,200,150,0.05))',border:'1px solid rgba(108,99,255,0.2)',display:'flex',alignItems:'flex-start',gap:14}}>
              <span style={{fontSize:24,flexShrink:0}}>✨</span>
              <div>
                <div style={{fontSize:14,fontWeight:700,background:'linear-gradient(135deg,#a78bfa,#34d399)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',marginBottom:6}}>Loci vous recommande</div>
                <div style={{fontSize:13.5,color:'rgba(255,255,255,0.5)',lineHeight:1.7}}>
                  Basé sur vos données actuelles ({stats.biens} biens, {stats.taux}% d'occupation), Loci suggère de lancer une <strong style={{color:'rgba(255,255,255,0.75)'}}>optimisation des loyers</strong> et un <strong style={{color:'rgba(255,255,255,0.75)'}}>rapport de performance mensuel</strong> pour maximiser vos revenus.
                </div>
                <button onClick={()=>navigate('/agence/loci/chat')}
                  style={{marginTop:12,display:'inline-flex',alignItems:'center',gap:7,padding:'8px 16px',borderRadius:7,background:'linear-gradient(135deg,rgba(108,99,255,0.2),rgba(0,200,150,0.1))',border:'1px solid rgba(108,99,255,0.3)',color:'#a78bfa',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'Inter'}}>
                  Discuter avec Loci →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
