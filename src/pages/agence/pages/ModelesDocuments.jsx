import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../store/authStore'
import toast from 'react-hot-toast'

export default function ModelesDocuments() {
  const { profile } = useAuthStore()
  const [agence, setAgence]   = useState(null)
  const [params, setParams]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [tab, setTab]         = useState('entete')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoRef = useRef(null)

  const [entete, setEntete] = useState({
    logo_url: '',
    nom_agence: '',
    slogan: '',
    adresse: '',
    telephone: '',
    email: '',
    site_web: '',
    couleur_principale: '#0078d4',
    couleur_secondaire: '#00c896',
    pied_page: '',
    afficher_logo: true,
    afficher_slogan: true,
    afficher_site: true,
    taille_logo: '80',
    style_entete: 'moderne',
  })
  const setE = (k,v) => setEntete(f=>({...f,[k]:v}))

  useEffect(()=>{ initData() },[]) // eslint-disable-line

  const initData = async () => {
    setLoading(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      const { data:agList }   = await supabase.from('agences').select('*')
      const ag = agList?.find(a=>a.profile_id===user.id)||agList?.[0]
      setAgence(ag)
      if (!ag?.id) return

      const { data:p } = await supabase
        .from('parametres_organisation')
        .select('*')
        .eq('agence_id', ag.id)
        .single()

      if (p) {
        setParams(p)
        const e = p.modele_entete || {}
        setEntete(prev=>({
          ...prev,
          logo_url:          ag.logo_url || e.logo_url || '',
          nom_agence:        ag.nom || '',
          slogan:            e.slogan || '',
          adresse:           ag.adresse || e.adresse || '',
          telephone:         ag.telephone || e.telephone || '',
          email:             ag.email || e.email || '',
          site_web:          ag.site_web || e.site_web || '',
          couleur_principale:e.couleur_principale || p.couleur_principale || '#0078d4',
          couleur_secondaire:e.couleur_secondaire || '#00c896',
          pied_page:         e.pied_page || '',
          afficher_logo:     e.afficher_logo !== false,
          afficher_slogan:   e.afficher_slogan !== false,
          afficher_site:     e.afficher_site !== false,
          taille_logo:       e.taille_logo || '80',
          style_entete:      e.style_entete || 'moderne',
        }))
      }
    } catch(e){ console.error(e) }
    finally{ setLoading(false) }
  }

  const uploadLogo = async (file) => {
    if (!file || !agence?.id) return
    setUploadingLogo(true)
    try {
      const ext  = file.name.split('.').pop()
      const path = 'logos/agence_'+agence.id+'.'+ext
      const { error:upErr } = await supabase.storage
        .from('documents')
        .upload(path, file, { upsert:true, contentType:file.type })
      if (upErr) throw upErr

      const { data:{ publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(path)

      await supabase.from('agences').update({ logo_url:publicUrl }).eq('id', agence.id)
      setE('logo_url', publicUrl)
      toast.success('Logo uploade avec succes !')
    } catch(e){ toast.error('Erreur upload: '+e.message) }
    finally{ setUploadingLogo(false) }
  }

  const saveEntete = async () => {
    if (!agence?.id) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('parametres_organisation')
        .upsert({
          agence_id:       agence.id,
          modele_entete:   entete,
          couleur_principale: entete.couleur_principale,
          updated_at:      new Date().toISOString(),
        }, { onConflict:'agence_id' })
      if (error) throw error
      // Mettre a jour aussi agences
      await supabase.from('agences').update({
        adresse:  entete.adresse,
        telephone:entete.telephone,
        email:    entete.email,
        site_web: entete.site_web,
      }).eq('id', agence.id)
      toast.success('Modele sauvegarde !')
    } catch(e){ toast.error(e.message) }
    finally{ setSaving(false) }
  }

  // Preview HTML du document
  const renderPreview = () => {
    const col = entete.couleur_principale
    const col2= entete.couleur_secondaire
    const isMod = entete.style_entete === 'moderne'
    const isClass = entete.style_entete === 'classique'
    const logoSize = parseInt(entete.taille_logo)||80

    if (isMod) return `
      <div style="font-family:Arial,sans-serif;background:#fff;min-height:297mm;padding:0;color:#222">
        <div style="background:${col};padding:24px 32px;display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:16px">
            ${entete.afficher_logo && entete.logo_url ? `<img src="${entete.logo_url}" style="height:${logoSize}px;width:auto;object-fit:contain;border-radius:4px;background:#fff;padding:4px"/>` : ''}
            <div>
              <div style="font-size:22px;font-weight:700;color:#fff">${entete.nom_agence||'Nom agence'}</div>
              ${entete.afficher_slogan && entete.slogan ? `<div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:2px">${entete.slogan}</div>` : ''}
            </div>
          </div>
          <div style="text-align:right;font-size:12px;color:rgba(255,255,255,0.9);line-height:1.8">
            ${entete.telephone ? `<div>${entete.telephone}</div>` : ''}
            ${entete.email ? `<div>${entete.email}</div>` : ''}
            ${entete.afficher_site && entete.site_web ? `<div>${entete.site_web}</div>` : ''}
          </div>
        </div>
        ${entete.adresse ? `<div style="background:${col}22;padding:8px 32px;font-size:12px;color:#555;border-bottom:2px solid ${col}">${entete.adresse}</div>` : ''}
        <div style="padding:32px 32px 20px">
          <div style="text-align:center;margin:20px 0 32px">
            <div style="font-size:18px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${col};border-bottom:2px solid ${col};display:inline-block;padding-bottom:6px">CONTRAT DE BAIL</div>
          </div>
          <p style="color:#888;font-size:13px;line-height:1.8">Le contenu du bail apparaitra ici apres edition...</p>
        </div>
        ${entete.pied_page ? `
          <div style="position:absolute;bottom:0;left:0;right:0;padding:12px 32px;border-top:2px solid ${col};display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#888">
            <span>${entete.nom_agence}</span>
            <span>${entete.pied_page}</span>
            <span>Page 1</span>
          </div>
        ` : ''}
      </div>
    `

    if (isClass) return `
      <div style="font-family:Georgia,serif;background:#fff;min-height:297mm;padding:32px;color:#222">
        <div style="border:2px solid ${col};padding:20px;margin-bottom:24px">
          <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid ${col};padding-bottom:16px;margin-bottom:16px">
            ${entete.afficher_logo && entete.logo_url ? `<img src="${entete.logo_url}" style="height:${logoSize}px;width:auto;object-fit:contain"/>` : '<div></div>'}
            <div style="text-align:center">
              <div style="font-size:20px;font-weight:700;color:${col}">${entete.nom_agence||'Nom agence'}</div>
              ${entete.afficher_slogan && entete.slogan ? `<div style="font-size:12px;color:#666;font-style:italic;margin-top:3px">${entete.slogan}</div>` : ''}
            </div>
            <div style="text-align:right;font-size:11px;color:#555;line-height:1.9">
              ${entete.telephone ? `<div>${entete.telephone}</div>` : ''}
              ${entete.email ? `<div>${entete.email}</div>` : ''}
              ${entete.afficher_site && entete.site_web ? `<div>${entete.site_web}</div>` : ''}
            </div>
          </div>
          ${entete.adresse ? `<div style="text-align:center;font-size:12px;color:#666">${entete.adresse}</div>` : ''}
        </div>
        <div style="text-align:center;margin:24px 0">
          <div style="font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:${col}">CONTRAT DE BAIL</div>
          <div style="width:60px;height:2px;background:${col};margin:8px auto 0"></div>
        </div>
        <p style="color:#888;font-size:13px;font-style:italic;line-height:1.8;margin-top:24px">Le contenu du bail apparaitra ici apres edition...</p>
        ${entete.pied_page ? `<div style="margin-top:40px;padding-top:12px;border-top:1px solid #ccc;text-align:center;font-size:11px;color:#888">${entete.pied_page}</div>` : ''}
      </div>
    `

    // Minimaliste
    return `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;background:#fff;min-height:297mm;padding:40px;color:#222">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:32px;padding-bottom:20px;border-bottom:1px solid #eee">
          <div style="display:flex;align-items:center;gap:14px">
            ${entete.afficher_logo && entete.logo_url ? `<img src="${entete.logo_url}" style="height:${logoSize}px;width:auto;object-fit:contain"/>` : ''}
            <div>
              <div style="font-size:18px;font-weight:600;color:#111">${entete.nom_agence||'Nom agence'}</div>
              ${entete.afficher_slogan && entete.slogan ? `<div style="font-size:12px;color:#999;margin-top:2px">${entete.slogan}</div>` : ''}
            </div>
          </div>
          <div style="text-align:right;font-size:12px;color:#666;line-height:2">
            ${entete.adresse ? `<div>${entete.adresse}</div>` : ''}
            ${entete.telephone ? `<div>${entete.telephone}</div>` : ''}
            ${entete.email ? `<div>${entete.email}</div>` : ''}
            ${entete.afficher_site && entete.site_web ? `<div style="color:${col}">${entete.site_web}</div>` : ''}
          </div>
        </div>
        <div style="margin:28px 0;text-align:center">
          <div style="font-size:15px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#333">Contrat de bail</div>
          <div style="width:32px;height:2px;background:${col};margin:8px auto 0"></div>
        </div>
        <p style="color:#aaa;font-size:13px;line-height:1.9;margin-top:24px">Le contenu du bail apparaitra ici apres edition...</p>
        ${entete.pied_page ? `<div style="margin-top:40px;padding-top:10px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:10px;color:#bbb"><span>${entete.nom_agence}</span><span>${entete.pied_page}</span><span>Page 1</span></div>` : ''}
      </div>
    `
  }

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:400,color:'rgba(255,255,255,0.3)'}}>Chargement...</div>

  return (
    <>
      <style>{`
        .md-page{display:flex;flex-direction:column;gap:0;height:100%}
        .md-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px}
        .md-title{font-size:22px;font-weight:700;color:#e6edf3;letter-spacing:-0.02em}
        .md-sub{font-size:13.5px;color:rgba(255,255,255,0.4);margin-top:3px}
        .md-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:5px;font-size:13px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.6);font-family:Inter,sans-serif;transition:all 0.15s}
        .md-btn:hover{background:rgba(255,255,255,0.09);color:#e6edf3}
        .md-btn-p{background:#0078d4;border-color:#0078d4;color:#fff}.md-btn-p:hover{background:#006cc1}
        .md-tabs{display:flex;gap:2px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:7px;padding:3px;margin-bottom:24px;width:fit-content}
        .md-tab{padding:7px 18px;border-radius:5px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:none;font-family:Inter,sans-serif;color:rgba(255,255,255,0.45);transition:all 0.15s}
        .md-tab.active{background:rgba(255,255,255,0.1);color:#e6edf3}
        .md-body{display:grid;grid-template-columns:400px 1fr;gap:24px;flex:1}
        .md-form{display:flex;flex-direction:column;gap:16px;overflow-y:auto;padding-right:4px}
        .md-form::-webkit-scrollbar{width:4px}.md-form::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        .md-card{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:18px 20px}
        .md-card-title{font-size:13px;font-weight:700;color:#e6edf3;margin-bottom:14px;display:flex;align-items:center;gap:8px}
        .md-lbl{display:block;font-size:12px;font-weight:600;color:rgba(255,255,255,0.45);margin-bottom:6px}
        .md-inp{width:100%;padding:8px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:6px;font-family:Inter,sans-serif;font-size:13.5px;color:#e6edf3;outline:none;transition:border-color 0.15s;color-scheme:dark;box-sizing:border-box}
        .md-inp:focus{border-color:#0078d4}
        .md-fld{margin-bottom:12px}
        .md-g2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
        .md-toggle{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05)}
        .md-toggle:last-child{border-bottom:none}
        .md-toggle-lbl{font-size:13px;color:rgba(255,255,255,0.6)}
        .md-sw{width:34px;height:18px;border-radius:9px;background:rgba(255,255,255,0.1);transition:background 0.2s;position:relative;cursor:pointer;flex-shrink:0}
        .md-sw.on{background:#0078d4}
        .md-sw-dot{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:left 0.2s}
        .md-sw.on .md-sw-dot{left:18px}
        .md-preview{background:#f5f5f5;border-radius:10px;overflow:hidden;position:sticky;top:0}
        .md-prev-head{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(255,255,255,0.04);border-bottom:1px solid rgba(255,255,255,0.07)}
        .md-prev-title{font-size:12px;font-weight:600;color:rgba(255,255,255,0.5)}
        .md-prev-body{height:600px;overflow-y:auto;overflow-x:hidden}
        .md-logo-zone{border:2px dashed rgba(255,255,255,0.15);border-radius:8px;padding:20px;text-align:center;cursor:pointer;transition:all 0.2s;background:rgba(255,255,255,0.02)}
        .md-logo-zone:hover{border-color:rgba(0,120,212,0.4);background:rgba(0,120,212,0.04)}
        .md-style-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
        .md-style-item{padding:10px;border-radius:7px;border:1.5px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);cursor:pointer;text-align:center;transition:all 0.15s}
        .md-style-item:hover{border-color:rgba(0,120,212,0.3)}
        .md-style-item.on{border-color:#0078d4;background:rgba(0,120,212,0.08)}
        .md-style-ic{font-size:22px;margin-bottom:5px}
        .md-style-lbl{font-size:11.5px;color:rgba(255,255,255,0.55)}
        .md-style-item.on .md-style-lbl{color:#e6edf3}
        @media(max-width:1100px){.md-body{grid-template-columns:1fr}}
      `}</style>

      <div className="md-page">
        <div className="md-header">
          <div>
            <div className="md-title">Modeles de Documents</div>
            <div className="md-sub">Configurez l entete de vos bails, quittances et factures</div>
          </div>
          <button className="md-btn md-btn-p" disabled={saving} onClick={saveEntete}>
            {saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
          </button>
        </div>

        <div className="md-tabs">
          {[['entete','Entete et logo'],['clauses','Clauses par defaut'],['factures','Modele facture']].map(([k,l])=>(
            <button key={k} className={'md-tab'+(tab===k?' active':'')} onClick={()=>setTab(k)}>{l}</button>
          ))}
        </div>

        {tab === 'entete' && (
          <div className="md-body">
            {/* Formulaire */}
            <div className="md-form">

              {/* Logo */}
              <div className="md-card">
                <div className="md-card-title">Logo de l agence</div>
                {entete.logo_url ? (
                  <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:12}}>
                    <img src={entete.logo_url} alt="Logo" style={{height:60,width:'auto',objectFit:'contain',borderRadius:6,background:'rgba(255,255,255,0.05)',padding:6,border:'1px solid rgba(255,255,255,0.1)'}}/>
                    <div>
                      <div style={{fontSize:13,color:'rgba(255,255,255,0.6)',marginBottom:6}}>Logo actuel</div>
                      <button className="md-btn" style={{fontSize:11,padding:'4px 10px'}} onClick={()=>logoRef.current?.click()}>Changer</button>
                    </div>
                  </div>
                ) : (
                  <div className="md-logo-zone" onClick={()=>logoRef.current?.click()}>
                    <div style={{fontSize:28,marginBottom:8,opacity:0.4}}>🖼️</div>
                    <div style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.5)',marginBottom:4}}>{uploadingLogo ? 'Upload en cours...' : 'Cliquer pour uploader le logo'}</div>
                    <div style={{fontSize:12,color:'rgba(255,255,255,0.25)'}}>PNG, JPG, SVG — max 2MB</div>
                  </div>
                )}
                <input ref={logoRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>e.target.files[0]&&uploadLogo(e.target.files[0])}/>
                <div style={{marginTop:12}}>
                  <label className="md-lbl">Taille du logo (px)</label>
                  <input className="md-inp" type="range" min="40" max="150" value={entete.taille_logo} onChange={e=>setE('taille_logo',e.target.value)} style={{padding:0,border:'none',background:'none',cursor:'pointer'}}/>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.3)',textAlign:'right'}}>{entete.taille_logo}px</div>
                </div>
              </div>

              {/* Style */}
              <div className="md-card">
                <div className="md-card-title">Style de l entete</div>
                <div className="md-style-grid">
                  {[['moderne','Moderne','Fond colore + texte blanc'],['classique','Classique','Bordure + mise en page formelle'],['minimaliste','Minimaliste','Epure et professionnel']].map(([v,l,d])=>(
                    <div key={v} className={'md-style-item'+(entete.style_entete===v?' on':'')} onClick={()=>setE('style_entete',v)}>
                      <div className="md-style-ic">{v==='moderne'?'🎨':v==='classique'?'📜':'⚪'}</div>
                      <div style={{fontSize:12,fontWeight:600,color:entete.style_entete===v?'#e6edf3':'rgba(255,255,255,0.5)',marginBottom:3}}>{l}</div>
                      <div style={{fontSize:10.5,color:'rgba(255,255,255,0.25)',lineHeight:1.4}}>{d}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Couleurs */}
              <div className="md-card">
                <div className="md-card-title">Couleurs</div>
                <div className="md-g2">
                  <div>
                    <label className="md-lbl">Couleur principale</label>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <input type="color" value={entete.couleur_principale} onChange={e=>setE('couleur_principale',e.target.value)} style={{width:40,height:36,padding:2,borderRadius:6,border:'1px solid rgba(255,255,255,0.1)',background:'none',cursor:'pointer'}}/>
                      <input className="md-inp" value={entete.couleur_principale} onChange={e=>setE('couleur_principale',e.target.value)} style={{flex:1,fontFamily:'monospace',fontSize:12}}/>
                    </div>
                  </div>
                  <div>
                    <label className="md-lbl">Couleur secondaire</label>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <input type="color" value={entete.couleur_secondaire} onChange={e=>setE('couleur_secondaire',e.target.value)} style={{width:40,height:36,padding:2,borderRadius:6,border:'1px solid rgba(255,255,255,0.1)',background:'none',cursor:'pointer'}}/>
                      <input className="md-inp" value={entete.couleur_secondaire} onChange={e=>setE('couleur_secondaire',e.target.value)} style={{flex:1,fontFamily:'monospace',fontSize:12}}/>
                    </div>
                  </div>
                </div>
              </div>

              {/* Infos agence */}
              <div className="md-card">
                <div className="md-card-title">Informations de l agence</div>
                <div className="md-fld"><label className="md-lbl">Nom agence</label><input className="md-inp" value={entete.nom_agence} onChange={e=>setE('nom_agence',e.target.value)} placeholder="DJLOTECH Society"/></div>
                <div className="md-fld"><label className="md-lbl">Slogan / Sous-titre</label><input className="md-inp" value={entete.slogan} onChange={e=>setE('slogan',e.target.value)} placeholder="Votre partenaire de confiance"/></div>
                <div className="md-fld"><label className="md-lbl">Adresse complete</label><input className="md-inp" value={entete.adresse} onChange={e=>setE('adresse',e.target.value)} placeholder="Cotonou, Benin"/></div>
                <div className="md-g2">
                  <div><label className="md-lbl">Telephone</label><input className="md-inp" value={entete.telephone} onChange={e=>setE('telephone',e.target.value)} placeholder="+229 XX XX XX XX"/></div>
                  <div><label className="md-lbl">Email</label><input className="md-inp" value={entete.email} onChange={e=>setE('email',e.target.value)} placeholder="contact@agence.com"/></div>
                </div>
                <div className="md-fld"><label className="md-lbl">Site web</label><input className="md-inp" value={entete.site_web} onChange={e=>setE('site_web',e.target.value)} placeholder="www.agence.com"/></div>
                <div className="md-fld"><label className="md-lbl">Pied de page</label><input className="md-inp" value={entete.pied_page} onChange={e=>setE('pied_page',e.target.value)} placeholder="RC: 12345 | IFU: 9876543 | Agree MEHU"/></div>
              </div>

              {/* Options affichage */}
              <div className="md-card">
                <div className="md-card-title">Options d'affichage</div>
                {[
                  ['afficher_logo', 'Afficher le logo'],
                  ['afficher_slogan', 'Afficher le slogan'],
                  ['afficher_site', 'Afficher le site web'],
                ].map(([k,l])=>(
                  <div key={k} className="md-toggle">
                    <span className="md-toggle-lbl">{l}</span>
                    <div className={'md-sw'+(entete[k]?' on':'')} onClick={()=>setE(k,!entete[k])}>
                      <div className="md-sw-dot"/>
                    </div>
                  </div>
                ))}
              </div>

            </div>

            {/* Preview */}
            <div className="md-preview">
              <div className="md-prev-head">
                <span className="md-prev-title">Apercu en temps reel</span>
                <span style={{fontSize:11,color:'rgba(255,255,255,0.3)'}}>Format A4</span>
              </div>
              <div className="md-prev-body">
                <div
                  style={{transform:'scale(0.7)',transformOrigin:'top left',width:'142.8%',minHeight:400}}
                  dangerouslySetInnerHTML={{__html: renderPreview()}}
                />
              </div>
            </div>
          </div>
        )}

        {tab === 'clauses' && (
          <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:32,textAlign:'center'}}>
            <div style={{fontSize:28,marginBottom:12,opacity:0.3}}>📜</div>
            <div style={{fontSize:15,fontWeight:600,color:'rgba(255,255,255,0.4)',marginBottom:8}}>Clauses par defaut</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.25)'}}>Configurez les clauses pre-remplies selon le type de bail — disponible avec l editeur de bail</div>
          </div>
        )}

        {tab === 'factures' && (
          <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:32,textAlign:'center'}}>
            <div style={{fontSize:28,marginBottom:12,opacity:0.3}}>🧾</div>
            <div style={{fontSize:15,fontWeight:600,color:'rgba(255,255,255,0.4)',marginBottom:8}}>Modele Facture</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.25)'}}>Utilise le meme entete. La personnalisation specifique des factures sera disponible prochainement.</div>
          </div>
        )}
      </div>
    </>
  )
}
