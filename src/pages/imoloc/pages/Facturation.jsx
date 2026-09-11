import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FileText, Plus, X, Receipt, Wallet, RefreshCw, TrendingDown, Users } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') : '—'

const STATUT_FACTURE_CFG = {
  brouillon: { color:'#8b949e', bg:'rgba(139,148,158,0.1)', label:'Brouillon' },
  envoyee:   { color:'#0078d4', bg:'rgba(0,120,212,0.1)',   label:'Envoyee' },
  payee:     { color:'#00c896', bg:'rgba(0,200,150,0.1)',   label:'Payee' },
  en_retard: { color:'#ef4444', bg:'rgba(239,68,68,0.1)',   label:'En retard' },
  annulee:   { color:'#4b5563', bg:'rgba(75,85,99,0.1)',    label:'Annulee' },
}
const STATUT_PAIEMENT_CFG = {
  paye:       { color:'#00c896', bg:'rgba(0,200,150,0.1)',  label:'Paye' },
  partiel:    { color:'#f59e0b', bg:'rgba(245,158,11,0.1)', label:'Partiel' },
  en_attente: { color:'#8b949e', bg:'rgba(139,148,158,0.1)',label:'En attente' },
  en_retard:  { color:'#ef4444', bg:'rgba(239,68,68,0.1)',  label:'En retard' },
  annule:     { color:'#4b5563', bg:'rgba(75,85,99,0.1)',   label:'Annule' },
}
const STATUT_RELEVE_CFG = {
  brouillon: { color:'#8b949e', bg:'rgba(139,148,158,0.1)', label:'Brouillon' },
  envoye:    { color:'#0078d4', bg:'rgba(0,120,212,0.1)',   label:'Envoye' },
  verse:     { color:'#00c896', bg:'rgba(0,200,150,0.1)',   label:'Verse' },
}
const Badge = ({ val, cfg }) => {
  const c = cfg[val] || Object.values(cfg)[0]
  return <span style={{fontSize:11,padding:'2px 9px',borderRadius:100,fontWeight:600,background:c.bg,color:c.color,border:`1px solid ${c.color}33`,whiteSpace:'nowrap'}}>{c.label}</span>
}

// Lien vers la fiche d'un bien/locataire/proprietaire ailleurs dans l'app.
const RefLink = ({ to, children }) => {
  const navigate = useNavigate()
  if (!children || children==='—') return <span style={{color:'rgba(255,255,255,0.3)'}}>—</span>
  return (
    <a href={to} onClick={e=>{e.preventDefault();navigate(to)}} style={{color:'#4da6ff',textDecoration:'none',cursor:'pointer'}}
      onMouseOver={e=>e.currentTarget.style.color='#6cb8ff'} onMouseOut={e=>e.currentTarget.style.color='#4da6ff'}>
      {children}
    </a>
  )
}

const inp = {width:'100%',padding:'8px 10px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.3)',borderRadius:2,fontFamily:'Inter,sans-serif',fontSize:13,color:'#e6edf3',outline:'none',colorScheme:'dark',boxSizing:'border-box'}
const lbl = {display:'block',fontSize:13,fontWeight:400,color:'rgba(255,255,255,0.85)',marginBottom:6}
const btnBase = {display:'inline-flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:5,fontSize:13,fontWeight:500,cursor:'pointer',border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.6)',fontFamily:'Inter,sans-serif',transition:'all 0.15s'}
const btnP = {...btnBase,background:'#0078d4',borderColor:'#0078d4',color:'#fff'}

const VIEW_TITLES = {
  'factures-locataires':   'Factures locataires',
  'factures-diverses':     'Factures diverses',
  'releves-proprietaires': 'Releves proprietaires',
  'depenses-charges':      'Depenses & charges',
}

export default function Facturation() {
  const location = useLocation()
  const navigate = useNavigate()
  const [agence, setAgence] = useState(null)
  const [loading, setLoading] = useState(true)

  const seg = location.pathname.split('/').pop()
  const view = VIEW_TITLES[seg] ? seg : 'factures-locataires'
  const space = location.pathname.startsWith('/agence') ? 'agence' : 'imoloc'

  // Factures locataires (paiements existants, presentes comme factures)
  const [echeances, setEcheances] = useState([])
  // Factures diverses
  const [facturesDiverses, setFacturesDiverses] = useState([])
  const [showAddFacture, setShowAddFacture] = useState(false)
  const [biens, setBiens] = useState([])
  const [locataires, setLocataires] = useState([])
  const [newFacture, setNewFacture] = useState({ bien_id:'', locataire_id:'', montant:'', date_echeance:'', description:'' })
  // Releves proprietaires
  const [releves, setReleves] = useState([])
  const [proprietaires, setProprietaires] = useState([])
  const [showGenReleve, setShowGenReleve] = useState(false)
  const [genReleve, setGenReleve] = useState({ proprietaire_id:'', mois:new Date().toISOString().slice(0,7) })
  const [generating, setGenerating] = useState(false)
  // Depenses & charges
  const [depenses, setDepenses] = useState([])

  useEffect(() => { initAgence() }, [])
  useEffect(() => { if (agence?.id) loadView() }, [agence?.id, view])

  const initAgence = async () => {
    const { data:{ user } } = await supabase.auth.getUser()
    const { data:ag } = await supabase.from('agences').select('*').eq('profile_id', user.id).single()
    setAgence(ag)
  }

  const loadView = async () => {
    setLoading(true)
    try {
      if (view==='factures-locataires') {
        const { data } = await supabase.from('paiements')
          .select('*, biens(nom,ville), locataires(nom,prenom)')
          .eq('agence_id', agence.id).order('date_echeance', { ascending:false })
        setEcheances(data||[])
      } else if (view==='factures-diverses') {
        const [{ data: fd }, { data: b }, { data: l }] = await Promise.all([
          supabase.from('factures_diverses').select('*, biens(nom,ville), locataires(nom,prenom)').eq('agence_id', agence.id).order('created_at', { ascending:false }),
          supabase.from('biens').select('id,nom').eq('agence_id', agence.id),
          supabase.from('locataires').select('id,nom,prenom').eq('agence_id', agence.id),
        ])
        setFacturesDiverses(fd||[])
        setBiens(b||[])
        setLocataires(l||[])
      } else if (view==='releves-proprietaires') {
        const [{ data: r }, { data: p }] = await Promise.all([
          supabase.from('releves_proprietaires').select('*, proprietaires(nom,prenom)').eq('agence_id', agence.id).order('periode_debut', { ascending:false }),
          supabase.from('proprietaires').select('id,nom,prenom').order('nom'),
        ])
        setReleves(r||[])
        setProprietaires(p||[])
      } else if (view==='depenses-charges') {
        const [{ data: charges }, { data: taxes }, { data: assurances }, { data: tickets }, { data: b }] = await Promise.all([
          supabase.from('charges_bien').select('bien_id, montant').in('bien_id', (await supabase.from('biens').select('id').eq('agence_id', agence.id)).data?.map(x=>x.id)||[]),
          supabase.from('taxes_bien').select('bien_id, montant').in('bien_id', (await supabase.from('biens').select('id').eq('agence_id', agence.id)).data?.map(x=>x.id)||[]),
          supabase.from('assurances').select('bien_id, prime').in('bien_id', (await supabase.from('biens').select('id').eq('agence_id', agence.id)).data?.map(x=>x.id)||[]),
          supabase.from('tickets').select('bien_id, cout_estime').eq('agence_id', agence.id).neq('statut','ferme'),
          supabase.from('biens').select('id,nom').eq('agence_id', agence.id),
        ])
        const parBien = {}
        for (const bi of (b||[])) parBien[bi.id] = { id: bi.id, nom: bi.nom, charges:0, taxes:0, assurances:0, tickets:0 }
        for (const c of (charges||[])) { if (parBien[c.bien_id]) parBien[c.bien_id].charges += Number(c.montant||0) }
        for (const t of (taxes||[])) { if (parBien[t.bien_id]) parBien[t.bien_id].taxes += Number(t.montant||0) }
        for (const a of (assurances||[])) { if (parBien[a.bien_id]) parBien[a.bien_id].assurances += Number(a.prime||0) }
        for (const tk of (tickets||[])) { if (parBien[tk.bien_id]) parBien[tk.bien_id].tickets += Number(tk.cout_estime||0) }
        setDepenses(Object.values(parBien).filter(d=>d.charges||d.taxes||d.assurances||d.tickets))
      }
    } catch(e) { console.error(e); toast.error('Erreur de chargement') }
    finally { setLoading(false) }
  }

  const addFactureDiverse = async () => {
    if (!newFacture.montant || !newFacture.description) { toast.error('Montant et description requis'); return }
    const { data:{ user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('factures_diverses').insert({
      agence_id: agence.id, bien_id: newFacture.bien_id||null, locataire_id: newFacture.locataire_id||null,
      montant: Number(newFacture.montant), date_echeance: newFacture.date_echeance||null,
      description: newFacture.description, statut:'envoyee', created_by: user.id,
    }).select('*, biens(nom,ville), locataires(nom,prenom)').single()
    if (error) { toast.error(error.message); return }
    setFacturesDiverses(f=>[data, ...f])
    setShowAddFacture(false)
    setNewFacture({ bien_id:'', locataire_id:'', montant:'', date_echeance:'', description:'' })
  }
  const changerStatutFacture = async (id, statut) => {
    setFacturesDiverses(f=>f.map(x=>x.id===id?{...x,statut}:x))
    await supabase.from('factures_diverses').update({ statut }).eq('id', id)
  }
  const deleteFactureDiverse = async (id) => {
    setFacturesDiverses(f=>f.filter(x=>x.id!==id))
    await supabase.from('factures_diverses').delete().eq('id', id)
  }

  const genererReleve = async () => {
    if (!genReleve.proprietaire_id) { toast.error('Proprietaire requis'); return }
    setGenerating(true)
    try {
      const [annee, mois] = genReleve.mois.split('-').map(Number)
      const periode_debut = `${annee}-${String(mois).padStart(2,'0')}-01`
      const periode_fin = new Date(annee, mois, 0).toISOString().slice(0,10)
      const { error } = await supabase.rpc('generer_releve_proprietaire', {
        p_proprietaire_id: genReleve.proprietaire_id, p_agence_id: agence.id,
        p_periode_debut: periode_debut, p_periode_fin: periode_fin,
      })
      if (error) throw error
      toast.success('Releve genere')
      setShowGenReleve(false)
      loadView()
    } catch(e) { toast.error(e.message||'Erreur de generation') }
    finally { setGenerating(false) }
  }
  const changerStatutReleve = async (id, statut) => {
    const patch = { statut }
    if (statut==='verse') patch.date_versement = new Date().toISOString().slice(0,10)
    setReleves(r=>r.map(x=>x.id===id?{...x,...patch}:x))
    await supabase.from('releves_proprietaires').update(patch).eq('id', id)
  }

  return (
    <div style={{minHeight:'100%'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:10}}>
        <div>
          <div style={{fontSize:22,fontWeight:700,color:'#e6edf3',letterSpacing:'-0.02em',marginBottom:3}}>{VIEW_TITLES[view]}</div>
          <div style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>{agence?.nom}</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button style={btnBase} onClick={loadView}><RefreshCw size={13}/></button>
          {view==='factures-diverses'&&<button style={btnP} onClick={()=>setShowAddFacture(o=>!o)}><Plus size={13}/> Nouvelle facture</button>}
          {view==='releves-proprietaires'&&<button style={btnP} onClick={()=>setShowGenReleve(o=>!o)}><Plus size={13}/> Generer un releve</button>}
        </div>
      </div>

      {loading?(
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:200,color:'rgba(255,255,255,0.3)'}}>Chargement...</div>
      ):(
      <>
        {view==='factures-locataires'&&(
          <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,overflow:'hidden'}}>
            {echeances.length===0?(
              <div style={{textAlign:'center',padding:'60px 20px'}}>
                <FileText size={36} style={{marginBottom:12,opacity:0.2}}/>
                <div style={{fontSize:15,fontWeight:600,color:'rgba(255,255,255,0.3)'}}>Aucune facture de loyer</div>
                <div style={{fontSize:12.5,color:'rgba(255,255,255,0.25)',marginTop:6}}>Generees automatiquement a la creation d'un bail</div>
              </div>
            ):(
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr>{['Periode','Bien','Locataire','Echeance','Montant','Statut'].map(h=>(
                    <th key={h} style={{textAlign:'left',padding:'10px 12px',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.06em',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>{h}</th>
                  ))}</tr></thead>
                  <tbody>{echeances.map(e=>(
                    <tr key={e.id}>
                      <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12.5,color:'#e6edf3',fontWeight:600}}>{e.periode_mois && e.periode_annee ? `${String(e.periode_mois).padStart(2,'0')}/${e.periode_annee}` : new Date(e.date_echeance).toLocaleDateString('fr-FR',{month:'2-digit',year:'numeric'})}</td>
                      <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12.5}}><RefLink to={`/${space}/biens?bien=${e.bien_id}`}>{e.biens?.nom}</RefLink></td>
                      <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12.5}}><RefLink to={`/imoloc/locataires?locataire=${e.locataire_id}`}>{e.locataires?`${e.locataires.prenom} ${e.locataires.nom}`:null}</RefLink></td>
                      <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12,color:'rgba(255,255,255,0.5)'}}>{e.date_echeance?new Date(e.date_echeance).toLocaleDateString('fr-FR'):'—'}</td>
                      <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:13,fontWeight:600,color:'#e6edf3'}}>{fmt(e.montant)} FCFA</td>
                      <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}><Badge val={e.statut} cfg={STATUT_PAIEMENT_CFG}/></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {view==='factures-diverses'&&(
          <>
            {showAddFacture&&(
              <div style={{background:'rgba(255,255,255,0.03)',padding:16,borderRadius:8,marginBottom:16}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                  <div><label style={lbl}>Bien (optionnel)</label>
                    <select style={inp} value={newFacture.bien_id} onChange={e=>setNewFacture(f=>({...f,bien_id:e.target.value}))}>
                      <option value="">Aucun</option>{biens.map(b=><option key={b.id} value={b.id}>{b.nom}</option>)}
                    </select>
                  </div>
                  <div><label style={lbl}>Locataire (optionnel)</label>
                    <select style={inp} value={newFacture.locataire_id} onChange={e=>setNewFacture(f=>({...f,locataire_id:e.target.value}))}>
                      <option value="">Aucun</option>{locataires.map(l=><option key={l.id} value={l.id}>{l.prenom} {l.nom}</option>)}
                    </select>
                  </div>
                  <div><label style={lbl}>Montant (FCFA) <span style={{color:'#ef4444'}}>*</span></label><input type="number" style={inp} value={newFacture.montant} onChange={e=>setNewFacture(f=>({...f,montant:e.target.value}))}/></div>
                  <div><label style={lbl}>Echeance</label><input type="date" style={inp} value={newFacture.date_echeance} onChange={e=>setNewFacture(f=>({...f,date_echeance:e.target.value}))}/></div>
                  <div style={{gridColumn:'1/-1'}}><label style={lbl}><span>Description</span> <span style={{color:'#ef4444'}}>*</span></label><input style={inp} value={newFacture.description} onChange={e=>setNewFacture(f=>({...f,description:e.target.value}))} placeholder="Ex: Frais de dossier"/></div>
                </div>
                <button style={btnP} onClick={addFactureDiverse}>Ajouter la facture</button>
              </div>
            )}
            <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,overflow:'hidden'}}>
              {facturesDiverses.length===0?(
                <div style={{textAlign:'center',padding:'60px 20px'}}>
                  <Receipt size={36} style={{marginBottom:12,opacity:0.2}}/>
                  <div style={{fontSize:15,fontWeight:600,color:'rgba(255,255,255,0.3)'}}>Aucune facture diverse</div>
                </div>
              ):(
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead><tr>{['Description','Bien','Locataire','Echeance','Montant','Statut',''].map(h=>(
                      <th key={h} style={{textAlign:'left',padding:'10px 12px',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.06em',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>{h}</th>
                    ))}</tr></thead>
                    <tbody>{facturesDiverses.map(f=>(
                      <tr key={f.id}>
                        <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12.5,fontWeight:600,color:'#e6edf3'}}>{f.description}</td>
                        <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12.5}}><RefLink to={`/${space}/biens?bien=${f.bien_id}`}>{f.biens?.nom}</RefLink></td>
                        <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12.5}}><RefLink to={`/imoloc/locataires?locataire=${f.locataire_id}`}>{f.locataires?`${f.locataires.prenom} ${f.locataires.nom}`:null}</RefLink></td>
                        <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12,color:'rgba(255,255,255,0.5)'}}>{f.date_echeance?new Date(f.date_echeance).toLocaleDateString('fr-FR'):'—'}</td>
                        <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:13,fontWeight:600,color:'#e6edf3'}}>{fmt(f.montant)} FCFA</td>
                        <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                          <select value={f.statut} onChange={e=>changerStatutFacture(f.id,e.target.value)} style={{...inp,padding:'4px 8px',fontSize:11,width:'auto'}}>
                            {Object.keys(STATUT_FACTURE_CFG).map(k=><option key={k} value={k}>{STATUT_FACTURE_CFG[k].label}</option>)}
                          </select>
                        </td>
                        <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}><button onClick={()=>deleteFactureDiverse(f.id)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)'}}><X size={14}/></button></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {view==='releves-proprietaires'&&(
          <>
            {showGenReleve&&(
              <div style={{background:'rgba(255,255,255,0.03)',padding:16,borderRadius:8,marginBottom:16}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                  <div><label style={lbl}><span>Proprietaire</span> <span style={{color:'#ef4444'}}>*</span></label>
                    <select style={inp} value={genReleve.proprietaire_id} onChange={e=>setGenReleve(g=>({...g,proprietaire_id:e.target.value}))}>
                      <option value="">Choisir...</option>{proprietaires.map(p=><option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
                    </select>
                  </div>
                  <div><label style={lbl}>Mois</label><input type="month" style={inp} value={genReleve.mois} onChange={e=>setGenReleve(g=>({...g,mois:e.target.value}))}/></div>
                </div>
                <div style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:12}}>Revenu brut, commission et charges sont calcules automatiquement a partir des paiements, du mandat et des charges du bien.</div>
                <button style={btnP} disabled={generating} onClick={genererReleve}>{generating?'Generation...':'Generer'}</button>
              </div>
            )}
            <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,overflow:'hidden'}}>
              {releves.length===0?(
                <div style={{textAlign:'center',padding:'60px 20px'}}>
                  <Users size={36} style={{marginBottom:12,opacity:0.2}}/>
                  <div style={{fontSize:15,fontWeight:600,color:'rgba(255,255,255,0.3)'}}>Aucun releve</div>
                  <div style={{fontSize:12.5,color:'rgba(255,255,255,0.25)',marginTop:6}}>Un brouillon est aussi genere automatiquement chaque debut de mois pour les mandats actifs</div>
                </div>
              ):(
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead><tr>{['Proprietaire','Periode','Revenu brut','Commission','Charges','Net a verser','Statut'].map(h=>(
                      <th key={h} style={{textAlign:'left',padding:'10px 12px',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.06em',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>{h}</th>
                    ))}</tr></thead>
                    <tbody>{releves.map(r=>(
                      <tr key={r.id}>
                        <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:13,fontWeight:600}}><RefLink to={`/imoloc/proprietaires?proprietaire=${r.proprietaire_id}`}>{r.proprietaires?`${r.proprietaires.prenom} ${r.proprietaires.nom}`:null}</RefLink></td>
                        <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12.5,color:'rgba(255,255,255,0.5)'}}>{new Date(r.periode_debut).toLocaleDateString('fr-FR',{month:'short',year:'numeric'})}</td>
                        <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12.5}}>{fmt(r.revenu_brut)} FCFA</td>
                        <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12.5,color:'#ef4444'}}>-{fmt(r.commission)} FCFA</td>
                        <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12.5,color:'#ef4444'}}>-{fmt(r.charges)} FCFA</td>
                        <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:13,fontWeight:700,color:'#00c896'}}>{fmt(r.montant_net)} FCFA</td>
                        <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                          <select value={r.statut} onChange={e=>changerStatutReleve(r.id,e.target.value)} style={{...inp,padding:'4px 8px',fontSize:11,width:'auto'}}>
                            {Object.keys(STATUT_RELEVE_CFG).map(k=><option key={k} value={k}>{STATUT_RELEVE_CFG[k].label}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {view==='depenses-charges'&&(
          <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,overflow:'hidden'}}>
            {depenses.length===0?(
              <div style={{textAlign:'center',padding:'60px 20px'}}>
                <TrendingDown size={36} style={{marginBottom:12,opacity:0.2}}/>
                <div style={{fontSize:15,fontWeight:600,color:'rgba(255,255,255,0.3)'}}>Aucune depense enregistree</div>
              </div>
            ):(
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr>{['Bien','Charges','Taxes','Assurances','Tickets (couts estimes)','Total'].map(h=>(
                    <th key={h} style={{textAlign:'left',padding:'10px 12px',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.06em',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>{h}</th>
                  ))}</tr></thead>
                  <tbody>{depenses.map((d,i)=>{
                    const total = d.charges+d.taxes+d.assurances+d.tickets
                    return (
                      <tr key={i}>
                        <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:13,fontWeight:600}}><RefLink to={`/${space}/biens?bien=${d.id}`}>{d.nom}</RefLink></td>
                        <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12.5}}>{fmt(d.charges)} FCFA</td>
                        <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12.5}}>{fmt(d.taxes)} FCFA</td>
                        <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12.5}}>{fmt(d.assurances)} FCFA</td>
                        <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12.5}}>{fmt(d.tickets)} FCFA</td>
                        <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:13,fontWeight:700,color:'#f59e0b'}}>{fmt(total)} FCFA</td>
                      </tr>
                    )
                  })}</tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </>
      )}
    </div>
  )
}
