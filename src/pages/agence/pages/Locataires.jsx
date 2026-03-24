import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'

export default function Locataires() {
  const [locataires, setLocataires] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [agenceId, setAgenceId] = useState(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ nom:'', prenom:'', email:'', telephone:'', cin:'', profession:'', garant_nom:'', garant_telephone:'' })
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  useEffect(() => {
    const init = async () => {
      const { data:{user} } = await supabase.auth.getUser()
      const { data:ag } = await supabase.from('agences').select('id').eq('profile_id', user.id).single()
      if (ag) { setAgenceId(ag.id); fetchLocataires(ag.id) }
      else setLoading(false)
    }
    init()
  }, [])

  const fetchLocataires = async (id) => {
    setLoading(true)
    const { data } = await supabase.from('locataires').select('*').eq('agence_id', id).order('created_at', { ascending: false })
    setLocataires(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('locataires').insert({ ...form, agence_id: agenceId })
    if (error) { toast.error(error.message); return }
    toast.success('Locataire ajouté !')
    setShowModal(false)
    setForm({ nom:'', prenom:'', email:'', telephone:'', cin:'', profession:'', garant_nom:'', garant_telephone:'' })
    fetchLocataires(agenceId)
  }

  const filtered = locataires.filter(l =>
    `${l.prenom} ${l.nom} ${l.email} ${l.telephone}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <style>{`
        .pg-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px}
        .pg-title{font-size:18px;font-weight:700;color:#e6edf3}
        .pg-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:8px;font-size:13.5px;font-weight:600;cursor:pointer;border:none;font-family:'Inter',sans-serif;transition:all 0.15s}
        .pg-btn-blue{background:#0078d4;color:#fff}
        .pg-btn-blue:hover{background:#006cc1}
        .pg-btn-ghost{background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.5);border:1px solid rgba(255,255,255,0.08)}
        .pg-btn-ghost:hover{background:rgba(255,255,255,0.08);color:#e6edf3}
        .pg-search{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:8px 14px;margin-bottom:20px}
        .pg-search input{background:none;border:none;outline:none;font-family:'Inter',sans-serif;font-size:13.5px;color:#e6edf3;width:100%}
        .pg-search input::placeholder{color:rgba(255,255,255,0.22)}
        .loc-table{width:100%;border-collapse:collapse}
        .loc-table th{font-size:11.5px;font-weight:600;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.08em;padding:10px 16px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02)}
        .loc-table td{padding:14px 16px;font-size:13.5px;color:rgba(255,255,255,0.7);border-bottom:1px solid rgba(255,255,255,0.04)}
        .loc-table tr:hover td{background:rgba(255,255,255,0.02)}
        .loc-avatar{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#0078d4,#6c63ff);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:#fff;flex-shrink:0}
        .loc-name{font-size:14px;font-weight:600;color:#e6edf3}
        .loc-email{font-size:12px;color:rgba(255,255,255,0.3);margin-top:2px}
        .pg-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;overflow:hidden}
        .pg-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;text-align:center}
        .pg-empty-icon{font-size:52px;margin-bottom:16px;opacity:0.3}
        .pg-empty-title{font-size:16px;font-weight:600;color:rgba(255,255,255,0.4);margin-bottom:8px}
        .pg-empty-sub{font-size:14px;color:rgba(255,255,255,0.2);margin-bottom:24px}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px)}
        .modal{background:#161b22;border:1px solid rgba(255,255,255,0.08);border-radius:16px;width:100%;max-width:540px;max-height:90vh;overflow-y:auto}
        .modal-head{display:flex;align-items:center;justify-content:space-between;padding:22px 24px;border-bottom:1px solid rgba(255,255,255,0.06)}
        .modal-title{font-size:16px;font-weight:700;color:#e6edf3}
        .modal-close{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);padding:4px;border-radius:6px;display:flex}
        .modal-close:hover{background:rgba(255,255,255,0.06);color:#e6edf3}
        .modal-body{padding:24px}
        .modal-foot{padding:16px 24px;border-top:1px solid rgba(255,255,255,0.06);display:flex;justify-content:flex-end;gap:10px}
        .form-grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .form-field{margin-bottom:14px}
        .form-lbl{display:block;font-size:12px;font-weight:600;color:rgba(255,255,255,0.4);margin-bottom:7px;text-transform:uppercase;letter-spacing:0.06em}
        .form-input{width:100%;padding:10px 12px;background:rgba(255,255,255,0.05);border:1.5px solid rgba(255,255,255,0.1);border-radius:8px;font-family:'Inter',sans-serif;font-size:14px;color:#e6edf3;outline:none;transition:border-color 0.15s}
        .form-input:focus{border-color:#0078d4}
        .form-section{font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:rgba(0,120,212,0.7);margin:18px 0 14px;display:flex;align-items:center;gap:10px}
        .form-section::after{content:'';flex:1;height:1px;background:rgba(255,255,255,0.06)}
        @media(max-width:768px){.form-grid2{grid-template-columns:1fr}.loc-table{display:block;overflow-x:auto}}
      `}</style>
      <div className="pg-head">
        <div className="pg-title">👥 Locataires <span style={{fontSize:14,fontWeight:400,color:'rgba(255,255,255,0.3)'}}>({locataires.length})</span></div>
        <button className="pg-btn pg-btn-blue" onClick={() => setShowModal(true)}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
          Nouveau locataire
        </button>
      </div>
      <div className="pg-search">
        <svg width="15" height="15" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z"/></svg>
        <input placeholder="Rechercher un locataire..." value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      <div className="pg-card">
        {loading ? (
          <div style={{padding:60,textAlign:'center',color:'rgba(255,255,255,0.3)'}}>Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="pg-empty">
            <div className="pg-empty-icon">👥</div>
            <div className="pg-empty-title">{search ? 'Aucun résultat' : 'Aucun locataire'}</div>
            <div className="pg-empty-sub">{search ? 'Essayez une autre recherche' : 'Ajoutez votre premier locataire'}</div>
            {!search && <button className="pg-btn pg-btn-blue" onClick={() => setShowModal(true)}>Ajouter un locataire</button>}
          </div>
        ) : (
          <table className="loc-table">
            <thead>
              <tr>
                <th>Locataire</th>
                <th>Téléphone</th>
                <th>Profession</th>
                <th>Date d'ajout</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l,i) => (
                <tr key={i}>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <div className="loc-avatar">{l.prenom?.[0]?.toUpperCase()}{l.nom?.[0]?.toUpperCase()}</div>
                      <div>
                        <div className="loc-name">{l.prenom} {l.nom}</div>
                        <div className="loc-email">{l.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{l.telephone || '—'}</td>
                  <td>{l.profession || '—'}</td>
                  <td>{new Date(l.created_at).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal">
            <div className="modal-head">
              <div className="modal-title">Nouveau locataire</div>
              <button className="modal-close" onClick={()=>setShowModal(false)}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-section">Informations personnelles</div>
                <div className="form-grid2">
                  <div className="form-field"><label className="form-lbl">Prénom *</label><input className="form-input" value={form.prenom} onChange={e=>set('prenom',e.target.value)} required/></div>
                  <div className="form-field"><label className="form-lbl">Nom *</label><input className="form-input" value={form.nom} onChange={e=>set('nom',e.target.value)} required/></div>
                </div>
                <div className="form-grid2">
                  <div className="form-field"><label className="form-lbl">Email</label><input type="email" className="form-input" value={form.email} onChange={e=>set('email',e.target.value)}/></div>
                  <div className="form-field"><label className="form-lbl">Téléphone</label><input className="form-input" value={form.telephone} onChange={e=>set('telephone',e.target.value)}/></div>
                </div>
                <div className="form-grid2">
                  <div className="form-field"><label className="form-lbl">N° CNI / Passeport</label><input className="form-input" value={form.cin} onChange={e=>set('cin',e.target.value)}/></div>
                  <div className="form-field"><label className="form-lbl">Profession</label><input className="form-input" value={form.profession} onChange={e=>set('profession',e.target.value)}/></div>
                </div>
                <div className="form-section">Garant</div>
                <div className="form-grid2">
                  <div className="form-field"><label className="form-lbl">Nom du garant</label><input className="form-input" value={form.garant_nom} onChange={e=>set('garant_nom',e.target.value)}/></div>
                  <div className="form-field"><label className="form-lbl">Téléphone garant</label><input className="form-input" value={form.garant_telephone} onChange={e=>set('garant_telephone',e.target.value)}/></div>
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="pg-btn pg-btn-ghost" onClick={()=>setShowModal(false)}>Annuler</button>
                <button type="submit" className="pg-btn pg-btn-blue">Ajouter</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
