import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { changeLanguage } from '../../../i18n'
import toast from 'react-hot-toast'

const SERVICES = [
  { id:'modeles',        icon:'📄', title:'Modeles de documents',    desc:'Gerez vos templates de bail, factures et quittances. Personnalisez avec votre logo et couleurs.',           path:'/agence/modeles' },
  { id:'notifications',  icon:'🔔', title:'Notifications',           desc:'Configurez les alertes email et push pour les paiements, baux et evenements importants.',                  path:'/agence/notifications' },
  { id:'integrations',   icon:'🔗', title:'Applications integrees',  desc:'Connectez des applications tierces a votre espace Imoloc (FedaPay, Stripe, et plus).',                    path:'/agence/integrations' },
  { id:'loci',           icon:'✨', title:'Loci IA',                  desc:'Parametrez l assistant IA pour votre organisation. Redigez, analysez et automatisez vos taches.',          path:null },
  { id:'nouveautes',     icon:'🆕', title:'Nouveautes',               desc:'Consultez les dernieres fonctionnalites et mises a jour de la plateforme Imoloc.',                         path:'/agence/nouveautes' },
]

const SECURITE = [
  { id:'mfa',            icon:'🔐', title:'Authentification a deux facteurs', desc:'Renforcez la securite des comptes de votre organisation avec la verification en deux etapes.',    path:'/agence/securite' },
  { id:'sessions',       icon:'⏱️', title:'Sessions et appareils',            desc:'Gerez les sessions actives et les appareils connectes a votre organisation.',                     path:'/agence/securite' },
  { id:'mdp',            icon:'🔑', title:'Politique de mot de passe',        desc:'Definissez les regles de complexite et d expiration des mots de passe pour vos utilisateurs.',   path:'/agence/securite' },
  { id:'acces',          icon:'👥', title:'Controle d acces',                 desc:'Gerez les roles et permissions de chaque collaborateur dans votre organisation.',                 path:'/agence/utilisateurs' },
]

const PROFIL_ITEMS = [
  { id:'informations',   icon:'🏢', title:'Informations de l organisation',   desc:'Nom, email, telephone, adresse, ville, pays et site web de votre organisation.' },
  { id:'langue',         icon:'🌐', title:'Langue par defaut',                 desc:'Definissez la langue par defaut pour tous les collaborateurs de votre organisation.' },
  { id:'devise',         icon:'💱', title:'Devise et fuseau horaire',          desc:'Configurez la devise utilisee et le fuseau horaire de votre organisation.' },
  { id:'charte',         icon:'🎨', title:'Charte graphique',                  desc:'Logo, couleur principale et identite visuelle de votre organisation.' },
]

function PanelItem({ icon, title, desc, onClick, badge }) {
  return (
    <div onClick={onClick} style={{ display:'flex', alignItems:'center', gap:16, padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,0.05)', cursor:onClick?'pointer':'default', transition:'background 0.15s' }}
      onMouseEnter={e=>{ if(onClick) e.currentTarget.style.background='rgba(255,255,255,0.03)' }}
      onMouseLeave={e=>{ e.currentTarget.style.background='transparent' }}>
      <div style={{ width:38, height:38, borderRadius:8, background:'rgba(0,120,212,0.1)', border:'1px solid rgba(0,120,212,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{icon}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:600, color:'#e6edf3', marginBottom:2 }}>{title}</div>
        <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.4)', lineHeight:1.5 }}>{desc}</div>
      </div>
      {badge && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:100, background:'rgba(0,120,212,0.1)', color:'#4da6ff', border:'1px solid rgba(0,120,212,0.2)', flexShrink:0 }}>{badge}</span>}
      {onClick && <svg width="16" height="16" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" viewBox="0 0 24 24" style={{ flexShrink:0 }}><path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>}
    </div>
  )
}

export default function Organisation() {
  const [tab, setTab]       = useState('profil')
  const [panel, setPanel]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [agenceId, setAgenceId] = useState(null)
  const [form, setForm] = useState({ nom:'', email:'', telephone:'', ville:'', pays:'Benin', adresse:'', site_web:'', langue:'fr', devise:'FCFA', fuseau:'Africa/Porto-Novo' })
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data:{ user } } = await supabase.auth.getUser()
    const { data:ag } = await supabase.from('agences').select('*').eq('profile_id', user.id).single()
    if (ag) {
      setAgenceId(ag.id)
      setForm(f=>({ ...f, nom:ag.nom||'', email:ag.email||'', telephone:ag.telephone||'', ville:ag.ville||'', pays:ag.pays||'Benin', adresse:ag.adresse||'', site_web:ag.site_web||'' }))
      const { data:po } = await supabase.from('parametres_organisation').select('langue,devise,fuseau_horaire,couleur_principale').eq('agence_id',ag.id).single()
      if (po) setForm(f=>({ ...f, langue:po.langue||'fr', devise:po.devise||'FCFA', fuseau:po.fuseau_horaire||'Africa/Porto-Novo' }))
    }
    setLoading(false)
  }

  const saveInfos = async () => {
    setSaving(true)
    const { langue, devise, fuseau, ...agForm } = form
    const { error } = await supabase.from('agences').update(agForm).eq('id', agenceId)
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success('Informations sauvegardees !')
    setPanel(null)
    setSaving(false)
  }

  const saveLangue = async () => {
    setSaving(true)
    await supabase.from('parametres_organisation').upsert({ agence_id:agenceId, langue:form.langue }, { onConflict:'agence_id' })
    changeLanguage(form.langue)
    toast.success('Langue mise a jour !')
    setPanel(null)
    setSaving(false)
  }

  const saveDevise = async () => {
    setSaving(true)
    await supabase.from('parametres_organisation').upsert({ agence_id:agenceId, devise:form.devise, fuseau_horaire:form.fuseau }, { onConflict:'agence_id' })
    toast.success('Devise et fuseau sauvegardes !')
    setPanel(null)
    setSaving(false)
  }

  const inp = { width:'100%', padding:'9px 12px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:7, fontFamily:'Inter,sans-serif', fontSize:13.5, color:'#e6edf3', outline:'none', colorScheme:'dark', boxSizing:'border-box', transition:'border-color 0.15s' }
  const lbl = { display:'block', fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.45)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }
  const bB = { display:'inline-flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:6, fontSize:13, fontWeight:500, cursor:'pointer', border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.6)', fontFamily:'Inter,sans-serif', transition:'all 0.15s' }
  const bP = { ...bB, background:'#0078d4', borderColor:'#0078d4', color:'#fff' }

  if (loading) return <div style={{ padding:60, textAlign:'center', color:'rgba(255,255,255,0.3)' }}>Chargement...</div>

  return (
    <>
      <style>{`
        .org-tab{padding:10px 18px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:none;font-family:Inter,sans-serif;color:rgba(255,255,255,0.4);border-bottom:2px solid transparent;transition:all 0.15s;white-space:nowrap}
        .org-tab.on{color:#e6edf3;border-bottom-color:#0078d4}
        .org-tab:hover:not(.on){color:rgba(255,255,255,0.7)}
        .org-inp:focus{border-color:#0078d4 !important}
      `}</style>

      <div style={{ maxWidth:900, margin:'0 auto' }}>
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:24, fontWeight:700, color:'#e6edf3', letterSpacing:'-0.02em', marginBottom:4 }}>Parametres de l organisation</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)' }}>Configurez votre organisation, la securite et les services Imoloc</div>
        </div>

        {/* TABS */}
        <div style={{ display:'flex', gap:0, borderBottom:'1px solid rgba(255,255,255,0.08)', marginBottom:24 }}>
          {[['services','Services'],['securite','Securite et confidentialite'],['profil','Profil de l organisation']].map(([k,l])=>(
            <button key={k} className={'org-tab'+(tab===k?' on':'')} onClick={()=>{setTab(k);setPanel(null)}}>{l}</button>
          ))}
        </div>

        {/* LISTE ITEMS */}
        <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, overflow:'hidden' }}>
          <div style={{ padding:'10px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.35)', fontWeight:500 }}>
              {tab==='services'?SERVICES.length:tab==='securite'?SECURITE.length:PROFIL_ITEMS.length} element{(tab==='services'?SERVICES.length:tab==='securite'?SECURITE.length:PROFIL_ITEMS.length)>1?'s':''}
            </span>
          </div>

          {tab==='services' && SERVICES.map(s=>(
            <PanelItem key={s.id} icon={s.icon} title={s.title} desc={s.desc} onClick={()=>s.path?window.open(s.path,'_self'):null} badge={s.id==='loci'?'IA':null}/>
          ))}

          {tab==='securite' && SECURITE.map(s=>(
            <PanelItem key={s.id} icon={s.icon} title={s.title} desc={s.desc} onClick={()=>setPanel(s.id)}/>
          ))}

          {tab==='profil' && PROFIL_ITEMS.map(s=>(
            <PanelItem key={s.id} icon={s.icon} title={s.title} desc={s.desc} onClick={()=>setPanel(s.id)}
              badge={s.id==='langue'?(form.langue==='fr'?'Francais':'English'):s.id==='devise'?form.devise:null}/>
          ))}
        </div>

        {/* PANELS DETAIL */}
        {panel && (
          <div style={{ marginTop:20, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(0,120,212,0.25)', borderRadius:10, padding:24 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <div style={{ fontSize:16, fontWeight:700, color:'#e6edf3' }}>
                {panel==='informations'&&'Informations de l organisation'}
                {panel==='langue'&&'Langue par defaut'}
                {panel==='devise'&&'Devise et fuseau horaire'}
                {panel==='charte'&&'Charte graphique'}
                {(panel==='mfa'||panel==='sessions'||panel==='mdp'||panel==='acces')&&'Parametres de securite'}
              </div>
              <button onClick={()=>setPanel(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.4)', fontSize:20 }}>x</button>
            </div>

            {/* Informations */}
            {panel==='informations' && (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
                  {[['nom','Nom de l organisation'],['email','Email'],['telephone','Telephone'],['ville','Ville'],['pays','Pays'],['adresse','Adresse'],['site_web','Site web']].map(([k,l])=>(
                    <div key={k} style={k==='adresse'||k==='site_web'?{gridColumn:'1/-1'}:{}}>
                      <label style={lbl}>{l}</label>
                      <input className="org-inp" style={inp} value={form[k]||''} onChange={e=>set(k,e.target.value)}/>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                  <button style={bB} onClick={()=>setPanel(null)}>Annuler</button>
                  <button style={{ ...bP, opacity:saving?0.6:1 }} disabled={saving} onClick={saveInfos}>{saving?'Sauvegarde...':'Sauvegarder'}</button>
                </div>
              </div>
            )}

            {/* Langue */}
            {panel==='langue' && (
              <div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginBottom:16 }}>
                  Cette langue sera appliquee par defaut pour tous les collaborateurs. Chaque utilisateur peut la modifier dans son profil personnel.
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
                  {[['fr','🇫🇷','Francais','Langue officielle'],['en','🇬🇧','English','Official language']].map(([val,flag,name,sub])=>(
                    <div key={val} onClick={()=>set('langue',val)} style={{ padding:'20px', borderRadius:10, border:`2px solid ${form.langue===val?'#0078d4':'rgba(255,255,255,0.1)'}`, background:form.langue===val?'rgba(0,120,212,0.08)':'rgba(255,255,255,0.02)', cursor:'pointer', textAlign:'center', transition:'all 0.15s' }}>
                      <div style={{ fontSize:36, marginBottom:10 }}>{flag}</div>
                      <div style={{ fontSize:15, fontWeight:700, color:form.langue===val?'#4da6ff':'#e6edf3', marginBottom:4 }}>{name}</div>
                      <div style={{ fontSize:12, color:'rgba(255,255,255,0.35)' }}>{sub}</div>
                      {form.langue===val && <div style={{ marginTop:8, fontSize:11, color:'#0078d4', fontWeight:600 }}>Langue active</div>}
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                  <button style={bB} onClick={()=>setPanel(null)}>Annuler</button>
                  <button style={{ ...bP, opacity:saving?0.6:1 }} disabled={saving} onClick={saveLangue}>{saving?'Sauvegarde...':'Appliquer'}</button>
                </div>
              </div>
            )}

            {/* Devise */}
            {panel==='devise' && (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
                  <div>
                    <label style={lbl}>Devise</label>
                    <select style={{ ...inp, cursor:'pointer', background:'rgba(20,27,40,0.95)' }} value={form.devise} onChange={e=>set('devise',e.target.value)}>
                      {[['FCFA','FCFA — Franc CFA'],['USD','USD — Dollar americain'],['EUR','EUR — Euro'],['GBP','GBP — Livre sterling'],['MAD','MAD — Dirham marocain'],['NGN','NGN — Naira nigerien']].map(([v,l])=><option key={v} value={v} style={{ background:'#161b22' }}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Fuseau horaire</label>
                    <select style={{ ...inp, cursor:'pointer', background:'rgba(20,27,40,0.95)' }} value={form.fuseau} onChange={e=>set('fuseau',e.target.value)}>
                      {[['Africa/Porto-Novo','Africa/Porto-Novo (UTC+1)'],['Africa/Abidjan','Africa/Abidjan (UTC+0)'],['Africa/Lagos','Africa/Lagos (UTC+1)'],['Europe/Paris','Europe/Paris (UTC+1/2)'],['America/New_York','America/New_York (UTC-5/4)'],['Asia/Dubai','Asia/Dubai (UTC+4)']].map(([v,l])=><option key={v} value={v} style={{ background:'#161b22' }}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                  <button style={bB} onClick={()=>setPanel(null)}>Annuler</button>
                  <button style={{ ...bP, opacity:saving?0.6:1 }} disabled={saving} onClick={saveDevise}>{saving?'Sauvegarde...':'Sauvegarder'}</button>
                </div>
              </div>
            )}

            {/* Charte graphique */}
            {panel==='charte' && (
              <div style={{ textAlign:'center', padding:'30px 20px' }}>
                <div style={{ fontSize:28, marginBottom:12, opacity:0.4 }}>🎨</div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginBottom:8 }}>Charte graphique</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.25)', marginBottom:16 }}>Gerez votre logo et couleurs dans Modeles de documents</div>
                <button style={{ ...bP, margin:'0 auto' }} onClick={()=>window.open('/agence/modeles','_self')}>Aller aux modeles</button>
              </div>
            )}

            {/* Securite */}
            {(panel==='mfa'||panel==='sessions'||panel==='mdp'||panel==='acces') && (
              <div style={{ textAlign:'center', padding:'30px 20px' }}>
                <div style={{ fontSize:28, marginBottom:12, opacity:0.4 }}>🔐</div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginBottom:16 }}>Parametres de securite disponibles dans l espace Securite</div>
                <button style={{ ...bP, margin:'0 auto' }} onClick={()=>window.open('/agence/securite','_self')}>Aller a la Securite</button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
