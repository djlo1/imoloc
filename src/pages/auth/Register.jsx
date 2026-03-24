import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const COUNTRY_CODES = [
  {code:'BJ',name:'Bénin',dial:'+229',flag:'🇧🇯'},
  {code:'TG',name:'Togo',dial:'+228',flag:'🇹🇬'},
  {code:'CI',name:"Côte d'Ivoire",dial:'+225',flag:'🇨🇮'},
  {code:'SN',name:'Sénégal',dial:'+221',flag:'🇸🇳'},
  {code:'CM',name:'Cameroun',dial:'+237',flag:'🇨🇲'},
  {code:'BF',name:'Burkina Faso',dial:'+226',flag:'🇧🇫'},
  {code:'ML',name:'Mali',dial:'+223',flag:'🇲🇱'},
  {code:'NE',name:'Niger',dial:'+227',flag:'🇳🇪'},
  {code:'GH',name:'Ghana',dial:'+233',flag:'🇬🇭'},
  {code:'NG',name:'Nigéria',dial:'+234',flag:'🇳🇬'},
  {code:'MA',name:'Maroc',dial:'+212',flag:'🇲🇦'},
  {code:'FR',name:'France',dial:'+33',flag:'🇫🇷'},
  {code:'BE',name:'Belgique',dial:'+32',flag:'🇧🇪'},
  {code:'US',name:'États-Unis',dial:'+1',flag:'🇺🇸'},
  {code:'GB',name:'Royaume-Uni',dial:'+44',flag:'🇬🇧'},
]

const isProEmail = (email) => {
  const free = ['gmail.com','yahoo.com','hotmail.com','outlook.com','live.com','icloud.com','me.com','apple.com','protonmail.com','aol.com','msn.com']
  const domain = email.split('@')[1]?.toLowerCase()
  return domain && !free.includes(domain)
}

const STEPS = [{id:1,label:'Compte'},{id:2,label:'Identité'},{id:3,label:'Profil'},{id:4,label:'Entreprise'}]

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [focused, setFocused] = useState({})
  const [accountType, setAccountType] = useState(null)
  const [form, setForm] = useState({
    email:'',password:'',confirmPassword:'',
    prenom:'',nom:'',dialCode:'+229',telephone:'',
    entreprise_nom:'',entreprise_pays:'Bénin',entreprise_ville:'',
  })
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const focus = (k) => setFocused(f=>({...f,[k]:true}))
  const blur = (k) => setFocused(f=>({...f,[k]:false}))
  const isUp = (k) => focused[k] || !!form[k]
  const isPro = form.email && isProEmail(form.email)

  const handleSocialLogin = async (provider) => {
    setLoading(true)
    try {
      const {error} = await supabase.auth.signInWithOAuth({provider,options:{redirectTo:`${window.location.origin}/agence`}})
      if (error) throw error
    } catch(err) {
      toast.error(err.message||'Erreur')
      setLoading(false)
    }
  }

  const handleStep2 = (e) => {
    e.preventDefault()
    if (!form.email){toast.error('Email requis');return}
    if (form.password.length<6){toast.error('Minimum 6 caractères');return}
    if (form.password!==form.confirmPassword){toast.error('Mots de passe différents');return}
    setStep(3)
  }

  const handleStep3 = (e) => {
    e.preventDefault()
    if (!form.prenom||!form.nom){toast.error('Prénom et nom requis');return}
    setStep(4)
  }

  const handleStep4 = async (e) => {
    e.preventDefault()
    if (!form.entreprise_nom||!form.entreprise_ville){toast.error('Nom et ville requis');return}
    setLoading(true)
    try {
      const {data,error:signUpError} = await supabase.auth.signUp({email:form.email,password:form.password})
      if (signUpError) throw signUpError
      const uid = data.user?.id
      if (!uid) throw new Error('Erreur création compte')
      await new Promise(r=>setTimeout(r,1000))
      await supabase.from('profiles').update({nom:form.nom,prenom:form.prenom,telephone:form.dialCode+form.telephone,role:'agence'}).eq('id',uid)
      await supabase.from('agences').insert({profile_id:uid,nom:form.entreprise_nom,email:form.email,ville:form.entreprise_ville,pays:form.entreprise_pays,actif:true})
      toast.success('Compte créé ! Connectez-vous.')
      navigate('/login')
    } catch(err) {
      console.error(err)
      toast.error(err.message||'Erreur')
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
        .rg-page{width:100vw;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Inter','Segoe UI',sans-serif;position:relative;overflow:hidden;padding:80px 16px 40px;background-color:#111c2d}
        .rg-bg{position:fixed;inset:0;z-index:0;background:radial-gradient(ellipse 120% 80% at -10% 50%,#1e3a5f 0%,transparent 50%),radial-gradient(ellipse 80% 100% at 110% 20%,#0f2847 0%,transparent 50%)}
        .rg-s1{position:fixed;width:700px;height:700px;border-radius:50%;filter:blur(60px);pointer-events:none;z-index:0;background:radial-gradient(circle,rgba(0,80,160,0.3) 0%,transparent 65%);top:-200px;left:-200px}
        .rg-s2{position:fixed;width:600px;height:600px;border-radius:50%;filter:blur(60px);pointer-events:none;z-index:0;background:radial-gradient(circle,rgba(0,50,120,0.25) 0%,transparent 65%);bottom:-150px;right:-150px}
        .rg-stars{position:fixed;inset:0;z-index:0;background-image:radial-gradient(1px 1px at 10% 20%,rgba(255,255,255,0.3) 0%,transparent 100%),radial-gradient(1px 1px at 50% 60%,rgba(255,255,255,0.2) 0%,transparent 100%),radial-gradient(1px 1px at 80% 10%,rgba(255,255,255,0.25) 0%,transparent 100%)}
        .rg-progress-bar{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(13,20,35,0.95);border-bottom:1px solid rgba(255,255,255,0.07);backdrop-filter:blur(20px);padding:0 5%}
        .rg-progress-inner{max-width:900px;margin:0 auto;display:flex;align-items:center;height:60px;position:relative}
        .rg-progress-logo{display:flex;align-items:center;gap:9px;text-decoration:none;margin-right:32px;flex-shrink:0}
        .rg-progress-logo-icon{width:28px;height:28px;border-radius:7px;background:#0078d4;display:flex;align-items:center;justify-content:center}
        .rg-progress-logo-name{font-size:16px;font-weight:700;color:#fff}
        .rg-steps-nav{display:flex;align-items:center;flex:1}
        .rg-step-nav{display:flex;align-items:center;gap:8px;padding:0 14px;flex-shrink:0}
        .rg-step-num{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;transition:all 0.25s}
        .rg-step-num.done{background:#0078d4;color:#fff}
        .rg-step-num.active{background:#0078d4;color:#fff;box-shadow:0 0 10px rgba(0,120,212,0.5)}
        .rg-step-num.pending{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.3);border:1px solid rgba(255,255,255,0.1)}
        .rg-step-lbl{font-size:12px;font-weight:500;white-space:nowrap}
        .rg-step-lbl.done{color:rgba(255,255,255,0.5)}
        .rg-step-lbl.active{color:#fff}
        .rg-step-lbl.pending{color:rgba(255,255,255,0.25)}
        .rg-connector{flex:1;height:1px;min-width:16px}
        .rg-connector.done{background:rgba(0,120,212,0.5)}
        .rg-connector.pending{background:rgba(255,255,255,0.07)}
        .rg-progress-line{position:absolute;bottom:0;left:0;height:2px;background:#0078d4;transition:width 0.4s ease;box-shadow:0 0 8px rgba(0,120,212,0.6)}
        .rg-card{position:relative;z-index:10;width:100%;max-width:480px;background:rgba(28,36,52,0.93);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:40px 44px 36px;backdrop-filter:blur(20px);box-shadow:0 8px 40px rgba(0,0,0,0.55);margin-top:8px}
        .rg-card-logo{display:flex;align-items:center;justify-content:center;gap:9px;margin-bottom:26px}
        .rg-card-logo-icon{width:30px;height:30px;border-radius:7px;background:#0078d4;display:flex;align-items:center;justify-content:center}
        .rg-card-logo-name{font-size:17px;font-weight:700;color:#fff}
        .rg-title{font-size:21px;font-weight:600;color:#fff;margin-bottom:6px}
        .rg-sub{font-size:13px;color:rgba(255,255,255,0.4);margin-bottom:28px;line-height:1.55}
        .rg-type-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}
        .rg-type-card{padding:18px 14px;border-radius:8px;background:rgba(255,255,255,0.04);border:1.5px solid rgba(255,255,255,0.1);cursor:pointer;transition:all 0.18s;text-align:center}
        .rg-type-card:hover{border-color:rgba(0,120,212,0.4);background:rgba(0,120,212,0.06)}
        .rg-type-card.sel{border-color:#0078d4;background:rgba(0,120,212,0.1)}
        .rg-type-icon{font-size:26px;margin-bottom:8px}
        .rg-type-name{font-size:13px;font-weight:600;color:rgba(255,255,255,0.85);margin-bottom:3px}
        .rg-type-desc{font-size:11px;color:rgba(255,255,255,0.35);line-height:1.4}
        .rg-type-full{grid-column:1/-1}
        .rg-social-grid{display:flex;flex-direction:column;gap:10px}
        .rg-social-btn{display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:6px;background:rgba(255,255,255,0.05);border:1.5px solid rgba(255,255,255,0.1);cursor:pointer;transition:all 0.15s;font-family:'Inter',sans-serif;font-size:14px;font-weight:500;color:rgba(255,255,255,0.8);width:100%}
        .rg-social-btn:hover{background:rgba(255,255,255,0.09);color:#fff}
        .rg-social-btn:disabled{opacity:0.4;cursor:not-allowed}
        .rg-social-icon{width:20px;height:20px;flex-shrink:0;display:flex;align-items:center;justify-content:center}
        .rg-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:600;margin-bottom:12px;letter-spacing:0.04em;text-transform:uppercase}
        .rg-badge.pro{background:rgba(0,200,150,0.12);color:#00c896;border:1px solid rgba(0,200,150,0.2)}
        .rg-badge.personal{background:rgba(77,166,255,0.1);color:#4da6ff;border:1px solid rgba(77,166,255,0.2)}
        .rg-field{position:relative;margin-bottom:16px}
        .rg-lbl{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:14px;color:rgba(255,255,255,0.35);pointer-events:none;transition:all 0.15s ease;padding:0 4px}
        .rg-lbl.up{top:0;transform:translateY(-50%);font-size:11px;color:#4da6ff;background:rgba(28,36,52,0.95)}
        .rg-input{width:100%;padding:13px 12px 5px;background:rgba(255,255,255,0.05);border:1.5px solid rgba(255,255,255,0.12);border-radius:4px;font-family:'Inter',sans-serif;font-size:14px;color:#fff;outline:none;transition:border-color 0.15s}
        .rg-input:focus{border-color:#0078d4;background:rgba(255,255,255,0.07)}
        .rg-input.has-eye{padding-right:44px}
        .rg-eye{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.3);display:flex;padding:2px;transition:color 0.15s}
        .rg-eye:hover{color:rgba(255,255,255,0.7)}
        .rg-phone-wrap{display:flex;gap:8px}
        .rg-phone-sel{flex-shrink:0;width:120px;padding:13px 8px 5px;background:rgba(255,255,255,0.05);border:1.5px solid rgba(255,255,255,0.12);border-radius:4px;font-family:'Inter',sans-serif;font-size:13px;color:#fff;outline:none;cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='rgba(255,255,255,0.3)' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 8px center;padding-right:24px}
        .rg-phone-sel option{background:#1c2434}
        .rg-select{width:100%;padding:13px 32px 5px 12px;background:rgba(255,255,255,0.05);border:1.5px solid rgba(255,255,255,0.12);border-radius:4px;font-family:'Inter',sans-serif;font-size:14px;color:#fff;outline:none;cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='rgba(255,255,255,0.3)' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center}
        .rg-select option{background:#1c2434}
        .rg-chip{display:inline-flex;align-items:center;gap:8px;padding:5px 12px 5px 5px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:100px;margin-bottom:18px}
        .rg-chip-av{width:26px;height:26px;border-radius:50%;background:#0078d4;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:#fff}
        .rg-chip-txt{font-size:13px;color:rgba(255,255,255,0.7);font-weight:500}
        .rg-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
        .rg-section-lbl{font-size:10.5px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:rgba(0,120,212,0.7);margin-bottom:14px;display:flex;align-items:center;gap:10px}
        .rg-section-lbl::after{content:'';flex:1;height:1px;background:rgba(255,255,255,0.06)}
        .rg-btn{width:100%;padding:13px;background:#0078d4;border:none;border-radius:4px;font-family:'Inter',sans-serif;font-size:14.5px;font-weight:600;color:#fff;cursor:pointer;transition:background 0.15s;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:8px;margin-bottom:18px}
        .rg-btn:hover:not(:disabled){background:#006cc1}
        .rg-btn:disabled{opacity:0.45;cursor:not-allowed}
        .rg-spin{width:15px;height:15px;border:2px solid rgba(255,255,255,0.2);border-top-color:#fff;border-radius:50%;animation:rg-spin 0.6s linear infinite}
        @keyframes rg-spin{to{transform:rotate(360deg)}}
        .rg-signin{font-size:13.5px;color:rgba(255,255,255,0.45);text-align:center}
        .rg-signin a{color:#4da6ff;text-decoration:none;font-weight:500}
        .rg-signin a:hover{text-decoration:underline}
        .rg-back{display:inline-flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.45);font-family:'Inter',sans-serif;font-size:13px;padding:0;margin-bottom:18px;transition:color 0.15s}
        .rg-back:hover{color:rgba(255,255,255,0.8)}
        .rg-info-box{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:6px;background:rgba(0,120,212,0.08);border:1px solid rgba(0,120,212,0.2);margin-bottom:16px;font-size:12.5px;color:rgba(255,255,255,0.55);line-height:1.5}
        .rg-info-box svg{color:#4da6ff;flex-shrink:0;margin-top:1px}
        .rg-footer{position:relative;z-index:10;display:flex;align-items:center;justify-content:center;gap:20px;flex-wrap:wrap;padding:20px 5%;margin-top:10px}
        .rg-footer a,.rg-footer span{font-size:12px;color:rgba(255,255,255,0.28);text-decoration:none}
        .rg-footer a:hover{color:rgba(255,255,255,0.6)}
        @media(max-width:520px){.rg-card{padding:32px 20px 28px}.rg-grid2{grid-template-columns:1fr}.rg-type-grid{grid-template-columns:1fr}.rg-steps-nav{display:none}}
      `}</style>
      <div className="rg-page">
        <div className="rg-bg"/><div className="rg-s1"/><div className="rg-s2"/><div className="rg-stars"/>
        <div className="rg-progress-bar">
          <div className="rg-progress-inner">
            <Link to="/" className="rg-progress-logo">
              <div className="rg-progress-logo-icon"><svg width="15" height="15" fill="none" stroke="#fff" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z"/></svg></div>
              <span className="rg-progress-logo-name">Imoloc</span>
            </Link>
            <div className="rg-steps-nav">
              {STEPS.map((s,i) => (
                <div key={s.id} style={{display:'flex',alignItems:'center',flex:i<STEPS.length-1?1:0}}>
                  <div className="rg-step-nav">
                    <div className={`rg-step-num ${step>s.id?'done':step===s.id?'active':'pending'}`}>{step>s.id?'✓':s.id}</div>
                    <span className={`rg-step-lbl ${step>s.id?'done':step===s.id?'active':'pending'}`}>{s.label}</span>
                  </div>
                  {i<STEPS.length-1 && <div className={`rg-connector ${step>s.id?'done':'pending'}`}/>}
                </div>
              ))}
            </div>
            <div className="rg-progress-line" style={{width:`${((step-1)/(STEPS.length-1))*100}%`}}/>
          </div>
        </div>
        <div className="rg-card">
          <div className="rg-card-logo">
            <div className="rg-card-logo-icon"><svg width="15" height="15" fill="none" stroke="#fff" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z"/></svg></div>
            <span className="rg-card-logo-name">Imoloc</span>
          </div>
          {step===1 && (
            <>
              <div className="rg-title">Créer un compte</div>
              <div className="rg-sub">Choisissez comment créer votre compte.</div>
              {accountType!=='social' ? (
                <>
                  <div className="rg-type-grid">
                    <div className={`rg-type-card ${accountType==='pro'?'sel':''}`} onClick={()=>{setAccountType('pro');setStep(2)}}>
                      <div className="rg-type-icon">🏢</div>
                      <div className="rg-type-name">Professionnel</div>
                      <div className="rg-type-desc">Email professionnel de votre entreprise</div>
                    </div>
                    <div className={`rg-type-card ${accountType==='personal'?'sel':''}`} onClick={()=>{setAccountType('personal');setStep(2)}}>
                      <div className="rg-type-icon">👤</div>
                      <div className="rg-type-name">Personnel</div>
                      <div className="rg-type-desc">Gmail, Yahoo, Outlook, etc.</div>
                    </div>
                    <div className="rg-type-card rg-type-full" onClick={()=>setAccountType('social')} style={{padding:'14px'}}>
                      <div className="rg-type-name" style={{marginBottom:0,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><span>🔗</span> Continuer avec un compte social</div>
                    </div>
                  </div>
                  <div className="rg-signin">Déjà un compte ? <Link to="/login">Se connecter</Link></div>
                </>
              ) : (
                <>
                  <button className="rg-back" onClick={()=>setAccountType(null)}><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/></svg>Retour</button>
                  <div className="rg-title">Connexion sociale</div>
                  <div className="rg-social-grid">
                    {[
                      {provider:'google',label:'Continuer avec Google',icon:<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>},
                      {provider:'github',label:'Continuer avec GitHub',icon:<svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>},
                      {provider:'azure',label:'Continuer avec Microsoft',icon:<svg viewBox="0 0 23 23" width="18" height="18"><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg>},
                    ].map(({provider,label,icon}) => (
                      <button key={provider} className="rg-social-btn" onClick={()=>handleSocialLogin(provider)} disabled={loading}>
                        <span className="rg-social-icon">{icon}</span>{label}
                      </button>
                    ))}
                  </div>
                  <div className="rg-signin" style={{marginTop:16}}>Déjà un compte ? <Link to="/login">Se connecter</Link></div>
                </>
              )}
            </>
          )}
          {step===2 && (
            <>
              <button className="rg-back" onClick={()=>setStep(1)}><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/></svg>Retour</button>
              {form.email && <div className={`rg-badge ${isPro?'pro':'personal'}`}>{isPro?'✓ Email professionnel':'Compte personnel'}</div>}
              <div className="rg-title">Votre identité</div>
              <div className="rg-sub">Email et mot de passe de votre compte.</div>
              <form onSubmit={handleStep2}>
                <div className="rg-field">
                  <label className={`rg-lbl ${isUp('email')?'up':''}`}>Email</label>
                  <input type="email" className="rg-input" value={form.email} onChange={e=>set('email',e.target.value)} onFocus={()=>focus('email')} onBlur={()=>blur('email')} required autoFocus/>
                </div>
                <div className="rg-field">
                  <label className={`rg-lbl ${isUp('password')?'up':''}`}>Mot de passe</label>
                  <input type={showPass?'text':'password'} className="rg-input has-eye" value={form.password} onChange={e=>set('password',e.target.value)} onFocus={()=>focus('password')} onBlur={()=>blur('password')} required/>
                  <button type="button" className="rg-eye" onClick={()=>setShowPass(!showPass)}><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path strokeLinecap="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg></button>
                </div>
                <div className="rg-field">
                  <label className={`rg-lbl ${isUp('confirmPassword')?'up':''}`}>Confirmer le mot de passe</label>
                  <input type="password" className="rg-input" value={form.confirmPassword} onChange={e=>set('confirmPassword',e.target.value)} onFocus={()=>focus('confirmPassword')} onBlur={()=>blur('confirmPassword')} required/>
                </div>
                <button type="submit" className="rg-btn">Continuer</button>
                <div className="rg-signin">Déjà un compte ? <Link to="/login">Se connecter</Link></div>
              </form>
            </>
          )}
          {step===3 && (
            <>
              <div className="rg-chip"><div className="rg-chip-av">{form.email[0]?.toUpperCase()}</div><span className="rg-chip-txt">{form.email}</span></div>
              <div className="rg-title">Votre profil</div>
              <div className="rg-sub">Comment souhaitez-vous être identifié ?</div>
              <form onSubmit={handleStep3}>
                <div className="rg-grid2">
                  <div className="rg-field" style={{marginBottom:0}}>
                    <label className={`rg-lbl ${isUp('prenom')?'up':''}`}>Prénom *</label>
                    <input className="rg-input" value={form.prenom} onChange={e=>set('prenom',e.target.value)} onFocus={()=>focus('prenom')} onBlur={()=>blur('prenom')} required autoFocus/>
                  </div>
                  <div className="rg-field" style={{marginBottom:0}}>
                    <label className={`rg-lbl ${isUp('nom')?'up':''}`}>Nom *</label>
                    <input className="rg-input" value={form.nom} onChange={e=>set('nom',e.target.value)} onFocus={()=>focus('nom')} onBlur={()=>blur('nom')} required/>
                  </div>
                </div>
                <div className="rg-field" style={{marginTop:14}}>
                  <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(0,120,212,0.8)',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:8}}>Téléphone</label>
                  <div className="rg-phone-wrap">
                    <select className="rg-phone-sel" value={form.dialCode} onChange={e=>set('dialCode',e.target.value)}>
                      {COUNTRY_CODES.map(c=><option key={c.code} value={c.dial}>{c.flag} {c.dial}</option>)}
                    </select>
                    <div className="rg-field" style={{flex:1,marginBottom:0}}>
                      <label className={`rg-lbl ${isUp('telephone')?'up':''}`}>Numéro</label>
                      <input type="tel" className="rg-input" value={form.telephone} onChange={e=>set('telephone',e.target.value.replace(/\D/g,''))} onFocus={()=>focus('telephone')} onBlur={()=>blur('telephone')}/>
                    </div>
                  </div>
                </div>
                <button type="submit" className="rg-btn" style={{marginTop:16}}>Continuer</button>
              </form>
            </>
          )}
          {step===4 && (
            <>
              <button className="rg-back" onClick={()=>setStep(3)}><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/></svg>Retour</button>
              <div className="rg-title">Votre entreprise</div>
              <div className="rg-sub">Dernière étape — création de votre espace Imoloc.</div>
              <form onSubmit={handleStep4}>
                <div className="rg-section-lbl">Informations entreprise</div>
                <div className="rg-field">
                  <label className={`rg-lbl ${isUp('entreprise_nom')?'up':''}`}>Nom de l'entreprise *</label>
                  <input className="rg-input" value={form.entreprise_nom} onChange={e=>set('entreprise_nom',e.target.value)} onFocus={()=>focus('entreprise_nom')} onBlur={()=>blur('entreprise_nom')} required autoFocus/>
                </div>
                <div className="rg-grid2">
                  <div className="rg-field" style={{marginBottom:0}}>
                    <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.35)',marginBottom:7}}>Pays *</label>
                    <select className="rg-select" value={form.entreprise_pays} onChange={e=>set('entreprise_pays',e.target.value)}>
                      {COUNTRY_CODES.map(c=><option key={c.code} value={c.name}>{c.flag} {c.name}</option>)}
                    </select>
                  </div>
                  <div className="rg-field" style={{marginBottom:0}}>
                    <label className={`rg-lbl ${isUp('entreprise_ville')?'up':''}`}>Ville *</label>
                    <input className="rg-input" value={form.entreprise_ville} onChange={e=>set('entreprise_ville',e.target.value)} onFocus={()=>focus('entreprise_ville')} onBlur={()=>blur('entreprise_ville')} required/>
                  </div>
                </div>
                <div className="rg-info-box" style={{marginTop:16}}>
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg>
                  Logo, téléphone et autres infos dans votre tableau de bord.
                </div>
                <button type="submit" className="rg-btn" disabled={loading}>
                  {loading?<><span className="rg-spin"/>Création…</>:"🎉 Terminer l'inscription"}
                </button>
                <div className="rg-signin">Déjà un compte ? <Link to="/login">Se connecter</Link></div>
              </form>
            </>
          )}
        </div>
        <div className="rg-footer">
          <a href="#">Conditions</a><a href="#">Confidentialité</a>
          <span>© {new Date().getFullYear()} Imoloc — DJLOTECH Society</span>
        </div>
      </div>
    </>
  )
}
