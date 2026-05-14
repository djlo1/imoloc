import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { changeLanguage } from '../../../i18n'
import toast from 'react-hot-toast'

const TABS = [
  { id:'services',  label:'Services' },
  { id:'securite',  label:'Securite et confidentialite' },
  { id:'profil',    label:'Profil de l organisation' },
]

const ITEMS = {
  services: [
    { icon:'📄', color:'#0078d4', title:'Modeles de documents',   desc:'Gerez vos templates de bail, factures et quittances. Personnalisez avec votre logo et couleurs.', action:'modeles' },
    { icon:'🔔', color:'#0078d4', title:'Notifications',          desc:'Configurez les alertes email et push pour les paiements, baux et evenements importants.', action:'notifications' },
    { icon:'🔗', color:'#0078d4', title:'Applications integrees', desc:'Connectez des applications tierces a votre espace Imoloc (FedaPay, Stripe, et plus).', action:'integrations' },
    { icon:'✨', color:'#6c63ff', title:'Loci IA',                desc:'Parametrez l assistant IA. Redigez, analysez et automatisez vos taches immobilieres.', action:'loci' },
    { icon:'🆕', color:'#0078d4', title:'Nouveautes',             desc:'Consultez les dernieres fonctionnalites et mises a jour de la plateforme Imoloc.', action:'nouveautes' },
    { icon:'📊', color:'#0078d4', title:'Rapports et analyses',   desc:'Configurez vos rapports automatiques et tableaux de bord analytiques.', action:'rapports' },
    { icon:'📱', color:'#00c896', title:'Application mobile',     desc:'Gerez les acces de l application mobile pour vos proprietaires et locataires.', action:null },
    { icon:'📧', color:'#0078d4', title:'Modeles d emails',       desc:'Personnalisez les emails automatiques envoyes par Imoloc a vos locataires.', action:null },
  ],
  securite: [
    { icon:'🔐', color:'#ef4444', title:'Authentification a deux facteurs', desc:'Renforcez la securite des comptes avec la verification en deux etapes obligatoire.', action:'securite' },
    { icon:'📱', color:'#f59e0b', title:'Sessions et appareils',            desc:'Gerez les sessions actives et les appareils connectes a votre organisation.', action:'securite' },
    { icon:'🔑', color:'#f59e0b', title:'Politique de mot de passe',        desc:'Definissez les regles de complexite et la duree d expiration des mots de passe.', action:'securite' },
    { icon:'👥', color:'#0078d4', title:'Roles et permissions',             desc:'Controllez precisement ce que chaque collaborateur peut voir et faire.', action:'utilisateurs' },
    { icon:'🛡️', color:'#ef4444', title:'Acces conditionnel',               desc:'Definissez des regles d acces selon la localisation ou l appareil utilise.', action:null },
    { icon:'📋', color:'#8b5cf6', title:'Journal d activite',               desc:'Consultez l historique complet des actions effectuees dans votre organisation.', action:null },
    { icon:'🔒', color:'#ef4444', title:'Chiffrement des donnees',          desc:'Toutes les donnees sont chiffrees en transit et au repos avec AES-256.', action:null },
    { icon:'⚠️', color:'#f59e0b', title:'Alertes de securite',              desc:'Recevez des notifications en cas d activite suspecte sur votre compte.', action:null },
    { icon:'🌍', color:'#0078d4', title:'Connexions autorisees',            desc:'Limitez les connexions a certains pays ou plages d adresses IP.', action:null },
    { icon:'🗑️', color:'#ef4444', title:'Suppression des donnees',          desc:'Gerez la retention et la suppression des donnees conformement au RGPD.', action:null },
  ],
  profil: [
    { icon:'🏢', color:'#0078d4', title:'Informations de l organisation',   desc:'Nom, email, telephone, adresse, ville, pays et site web de votre organisation.', action:'informations' },
    { icon:'🌐', color:'#00c896', title:'Langue par defaut',                 desc:'Definissez la langue de l interface pour tous les collaborateurs.', action:'langue' },
    { icon:'💱', color:'#f59e0b', title:'Devise et fuseau horaire',          desc:'Configurez la devise et le fuseau horaire utilises dans votre organisation.', action:'devise' },
    { icon:'🎨', color:'#8b5cf6', title:'Charte graphique',                  desc:'Logo, couleur principale et identite visuelle de votre organisation.', action:'charte' },
    { icon:'📍', color:'#ef4444', title:'Localisation',                      desc:'Adresse principale, ville et pays de votre organisation.', action:'informations' },
    { icon:'📞', color:'#0078d4', title:'Coordonnees de contact',            desc:'Numero de telephone, email de contact et site web public.', action:'informations' },
    { icon:'📄', color:'#0078d4', title:'Mentions legales',                  desc:'Configurez les mentions legales et politique de confidentialite.', action:null },
    { icon:'🤝', color:'#00c896', title:'Partenaires et integrateurs',       desc:'Gerez les acces partenaires et les relations B2B de votre organisation.', action:null },
    { icon:'💼', color:'#6c63ff', title:'Informations fiscales',             desc:'IFU, registre de commerce et statut fiscal de votre organisation.', action:null },
  ],
}

export default function Organisation() {
  const [tab, setTab]       = useState('services')
  const [panel, setPanel]   = useState(null)
  const [search, setSearch] = useState('')
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
      const { data:po } = await supabase.from('parametres_organisation').select('langue,devise,fuseau_horaire').eq('agence_id',ag.id).single()
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
    setPanel(null); setSaving(false)
  }

  const saveLangue = async () => {
    setSaving(true)
    await supabase.from('parametres_organisation').upsert({ agence_id:agenceId, langue:form.langue }, { onConflict:'agence_id' })
    changeLanguage(form.langue)
    toast.success('Langue mise a jour !')
    setPanel(null); setSaving(false)
  }

  const saveDevise = async () => {
    setSaving(true)
    await supabase.from('parametres_organisation').upsert({ agence_id:agenceId, devise:form.devise, fuseau_horaire:form.fuseau }, { onConflict:'agence_id' })
    toast.success('Parametres sauvegardes !')
    setPanel(null); setSaving(false)
  }

  const handleAction = (item) => {
    if (!item.action) return
    if (['securite','utilisateurs','integrations','rapports','nouveautes','loci','notifications'].includes(item.action)) {
      window.location.href = '/agence/' + item.action
    } else {
      setPanel(item.action)
    }
  }

  const getBadge = (action) => {
    if (action === 'langue') return form.langue === 'fr' ? 'Francais' : 'English'
    if (action === 'devise') return form.devise
    return null
  }

  const items = ITEMS[tab] || []
  const filtered = search ? items.filter(i => i.title.toLowerCase().includes(search.toLowerCase()) || i.desc.toLowerCase().includes(search.toLowerCase())) : items

  const inp = { width:'100%', padding:'9px 12px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:6, fontFamily:'Inter,sans-serif', fontSize:13.5, color:'#e6edf3', outline:'none', colorScheme:'dark', boxSizing:'border-box' }
  const lbl = { display:'block', fontSize:11.5, fontWeight:600, color:'rgba(255,255,255,0.4)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }
  const bB = { display:'inline-flex', alignItems:'center', gap:6, padding:'7px 16px', borderRadius:5, fontSize:13, fontWeight:500, cursor:'pointer', border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.6)', fontFamily:'Inter,sans-serif' }
  const bP = { ...bB, background:'#0078d4', borderColor:'#0078d4', color:'#fff' }

  if (loading) return <div style={{ padding:60, textAlign:'center', color:'rgba(255,255,255,0.3)' }}>Chargement...</div>

  return (
    <>
      <style>{`
        .ms-tab{padding:12px 16px;font-size:13px;font-weight:400;cursor:pointer;border:none;border-bottom:2px solid transparent;background:none;font-family:Inter,sans-serif;color:rgba(255,255,255,0.5);transition:all 0.15s;white-space:nowrap;margin-bottom:-1px}
        .ms-tab:hover{color:rgba(255,255,255,0.8);border-bottom-color:rgba(255,255,255,0.2)}
        .ms-tab.on{color:#e6edf3;font-weight:600;border-bottom-color:#0078d4}
        .ms-row{display:grid;grid-template-columns:1fr 1fr;align-items:center;padding:12px 20px;border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;transition:background 0.1s;gap:24px}
        .ms-row:hover{background:rgba(255,255,255,0.03)}
        .ms-row:last-child{border-bottom:none}
        .ms-title{font-size:13.5px;font-weight:400;color:#4da6ff;text-decoration:none}
        .ms-title:hover{text-decoration:underline}
        .ms-desc{font-size:13px;color:rgba(255,255,255,0.45);line-height:1.5}
        .ms-icon{width:28px;height:28px;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
        .ms-search{padding:6px 10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);borderRadius:4px;color:#e6edf3;font-family:Inter,sans-serif;font-size:13px;outline:none;width:220px}
        .panel-overlay{position:fixed;top:0;right:0;height:100vh;width:min(480px,90vw);background:#161b22;border-left:1px solid rgba(255,255,255,0.08);z-index:200;display:flex;flex-direction:column;box-shadow:-8px 0 30px rgba(0,0,0,0.4)}
      `}</style>

      <div style={{ maxWidth:960, margin:'0 auto' }}>
        {/* HEADER */}
        <div style={{ marginBottom:0 }}>
          <div style={{ fontSize:22, fontWeight:700, color:'#e6edf3', letterSpacing:'-0.01em', marginBottom:20 }}>Parametres de l organisation</div>

          {/* TABS */}
          <div style={{ display:'flex', gap:0, borderBottom:'1px solid rgba(255,255,255,0.08)', marginBottom:0 }}>
            {TABS.map(t => (
              <button key={t.id} className={'ms-tab'+(tab===t.id?' on':'')} onClick={()=>{setTab(t.id);setPanel(null);setSearch('')}}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* TOOLBAR */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.01)' }}>
          <span style={{ fontSize:13, color:'rgba(255,255,255,0.35)' }}>{filtered.length} element{filtered.length > 1 ? 's' : ''}</span>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <input className="ms-search" style={{ padding:'6px 10px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:4, color:'#e6edf3', fontFamily:'Inter,sans-serif', fontSize:13, outline:'none', width:220 }} placeholder="Rechercher dans tous les parametres..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
        </div>

        {/* TABLE HEADER */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', padding:'8px 20px', borderBottom:'1px solid rgba(255,255,255,0.08)', gap:24 }}>
          <div style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.06em', display:'flex', alignItems:'center', gap:4 }}>
            Nom <span style={{ fontSize:10 }}>↑</span>
          </div>
          <div style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Description</div>
        </div>

        {/* ROWS */}
        <div style={{ background:'rgba(255,255,255,0.01)' }}>
          {filtered.map((item, i) => {
            const badge = getBadge(item.action)
            return (
              <div key={i} className="ms-row" onClick={()=>handleAction(item)}>
                {/* COL 1 : icon + title + badge */}
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div className="ms-icon" style={{ background: item.color + '18', border: '1px solid ' + item.color + '33' }}>
                    {item.icon}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span className="ms-title">{item.title}</span>
                    {badge && <span style={{ fontSize:10.5, padding:'1px 7px', borderRadius:100, background:'rgba(0,120,212,0.1)', color:'#4da6ff', border:'1px solid rgba(0,120,212,0.2)', fontWeight:500 }}>{badge}</span>}
                  </div>
                </div>
                {/* COL 2 : description */}
                <div className="ms-desc">{item.desc}</div>
              </div>
            )
          })}
        </div>

        {/* PANEL LATERAL */}
        {panel && (
          <div className="panel-overlay">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize:16, fontWeight:600, color:'#e6edf3' }}>
                {panel==='informations'&&'Informations de l organisation'}
                {panel==='langue'&&'Langue par defaut'}
                {panel==='devise'&&'Devise et fuseau horaire'}
                {panel==='charte'&&'Charte graphique'}
              </div>
              <button onClick={()=>setPanel(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.4)', fontSize:22, lineHeight:1, padding:'2px 6px' }}>x</button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'20px' }}>

              {panel==='informations' && (
                <div>
                  <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.4)', marginBottom:20, lineHeight:1.6 }}>Mettez a jour les informations de contact et d identification de votre organisation.</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    {[['nom','Nom de l organisation'],['email','Email'],['telephone','Telephone'],['adresse','Adresse'],['ville','Ville'],['pays','Pays'],['site_web','Site web']].map(([k,l])=>(
                      <div key={k}>
                        <label style={lbl}>{l}</label>
                        <input style={inp} value={form[k]||''} onChange={e=>set(k,e.target.value)}/>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {panel==='langue' && (
                <div>
                  <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.4)', marginBottom:20, lineHeight:1.6 }}>Choisissez la langue par defaut pour tous les collaborateurs. Chaque utilisateur peut la modifier individuellement dans son profil.</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {[['fr','🇫🇷','Francais','Langue par defaut'],['en','🇬🇧','English','Default language']].map(([val,flag,name,sub])=>(
                      <div key={val} onClick={()=>set('langue',val)} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:8, border:`1.5px solid ${form.langue===val?'#0078d4':'rgba(255,255,255,0.08)'}`, background:form.langue===val?'rgba(0,120,212,0.06)':'rgba(255,255,255,0.02)', cursor:'pointer', transition:'all 0.15s' }}>
                        <span style={{ fontSize:28 }}>{flag}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:14, fontWeight:600, color: form.langue===val?'#4da6ff':'#e6edf3', marginBottom:2 }}>{name}</div>
                          <div style={{ fontSize:12, color:'rgba(255,255,255,0.35)' }}>{sub}</div>
                        </div>
                        {form.langue===val && <div style={{ width:18, height:18, borderRadius:'50%', background:'#0078d4', display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ color:'#fff', fontSize:11 }}>✓</span></div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {panel==='devise' && (
                <div>
                  <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.4)', marginBottom:20, lineHeight:1.6 }}>La devise et le fuseau horaire s appliquent a toute l organisation.</div>
                  <div style={{ marginBottom:16 }}>
                    <label style={lbl}>Devise</label>
                    <select style={{ ...inp, cursor:'pointer', background:'rgba(20,27,40,0.95)' }} value={form.devise} onChange={e=>set('devise',e.target.value)}>
                      {[['FCFA','FCFA — Franc CFA'],['USD','USD — Dollar americain'],['EUR','EUR — Euro'],['GBP','GBP — Livre sterling'],['MAD','MAD — Dirham marocain'],['NGN','NGN — Naira nigerien']].map(([v,l])=><option key={v} value={v} style={{ background:'#161b22' }}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Fuseau horaire</label>
                    <select style={{ ...inp, cursor:'pointer', background:'rgba(20,27,40,0.95)' }} value={form.fuseau} onChange={e=>set('fuseau',e.target.value)}>
                      {[['Africa/Porto-Novo','Africa/Porto-Novo (UTC+1)'],['Africa/Abidjan','Africa/Abidjan (UTC+0)'],['Africa/Lagos','Africa/Lagos (UTC+1)'],['Africa/Dakar','Africa/Dakar (UTC+0)'],['Europe/Paris','Europe/Paris (UTC+1/2)'],['America/New_York','America/New_York (UTC-5)']].map(([v,l])=><option key={v} value={v} style={{ background:'#161b22' }}>{l}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {panel==='charte' && (
                <div>
                  <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.4)', marginBottom:20, lineHeight:1.6 }}>La charte graphique (logo, couleurs) se configure dans vos modeles de documents.</div>
                  <button style={{ ...bP, width:'100%', justifyContent:'center' }} onClick={()=>window.location.href='/agence/modeles'}>Aller aux modeles de documents</button>
                </div>
              )}
            </div>

            {/* FOOTER PANEL */}
            {['informations','langue','devise'].includes(panel) && (
              <div style={{ padding:'14px 20px', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button style={bB} onClick={()=>setPanel(null)}>Annuler</button>
                <button style={{ ...bP, opacity:saving?0.6:1 }} disabled={saving} onClick={panel==='informations'?saveInfos:panel==='langue'?saveLangue:saveDevise}>
                  {saving?'Sauvegarde...':'Enregistrer'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
