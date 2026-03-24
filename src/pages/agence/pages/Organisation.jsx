import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'

export default function Organisation() {
  const [form, setForm] = useState({ nom:'', email:'', telephone:'', ville:'', pays:'Bénin', adresse:'', site_web:'' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [agenceId, setAgenceId] = useState(null)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  useEffect(() => {
    const init = async () => {
      const { data:{user} } = await supabase.auth.getUser()
      const { data:ag } = await supabase.from('agences').select('*').eq('profile_id', user.id).single()
      if (ag) { setAgenceId(ag.id); setForm({ nom:ag.nom||'', email:ag.email||'', telephone:ag.telephone||'', ville:ag.ville||'', pays:ag.pays||'Bénin', adresse:ag.adresse||'', site_web:ag.site_web||'' }) }
      setLoading(false)
    }
    init()
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('agences').update(form).eq('id', agenceId)
    if (error) toast.error(error.message)
    else toast.success('Informations sauvegardées !')
    setSaving(false)
  }

  if (loading) return <div style={{padding:60,textAlign:'center',color:'rgba(255,255,255,0.3)'}}>Chargement...</div>

  return (
    <>
      <style>{`
        .org-title{font-size:18px;font-weight:700;color:#e6edf3;margin-bottom:24px}
        .org-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:28px;margin-bottom:20px}
        .org-card-title{font-size:14px;font-weight:600;color:#e6edf3;margin-bottom:20px;display:flex;align-items:center;gap:8px}
        .form-grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .form-field{margin-bottom:16px}
        .form-lbl{display:block;font-size:12px;font-weight:600;color:rgba(255,255,255,0.4);margin-bottom:7px;text-transform:uppercase;letter-spacing:0.06em}
        .form-input{width:100%;padding:10px 12px;background:rgba(255,255,255,0.05);border:1.5px solid rgba(255,255,255,0.1);border-radius:8px;font-family:'Inter',sans-serif;font-size:14px;color:#e6edf3;outline:none;transition:border-color 0.15s}
        .form-input:focus{border-color:#0078d4}
        .pg-btn{display:inline-flex;align-items:center;gap:8px;padding:11px 22px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;border:none;font-family:'Inter',sans-serif;transition:all 0.15s}
        .pg-btn-blue{background:#0078d4;color:#fff}
        .pg-btn-blue:hover:not(:disabled){background:#006cc1}
        .pg-btn-blue:disabled{opacity:0.5;cursor:not-allowed}
        @media(max-width:768px){.form-grid2{grid-template-columns:1fr}}
      `}</style>
      <div className="org-title">🏢 Organisation</div>
      <form onSubmit={handleSave}>
        <div className="org-card">
          <div className="org-card-title">📋 Informations générales</div>
          <div className="form-grid2">
            <div className="form-field"><label className="form-lbl">Nom de l'agence *</label><input className="form-input" value={form.nom} onChange={e=>set('nom',e.target.value)} required/></div>
            <div className="form-field"><label className="form-lbl">Email professionnel</label><input type="email" className="form-input" value={form.email} onChange={e=>set('email',e.target.value)}/></div>
          </div>
          <div className="form-grid2">
            <div className="form-field"><label className="form-lbl">Téléphone</label><input className="form-input" value={form.telephone} onChange={e=>set('telephone',e.target.value)}/></div>
            <div className="form-field"><label className="form-lbl">Site web</label><input className="form-input" value={form.site_web} onChange={e=>set('site_web',e.target.value)} placeholder="https://..."/></div>
          </div>
        </div>
        <div className="org-card">
          <div className="org-card-title">📍 Localisation</div>
          <div className="form-field"><label className="form-lbl">Adresse</label><input className="form-input" value={form.adresse} onChange={e=>set('adresse',e.target.value)}/></div>
          <div className="form-grid2">
            <div className="form-field"><label className="form-lbl">Ville</label><input className="form-input" value={form.ville} onChange={e=>set('ville',e.target.value)}/></div>
            <div className="form-field"><label className="form-lbl">Pays</label><input className="form-input" value={form.pays} onChange={e=>set('pays',e.target.value)}/></div>
          </div>
        </div>
        <button type="submit" className="pg-btn pg-btn-blue" disabled={saving}>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</button>
      </form>
    </>
  )
}
