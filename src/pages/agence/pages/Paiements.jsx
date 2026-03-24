import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'

const MODES = ['Mobile Money','Virement bancaire','Espèces','Chèque','Carte bancaire']
const STATUTS = ['payé','en attente','retard']
const STATUT_COLORS = { payé:'#00c896', 'en attente':'#f59e0b', retard:'#ef4444' }

export default function Paiements() {
  const [paiements, setPaiements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [agenceId, setAgenceId] = useState(null)
  const [biens, setBiens] = useState([])
  const [locataires, setLocataires] = useState([])
  const [filterStatut, setFilterStatut] = useState('tous')
  const [form, setForm] = useState({ montant:'', mode:'Mobile Money', statut:'payé', date_paiement: new Date().toISOString().split('T')[0], bien_id:'', locataire_id:'', notes:'' })
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  useEffect(() => {
    const init = async () => {
      const { data:{user} } = await supabase.auth.getUser()
      const { data:ag } = await supabase.from('agences').select('id').eq('profile_id', user.id).single()
      if (ag) {
        setAgenceId(ag.id)
        const [{ data:p },{ data:b },{ data:l }] = await Promise.all([
          supabase.from('paiements').select('*, biens(nom), locataires(nom,prenom)').eq('agence_id', ag.id).order('created_at',{ascending:false}),
          supabase.from('biens').select('id,nom').eq('agence_id', ag.id),
          supabase.from('locataires').select('id,nom,prenom').eq('agence_id', ag.id),
        ])
        setPaiements(p||[]); setBiens(b||[]); setLocataires(l||[])
      }
      setLoading(false)
    }
    init()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('paiements').insert({ ...form, agence_id: agenceId, montant: Number(form.montant) })
    if (error) { toast.error(error.message); return }
    toast.success('Paiement enregistré !')
    setShowModal(false)
    const { data } = await supabase.from('paiements').select('*, biens(nom), locataires(nom,prenom)').eq('agence_id', agenceId).order('created_at',{ascending:false})
    setPaiements(data||[])
  }

  const totalMois = paiements.filter(p => p.statut === 'payé' && new Date(p.date_paiement).getMonth() === new Date().getMonth()).reduce((s,p) => s + Number(p.montant), 0)
  const filtered = filterStatut === 'tous' ? paiements : paiements.filter(p => p.statut === filterStatut)

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
        .pai-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px}
        .pai-stat{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px}
        .pai-stat-val{font-size:22px;font-weight:700;margin-bottom:4px}
        .pai-stat-lbl{font-size:12.5px;color:rgba(255,255,255,0.35)}
        .pg-filters{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap}
        .pg-filter-btn{padding:8px 16px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.5);font-family:'Inter',sans-serif;transition:all 0.15s}
        .pg-filter-btn.active{background:rgba(0,120,212,0.15);border-color:rgba(0,120,212,0.3);color:#4da6ff}
        .pg-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;overflow:hidden}
        .loc-table{width:100%;border-collapse:collapse}
        .loc-table th{font-size:11.5px;font-weight:600;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.08em;padding:10px 16px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02)}
        .loc-table td{padding:14px 16px;font-size:13.5px;color:rgba(255,255,255,0.7);border-bottom:1px solid rgba(255,255,255,0.04)}
        .loc-table tr:hover td{background:rgba(255,255,255,0.02)}
        .statut-badge{padding:3px 10px;border-radius:100px;font-size:11px;font-weight:600}
        .pg-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;text-align:center;color:rgba(255,255,255,0.3)}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px)}
        .modal{background:#161b22;border:1px solid rgba(255,255,255,0.08);border-radius:16px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto}
        .modal-head{display:flex;align-items:center;justify-content:space-between;padding:22px 24px;border-bottom:1px solid rgba(255,255,255,0.06)}
        .modal-title{font-size:16px;font-weight:700;color:#e6edf3}
        .modal-close{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);padding:4px;border-radius:6px;display:flex}
        .modal-close:hover{background:rgba(255,255,255,0.06)}
        .modal-body{padding:24px}
        .modal-foot{padding:16px 24px;border-top:1px solid rgba(255,255,255,0.06);display:flex;justify-content:flex-end;gap:10px}
        .form-grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .form-field{margin-bottom:14px}
        .form-lbl{display:block;font-size:12px;font-weight:600;color:rgba(255,255,255,0.4);margin-bottom:7px;text-transform:uppercase;letter-spacing:0.06em}
        .form-input{width:100%;padding:10px 12px;background:rgba(255,255,255,0.05);border:1.5px solid rgba(255,255,255,0.1);border-radius:8px;font-family:'Inter',sans-serif;font-size:14px;color:#e6edf3;outline:none;transition:border-color 0.15s}
        .form-input:focus{border-color:#0078d4}
        .form-input option{background:#1c2434}
        @media(max-width:768px){.pai-stats{grid-template-columns:1fr}.form-grid2{grid-template-columns:1fr}}
      `}</style>
      <div className="pg-head">
        <div className="pg-title">💳 Paiements</div>
        <button className="pg-btn pg-btn-blue" onClick={() => setShowModal(true)}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
          Enregistrer un paiement
        </button>
      </div>
      <div className="pai-stats">
        <div className="pai-stat">
          <div className="pai-stat-val" style={{color:'#00c896'}}>{totalMois.toLocaleString()} FCFA</div>
          <div className="pai-stat-lbl">Encaissé ce mois</div>
        </div>
        <div className="pai-stat">
          <div className="pai-stat-val" style={{color:'#ef4444'}}>{paiements.filter(p=>p.statut==='retard').length}</div>
          <div className="pai-stat-lbl">Loyers en retard</div>
        </div>
        <div className="pai-stat">
          <div className="pai-stat-val" style={{color:'#f59e0b'}}>{paiements.filter(p=>p.statut==='en attente').length}</div>
          <div className="pai-stat-lbl">En attente</div>
        </div>
      </div>
      <div className="pg-filters">
        {['tous','payé','en attente','retard'].map(s => (
          <button key={s} className={`pg-filter-btn ${filterStatut===s?'active':''}`} onClick={()=>setFilterStatut(s)}>
            {s.charAt(0).toUpperCase()+s.slice(1)}
          </button>
        ))}
      </div>
      <div className="pg-card">
        {loading ? (
          <div style={{padding:60,textAlign:'center',color:'rgba(255,255,255,0.3)'}}>Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="pg-empty"><div style={{fontSize:40,marginBottom:12}}>💳</div><div>Aucun paiement trouvé</div></div>
        ) : (
          <table className="loc-table">
            <thead><tr><th>Locataire</th><th>Bien</th><th>Montant</th><th>Mode</th><th>Date</th><th>Statut</th></tr></thead>
            <tbody>
              {filtered.map((p,i) => (
                <tr key={i}>
                  <td>{p.locataires ? `${p.locataires.prenom} ${p.locataires.nom}` : '—'}</td>
                  <td>{p.biens?.nom || '—'}</td>
                  <td style={{fontWeight:600,color:'#00c896'}}>{Number(p.montant).toLocaleString()} FCFA</td>
                  <td>{p.mode}</td>
                  <td>{p.date_paiement ? new Date(p.date_paiement).toLocaleDateString('fr-FR') : '—'}</td>
                  <td><span className="statut-badge" style={{background:`${STATUT_COLORS[p.statut]}18`,color:STATUT_COLORS[p.statut]}}>{p.statut}</span></td>
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
              <div className="modal-title">Enregistrer un paiement</div>
              <button className="modal-close" onClick={()=>setShowModal(false)}><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-field"><label className="form-lbl">Locataire</label>
                  <select className="form-input" value={form.locataire_id} onChange={e=>set('locataire_id',e.target.value)}>
                    <option value="">Sélectionner...</option>
                    {locataires.map(l=><option key={l.id} value={l.id}>{l.prenom} {l.nom}</option>)}
                  </select>
                </div>
                <div className="form-field"><label className="form-lbl">Bien</label>
                  <select className="form-input" value={form.bien_id} onChange={e=>set('bien_id',e.target.value)}>
                    <option value="">Sélectionner...</option>
                    {biens.map(b=><option key={b.id} value={b.id}>{b.nom}</option>)}
                  </select>
                </div>
                <div className="form-grid2">
                  <div className="form-field"><label className="form-lbl">Montant (FCFA) *</label><input type="number" className="form-input" value={form.montant} onChange={e=>set('montant',e.target.value)} required/></div>
                  <div className="form-field"><label className="form-lbl">Date *</label><input type="date" className="form-input" value={form.date_paiement} onChange={e=>set('date_paiement',e.target.value)} required/></div>
                </div>
                <div className="form-grid2">
                  <div className="form-field"><label className="form-lbl">Mode de paiement</label>
                    <select className="form-input" value={form.mode} onChange={e=>set('mode',e.target.value)}>
                      {MODES.map(m=><option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="form-field"><label className="form-lbl">Statut</label>
                    <select className="form-input" value={form.statut} onChange={e=>set('statut',e.target.value)}>
                      {STATUTS.map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-field"><label className="form-lbl">Notes</label><textarea className="form-input" rows={2} value={form.notes} onChange={e=>set('notes',e.target.value)} style={{resize:'vertical'}}/></div>
              </div>
              <div className="modal-foot">
                <button type="button" className="pg-btn pg-btn-ghost" onClick={()=>setShowModal(false)}>Annuler</button>
                <button type="submit" className="pg-btn pg-btn-blue">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
