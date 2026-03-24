import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../store/authStore'

const STATS = [
  { label: 'Biens gérés', value: '0', icon: 'M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z', color: '#0078d4', bg: 'rgba(0,120,212,0.1)', key: 'biens' },
  { label: 'Locataires actifs', value: '0', icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z', color: '#6c63ff', bg: 'rgba(108,99,255,0.1)', key: 'locataires' },
  { label: 'Revenus du mois', value: '0 FCFA', icon: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75', color: '#00c896', bg: 'rgba(0,200,150,0.1)', key: 'revenus' },
  { label: 'Loyers en retard', value: '0', icon: 'M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', key: 'retards' },
]

const QUICK_ACTIONS = [
  { label: 'Ajouter un bien', icon: 'M12 4.5v15m7.5-7.5h-15', path: '/agence/biens', color: '#0078d4' },
  { label: 'Nouveau locataire', icon: 'M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z', path: '/agence/locataires', color: '#6c63ff' },
  { label: 'Enregistrer paiement', icon: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z', path: '/agence/paiements', color: '#00c896' },
  { label: 'Créer un bail', icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z', path: '/agence/baux', color: '#f59e0b' },
]

const RECENT_ACTIVITIES = [
  { type: 'paiement', text: 'Paiement reçu de M. Adjovi — 75 000 FCFA', time: 'Il y a 1h', color: '#00c896' },
  { type: 'bail', text: 'Bail signé — Appartement Lot 45, Cotonou', time: 'Il y a 3h', color: '#0078d4' },
  { type: 'retard', text: 'Loyer en retard — Villa Fidjrossè (15 jours)', time: 'Il y a 5h', color: '#ef4444' },
  { type: 'locataire', text: 'Nouveau locataire ajouté — Mme Hounkpe', time: 'Hier', color: '#6c63ff' },
  { type: 'plainte', text: 'Plainte soumise — Fuite d\'eau Apt 7B', time: 'Il y a 2 jours', color: '#f59e0b' },
]

export default function Overview() {
  const { profile } = useAuthStore()
  const [stats, setStats] = useState({ biens: 0, locataires: 0, revenus: 0, retards: 0 })
  const [agence, setAgence] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: ag } = await supabase.from('agences').select('*').eq('profile_id', user.id).single()
        setAgence(ag)
        const [{ count: biens }, { count: locataires }] = await Promise.all([
          supabase.from('biens').select('*', { count: 'exact', head: true }).eq('agence_id', ag?.id),
          supabase.from('locataires').select('*', { count: 'exact', head: true }).eq('agence_id', ag?.id),
        ])
        setStats({ biens: biens || 0, locataires: locataires || 0, revenus: 0, retards: 0 })
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <>
      <style>{`
        .ov-greeting{margin-bottom:28px}
        .ov-greeting-title{font-size:22px;font-weight:700;color:#e6edf3;letter-spacing:-0.02em;margin-bottom:4px}
        .ov-greeting-sub{font-size:14px;color:rgba(255,255,255,0.35)}
        .ov-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px}
        .ov-stat{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px;transition:all 0.2s}
        .ov-stat:hover{border-color:rgba(255,255,255,0.12);transform:translateY(-2px)}
        .ov-stat-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px}
        .ov-stat-icon{width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center}
        .ov-stat-trend{font-size:11px;font-weight:600;padding:3px 8px;border-radius:100px;background:rgba(0,200,150,0.1);color:#00c896}
        .ov-stat-val{font-size:26px;font-weight:700;color:#e6edf3;letter-spacing:-0.03em;margin-bottom:4px}
        .ov-stat-lbl{font-size:12.5px;color:rgba(255,255,255,0.35)}
        .ov-grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px}
        .ov-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:22px}
        .ov-card-title{font-size:14px;font-weight:600;color:#e6edf3;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between}
        .ov-card-link{font-size:12px;color:#4da6ff;text-decoration:none;font-weight:500}
        .ov-card-link:hover{text-decoration:underline}
        .ov-qa-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .ov-qa{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:9px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);text-decoration:none;transition:all 0.15s;cursor:pointer}
        .ov-qa:hover{border-color:rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);transform:translateY(-1px)}
        .ov-qa-icon{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .ov-qa-lbl{font-size:13px;font-weight:500;color:rgba(255,255,255,0.7)}
        .ov-act-item{display:flex;align-items:flex-start;gap:12px;padding:11px 0;border-bottom:1px solid rgba(255,255,255,0.04)}
        .ov-act-item:last-child{border-bottom:none;padding-bottom:0}
        .ov-act-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;margin-top:4px}
        .ov-act-text{font-size:13px;color:rgba(255,255,255,0.6);line-height:1.5;flex:1}
        .ov-act-time{font-size:11.5px;color:rgba(255,255,255,0.22);flex-shrink:0;white-space:nowrap}
        .ov-occ{margin-bottom:16px}
        .ov-occ-row{display:flex;justify-content:space-between;margin-bottom:8px}
        .ov-occ-lbl{font-size:13px;color:rgba(255,255,255,0.5)}
        .ov-occ-val{font-size:13px;font-weight:600;color:#e6edf3}
        .ov-bar-bg{height:8px;background:rgba(255,255,255,0.06);border-radius:100px;overflow:hidden}
        .ov-bar-fill{height:100%;border-radius:100px;transition:width 0.6s ease}
        .ov-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;text-align:center;color:rgba(255,255,255,0.25)}
        .ov-empty-icon{font-size:36px;margin-bottom:12px;opacity:0.4}
        .ov-empty-text{font-size:14px}
        @media(max-width:1200px){.ov-stats{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:900px){.ov-grid2{grid-template-columns:1fr}.ov-qa-grid{grid-template-columns:1fr}}
        @media(max-width:600px){.ov-stats{grid-template-columns:1fr}}
      `}</style>

      <div className="ov-greeting">
        <div className="ov-greeting-title">
          {greeting}, {profile?.prenom || 'Admin'} 👋
        </div>
        <div className="ov-greeting-sub">
          {agence?.nom || 'Votre agence'} — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Stats */}
      <div className="ov-stats">
        {STATS.map((s, i) => (
          <div key={i} className="ov-stat">
            <div className="ov-stat-top">
              <div className="ov-stat-icon" style={{ background: s.bg }}>
                <svg width="22" height="22" fill="none" stroke={s.color} strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={s.icon}/>
                </svg>
              </div>
              <span className="ov-stat-trend">+0%</span>
            </div>
            <div className="ov-stat-val" style={{ color: s.color }}>
              {s.key === 'biens' ? stats.biens :
               s.key === 'locataires' ? stats.locataires :
               s.key === 'revenus' ? `${stats.revenus.toLocaleString()} FCFA` :
               stats.retards}
            </div>
            <div className="ov-stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="ov-grid2">
        {/* Actions rapides */}
        <div className="ov-card">
          <div className="ov-card-title">⚡ Actions rapides</div>
          <div className="ov-qa-grid">
            {QUICK_ACTIONS.map((a, i) => (
              <Link key={i} to={a.path} className="ov-qa">
                <div className="ov-qa-icon" style={{ background: `${a.color}15` }}>
                  <svg width="18" height="18" fill="none" stroke={a.color} strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d={a.icon}/>
                  </svg>
                </div>
                <span className="ov-qa-lbl">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Taux d'occupation */}
        <div className="ov-card">
          <div className="ov-card-title">
            📊 Taux d'occupation
            <Link to="/agence/biens" className="ov-card-link">Voir les biens →</Link>
          </div>
          {stats.biens === 0 ? (
            <div className="ov-empty">
              <div className="ov-empty-icon">🏠</div>
              <div className="ov-empty-text">Ajoutez des biens pour voir les statistiques</div>
            </div>
          ) : (
            <>
              {[
                { label: 'Occupés', val: Math.round((stats.locataires / Math.max(stats.biens, 1)) * 100), color: '#0078d4' },
                { label: 'Libres', val: 100 - Math.round((stats.locataires / Math.max(stats.biens, 1)) * 100), color: '#00c896' },
                { label: 'En maintenance', val: 0, color: '#f59e0b' },
              ].map((item, i) => (
                <div key={i} className="ov-occ">
                  <div className="ov-occ-row">
                    <span className="ov-occ-lbl">{item.label}</span>
                    <span className="ov-occ-val">{item.val}%</span>
                  </div>
                  <div className="ov-bar-bg">
                    <div className="ov-bar-fill" style={{ width: `${item.val}%`, background: item.color }}/>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Activité récente */}
      <div className="ov-card">
        <div className="ov-card-title">
          🕐 Activité récente
          <Link to="/agence/rapports" className="ov-card-link">Voir tout →</Link>
        </div>
        {RECENT_ACTIVITIES.map((a, i) => (
          <div key={i} className="ov-act-item">
            <div className="ov-act-dot" style={{ background: a.color }}/>
            <div className="ov-act-text">{a.text}</div>
            <div className="ov-act-time">{a.time}</div>
          </div>
        ))}
      </div>
    </>
  )
}
