import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { passwordRuleMet, passwordStrength } from '../../lib/password'
import Logo from '../../components/Logo'

// Page vers laquelle PrivateRoute redirige tant que
// profiles.doit_changer_mot_de_passe est vrai (voir App.jsx) — l'utilisateur
// ne peut accéder au reste de l'application avant d'avoir choisi un nouveau
// mot de passe. C'est ce qui rend réelle la case "Demander à cet utilisateur
// de modifier son mot de passe lors de sa première connexion" cochée à la
// création du compte ou lors d'une réinitialisation.
export default function ChangePassword() {
  const navigate = useNavigate()
  const { profile, setProfile } = useAuthStore()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const strength = passwordStrength(password)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!passwordRuleMet(password)) {
      setError("Le mot de passe doit comprendre entre 8 et 256 caractères et utiliser une combinaison d'au moins trois des éléments suivants : majuscules, minuscules, chiffres et symboles.")
      return
    }
    if (password !== confirm) { setError('Les deux mots de passe ne correspondent pas.'); return }
    setSaving(true)
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password })
      if (updErr) throw updErr
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('profiles').update({ doit_changer_mot_de_passe: false }).eq('id', user.id)
      setProfile({ ...profile, doit_changer_mot_de_passe: false })
      const espace = profile?.espace || 'collaborateur'
      if (espace === 'locataire') navigate('/locataire', { replace: true })
      else if (espace === 'proprietaire') navigate('/proprietaire', { replace: true })
      else if (espace === 'super_admin') navigate('/admin', { replace: true })
      else navigate('/agence', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f2f2f2', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif', padding: 20,
    }}>
      <style>{`
        .cp-input{width:100%;padding:9px 12px;border:1px solid #666;border-radius:2px;background:#fff;font-size:15px;font-family:inherit;color:#1a1a1a;outline:none;box-sizing:border-box}
        .cp-input:focus{border:2px solid #0067b8;padding:8px 11px}
        .cp-btn{width:100%;padding:10px 20px;background:#0067b8;color:#fff;border:none;font-size:15px;font-family:inherit;font-weight:600;cursor:pointer;margin-top:8px}
        .cp-btn:hover:not(:disabled){background:#005a9e}
        .cp-btn:disabled{background:#ccc;cursor:default}
        .cp-error{background:#fde8e8;border-left:3px solid #d93025;padding:8px 12px;font-size:13px;color:#d93025;margin-bottom:16px;border-radius:0 2px 2px 0}
      `}</style>
      <div style={{ background:'#fff', width:'100%', maxWidth:440, padding:'44px 44px 36px', boxShadow:'0 2px 6px rgba(0,0,0,0.2)' }}>
        <div style={{ marginBottom:32 }}>
          <Logo size={28} />
        </div>
        <h1 style={{ fontSize:24, fontWeight:400, color:'#1a1a1a', margin:'0 0 8px' }}>Mettre à jour votre mot de passe</h1>
        <p style={{ fontSize:13.5, color:'#555', margin:'0 0 24px', lineHeight:1.6 }}>
          Vous devez choisir un nouveau mot de passe avant de continuer.
        </p>
        {error && <div className="cp-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#333', marginBottom:6 }}>Nouveau mot de passe</label>
            <div style={{ position:'relative' }}>
              <input className="cp-input" type={showPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} autoFocus style={{ paddingRight:70 }}/>
              <div style={{ position:'absolute', right:10, top:0, bottom:0, display:'flex', alignItems:'center', gap:8 }}>
                {strength && <span style={{ fontSize:11.5, fontWeight:600, color:strength.color }}>{strength.label}</span>}
                <button type="button" onClick={()=>setShowPass(v=>!v)} style={{ background:'none', border:'none', cursor:'pointer', color:'#666', display:'flex' }}>
                  {showPass
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                </button>
              </div>
            </div>
            <div style={{ fontSize:12, color:'#666', marginTop:6, lineHeight:1.5 }}>
              Entre 8 et 256 caractères, avec au moins trois des éléments suivants : majuscules, minuscules, chiffres et symboles.
            </div>
          </div>
          <div style={{ marginBottom:8 }}>
            <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#333', marginBottom:6 }}>Confirmer le mot de passe</label>
            <input className="cp-input" type={showPass?'text':'password'} value={confirm} onChange={e=>setConfirm(e.target.value)}/>
          </div>
          <button type="submit" className="cp-btn" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer et continuer'}</button>
        </form>
      </div>
    </div>
  )
}
