import { useState } from 'react'
import AddUserModal from '../components/AddUserModal'

const ROLES_INFO = [
  { name:'Administrateur global', color:'#ef4444', badge:'Critique' },
  { name:'Administrateur des utilisateurs', color:'#f59e0b', badge:'Élevé' },
  { name:'Agent', color:'#0078d4', badge:'Standard' },
  { name:'Comptable', color:'#0078d4', badge:'Standard' },
  { name:'Lecteur', color:'#6c63ff', badge:'Limité' },
]

export default function Utilisateurs() {
  const [showAdd, setShowAdd] = useState(false)

  return (
    <>
      <style>{`
        .usr-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px}
        .usr-title{font-size:18px;font-weight:700;color:#e6edf3}
        .usr-btns{display:flex;gap:10px}
        .pg-btn{display:inline-flex;align-items:center;gap:8px;padding:9px 18px;border-radius:6px;font-size:13.5px;font-weight:600;cursor:pointer;border:none;font-family:'Inter',sans-serif;transition:all 0.15s}
        .pg-btn-blue{background:#0078d4;color:#fff}
        .pg-btn-blue:hover{background:#006cc1}
        .pg-btn-ghost{background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.5);border:1px solid rgba(255,255,255,0.08)}
        .pg-btn-ghost:hover{background:rgba(255,255,255,0.08);color:#e6edf3}
        .usr-roles-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:28px}
        .usr-role-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:18px}
        .usr-role-top{display:flex;align-items:center;gap:10px;margin-bottom:8px}
        .usr-role-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
        .usr-role-name{font-size:13.5px;font-weight:600;color:#e6edf3}
        .usr-role-badge{padding:2px 8px;border-radius:100px;font-size:10px;font-weight:700;margin-left:auto}
        .usr-role-desc{font-size:12px;color:rgba(255,255,255,0.35);line-height:1.5}
        .usr-empty-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:60px 20px;text-align:center}
        .usr-empty-icon{font-size:44px;margin-bottom:14px;opacity:0.3}
        .usr-empty-title{font-size:16px;font-weight:600;color:rgba(255,255,255,0.4);margin-bottom:8px}
        .usr-empty-sub{font-size:13.5px;color:rgba(255,255,255,0.22);margin-bottom:24px;max-width:400px;margin-left:auto;margin-right:auto}
        .usr-bar{display:flex;align-items:center;gap:10px;margin-bottom:20px;flex-wrap:wrap}
        .usr-search{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:7px;padding:8px 14px;flex:1;min-width:200px}
        .usr-search input{background:none;border:none;outline:none;font-family:'Inter',sans-serif;font-size:13.5px;color:#e6edf3;width:100%}
        .usr-search input::placeholder{color:rgba(255,255,255,0.22)}
        @media(max-width:900px){.usr-roles-grid{grid-template-columns:1fr 1fr}}
        @media(max-width:600px){.usr-roles-grid{grid-template-columns:1fr}}
      `}</style>

      {/* Modal */}
      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} agenceName="Mon organisation"/>}

      <div className="usr-head">
        <div className="usr-title">👤 Utilisateurs & Rôles</div>
        <div className="usr-btns">
          <button className="pg-btn pg-btn-ghost">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
            Réinitialiser un mot de passe
          </button>
          <button className="pg-btn pg-btn-blue" onClick={() => setShowAdd(true)}>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
            Ajouter un utilisateur
          </button>
        </div>
      </div>

      {/* Rôles disponibles */}
      <div style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:14}}>Rôles disponibles</div>
      <div className="usr-roles-grid">
        {ROLES_INFO.map((r,i) => (
          <div key={i} className="usr-role-card">
            <div className="usr-role-top">
              <div className="usr-role-dot" style={{background:r.color}}/>
              <span className="usr-role-name">{r.name}</span>
              <span className="usr-role-badge" style={{background:`${r.color}18`,color:r.color}}>{r.badge}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Barre de recherche */}
      <div className="usr-bar">
        <div className="usr-search">
          <svg width="14" height="14" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z"/></svg>
          <input placeholder="Rechercher un utilisateur..."/>
        </div>
        <button className="pg-btn pg-btn-ghost" style={{fontSize:13}}>Filtrer par rôle</button>
      </div>

      {/* Liste vide */}
      <div className="usr-empty-card">
        <div className="usr-empty-icon">👥</div>
        <div className="usr-empty-title">Aucun utilisateur dans votre organisation</div>
        <div className="usr-empty-sub">Invitez des membres pour collaborer sur la gestion de vos biens, locataires et paiements.</div>
        <button className="pg-btn pg-btn-blue" onClick={() => setShowAdd(true)}>
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
          Ajouter le premier utilisateur
        </button>
      </div>
    </>
  )
}
