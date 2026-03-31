import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../store/authStore'

const TYPE_CONFIG = {
  feature:  { label:'Nouveau', color:'#0078d4', bg:'rgba(0,120,212,0.12)', icon:'✨' },
  update:   { label:'Mise à jour', color:'#6c63ff', bg:'rgba(108,99,255,0.12)', icon:'🔄' },
  fix:      { label:'Correction', color:'#00c896', bg:'rgba(0,200,150,0.12)', icon:'🔧' },
  security: { label:'Sécurité', color:'#f59e0b', bg:'rgba(245,158,11,0.12)', icon:'🔐' },
}

export default function Nouveautes() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [nouveautes, setNouveautes] = useState([])
  const [vues, setVues] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchData()
  }, [])

  const FALLBACK = [
    { id:'1', titre:'Loci IA Multi-modèles', description:"Loci utilise maintenant Claude, Llama et Gemini pour des réponses encore plus précises sur vos données immobilières.", type:'feature', version:'2.1.0', publie:true, date_publication:new Date().toISOString() },
    { id:'2', titre:'Page Utilisateurs Imoloc Style', description:"Nouvelle interface de gestion des utilisateurs avec drawer latéral, colonnes configurables et export CSV.", type:'feature', version:'2.1.0', publie:true, date_publication:new Date(Date.now()-86400000).toISOString() },
    { id:'3', titre:'DriveLoc — Stockage par utilisateur', description:"Chaque utilisateur dispose maintenant de son espace de stockage personnel pour ses documents et baux.", type:'update', version:'2.1.0', publie:true, date_publication:new Date(Date.now()-172800000).toISOString() },
    { id:'4', titre:'Gestion des équipes améliorée', description:"Créez des équipes multiagences avec propriétaires et membres. Confidentialité publique ou privée.", type:'update', version:'2.0.5', publie:true, date_publication:new Date(Date.now()-259200000).toISOString() },
    { id:'5', titre:'Notifications temps réel', description:"Les notifications arrivent instantanément grâce à Supabase Realtime. Badge compteur sur la cloche.", type:'feature', version:'2.1.0', publie:true, date_publication:new Date(Date.now()-345600000).toISOString() },
  ]

  const fetchData = async () => {
    setLoading(true)
    try {
      // D'abord charger les nouveautés publiques (sans auth requise)
      const { data:nouvData } = await supabase
        .from('nouveautes')
        .select('*')
        .eq('publie', true)
        .order('date_publication', { ascending: false })

      setNouveautes(nouvData?.length > 0 ? nouvData : FALLBACK)

      // Ensuite les vues (nécessite auth)
      try {
        const { data:{ user } } = await supabase.auth.getUser()
        if (user) {
          const { data:vuesData } = await supabase
            .from('nouveautes_vues')
            .select('nouveaute_id')
            .eq('user_id', user.id)
          setVues((vuesData || []).map(v => v.nouveaute_id))

          // Marquer comme vues
          const data = nouvData?.length > 0 ? nouvData : FALLBACK
          const nonVues = data.filter(n => !(vuesData||[]).find(v=>v.nouveaute_id===n.id))
          if (nonVues.length > 0) {
            await supabase.from('nouveautes_vues').insert(
              nonVues.map(n => ({ user_id: user.id, nouveaute_id: n.id }))
            ).select()
          }
        }
      } catch(e) { console.error('Auth error:', e) }

    } catch(e) {
      console.error('Fetch error:', e)
      setNouveautes(FALLBACK)
    } finally {
      setLoading(false)
    }
  }

  const nonVues = nouveautes.filter(n => !vues.includes(n.id))
  const filtered = filter === 'all' ? nouveautes
    : filter === 'new' ? nonVues
    : nouveautes.filter(n => n.type === filter)

  return (
    <>
      <style>{`
        .nv-page{min-height:calc(100vh - 120px)}
        .nv-hero{background:linear-gradient(135deg,rgba(0,120,212,0.08),rgba(108,99,255,0.06));border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:32px 36px;margin-bottom:28px;display:flex;align-items:center;justify-content:space-between;gap:20px}
        .nv-hero-title{font-size:26px;font-weight:800;color:#e6edf3;letter-spacing:-0.02em;margin-bottom:6px}
        .nv-hero-sub{font-size:14px;color:rgba(255,255,255,0.45);line-height:1.7;max-width:500px}
        .nv-hero-badge{display:inline-flex;align-items:center;gap:7px;padding:5px 14px;border-radius:100px;background:rgba(0,120,212,0.12);border:1px solid rgba(0,120,212,0.25);font-size:13px;color:#4da6ff;font-weight:600;margin-top:12px}
        .nv-hero-right{text-align:right;flex-shrink:0}
        .nv-version{font-size:32px;font-weight:800;color:#e6edf3;letter-spacing:-0.03em}
        .nv-version-lbl{font-size:12px;color:rgba(255,255,255,0.35);margin-top:4px}

        .nv-filters{display:flex;gap:6px;margin-bottom:24px;flex-wrap:wrap}
        .nv-filter{padding:7px 16px;border-radius:100px;font-size:13px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.5);font-family:'Inter',sans-serif;transition:all 0.15s}
        .nv-filter:hover{background:rgba(255,255,255,0.08);color:#e6edf3}
        .nv-filter.active{background:rgba(0,120,212,0.12);border-color:rgba(0,120,212,0.3);color:#4da6ff}

        .nv-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:24px}
        .nv-card{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:22px;cursor:pointer;transition:all 0.2s;position:relative;overflow:hidden}
        .nv-card:hover{border-color:rgba(255,255,255,0.14);transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.3)}
        .nv-card.featured{grid-column:1/-1;background:linear-gradient(135deg,rgba(0,120,212,0.07),rgba(108,99,255,0.05));border-color:rgba(0,120,212,0.2)}
        .nv-card-new-dot{position:absolute;top:16px;right:16px;width:10px;height:10px;border-radius:50%;background:#0078d4;box-shadow:0 0 8px rgba(0,120,212,0.6);animation:nv-pulse 2s ease infinite}
        @keyframes nv-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.6;transform:scale(1.3)}}
        .nv-card-head{display:flex;align-items:flex-start;gap:14px;margin-bottom:14px}
        .nv-card-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}
        .nv-card-type{display:inline-flex;align-items:center;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:700;margin-bottom:6px}
        .nv-card-title{font-size:15px;font-weight:700;color:#e6edf3;margin-bottom:4px;line-height:1.4}
        .nv-card-desc{font-size:13px;color:rgba(255,255,255,0.45);line-height:1.65}
        .nv-card-footer{display:flex;align-items:center;justify-content:space-between;margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.06)}
        .nv-card-date{font-size:12px;color:rgba(255,255,255,0.3)}
        .nv-card-version{font-size:11px;padding:'2px 8px';border-radius:100px;background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.4);font-weight:600}
        .nv-card-read{font-size:12.5px;color:#0078d4;font-weight:600;display:flex;align-items:center;gap:5px;transition:gap 0.15s}
        .nv-card:hover .nv-card-read{gap:8px}

        /* Modal détail */
        .nv-modal-ov{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(6px)}
        .nv-modal{background:#161b22;border:1px solid rgba(255,255,255,0.09);border-radius:16px;max-width:680px;width:100%;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;animation:nv-modal-in 0.25s ease}
        @keyframes nv-modal-in{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
        .nv-modal-head{padding:24px 28px 0;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-shrink:0}
        .nv-modal-body{flex:1;overflow-y:auto;padding:24px 28px}
        .nv-modal-body::-webkit-scrollbar{width:4px}
        .nv-modal-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        .nv-modal-foot{padding:20px 28px;border-top:1px solid rgba(255,255,255,0.07);display:flex;justify-content:flex-end;flex-shrink:0}
        .nv-modal-close{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);padding:5px;border-radius:5px;display:flex;transition:all 0.1s;flex-shrink:0}
        .nv-modal-close:hover{background:rgba(255,255,255,0.07);color:#e6edf3}

        .nv-empty{text-align:center;padding:80px 20px;color:rgba(255,255,255,0.3)}

        @media(max-width:900px){.nv-grid{grid-template-columns:1fr}.nv-card.featured{grid-column:1}.nv-hero{flex-direction:column}.nv-hero-right{text-align:left}}
      `}</style>

      <div className="nv-page">
        {/* Hero */}
        <div className="nv-hero">
          <div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:8,display:'flex',alignItems:'center',gap:8}}>
              <span style={{cursor:'pointer',color:'rgba(255,255,255,0.4)'}} onClick={()=>navigate('/agence')}>Accueil</span>
              <span style={{color:'rgba(255,255,255,0.2)'}}>›</span>
              <span style={{color:'rgba(255,255,255,0.65)'}}>Nouveautés</span>
            </div>
            <div className="nv-hero-title">🚀 Nouveautés Imoloc</div>
            <div className="nv-hero-sub">
              Découvrez toutes les nouvelles fonctionnalités, améliorations et corrections apportées à votre plateforme de gestion immobilière.
            </div>
            {nonVues.length > 0 && (
              <div className="nv-hero-badge">
                <span style={{width:8,height:8,borderRadius:'50%',background:'#0078d4',animation:'nv-pulse 2s ease infinite'}}/>
                {nonVues.length} nouvelle{nonVues.length>1?'s':''} mise{nonVues.length>1?'s':''} à jour
              </div>
            )}
          </div>
          <div className="nv-hero-right">
            <div className="nv-version">
              v{nouveautes[0]?.version || '2.1.0'}
            </div>
            <div className="nv-version-lbl">Version actuelle</div>
            <div style={{marginTop:12,fontSize:12,color:'rgba(255,255,255,0.3)'}}>
              {nouveautes.length} mise{nouveautes.length>1?'s':''} à jour disponible{nouveautes.length>1?'s':''}
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="nv-filters">
          {[
            { v:'all', l:`Toutes (${nouveautes.length})` },
            nonVues.length > 0 && { v:'new', l:`Non vues (${nonVues.length})` },
            { v:'feature', l:'✨ Nouvelles fonctionnalités' },
            { v:'update', l:'🔄 Mises à jour' },
            { v:'fix', l:'🔧 Corrections' },
            { v:'security', l:'🔐 Sécurité' },
          ].filter(Boolean).map(f=>(
            <button key={f.v} className={`nv-filter ${filter===f.v?'active':''}`} onClick={()=>setFilter(f.v)}>
              {f.l}
            </button>
          ))}
        </div>

        {/* Grille */}
        {loading ? (
          <div style={{textAlign:'center',padding:60,color:'rgba(255,255,255,0.3)'}}>
            <div style={{fontSize:32,marginBottom:12,opacity:0.4}}>🚀</div>
            Chargement des nouveautés...
          </div>
        ) : filtered.length === 0 ? (
          <div className="nv-empty">
            <div style={{fontSize:40,marginBottom:14,opacity:0.35}}>📭</div>
            <div style={{fontSize:15,fontWeight:600,color:'rgba(255,255,255,0.4)',marginBottom:8}}>Aucune nouveauté</div>
            <div>Les mises à jour apparaîtront ici automatiquement.</div>
          </div>
        ) : (
          <div className="nv-grid">
            {filtered.map((n, i) => {
              const tc = TYPE_CONFIG[n.type] || TYPE_CONFIG.feature
              const isNew = !vues.includes(n.id)
              const isFeatured = i === 0 && filter === 'all'
              return (
                <div key={n.id} className={`nv-card ${isFeatured?'featured':''}`} onClick={()=>setSelected(n)}
                  style={{animationDelay:`${i*0.05}s`}}>
                  {isNew && <div className="nv-card-new-dot"/>}
                  <div className="nv-card-head">
                    <div className="nv-card-icon" style={{background:tc.bg}}>
                      {tc.icon}
                    </div>
                    <div style={{flex:1}}>
                      <div className="nv-card-type" style={{background:tc.bg,color:tc.color}}>
                        {tc.label}
                      </div>
                      <div className="nv-card-title">{n.titre}</div>
                    </div>
                  </div>
                  <div className="nv-card-desc">{n.description}</div>
                  <div className="nv-card-footer">
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <span className="nv-card-date">
                        {new Date(n.date_publication).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}
                      </span>
                      {n.version && (
                        <span style={{fontSize:11,padding:'2px 8px',borderRadius:'100px',background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.4)',fontWeight:600}}>
                          v{n.version}
                        </span>
                      )}
                    </div>
                    <span className="nv-card-read">
                      Lire la suite <span>→</span>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal détail */}
      {selected && (
        <div className="nv-modal-ov" onClick={e=>e.target===e.currentTarget&&setSelected(null)}>
          <div className="nv-modal">
            <div className="nv-modal-head">
              <div style={{display:'flex',alignItems:'flex-start',gap:14}}>
                <div style={{width:48,height:48,borderRadius:12,background:(TYPE_CONFIG[selected.type]||TYPE_CONFIG.feature).bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>
                  {(TYPE_CONFIG[selected.type]||TYPE_CONFIG.feature).icon}
                </div>
                <div>
                  <div style={{display:'inline-flex',alignItems:'center',padding:'3px 10px',borderRadius:'100px',fontSize:11,fontWeight:700,background:(TYPE_CONFIG[selected.type]||TYPE_CONFIG.feature).bg,color:(TYPE_CONFIG[selected.type]||TYPE_CONFIG.feature).color,marginBottom:6}}>
                    {(TYPE_CONFIG[selected.type]||TYPE_CONFIG.feature).label}
                  </div>
                  <div style={{fontSize:20,fontWeight:800,color:'#e6edf3',letterSpacing:'-0.02em',lineHeight:1.3}}>{selected.titre}</div>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginTop:6}}>
                    <span style={{fontSize:12.5,color:'rgba(255,255,255,0.35)'}}>
                      {new Date(selected.date_publication).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}
                    </span>
                    {selected.version && (
                      <span style={{fontSize:11,padding:'2px 8px',borderRadius:'100px',background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.4)',fontWeight:600}}>
                        v{selected.version}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button className="nv-modal-close" onClick={()=>setSelected(null)}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="nv-modal-body">
              <div style={{fontSize:14,color:'rgba(255,255,255,0.5)',lineHeight:1.8,marginBottom:20}}>
                {selected.description}
              </div>
              {selected.contenu && (
                <div style={{fontSize:14,color:'rgba(255,255,255,0.65)',lineHeight:1.85,whiteSpace:'pre-wrap'}}>
                  {selected.contenu}
                </div>
              )}
              <div style={{marginTop:24,padding:'16px 18px',borderRadius:10,background:'rgba(0,120,212,0.06)',border:'1px solid rgba(0,120,212,0.15)'}}>
                <div style={{fontSize:13,color:'rgba(255,255,255,0.5)',lineHeight:1.65}}>
                  💡 <strong style={{color:'rgba(255,255,255,0.7)'}}>Conseil :</strong> Cette fonctionnalité est disponible dès maintenant dans votre tableau de bord. Contactez le support si vous avez des questions.
                </div>
              </div>
            </div>

            <div className="nv-modal-foot">
              <button onClick={()=>setSelected(null)}
                style={{padding:'10px 24px',borderRadius:6,background:'#0078d4',border:'none',color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'Inter'}}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
