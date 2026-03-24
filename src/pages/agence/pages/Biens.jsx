import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../store/authStore'
import toast from 'react-hot-toast'

const TYPES = ['Appartement','Villa','Bureau','Terrain','Local commercial','Studio','Duplex']
const STATUTS = ['libre','occupé','maintenance','réservé']
const STATUT_COLORS = { libre:'#00c896', occupé:'#0078d4', maintenance:'#f59e0b', réservé:'#6c63ff' }

export default function Biens() {
  const [biens, setBiens] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [agenceId, setAgenceId] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('tous')
  const [form, setForm] = useState({ nom:'', type:'Appartement', adresse:'', ville:'', superficie:'', loyer:'', statut:'libre', description:'' })
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  useEffect(() => {
    const init = async () => {
      const { data:{user} } = await supabase.auth.getUser()
      const { data:ag } = await supabase.from('agences').select('id').eq('profile_id', user.id).single()
      if (ag) { setAgenceId(ag.id); fetchBiens(ag.id) }
      else setLoading(false)
    }
    init()
  }, [])

  const fetchBiens = async (id) => {
    setLoading(true)
    const { data } = await supabase.from('biens').select('*').eq('agence_id', id).order('created_at', { ascending: false })
    setBiens(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!agenceId) return
    const { error } = await supabase.from('biens').insert({ ...form, agence_id: agenceId, superficie: Number(form.superficie), loyer: Number(form.loyer) })
    if (error) { toast.error(error.message); return }
    toast.success('Bien ajouté !')
    setShowModal(false)
    setForm({ nom:'', type:'Appartement', adresse:'', ville:'', superficie:'', loyer:'', statut:'libre', description:'' })
    fetchBiens(agenceId)
  }

  const filtered = biens.filter(b => {
    const matchSearch = b.nom?.toLowerCase().includes(search.toLowerCase()) || b.ville?.toLowerCase().includes(search.toLowerCase())
    const matchStatut = filterStatut === 'tous' || b.statut === filterStatut
    return matchSearch && matchStatut
  })

  return (
    <>
      <style>{`
        .pg-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px}
        .pg-title{font-size:18px;font-weight:700;color:#e6edf3}
        .pg-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:8px;font-size:13.5px;font-weight:600;cursor:pointer;border:none;font-family:'Inter',sans-serif;transition:all 0.15s}
        .pg-btn-blue{background:#0078d4;color:#fff}
        .pg-btn-blue:hover{background:#006cc1}
        .pg-filters{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap}
        .pg-search{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:8px 14px;flex:1;min-width:200px}
        .pg-search input{background:none;border:none;outline:none;font-family:'Inter',sans-serif;font-size:13.5px;color:#e6edf3;width:100%}
        .pg-search input::placeholder{color:rgba(255,255,255,0.22)}
        .pg-filter-btn{padding:8px 16px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.5);font-family:'Inter',sans-serif;transition:all 0.15s}
        .pg-filter-btn.active{background:rgba(0,120,212,0.15);border-color:rgba(0,120,212,0.3);color:#4da6ff}
        .pg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
        .bien-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px;transition:all 0.2s;cursor:pointer}
        .bien-card:hover{border-color:rgba(255,255,255,0.14);transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.3)}
        .bien-card-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px}
        .bien-card-type{font-size:11px;font-weight:600;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.08em}
        .bien-statut{padding:3px 10px;border-radius:100px;font-size:11px;font-weight:600;text-transform:capitalize}
        .bien-card-nom{font-size:15px;font-weight:600;color:#e6edf3;margin-bottom:4px}
        .bien-card-addr{font-size:12.5px;color:rgba(255,255,255,0.35);margin-bottom:14px}
        .bien-card-footer{display:flex;justify-content:space-between;align-items:center;padding-top:14px;border-top:1px solid rgba(255,255,255,0.06)}
        .bien-loyer{font-size:15px;font-weight:700;color:#0078d4}
        .bien-superficie{font-size:12px;color:rgba(255,255,255,0.3)}
        .pg-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;text-align:center}
        .pg-empty-icon{font-size:52px;margin-bottom:16px;opacity:0.3}
        .pg-empty-title{font-size:16px;font-weight:600;color:rgba(255,255,255,0.4);margin-bottom:8px}
        .pg-empty-sub{font-size:14px;color:rgba(255,255,255,0.2);margin-bottom:24px}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px)}
        .modal{background:#161b22;border:1px solid rgba(255,255,255,0.08);border-radius:16px;width:100%;max-width:540px;max-height:90vh;overflow-y:auto}
        .modal-head{display:flex;align-items:center;justify-content:space-between;padding:22px 24px;border-bottom:1px solid rgba(255,255,255,0.06)}
        .modal-title{font-size:16px;font-weight:700;color:#e6edf3}
        .modal-close{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);padding:4px;border-radius:6px;transition:all 0.15s;display:flex}
        .modal-close:hover{background:rgba(255,255,255,0.06);color:#e6edf3}
        .modal-body{padding:24px}
        .form-grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .form-field{margin-bottom:14px}
        .form-lbl{display:block;font-size:12px;font-weight:600;color:rgba(255,255,255,0.4);margin-bottom:7px;text-transform:uppercase;letter-spacing:0.06em}
        .form-input{width:100%;padding:10px 12px;background:rgba(255,255,255,0.05);border:1.5px solid rgba(255,255,255,0.1);border-radius:8px;font-family:'Inter',sans-serif;font-size:14px;color:#e6edf3;outline:none;transition:border-color 0.15s}
        .form-input:focus{border-color:#0078d4}
        .form-input option{background:#1c2434}
        .modal-foot{padding:16px 24px;border-top:1px solid rgba(255,255,255,0.06);display:flex;justify-content:flex-end;gap:10px}
        .pg-btn-ghost{background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.5);border:1px solid rgba(255,255,255,0.08)}
        .pg-btn-ghost:hover{background:rgba(255,255,255,0.08);color:#e6edf3}
        @media(max-width:768px){.form-grid2{grid-template-columns:1fr}}
      `}</style>

      <div className="pg-head">
        <div className="pg-title">🏢 Biens immobiliers <span style={{fontSize:14,fontWeight:400,color:'rgba(255,255,255,0.3)'}}>({biens.length})</span></div>
        <button className="pg-btn pg-btn-blue" onClick={() => setShowModal(true)}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
          Ajouter un bien
        </button>
      </div>

      <div className="pg-filters">
        <div className="pg-search">
          <svg width="15" height="15" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z"/></svg>
          <input placeholder="Rechercher un bien..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        {['tous',...STATUTS].map(s => (
          <button key={s} className={`pg-filter-btn ${filterStatut===s?'active':''}`} onClick={()=>setFilterStatut(s)}>
            {s.charAt(0).toUpperCase()+s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{display:'flex',justifyContent:'center',padding:60,color:'rgba(255,255,255,0.3)'}}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="pg-empty">
          <div className="pg-empty-icon">🏠</div>
          <div className="pg-empty-title">{search ? 'Aucun résultat' : 'Aucun bien ajouté'}</div>
          <div className="pg-empty-sub">{search ? 'Essayez une autre recherche' : 'Commencez par ajouter votre premier bien immobilier'}</div>
          {!search && <button className="pg-btn pg-btn-blue" onClick={() => setShowModal(true)}>Ajouter un bien</button>}
        </div>
      ) : (
        <div className="pg-grid">
          {filtered.map((b,i) => (
            <div key={i} className="bien-card">
              <div className="bien-card-top">
                <div className="bien-card-type">{b.type}</div>
                <div className="bien-statut" style={{background:`${STATUT_COLORS[b.statut]}18`,color:STATUT_COLORS[b.statut]}}>
                  {b.statut}
                </div>
              </div>
              <div className="bien-card-nom">{b.nom}</div>
              <div className="bien-card-addr">{b.adresse}{b.ville ? `, ${b.ville}` : ''}</div>
              <div className="bien-card-footer">
                <div className="bien-loyer">{Number(b.loyer).toLocaleString()} FCFA<span style={{fontSize:11,fontWeight:400,color:'rgba(255,255,255,0.3)'}}>/mois</span></div>
                <div className="bien-superficie">{b.superficie} m²</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal">
            <div className="modal-head">
              <div className="modal-title">Ajouter un bien</div>
              <button className="modal-close" onClick={()=>setShowModal(false)}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-field">
                  <label className="form-lbl">Nom du bien *</label>
                  <input className="form-input" value={form.nom} onChange={e=>set('nom',e.target.value)} required placeholder="Ex: Appartement Lot 12"/>
                </div>
                <div className="form-grid2">
                  <div className="form-field">
                    <label className="form-lbl">Type *</label>
                    <select className="form-input" value={form.type} onChange={e=>set('type',e.target.value)}>
                      {TYPES.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-lbl">Statut</label>
                    <select className="form-input" value={form.statut} onChange={e=>set('statut',e.target.value)}>
                      {STATUTS.map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-field">
                  <label className="form-lbl">Adresse</label>
                  <input className="form-input" value={form.adresse} onChange={e=>set('adresse',e.target.value)} placeholder="Adresse complète"/>
                </div>
                <div className="form-grid2">
                  <div className="form-field">
                    <label className="form-lbl">Ville</label>
                    <input className="form-input" value={form.ville} onChange={e=>set('ville',e.target.value)} placeholder="Cotonou"/>
                  </div>
                  <div className="form-field">
                    <label className="form-lbl">Superficie (m²)</label>
                    <input type="number" className="form-input" value={form.superficie} onChange={e=>set('superficie',e.target.value)} placeholder="75"/>
                  </div>
                </div>
                <div className="form-field">
                  <label className="form-lbl">Loyer mensuel (FCFA) *</label>
                  <input type="number" className="form-input" value={form.loyer} onChange={e=>set('loyer',e.target.value)} required placeholder="75000"/>
                </div>
                <div className="form-field">
                  <label className="form-lbl">Description</label>
                  <textarea className="form-input" rows={3} value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Description du bien..." style={{resize:'vertical'}}/>
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="pg-btn pg-btn-ghost" onClick={()=>setShowModal(false)}>Annuler</button>
                <button type="submit" className="pg-btn pg-btn-blue">Ajouter le bien</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
