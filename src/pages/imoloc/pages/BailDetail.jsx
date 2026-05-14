import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'
import SignaturePanel from '../../../components/SignaturePanel'

const STATUT_BAIL = {
  en_attente:{ color:'#f59e0b', bg:'rgba(245,158,11,0.12)', label:'En attente' },
  actif:     { color:'#00c896', bg:'rgba(0,200,150,0.12)',  label:'Actif' },
  expire:    { color:'#8b949e', bg:'rgba(139,148,158,0.12)',label:'Expire' },
  resilie:   { color:'#ef4444', bg:'rgba(239,68,68,0.12)',  label:'Resilie' },
}
const ETAPES = ['brouillon','genere','envoye','validation','valide','signe','actif','archive']

export default function BailDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [bail, setBail]     = useState(null)
  const [agence, setAgence] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]       = useState('informations')
  const [paiements, setPaiements] = useState([])
  const [showPay, setShowPay] = useState(false)
  const [savingPay, setSavingPay] = useState(false)
  const [payForm, setPayForm] = useState({ montant:'', mode:'Mobile Money', operateur:'', reference:'' })
  const [contrat, setContrat] = useState(null)
  const [contratOuvert, setContratOuvert] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [loadingContrat, setLoadingContrat] = useState(false)
  const [modeleActif, setModeleActif] = useState(null)
  const editableRef = useRef(null)

  useEffect(() => { initData() }, [id])

  const initData = async () => {
    setLoading(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      const { data:agList } = await supabase.from('agences').select('*')
      const ag = agList?.find(a => a.profile_id === user.id) || agList?.[0]
      setAgence(ag)
      const { data:b } = await supabase.from('baux')
        .select('*, biens(*), locataires(*), proprietaires(*)')
        .eq('id', id).single()
      setBail(b)
      if (b?.contrat_html) setContrat(b.contrat_html)
      const { data:p } = await supabase.from('paiements')
        .select('*').eq('bail_id', id).order('date_echeance', { ascending:false })
      setPaiements(p || [])
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const changerStatut = async (s) => {
    await supabase.from('baux').update({ statut:s, updated_at:new Date().toISOString() }).eq('id', id)
    setBail(p => p ? { ...p, statut:s } : p)
    toast.success('Statut mis a jour')
  }

  const avancerEtape = async (e) => {
    await supabase.from('baux').update({ etape:e, updated_at:new Date().toISOString() }).eq('id', id)
    setBail(p => p ? { ...p, etape:e } : p)
    toast.success('Etape : ' + e)
  }

  const encaisserPaiement = async () => {
    if (!payForm.montant) { toast.error('Montant requis'); return }
    setSavingPay(true)
    try {
      const now = new Date()
      await supabase.from('paiements').insert({
        bail_id:id, locataire_id:bail?.locataire_id, bien_id:bail?.bien_id, agence_id:agence?.id,
        montant:parseFloat(payForm.montant), devise:bail?.devise||'FCFA',
        periode_mois:now.getMonth()+1, periode_annee:now.getFullYear(),
        date_echeance:now.toISOString().split('T')[0],
        date_paiement:now.toISOString(), statut:'paye',
        mode_paiement:payForm.mode, operateur:payForm.operateur,
        reference_transaction:payForm.reference,
      })
      toast.success('Paiement enregistre !')
      setShowPay(false)
      setPayForm({ montant:'', mode:'Mobile Money', operateur:'', reference:'' })
      const { data:p } = await supabase.from('paiements').select('*').eq('bail_id',id).order('date_echeance',{ascending:false})
      setPaiements(p||[])
    } catch(e) { toast.error(e.message) }
    finally { setSavingPay(false) }
  }

  const loadModeleActif = async () => {
    const { data:p } = await supabase.from('parametres_organisation').select('*').eq('agence_id',agence?.id).single()
    if (!p?.mes_modeles || !p.modele_actif_id) return null
    return p.mes_modeles.find(m => m.id === p.modele_actif_id) || null
  }

  const genererContrat = async () => {
    setLoadingContrat(true); setContrat(null)
    try {
      const modele = await loadModeleActif()
      setModeleActif(modele)
      if (!modele) { setContrat('<p style="color:#ef4444;padding:40px;text-align:center">Aucun modele actif. Allez dans Admin Center > Parametres > Modeles de Documents.</p>'); return }
      const vars = {
        '{{locataire.nom}}':    (bail.locataires?.prenom||'') + ' ' + (bail.locataires?.nom||''),
        '{{proprietaire.nom}}': bail.proprietaires?.nom ? (bail.proprietaires.prenom||'') + ' ' + bail.proprietaires.nom : '—',
        '{{bien.adresse}}':     bail.biens?.nom ? bail.biens.nom + ', ' + (bail.biens?.ville||'') : '—',
        '{{loyer}}':            bail.loyer_mensuel ? Number(bail.loyer_mensuel).toLocaleString('fr-FR') : '—',
        '{{caution}}':          bail.caution ? Number(bail.caution).toLocaleString('fr-FR') : '—',
        '{{date_debut}}':       bail.date_debut ? new Date(bail.date_debut).toLocaleDateString('fr-FR') : '—',
        '{{date_fin}}':         bail.date_fin ? new Date(bail.date_fin).toLocaleDateString('fr-FR') : 'Indefinie',
        '{{duree_mois}}':       String(bail.duree_mois||'—'),
        '{{bien.type}}':        bail.biens?.type_bien||bail.biens?.type||'—',
        '{{devise}}':           bail.devise||'FCFA',
      }
      let html = modele.content || ''
      Object.entries(vars).forEach(([k,v]) => { html = html.replaceAll(k, '<strong>'+v+'</strong>') })
      setContrat(html)
      const now = new Date().toISOString()
      await supabase.from('baux').update({ contrat_html:html, contrat_date:now, contrat_statut:'brouillon' }).eq('id',id)
      setBail(p => p ? { ...p, contrat_html:html, contrat_date:now } : p)
    } catch(e) { setContrat('<p style="color:#ef4444">Erreur: '+e.message+'</p>') }
    finally { setLoadingContrat(false) }
  }

  const exporterPDF = async () => {
    if (!contrat) return
    if (!window.html2pdf) {
      await new Promise((res,rej) => { const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'; s.onload=res; s.onerror=rej; document.head.appendChild(s) })
    }
    const el = document.createElement('div')
    el.innerHTML = '<div style="padding:20px 32px;font-family:Arial;font-size:13.5px;line-height:1.9;color:#333">'+contrat+'</div>'
    document.body.appendChild(el)
    await window.html2pdf().set({ margin:0, filename:'Contrat_'+id+'.pdf', html2canvas:{ scale:2 }, jsPDF:{ unit:'mm', format:'a4' } }).from(el).save()
    document.body.removeChild(el)
    toast.success('PDF telecharge !')
  }

  const fmt = n => Number(n||0).toLocaleString('fr-FR')
  const inp = { width:'100%', padding:'8px 11px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:6, fontFamily:'Inter,sans-serif', fontSize:13, color:'#e6edf3', outline:'none', colorScheme:'dark', boxSizing:'border-box' }
  const sel2 = { ...inp, cursor:'pointer', background:'rgba(20,27,40,0.95)' }
  const lbl = { display:'block', fontSize:11.5, fontWeight:600, color:'rgba(255,255,255,0.4)', marginBottom:5 }
  const bB = { display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:5, fontSize:13, fontWeight:500, cursor:'pointer', border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.6)', fontFamily:'Inter,sans-serif', transition:'all 0.15s' }
  const bP = { ...bB, background:'#0078d4', borderColor:'#0078d4', color:'#fff' }
  const bG = { ...bB, background:'rgba(0,200,150,0.08)', borderColor:'rgba(0,200,150,0.25)', color:'#00c896' }
  const bR = { ...bB, background:'rgba(239,68,68,0.08)', borderColor:'rgba(239,68,68,0.25)', color:'#ef4444' }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:400, color:'rgba(255,255,255,0.3)' }}>Chargement...</div>
  if (!bail) return <div style={{ textAlign:'center', padding:60, color:'rgba(255,255,255,0.3)' }}>Bail introuvable</div>

  const sc = STATUT_BAIL[bail.statut] || STATUT_BAIL.en_attente
  const etapeIdx = ETAPES.indexOf(bail.etape || 'brouillon')

  return (
    <>
      <style>{`.bd-tab{padding:10px 18px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:none;font-family:Inter,sans-serif;color:rgba(255,255,255,0.4);transition:all 0.15s;white-space:nowrap}.bd-tab.on{background:rgba(255,255,255,0.08);color:#e6edf3}.bd-tr:hover td{background:rgba(255,255,255,0.02)}`}</style>
      <div style={{ maxWidth:1100, margin:'0 auto' }}>

        <button onClick={() => navigate('/imoloc/baux')} style={{ ...bB, fontSize:12, padding:'5px 12px', marginBottom:20 }}>← Retour aux baux</button>

        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:16, marginBottom:20 }}>
          <div>
            <div style={{ fontSize:26, fontWeight:800, color:'#e6edf3', letterSpacing:'-0.025em', marginBottom:8 }}>{bail.biens?.nom || 'Bail'}</div>
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <span style={{ fontSize:14, color:'rgba(255,255,255,0.5)' }}>{bail.locataires ? bail.locataires.prenom+' '+bail.locataires.nom : '—'}</span>
              <span style={{ width:4, height:4, borderRadius:'50%', background:'rgba(255,255,255,0.2)' }}/>
              <span style={{ fontSize:14, fontWeight:600, color:'#00c896' }}>{fmt(bail.loyer_mensuel)} {bail.devise||'FCFA'}/mois</span>
              <span style={{ fontSize:12, padding:'2px 10px', borderRadius:100, fontWeight:600, background:sc.bg, color:sc.color }}>{sc.label}</span>
              {bail.etape && <span style={{ fontSize:12, padding:'2px 10px', borderRadius:100, background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.5)' }}>{bail.etape}</span>}
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <select value={bail.statut} onChange={e => changerStatut(e.target.value)} style={{ ...sel2, width:'auto' }}>
              {Object.entries(STATUT_BAIL).map(([k,v]) => <option key={k} value={k} style={{ background:'#161b22' }}>{v.label}</option>)}
            </select>
            <button style={bR} onClick={() => { if(confirm('Resilier ce bail ?')) changerStatut('resilie') }}>Resilier</button>
          </div>
        </div>

        <div style={{ display:'flex', gap:0, marginBottom:24, overflowX:'auto', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
          {ETAPES.map((e,i) => (
            <div key={e} onClick={() => avancerEtape(e)} style={{ padding:'7px 14px', fontSize:11.5, fontWeight:etapeIdx===i?700:400, cursor:'pointer', borderBottom:`2px solid ${etapeIdx===i?'#0078d4':i<etapeIdx?'#00c896':'transparent'}`, color:etapeIdx===i?'#0078d4':i<etapeIdx?'#00c896':'rgba(255,255,255,0.3)', transition:'all 0.15s', whiteSpace:'nowrap', marginBottom:-1 }}>
              {i < etapeIdx ? '✓ ' : ''}{e.charAt(0).toUpperCase()+e.slice(1)}
            </div>
          ))}
        </div>

        <div style={{ display:'flex', gap:2, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:3, marginBottom:24, overflowX:'auto', width:'fit-content' }}>
          {[['informations','Informations'],['paiements','Paiements'],['contrat','Contrat'],['signatures','Signatures'],['edl','Etat des lieux']].map(([k,l]) => (
            <button key={k} className={'bd-tab'+(tab===k?' on':'')} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>

        {tab === 'informations' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:16 }}>
            {[
              { title:'Bail', items:[['Date debut',bail.date_debut?new Date(bail.date_debut).toLocaleDateString('fr-FR'):'—'],['Date fin',bail.date_fin?new Date(bail.date_fin).toLocaleDateString('fr-FR'):'Indefinie'],['Duree',bail.duree_mois?bail.duree_mois+' mois':'—'],['Loyer',fmt(bail.loyer_mensuel)+' '+(bail.devise||'FCFA')],['Caution',bail.caution?fmt(bail.caution)+' '+(bail.devise||'FCFA'):'—'],['Renouvellement auto',bail.renouvellement_auto?'Oui':'Non']] },
              { title:'Bien', items:[['Nom',bail.biens?.nom||'—'],['Type',bail.biens?.type_bien||bail.biens?.type||'—'],['Adresse',bail.biens?.adresse||'—'],['Ville',bail.biens?.ville||'—']] },
              { title:'Locataire', items:[['Nom',bail.locataires?(bail.locataires.prenom||'')+' '+bail.locataires.nom:'—'],['Tel',bail.locataires?.telephone||'—'],['Email',bail.locataires?.email||'—'],['CIN',bail.locataires?.cin||'—'],['Profession',bail.locataires?.profession||'—']] },
              { title:'Proprietaire', items:[['Nom',bail.proprietaires?((bail.proprietaires.prenom||'')+' '+bail.proprietaires.nom).trim():'—'],['Tel',bail.proprietaires?.telephone||'—'],['Email',bail.proprietaires?.email||'—']] },
            ].map(({ title, items }) => (
              <div key={title} style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'20px 24px' }}>
                <div style={{ fontSize:14, fontWeight:700, color:'#e6edf3', marginBottom:14, paddingBottom:10, borderBottom:'1px solid rgba(255,255,255,0.07)' }}>{title}</div>
                {items.map(([k,v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                    <span style={{ fontSize:12.5, color:'rgba(255,255,255,0.4)' }}>{k}</span>
                    <span style={{ fontSize:12.5, color:'#e6edf3', fontWeight:500, textAlign:'right', maxWidth:'60%', wordBreak:'break-word' }}>{v}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {tab === 'paiements' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontSize:15, fontWeight:600, color:'#e6edf3' }}>{paiements.length} paiement{paiements.length!==1?'s':''}</div>
              <button style={bP} onClick={() => setShowPay(true)}>+ Encaisser</button>
            </div>
            {showPay && (
              <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:20, marginBottom:16 }}>
                <div style={{ fontSize:14, fontWeight:600, color:'#e6edf3', marginBottom:14 }}>Enregistrer un paiement</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                  <div><label style={lbl}>Montant ({bail.devise||'FCFA'}) *</label><input type="number" style={inp} value={payForm.montant} onChange={e=>setPayForm(p=>({...p,montant:e.target.value}))}/></div>
                  <div><label style={lbl}>Mode</label><select style={sel2} value={payForm.mode} onChange={e=>setPayForm(p=>({...p,mode:e.target.value}))}><option>Mobile Money</option><option>Virement</option><option>Especes</option><option>Cheque</option></select></div>
                  <div><label style={lbl}>Operateur</label><input style={inp} value={payForm.operateur} onChange={e=>setPayForm(p=>({...p,operateur:e.target.value}))} placeholder="MTN, Moov..."/></div>
                  <div><label style={lbl}>Reference</label><input style={inp} value={payForm.reference} onChange={e=>setPayForm(p=>({...p,reference:e.target.value}))}/></div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button style={bB} onClick={() => setShowPay(false)}>Annuler</button>
                  <button style={{ ...bP, opacity:savingPay?0.6:1 }} disabled={savingPay} onClick={encaisserPaiement}>{savingPay?'Enregistrement...':'Enregistrer'}</button>
                </div>
              </div>
            )}
            <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, overflow:'hidden' }}>
              {paiements.length===0 ? <div style={{ textAlign:'center', padding:50, color:'rgba(255,255,255,0.3)', fontSize:13 }}>Aucun paiement</div> : (
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr>{['Periode','Montant','Mode','Statut','Date'].map(h=><th key={h} style={{ textAlign:'left', padding:'10px 14px', fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>{h}</th>)}</tr></thead>
                  <tbody>{paiements.map(p => {
                    const c = { paye:'#00c896', en_attente:'#f59e0b', en_retard:'#ef4444' }
                    return <tr key={p.id} className="bd-tr">
                      <td style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.04)', fontSize:13, color:'#e6edf3' }}>{p.periode_mois?String(p.periode_mois).padStart(2,'0')+'/'+p.periode_annee:new Date(p.date_echeance).toLocaleDateString('fr-FR')}</td>
                      <td style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.04)', fontSize:13, fontWeight:600, color:'#00c896' }}>{fmt(p.montant)} {p.devise||'FCFA'}</td>
                      <td style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.04)', fontSize:12.5, color:'rgba(255,255,255,0.5)' }}>{p.mode_paiement||'—'}</td>
                      <td style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}><span style={{ fontSize:11, padding:'2px 8px', borderRadius:100, fontWeight:600, color:c[p.statut]||'#8b949e', background:(c[p.statut]||'#8b949e')+'18' }}>{p.statut}</span></td>
                      <td style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.04)', fontSize:12, color:'rgba(255,255,255,0.4)' }}>{p.date_paiement?new Date(p.date_paiement).toLocaleDateString('fr-FR'):new Date(p.date_echeance).toLocaleDateString('fr-FR')}</td>
                    </tr>
                  })}</tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {tab === 'contrat' && (
          <div>
            {loadingContrat ? <div style={{ textAlign:'center', padding:60, color:'rgba(255,255,255,0.3)' }}>Generation...</div>
            : !contratOuvert ? (
              <div>
                {contrat ? (
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, marginBottom:12, cursor:'pointer' }} onClick={() => { setContratOuvert(true); setEditMode(false); loadModeleActif().then(m=>setModeleActif(m)) }}>
                      <div style={{ width:44, height:50, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:6, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <span style={{ fontSize:18 }}>📄</span><span style={{ fontSize:7, fontWeight:700, color:'#ef4444' }}>PDF</span>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontWeight:600, color:'#e6edf3', marginBottom:3 }}>Contrat_{(bail.biens?.nom||'bail').replace(/\s+/g,'_')}.pdf</div>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          {bail.contrat_date && <span style={{ fontSize:11.5, color:'rgba(255,255,255,0.3)' }}>{new Date(bail.contrat_date).toLocaleDateString('fr-FR')}</span>}
                          <span style={{ fontSize:11, padding:'1px 7px', borderRadius:100, fontWeight:600, background:bail.contrat_statut==='signe'?'rgba(0,200,150,0.1)':'rgba(245,158,11,0.1)', color:bail.contrat_statut==='signe'?'#00c896':'#f59e0b' }}>{bail.contrat_statut==='signe'?'Signe':'Brouillon'}</span>
                        </div>
                      </div>
                      <button style={{ ...bB, padding:'7px 12px' }} onClick={e=>{e.stopPropagation();genererContrat()}}>↺</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign:'center', padding:'60px 20px', border:'1px dashed rgba(255,255,255,0.08)', borderRadius:10 }}>
                    <div style={{ fontSize:36, marginBottom:12, opacity:0.3 }}>📄</div>
                    <div style={{ fontSize:15, fontWeight:600, color:'rgba(255,255,255,0.4)', marginBottom:8 }}>Aucun contrat genere</div>
                    <div style={{ fontSize:13, color:'rgba(255,255,255,0.25)', marginBottom:20 }}>Generez le contrat depuis le modele actif</div>
                    <button style={{ ...bP, margin:'0 auto' }} onClick={genererContrat}>Generer le contrat</button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, flexWrap:'wrap' }}>
                  <button style={{ ...bB, fontSize:12, padding:'5px 12px' }} onClick={()=>{setContratOuvert(false);setEditMode(false)}}>← Retour</button>
                  <button style={{ ...bP, fontSize:12, padding:'5px 12px' }} onClick={exporterPDF}>⬇ PDF</button>
                  <button style={{ ...bB, fontSize:12, padding:'5px 12px', color:editMode?'#f59e0b':'rgba(255,255,255,0.6)' }} onClick={()=>setEditMode(m=>!m)}>{editMode?'Apercu':'Modifier'}</button>
                  {editMode && <button style={{ ...bG, fontSize:12, padding:'5px 12px' }} onClick={async()=>{const html=editableRef.current?editableRef.current.innerHTML:contrat;setContrat(html);await supabase.from('baux').update({contrat_html:html}).eq('id',id);toast.success('Sauvegarde !')}}>Sauvegarder</button>}
                  <button style={{ ...bB, fontSize:12, padding:'5px 12px' }} onClick={()=>{setContrat(null);setContratOuvert(false);genererContrat()}}>Regenerer</button>
                  {!editMode && bail.contrat_statut!=='signe' && <button style={{ ...bG, fontSize:12, padding:'5px 12px' }} onClick={async()=>{if(!confirm('Marquer comme signe ?'))return;await supabase.from('baux').update({contrat_statut:'signe'}).eq('id',id);setBail(p=>p?{...p,contrat_statut:'signe'}:p);toast.success('Signe !')}}>Marquer signe</button>}
                  {modeleActif && <span style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginLeft:'auto' }}>Modele : {modeleActif.nom}</span>}
                </div>
                {editMode ? (
                  <div style={{ border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, overflow:'hidden' }}>
                    <div style={{ background:'#1e2430', padding:'6px 10px', display:'flex', gap:4, flexWrap:'wrap' }}>
                      {[['bold','<b>G</b>'],['italic','<i>I</i>'],['underline','<u>U</u>']].map(([cmd,l])=><button key={cmd} onMouseDown={e=>{e.preventDefault();document.execCommand(cmd)}} style={{ padding:'3px 8px', borderRadius:4, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.06)', cursor:'pointer', fontSize:12, color:'#e6edf3' }} dangerouslySetInnerHTML={{__html:l}}/>)}
                      {[['h2','H2'],['h3','H3'],['p','P']].map(([t,l])=><button key={t} onMouseDown={e=>{e.preventDefault();document.execCommand('formatBlock',false,t)}} style={{ padding:'3px 8px', borderRadius:4, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.06)', cursor:'pointer', fontSize:11, color:'#e6edf3' }}>{l}</button>)}
                    </div>
                    <div ref={el=>{editableRef.current=el;if(el&&!el.dataset.init){el.dataset.init='1';el.innerHTML=contrat||'';setTimeout(()=>el.focus(),50)}}} contentEditable suppressContentEditableWarning style={{ minHeight:500, padding:'20px 24px', background:'#fff', color:'#333', fontSize:13.5, lineHeight:1.9, outline:'none', fontFamily:'Arial,sans-serif' }}/>
                  </div>
                ) : (
                  <div style={{ background:'#f5f5f5', borderRadius:8, minHeight:400 }}>
                    <div dangerouslySetInnerHTML={{ __html:contrat||'' }} style={{ padding:'20px 32px', fontFamily:'Arial,sans-serif', fontSize:13.5, lineHeight:1.9, color:'#333' }}/>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'signatures' && bail && agence && (
          <div>
            <div style={{ fontSize:15, fontWeight:600, color:'#e6edf3', marginBottom:16 }}>Signatures du contrat</div>
            <SignaturePanel bail={bail} agence={agence} onUpdate={initData}/>
          </div>
        )}

        {tab === 'edl' && (
          <div style={{ textAlign:'center', padding:'60px 20px', border:'1px dashed rgba(255,255,255,0.08)', borderRadius:10 }}>
            <div style={{ fontSize:36, marginBottom:12, opacity:0.3 }}>📋</div>
            <div style={{ fontSize:15, fontWeight:600, color:'rgba(255,255,255,0.4)', marginBottom:8 }}>Etats des lieux</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.25)', marginBottom:20 }}>Creez les etats des lieux pour ce bail</div>
            <button style={{ ...bP, margin:'0 auto' }} onClick={() => navigate('/imoloc/etats-lieux')}>Aller aux etats des lieux</button>
          </div>
        )}
      </div>
    </>
  )
}
