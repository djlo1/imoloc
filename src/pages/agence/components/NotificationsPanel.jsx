import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import { useNavigate } from 'react-router-dom'

const TYPE_CONFIG = {
  info:    { color:'#0078d4', bg:'rgba(0,120,212,0.12)', icon:'ℹ️' },
  success: { color:'#00c896', bg:'rgba(0,200,150,0.12)', icon:'✅' },
  warning: { color:'#f59e0b', bg:'rgba(245,158,11,0.12)', icon:'⚠️' },
  error:   { color:'#ef4444', bg:'rgba(239,68,68,0.12)',  icon:'🔴' },
}

const CAT_LABELS = {
  general:     '🔔 Général',
  paiement:    '💰 Paiement',
  utilisateur: '👥 Utilisateur',
  bien:        '🏢 Bien',
  securite:    '🔐 Sécurité',
}

export default function NotificationsPanel({ userId, agenceId }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState([])
  const [filter, setFilter] = useState('all') // 'all' | 'unread'
  const [loading, setLoading] = useState(true)
  const panelRef = useRef(null)
  const unread = notifs.filter(n => !n.lu).length

  useEffect(() => {
    if (!userId) return
    fetchNotifs()

    // Supabase Realtime
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setNotifs(prev => [payload.new, ...prev])
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [userId])

  useEffect(() => {
    const handle = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const fetchNotifs = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)
      setNotifs(data || [])
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const markRead = async (id) => {
    await supabase.from('notifications').update({ lu: true }).eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? {...n, lu: true} : n))
  }

  const markAllRead = async () => {
    await supabase.from('notifications')
      .update({ lu: true })
      .eq('user_id', userId)
      .eq('lu', false)
    setNotifs(prev => prev.map(n => ({...n, lu: true})))
  }

  const deleteNotif = async (id) => {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifs(prev => prev.filter(n => n.id !== id))
  }

  const handleClick = async (n) => {
    if (!n.lu) await markRead(n.id)
    if (n.lien) navigate(n.lien)
    setOpen(false)
  }

  const filtered = filter === 'unread' ? notifs.filter(n => !n.lu) : notifs
  const grouped = filtered.reduce((acc, n) => {
    const date = new Date(n.created_at)
    const now = new Date()
    const diff = now - date
    const key = diff < 86400000 ? "Aujourd'hui"
      : diff < 172800000 ? 'Hier'
      : diff < 604800000 ? 'Cette semaine'
      : 'Plus ancien'
    if (!acc[key]) acc[key] = []
    acc[key].push(n)
    return acc
  }, {})

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date)
    if (diff < 60000) return "À l'instant"
    if (diff < 3600000) return `Il y a ${Math.floor(diff/60000)} min`
    if (diff < 86400000) return `Il y a ${Math.floor(diff/3600000)} h`
    return new Date(date).toLocaleDateString('fr-FR')
  }

  return (
    <>
      <style>{`
        .notif-wrap{position:relative}
        .notif-bell{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.55);padding:6px;border-radius:6px;display:flex;align-items:center;justify-content:center;transition:all 0.15s;position:relative}
        .notif-bell:hover{background:rgba(255,255,255,0.07);color:#e6edf3}
        .notif-bell.active{background:rgba(0,120,212,0.1);color:#4da6ff}
        .notif-badge{position:absolute;top:1px;right:1px;min-width:16px;height:16px;border-radius:100px;background:#ef4444;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 4px;border:2px solid #0d1117;animation:notif-pop 0.3s ease}
        @keyframes notif-pop{from{transform:scale(0)}to{transform:scale(1)}}
        .notif-panel{position:absolute;top:calc(100% + 10px);right:0;width:400px;background:#161b22;border:1px solid rgba(255,255,255,0.09);border-radius:12px;box-shadow:0 16px 48px rgba(0,0,0,0.6);z-index:500;display:flex;flex-direction:column;max-height:560px;overflow:hidden;animation:notif-slide 0.2s ease}
        @keyframes notif-slide{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        .notif-head{padding:16px 18px 12px;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0}
        .notif-head-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
        .notif-title{font-size:15px;font-weight:700;color:#e6edf3}
        .notif-mark-all{background:none;border:none;cursor:pointer;color:#0078d4;font-size:12.5px;font-family:'Inter',sans-serif;padding:0;font-weight:500;transition:color 0.1s}
        .notif-mark-all:hover{color:#4da6ff;text-decoration:underline}
        .notif-filters{display:flex;gap:4px}
        .notif-filter{padding:5px 12px;border-radius:100px;font-size:12px;font-weight:500;cursor:pointer;border:none;background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.45);font-family:'Inter',sans-serif;transition:all 0.15s}
        .notif-filter:hover{background:rgba(255,255,255,0.09);color:#e6edf3}
        .notif-filter.active{background:rgba(0,120,212,0.15);color:#4da6ff}
        .notif-list{flex:1;overflow-y:auto}
        .notif-list::-webkit-scrollbar{width:4px}
        .notif-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        .notif-group-lbl{font-size:11px;font-weight:700;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.07em;padding:10px 18px 6px}
        .notif-item{display:flex;gap:12px;padding:12px 18px;cursor:pointer;transition:background 0.1s;position:relative;border-bottom:1px solid rgba(255,255,255,0.04)}
        .notif-item:hover{background:rgba(255,255,255,0.03)}
        .notif-item.unread{background:rgba(0,120,212,0.04)}
        .notif-item.unread::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:#0078d4;border-radius:0 2px 2px 0}
        .notif-ic{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;margin-top:2px}
        .notif-body{flex:1;min-width:0}
        .notif-ntitle{font-size:13.5px;font-weight:600;color:#e6edf3;margin-bottom:3px;line-height:1.4}
        .notif-msg{font-size:12.5px;color:rgba(255,255,255,0.45);line-height:1.5;margin-bottom:5px}
        .notif-meta{display:flex;align-items:center;gap:8px;font-size:11.5px;color:rgba(255,255,255,0.3)}
        .notif-cat{padding:1px 7px;border-radius:100px;font-size:10.5px;font-weight:600}
        .notif-del{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.2);padding:4px;border-radius:4px;display:flex;flex-shrink:0;transition:all 0.1s;opacity:0}
        .notif-item:hover .notif-del{opacity:1}
        .notif-del:hover{background:rgba(239,68,68,0.1);color:#ef4444}
        .notif-empty{text-align:center;padding:48px 20px;color:rgba(255,255,255,0.3)}
        .notif-empty-ic{font-size:40px;margin-bottom:12px;opacity:0.35}
        .notif-footer{padding:12px 18px;border-top:1px solid rgba(255,255,255,0.07);text-align:center;flex-shrink:0}
        .notif-footer a{color:#0078d4;font-size:13px;text-decoration:none;font-weight:500;cursor:pointer}
        .notif-footer a:hover{text-decoration:underline}
        @media(max-width:460px){.notif-panel{width:calc(100vw - 20px);right:-10px}}
      `}</style>

      <div className="notif-wrap" ref={panelRef}>
        {/* Bouton cloche */}
        <button className={`notif-bell ${open?'active':''}`} onClick={()=>setOpen(o=>!o)}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/>
          </svg>
          {unread > 0 && (
            <span className="notif-badge">{unread > 99 ? '99+' : unread}</span>
          )}
        </button>

        {/* Panel */}
        {open && (
          <div className="notif-panel">
            {/* Header */}
            <div className="notif-head">
              <div className="notif-head-row">
                <div>
                  <span className="notif-title">Notifications</span>
                  {unread > 0 && (
                    <span style={{marginLeft:8,fontSize:12,padding:'2px 8px',borderRadius:'100px',background:'rgba(0,120,212,0.15)',color:'#4da6ff',fontWeight:600}}>
                      {unread} non lue{unread>1?'s':''}
                    </span>
                  )}
                </div>
                {unread > 0 && (
                  <button className="notif-mark-all" onClick={markAllRead}>
                    Tout marquer comme lu
                  </button>
                )}
              </div>
              <div className="notif-filters">
                {[['all','Toutes'],['unread','Non lues']].map(([v,l])=>(
                  <button key={v} className={`notif-filter ${filter===v?'active':''}`} onClick={()=>setFilter(v)}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Liste */}
            <div className="notif-list">
              {loading ? (
                <div style={{textAlign:'center',padding:40,color:'rgba(255,255,255,0.3)'}}>
                  Chargement...
                </div>
              ) : filtered.length === 0 ? (
                <div className="notif-empty">
                  <div className="notif-empty-ic">🔔</div>
                  <div style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,0.4)',marginBottom:6}}>
                    {filter==='unread'?'Aucune notification non lue':'Aucune notification'}
                  </div>
                  <div style={{fontSize:13}}>
                    {filter==='unread'?'Vous êtes à jour !':'Les notifications apparaîtront ici'}
                  </div>
                </div>
              ) : Object.entries(grouped).map(([group, items])=>(
                <div key={group}>
                  <div className="notif-group-lbl">{group}</div>
                  {items.map((n,i)=>{
                    const tc = TYPE_CONFIG[n.type] || TYPE_CONFIG.info
                    return (
                      <div key={i} className={`notif-item ${!n.lu?'unread':''}`} onClick={()=>handleClick(n)}>
                        <div className="notif-ic" style={{background:tc.bg}}>
                          {tc.icon}
                        </div>
                        <div className="notif-body">
                          <div className="notif-ntitle">{n.titre}</div>
                          {n.message && <div className="notif-msg">{n.message}</div>}
                          <div className="notif-meta">
                            <span>{timeAgo(n.created_at)}</span>
                            {n.categorie && (
                              <span className="notif-cat" style={{background:tc.bg,color:tc.color}}>
                                {CAT_LABELS[n.categorie] || n.categorie}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          className="notif-del"
                          onClick={e=>{e.stopPropagation();deleteNotif(n.id)}}
                          title="Supprimer">
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Footer */}
            {filtered.length > 0 && (
              <div className="notif-footer">
                <a onClick={()=>{setOpen(false); navigate('/agence/notifications')}}>
                  Voir toutes les notifications →
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
