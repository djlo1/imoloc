import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const TYPES = [
  { id:'organisation', icon:'🏢', titre:'Agence / Entreprise', desc:'Gerez vos biens, locataires et equipes' },
  { id:'particulier',  icon:'👤', titre:'Particulier', desc:'Proprietaire individuel avec quelques biens' },
  { id:'proprietaire', icon:'🔑', titre:'Proprietaire', desc:'Suivez vos biens et revenus locatifs' },
  { id:'locataire',    icon:'🏠', titre:'Locataire', desc:'Payez votre loyer et gerez votre bail' },
]

const ROLE_MAP = { organisation:'global_admin', particulier:'agence', proprietaire:'proprietaire', locataire:'locataire' }

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [typeCompte, setTypeCompte] = useState(null)
  const [form, setForm] = useState({ prenom:'', nom:'', email:'', password:'', confirm:'' })
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const handleType = (t) => { setTypeCompte(t); setStep(2) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.prenom || !form.nom) { toast.error('Remplissez votre nom et prenom'); return }
    if (!form.email || !form.email.includes('@')) { toast.error('Email invalide'); return }
    if (form.password.length < 8) { toast.error('Mot de passe: 8 caracteres minimum'); return }
    if (form.password !== form.confirm) { toast.error('Les mots de passe ne correspondent pas'); return }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { prenom: form.prenom, nom: form.nom, role: ROLE_MAP[typeCompte], type_compte: typeCompte } }
      })
      if (error) { toast.error(error.message); setLoading(false); return }
      if (typeCompte === 'locataire' || typeCompte === 'proprietaire') {
        toast.success('Compte cree ! Connectez-vous.')
        navigate('/login')
      } else {
        toast.success('Compte cree ! Configurez votre organisation.')
        navigate('/agence')
      }
    } catch(e) { toast.error(e.message); setLoading(false) }
  }

  const inp = {width:'100%',padding:'6px 8px',border:'none',borderBottom:'2px solid #605e5c',background:'transparent',fontSize:14,fontFamily:'"Segoe UI",sans-serif',outline:'none',color:'#323130',boxSizing:'border-box',transition:'border-color 0.15s'}

  return (
    <div style={{minHeight:'100vh',background:'#f3f2f1',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'"Segoe UI",system-ui,sans-serif',padding:'20px 0'}}>
      <style>{`
        .ms-inp{width:100%;padding:6px 8px;border:none;border-bottom:2px solid #605e5c;background:transparent;font-size:14px;font-family:"Segoe UI",sans-serif;outline:none;color:#323130;box-sizing:border-box;transition:border-color 0.15s}
        .ms-inp:focus{border-bottom-color:#0078d4}
        .ms-inp::placeholder{color:#a19f9d}
        .ms-btn{width:100%;padding:8px 16px;background:#0078d4;color:#fff;border:none;font-size:14px;font-family:"Segoe UI",sans-serif;font-weight:600;cursor:pointer;border-radius:2px;transition:background 0.15s}
        .ms-btn:hover{background:#106ebe}
        .ms-btn:disabled{background:#c8c6c4;cursor:default}
        .type-card{padding:16px;border:1px solid #edebe9;background:#fff;cursor:pointer;transition:all 0.15s;text-align:left;font-family:"Segoe UI",sans-serif;border-radius:2px}
        .type-card:hover{border-color:#0078d4;background:#f0f6ff}
        .type-card.selected{border-color:#0078d4;background:#f0f6ff;box-shadow:inset 0 0 0 1px #0078d4}
      `}</style>

      <div style={{background:'#fff',width:'100%',maxWidth:480,boxShadow:'0 2px 6px rgba(0,0,0,0.12)',padding:'44px 44px 36px'}}>
        
        {/* Logo */}
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:28}}>
          <div style={{width:32,height:32,background:'#0078d4',borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <span style={{fontSize:20,fontWeight:600,color:'#323130'}}>Imoloc</span>
        </div>

        {/* ETAPE 1 — Type de compte */}
        {step===1 && (
          <div>
            <div style={{fontSize:24,fontWeight:300,color:'#323130',marginBottom:4}}>Creer un compte</div>
            <div style={{fontSize:13,color:'#605e5c',marginBottom:24}}>Choisissez votre type de compte</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:24}}>
              {TYPES.map(t=>(
                <button key={t.id} className={'type-card'+(typeCompte===t.id?' selected':'')} onClick={()=>handleType(t.id)}>
                  <div style={{fontSize:28,marginBottom:8}}>{t.icon}</div>
                  <div style={{fontSize:13,fontWeight:600,color:'#323130',marginBottom:4}}>{t.titre}</div>
                  <div style={{fontSize:11.5,color:'#605e5c',lineHeight:1.4}}>{t.desc}</div>
                </button>
              ))}
            </div>
            <div style={{fontSize:13,color:'#605e5c',textAlign:'center'}}>
              Deja un compte ?{' '}
              <Link to="/login" style={{color:'#0078d4',textDecoration:'none'}}>Se connecter</Link>
            </div>
          </div>
        )}

        {/* ETAPE 2 — Informations */}
        {step===2 && (
          <form onSubmit={handleSubmit}>
            <button type="button" onClick={()=>setStep(1)} style={{display:'flex',alignItems:'center',gap:4,background:'none',border:'none',color:'#0078d4',fontSize:13,cursor:'pointer',padding:0,marginBottom:16,fontFamily:'inherit'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Retour
            </button>
            <div style={{fontSize:24,fontWeight:300,color:'#323130',marginBottom:4}}>Creer un compte</div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:24,padding:'8px 12px',background:'#f0f6ff',border:'1px solid #0078d4',borderRadius:2}}>
              <span style={{fontSize:18}}>{TYPES.find(t=>t.id===typeCompte)?.icon}</span>
              <span style={{fontSize:13,color:'#0078d4',fontWeight:600}}>{TYPES.find(t=>t.id===typeCompte)?.titre}</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
              <div>
                <label style={{display:'block',fontSize:12,color:'#323130',marginBottom:6}}>Prenom *</label>
                <input className="ms-inp" placeholder="Jean" value={form.prenom} onChange={e=>set('prenom',e.target.value)}/>
              </div>
              <div>
                <label style={{display:'block',fontSize:12,color:'#323130',marginBottom:6}}>Nom *</label>
                <input className="ms-inp" placeholder="Dupont" value={form.nom} onChange={e=>set('nom',e.target.value)}/>
              </div>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{display:'block',fontSize:12,color:'#323130',marginBottom:6}}>Email *</label>
              <input className="ms-inp" type="email" placeholder="vous@exemple.com" value={form.email} onChange={e=>set('email',e.target.value)}/>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{display:'block',fontSize:12,color:'#323130',marginBottom:6}}>Mot de passe *</label>
              <div style={{position:'relative'}}>
                <input className="ms-inp" type={showPass?'text':'password'} placeholder="8 caracteres minimum" value={form.password} onChange={e=>set('password',e.target.value)} style={{paddingRight:30}}/>
                <button type="button" onClick={()=>setShowPass(!showPass)} style={{position:'absolute',right:4,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#605e5c',fontSize:14}}>
                  {showPass?'🙈':'👁'}
                </button>
              </div>
              {form.password && <div style={{marginTop:6,display:'flex',gap:4}}>
                {[form.password.length>=8,/[A-Z]/.test(form.password),/[0-9]/.test(form.password)].map((ok,i)=>(
                  <div key={i} style={{flex:1,height:3,borderRadius:2,background:ok?'#0078d4':'#edebe9',transition:'background 0.2s'}}/>
                ))}
              </div>}
            </div>
            <div style={{marginBottom:24}}>
              <label style={{display:'block',fontSize:12,color:'#323130',marginBottom:6}}>Confirmer le mot de passe *</label>
              <input className="ms-inp" type="password" placeholder="Repetez le mot de passe" value={form.confirm} onChange={e=>set('confirm',e.target.value)}/>
              {form.confirm && form.confirm!==form.password && <div style={{fontSize:11.5,color:'#a4262c',marginTop:4}}>Les mots de passe ne correspondent pas</div>}
            </div>
            <div style={{fontSize:11.5,color:'#605e5c',marginBottom:16,lineHeight:1.6}}>
              En creant un compte, vous acceptez les{' '}
              <a href="#" style={{color:'#0078d4',textDecoration:'none'}}>Conditions d utilisation</a>{' '}
              et la{' '}
              <a href="#" style={{color:'#0078d4',textDecoration:'none'}}>Politique de confidentialite</a> d Imoloc.
            </div>
            <button type="submit" className="ms-btn" disabled={loading}>{loading?'Creation...':'Creer un compte'}</button>
          </form>
        )}
      </div>

      <div style={{marginTop:16,display:'flex',gap:20,fontSize:12,color:'#605e5c'}}>
        {['Conditions','Confidentialite','Aide'].map(l=>(
          <a key={l} href="#" style={{color:'#605e5c',textDecoration:'none'}}>{l}</a>
        ))}
      </div>
      <div style={{marginTop:8,fontSize:11,color:'#a19f9d'}}>© 2026 Imoloc. Tous droits reserves.</div>
    </div>
  )
}
