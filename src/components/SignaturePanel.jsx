import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import SignatureModal from './SignatureModal'

const PARTIES = [
  { key: 'locataire',    label: 'Locataire',    icon: '👤', color: '#00c896' },
  { key: 'proprietaire', label: 'Proprietaire', icon: '🏠', color: '#4da6ff' },
  { key: 'agence',       label: 'Agence',       icon: '🏢', color: '#f59e0b' },
]

function StatusBadge({ sig }) {
  if (!sig) return <span style={{fontSize:11,padding:'2px 9px',borderRadius:100,background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.3)',border:'1px solid rgba(255,255,255,0.1)'}}>En attente</span>
  if (sig.statut === 'demande_envoyee') return <span style={{fontSize:11,padding:'2px 9px',borderRadius:100,background:'rgba(245,158,11,0.1)',color:'#f59e0b',border:'1px solid rgba(245,158,11,0.2)'}}>Demande envoyee</span>
  if (sig.statut === 'signe') return <span style={{fontSize:11,padding:'2px 9px',borderRadius:100,background:'rgba(0,200,150,0.1)',color:'#00c896',border:'1px solid rgba(0,200,150,0.2)'}}>Signe le {new Date(sig.date_signature).toLocaleDateString('fr-FR')}</span>
  return null
}

export default function SignaturePanel({ bail, agence, onUpdate }) {
  const [signatures, setSignatures] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSigModal, setShowSigModal] = useState(false)
  const [sigConfig, setSigConfig] = useState({})
  const [uploading, setUploading] = useState(null)

  useEffect(() => { if (bail?.id) loadSignatures() }, [bail?.id])

  const loadSignatures = async () => {
    setLoading(true)
    const { data } = await supabase.from('signatures')
      .select('*')
      .eq('document_type', 'bail')
      .eq('document_id', bail.id)
    setSignatures(data || [])
    setLoading(false)
  }

  const getSig = (role) => signatures.find(s => s.signataire_role === role)

  const getNom = (role) => {
    if (role === 'locataire') return bail?.locataires?.nom ? `${bail.locataires.prenom||''} ${bail.locataires.nom}`.trim() : 'Locataire'
    if (role === 'proprietaire') return bail?.proprietaires?.nom ? `${bail.proprietaires.prenom||''} ${bail.proprietaires.nom}`.trim() : 'Proprietaire'
    return agence?.nom || 'Agence'
  }

  const getEmail = (role) => {
    if (role === 'locataire') return bail?.locataires?.email || ''
    if (role === 'proprietaire') return bail?.proprietaires?.email || ''
    return agence?.email || ''
  }

  // Option 1 : Sur place
  const signerSurPlace = (role) => {
    setSigConfig({ signataire_nom: getNom(role), signataire_role: role, signataire_email: getEmail(role) })
    setShowSigModal(true)
  }

  // Option 2 : Demande par email
  const demanderParEmail = async (role) => {
    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
    const { error } = await supabase.from('signatures').insert({
      agence_id: agence?.id,
      document_type: 'bail',
      document_id: bail.id,
      signataire_nom: getNom(role),
      signataire_email: getEmail(role),
      signataire_role: role,
      type_signature: 'distance',
      lien_token: token,
      statut: 'demande_envoyee',
      email_envoye_le: new Date().toISOString(),
    })
    if (error) { toast.error(error.message); return }
    toast.success(`Demande de signature envoyee a ${getNom(role)} — email bientot disponible avec le module Notifications`)
    loadSignatures()
    onUpdate && onUpdate()
  }

  // Option 3 : Document physique
  const uploaderPhysique = async (role, file) => {
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('Fichier trop lourd (max 10MB)'); return }
    setUploading(role)
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const { error } = await supabase.from('signatures').insert({
          agence_id: agence?.id,
          document_type: 'bail',
          document_id: bail.id,
          signataire_nom: getNom(role),
          signataire_email: getEmail(role),
          signataire_role: role,
          type_signature: 'physique',
          document_signe_url: e.target.result,
          statut: 'signe',
          date_signature: new Date().toISOString(),
        })
        if (error) { toast.error(error.message); setUploading(null); return }
        toast.success('Document signe uploade !')
        loadSignatures()
        onUpdate && onUpdate()
        setUploading(null)
      }
      reader.readAsDataURL(file)
    } catch (e) { toast.error(e.message); setUploading(null) }
  }

  const annulerSignature = async (sig) => {
    if (!confirm('Annuler cette signature ?')) return
    await supabase.from('signatures').delete().eq('id', sig.id)
    loadSignatures()
    onUpdate && onUpdate()
    toast.success('Signature annulee')
  }

  const toutSigne = PARTIES.every(p => getSig(p.key)?.statut === 'signe')

  if (loading) return <div style={{padding:20,textAlign:'center',color:'rgba(255,255,255,0.3)',fontSize:13}}>Chargement...</div>

  return (
    <div>
      {toutSigne && (
        <div style={{padding:'12px 16px',background:'rgba(0,200,150,0.06)',border:'1px solid rgba(0,200,150,0.15)',borderRadius:8,marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:20}}>✅</span>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:'#00c896'}}>Contrat entierement signe</div>
            <div style={{fontSize:11.5,color:'rgba(255,255,255,0.35)'}}>Toutes les parties ont signe le bail</div>
          </div>
        </div>
      )}

      {PARTIES.map(({ key, label, icon, color }) => {
        const sig = getSig(key)
        const estSigne = sig?.statut === 'signe'
        return (
          <div key={key} style={{marginBottom:12,padding:'16px',background:'rgba(255,255,255,0.02)',border:`1px solid ${estSigne ? color+'33' : 'rgba(255,255,255,0.07)'}`,borderRadius:10,transition:'all 0.2s'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:estSigne ? 10 : 14}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:36,height:36,borderRadius:8,background:color+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>{icon}</div>
                <div>
                  <div style={{fontSize:13.5,fontWeight:600,color:'#e6edf3'}}>{label}</div>
                  <div style={{fontSize:11.5,color:'rgba(255,255,255,0.35)'}}>{getNom(key)}</div>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <StatusBadge sig={sig}/>
                {sig && <button onClick={()=>annulerSignature(sig)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(239,68,68,0.6)',fontSize:13,padding:'2px 6px'}}>✕</button>}
              </div>
            </div>

            {estSigne ? (
              <div>
                {sig.type_signature === 'physique' ? (
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>Document physique uploade</div>
                ) : sig.signature_data ? (
                  <div style={{background:'#fff',borderRadius:6,padding:6,display:'inline-block'}}>
                    <img src={sig.signature_data} alt="signature" style={{height:50,display:'block'}}/>
                  </div>
                ) : null}
              </div>
            ) : (
              <div>
                <div style={{fontSize:11.5,color:'rgba(255,255,255,0.35)',marginBottom:10}}>Choisir le mode de signature :</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>

                  {/* Option 1 : Sur place */}
                  <button onClick={()=>signerSurPlace(key)} style={{padding:'10px 8px',borderRadius:8,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.03)',cursor:'pointer',textAlign:'center',transition:'all 0.15s',fontFamily:'Inter,sans-serif'}}>
                    <div style={{fontSize:20,marginBottom:5}}>✍️</div>
                    <div style={{fontSize:11.5,fontWeight:600,color:'#e6edf3',marginBottom:2}}>Sur place</div>
                    <div style={{fontSize:10,color:'rgba(255,255,255,0.3)'}}>Signer a l ecran</div>
                  </button>

                  {/* Option 2 : Par email */}
                  <button onClick={()=>demanderParEmail(key)} disabled={sig?.statut==='demande_envoyee'} style={{padding:'10px 8px',borderRadius:8,border:'1px solid rgba(255,255,255,0.1)',background:sig?.statut==='demande_envoyee'?'rgba(245,158,11,0.06)':'rgba(255,255,255,0.03)',cursor:sig?.statut==='demande_envoyee'?'default':'pointer',textAlign:'center',transition:'all 0.15s',fontFamily:'Inter,sans-serif',opacity:sig?.statut==='demande_envoyee'?0.7:1}}>
                    <div style={{fontSize:20,marginBottom:5}}>📧</div>
                    <div style={{fontSize:11.5,fontWeight:600,color:'#e6edf3',marginBottom:2}}>{sig?.statut==='demande_envoyee'?'Envoye':'Par email'}</div>
                    <div style={{fontSize:10,color:'rgba(255,255,255,0.3)'}}>Lien de signature</div>
                  </button>

                  {/* Option 3 : Physique */}
                  <label style={{padding:'10px 8px',borderRadius:8,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.03)',cursor:'pointer',textAlign:'center',transition:'all 0.15s',display:'block'}}>
                    <input type="file" accept="image/*,application/pdf" style={{display:'none'}} onChange={e=>e.target.files[0]&&uploaderPhysique(key,e.target.files[0])}/>
                    <div style={{fontSize:20,marginBottom:5}}>{uploading===key?'⏳':'📄'}</div>
                    <div style={{fontSize:11.5,fontWeight:600,color:'#e6edf3',marginBottom:2}}>{uploading===key?'Upload...':'Physique'}</div>
                    <div style={{fontSize:10,color:'rgba(255,255,255,0.3)'}}>Scanner et uploader</div>
                  </label>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {showSigModal && (
        <SignatureModal
          isOpen={showSigModal}
          onClose={()=>setShowSigModal(false)}
          document_type="bail"
          document_id={bail.id}
          agence_id={agence?.id}
          signataire_nom={sigConfig.signataire_nom}
          signataire_role={sigConfig.signataire_role}
          signataire_email={sigConfig.signataire_email}
          onSigned={()=>{ loadSignatures(); onUpdate&&onUpdate() }}
        />
      )}
    </div>
  )
}
