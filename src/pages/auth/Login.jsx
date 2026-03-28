import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()
  const { setUser, setProfile } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passFocused, setPassFocused] = useState(false)

  const handleNext = (e) => {
    e.preventDefault()
    if (!email) return
    setStep(2)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      setUser(data.user)
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
      const p = profile || { id: data.user.id, role: 'agence' }
      setProfile(p)
      toast.success('Connexion réussie !')
      const AGENCE_ROLES = ['global_admin','user_admin','billing_admin','reports_reader','security_admin','password_admin','agent','comptable','lecteur']
      if (p.role === 'super_admin') navigate('/admin')
      else if (AGENCE_ROLES.includes(p.role)) navigate('/agence')
      else if (p.role === 'proprietaire') navigate('/proprietaire')
      else if (p.role === 'locataire') navigate('/locataire')
      else navigate('/agence') // fallback
    } catch (err) {
      toast.error('Email ou mot de passe incorrect')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body,#root{width:100%;min-height:100vh}
        .ms-page{width:100vw;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Inter','Segoe UI',sans-serif;position:relative;overflow:hidden;background-color:#111c2d;padding:80px 16px 40px}
        .ms-bg{position:fixed;inset:0;z-index:0;background:radial-gradient(ellipse 120% 80% at -10% 50%,#1e3a5f 0%,transparent 50%),radial-gradient(ellipse 80% 100% at 110% 20%,#0f2847 0%,transparent 50%)}
        .ms-s1{position:fixed;width:700px;height:700px;border-radius:50%;filter:blur(60px);pointer-events:none;z-index:0;background:radial-gradient(circle,rgba(0,80,160,0.3) 0%,transparent 65%);top:-200px;left:-200px}
        .ms-s2{position:fixed;width:600px;height:600px;border-radius:50%;filter:blur(60px);pointer-events:none;z-index:0;background:radial-gradient(circle,rgba(0,50,120,0.25) 0%,transparent 65%);bottom:-150px;right:-150px}
        .ms-stars{position:fixed;inset:0;z-index:0;background-image:radial-gradient(1px 1px at 10% 20%,rgba(255,255,255,0.35) 0%,transparent 100%),radial-gradient(1px 1px at 30% 60%,rgba(255,255,255,0.25) 0%,transparent 100%),radial-gradient(1px 1px at 60% 10%,rgba(255,255,255,0.3) 0%,transparent 100%),radial-gradient(1px 1px at 75% 85%,rgba(255,255,255,0.2) 0%,transparent 100%),radial-gradient(1px 1px at 90% 35%,rgba(255,255,255,0.25) 0%,transparent 100%)}
        .ms-card{position:relative;z-index:10;width:100%;max-width:440px;background:rgba(28,36,52,0.93);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:44px 44px 36px;backdrop-filter:blur(20px);box-shadow:0 8px 40px rgba(0,0,0,0.55);margin-top:8px}
        .ms-logo{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:24px}
        .ms-logo-icon{width:32px;height:32px;border-radius:7px;background:#0078d4;display:flex;align-items:center;justify-content:center}
        .ms-title{font-size:24px;font-weight:600;color:#fff;letter-spacing:-0.02em;margin-bottom:8px}
        .ms-sub{font-size:14px;color:rgba(255,255,255,0.5);margin-bottom:28px}
        .ms-chip{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:8px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);margin-bottom:20px;cursor:pointer}
        .ms-chip-text{font-size:14px;color:rgba(255,255,255,0.8);font-weight:500}
        .ms-chip-change{font-size:13px;color:#4da6ff;background:none;border:none;cursor:pointer;font-family:inherit;font-weight:500}
        .ms-field{position:relative;margin-bottom:20px}
        .ms-lbl{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:14px;color:rgba(255,255,255,0.4);pointer-events:none;transition:all 0.15s ease;padding:0 4px}
        .ms-lbl.up{top:0;transform:translateY(-50%);font-size:11.5px;color:#4da6ff;background:rgba(28,36,52,0.95)}
        .ms-input{width:100%;padding:14px 12px 6px;background:rgba(255,255,255,0.05);border:1.5px solid rgba(255,255,255,0.14);border-radius:4px;font-family:'Inter',sans-serif;font-size:14px;color:#fff;outline:none;transition:border-color 0.15s}
        .ms-input:focus{border-color:#0078d4;background:rgba(255,255,255,0.07)}
        .ms-input.has-eye{padding-right:44px}
        .ms-eye{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.3);display:flex;padding:2px;transition:color 0.15s}
        .ms-eye:hover{color:rgba(255,255,255,0.7)}
        .ms-forgot{display:block;font-size:13px;color:#4da6ff;text-decoration:none;margin-top:8px;margin-bottom:20px;transition:color 0.15s}
        .ms-forgot:hover{color:#79bfff;text-decoration:underline}
        .ms-btn{width:100%;padding:13px;background:#0078d4;border:none;border-radius:4px;font-family:'Inter',sans-serif;font-size:15px;font-weight:600;color:#fff;cursor:pointer;transition:background 0.15s;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:20px}
        .ms-btn:hover:not(:disabled){background:#006cc1}
        .ms-btn:disabled{opacity:0.5;cursor:not-allowed}
        .ms-spin{width:16px;height:16px;border:2px solid rgba(255,255,255,0.25);border-top-color:#fff;border-radius:50%;animation:ms-spin 0.6s linear infinite}
        @keyframes ms-spin{to{transform:rotate(360deg)}}
        .ms-create{font-size:14px;color:rgba(255,255,255,0.6);text-align:center}
        .ms-create a{color:#4da6ff;text-decoration:none;font-weight:500}
        .ms-create a:hover{text-decoration:underline}
        .ms-footer{position:relative;z-index:10;display:flex;align-items:center;justify-content:center;gap:20px;flex-wrap:wrap;padding:20px 5%;margin-top:8px}
        .ms-footer a,.ms-footer span{font-size:12.5px;color:rgba(255,255,255,0.35);text-decoration:none;transition:color 0.15s}
        .ms-footer a:hover{color:rgba(255,255,255,0.7)}
        @media(max-width:480px){.ms-card{padding:36px 24px 28px;margin:12px}}
      `}</style>
      <div className="ms-page">
        <div className="ms-bg"/><div className="ms-s1"/><div className="ms-s2"/><div className="ms-stars"/>
        <div className="ms-card">
          <div className="ms-logo">
            <div className="ms-logo-icon"><svg width="18" height="18" fill="none" stroke="#fff" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z"/></svg></div>
            <span style={{fontSize:18,fontWeight:700,color:'#fff',letterSpacing:'-0.02em'}}>Imoloc</span>
          </div>
          {step === 1 && (
            <>
              <div className="ms-title">Se connecter</div>
              <div className="ms-sub">Utilisez votre compte Imoloc</div>
              <form onSubmit={handleNext}>
                <div className="ms-field">
                  <label className={`ms-lbl ${emailFocused||email?'up':''}`}>Email ou téléphone</label>
                  <input type="email" className="ms-input" value={email} onChange={e=>setEmail(e.target.value)} onFocus={()=>setEmailFocused(true)} onBlur={()=>setEmailFocused(false)} required autoFocus/>
                </div>
                <a href="#" className="ms-forgot">Identifiant oublié ?</a>
                <button type="submit" className="ms-btn">Suivant</button>
                <div className="ms-create">Pas de compte ? <Link to="/register">Créez-en un !</Link></div>
              </form>
            </>
          )}
          {step === 2 && (
            <>
              <div className="ms-title">Entrez le mot de passe</div>
              <div className="ms-chip" onClick={()=>setStep(1)}>
                <span className="ms-chip-text">{email}</span>
                <button className="ms-chip-change">Modifier</button>
              </div>
              <form onSubmit={handleLogin}>
                <div className="ms-field">
                  <label className={`ms-lbl ${passFocused||password?'up':''}`}>Mot de passe</label>
                  <input type={showPass?'text':'password'} className="ms-input has-eye" value={password} onChange={e=>setPassword(e.target.value)} onFocus={()=>setPassFocused(true)} onBlur={()=>setPassFocused(false)} required autoFocus/>
                  <button type="button" className="ms-eye" onClick={()=>setShowPass(!showPass)}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path strokeLinecap="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  </button>
                </div>
                <a href="#" className="ms-forgot">Mot de passe oublié ?</a>
                <button type="submit" className="ms-btn" disabled={loading}>
                  {loading?<><span className="ms-spin"/>Connexion…</>:'Se connecter'}
                </button>
                <div className="ms-create"><Link to="/register">Créer un compte agence</Link></div>
              </form>
            </>
          )}
        </div>
        <div className="ms-footer">
          <a href="#">Conditions</a><a href="#">Confidentialité</a>
          <span>© {new Date().getFullYear()} Imoloc — DJLOTECH Society</span>
        </div>
      </div>
    </>
  )
}
