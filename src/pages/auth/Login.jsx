import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [step, setStep] = useState(1) // 1=email, 2=password

  const handleNext = (e) => {
    e.preventDefault()
    if (!email || !email.includes('@')) { toast.error('Entrez une adresse email valide'); return }
    setStep(2)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!password) { toast.error('Entrez votre mot de passe'); return }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { toast.error(error.message); setLoading(false); return }
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
      const role = prof?.role || 'global_admin'
      const AGENCE = ['agence','global_admin','user_admin','billing_admin','reports_reader','security_admin','password_admin','agent','comptable','lecteur']
      if (role === 'locataire') navigate('/locataire')
      else if (role === 'proprietaire') navigate('/proprietaire')
      else if (role === 'super_admin') navigate('/admin')
      else if (AGENCE.includes(role)) navigate('/agence')
      else navigate('/agence')
    } catch(e) { toast.error(e.message); setLoading(false) }
  }

  return (
    <div style={{minHeight:'100vh',background:'#f3f2f1',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'"Segoe UI",system-ui,sans-serif'}}>
      <style>{`
        .ms-input{width:100%;padding:6px 8px;border:none;border-bottom:2px solid #605e5c;background:transparent;font-size:14px;font-family:"Segoe UI",sans-serif;outline:none;transition:border-color 0.15s;color:#323130;box-sizing:border-box}
        .ms-input:focus{border-bottom-color:#0078d4}
        .ms-input::placeholder{color:#a19f9d}
        .ms-btn{width:100%;padding:8px 16px;background:#0078d4;color:#fff;border:none;font-size:14px;font-family:"Segoe UI",sans-serif;font-weight:600;cursor:pointer;border-radius:2px;transition:background 0.15s;letter-spacing:0.01em}
        .ms-btn:hover{background:#106ebe}
        .ms-btn:disabled{background:#c8c6c4;cursor:default}
        .ms-link{color:#0078d4;font-size:13px;cursor:pointer;text-decoration:none;font-family:"Segoe UI",sans-serif}
        .ms-link:hover{text-decoration:underline}
        .ms-back{display:flex;align-items:center;gap:4px;background:none;border:none;color:#0078d4;font-size:13px;cursor:pointer;padding:0;font-family:"Segoe UI",sans-serif;margin-bottom:16px}
        .ms-back:hover{text-decoration:underline}
      `}</style>

      {/* Card */}
      <div style={{background:'#fff',padding:'44px 44px 36px',width:'100%',maxWidth:440,boxShadow:'0 2px 6px rgba(0,0,0,0.12)'}}>

        {/* Logo */}
        <div style={{marginBottom:20}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
            <div style={{width:32,height:32,background:'#0078d4',borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <span style={{fontSize:20,fontWeight:600,color:'#323130',letterSpacing:'-0.01em'}}>Imoloc</span>
          </div>
          <div style={{fontSize:24,fontWeight:300,color:'#323130',marginBottom:4,letterSpacing:'-0.01em'}}>Se connecter</div>
          {step===2 && <div style={{fontSize:13,color:'#605e5c'}}>{email}</div>}
        </div>

        {step===1 && (
          <form onSubmit={handleNext}>
            <div style={{marginBottom:20}}>
              <label style={{display:'block',fontSize:13,color:'#323130',marginBottom:8,fontWeight:400}}>Email, telephone ou Skype</label>
              <input className="ms-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="exemple@domaine.com" autoFocus/>
            </div>
            <div style={{fontSize:12,color:'#605e5c',marginBottom:24,lineHeight:1.5}}>
              Pas de compte ?{" "}
              <Link to="/register" className="ms-link">Creez-en un !</Link>
            </div>
            <button type="submit" className="ms-btn">Suivant</button>
          </form>
        )}

        {step===2 && (
          <form onSubmit={handleLogin}>
            <button type="button" className="ms-back" onClick={()=>setStep(1)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Retour
            </button>
            <div style={{marginBottom:20}}>
              <label style={{display:'block',fontSize:13,color:'#323130',marginBottom:8}}>Mot de passe</label>
              <div style={{position:'relative'}}>
                <input className="ms-input" type={showPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mot de passe" autoFocus style={{paddingRight:36}}/>
                <button type="button" onClick={()=>setShowPass(!showPass)} style={{position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#605e5c',fontSize:16,padding:2}}>
                  {showPass?'👁':'👁‍🗨'}
                </button>
              </div>
            </div>
            <div style={{marginBottom:24,textAlign:'right'}}>
              <a href="#" className="ms-link">Mot de passe oublie ?</a>
            </div>
            <button type="submit" className="ms-btn" disabled={loading}>{loading?'Connexion...':'Se connecter'}</button>
          </form>
        )}

        {/* Divider option */}
        <div style={{margin:'20px 0',display:'flex',alignItems:'center',gap:10}}>
          <div style={{flex:1,height:1,background:'#edebe9'}}/>
          <span style={{fontSize:12,color:'#a19f9d'}}>Options de connexion</span>
          <div style={{flex:1,height:1,background:'#edebe9'}}/>
        </div>
        <div style={{display:'flex',gap:10'}}>
          {['🏢 Agence','🏠 Locataire','👤 Proprietaire'].map(t=>(
            <button key={t} style={{flex:1,padding:'8px 4px',border:'1px solid #edebe9',background:'#faf9f8',borderRadius:2,fontSize:11,color:'#605e5c',cursor:'pointer',fontFamily:'inherit'}}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{marginTop:16,display:'flex',gap:20,fontSize:12,color:'#605e5c'}}>
        {['Conditions','Confidentialite','Aide'].map(l=>(
          <a key={l} href="#" style={{color:'#605e5c',textDecoration:'none'}} onMouseOver={e=>e.target.style.textDecoration='underline'} onMouseOut={e=>e.target.style.textDecoration='none'}>{l}</a>
        ))}
      </div>
      <div style={{marginTop:8,fontSize:11,color:'#a19f9d'}}>© 2026 Imoloc. Tous droits réservés.</div>
    </div>
  )
}
