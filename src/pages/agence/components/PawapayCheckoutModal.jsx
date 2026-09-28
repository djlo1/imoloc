import { useState } from 'react'
import { Smartphone, CheckCircle2, XCircle } from 'lucide-react'
import { supabase } from '../../../lib/supabase'

// Modale de paiement Mobile Money (pawapay), partagee entre Register.jsx
// (premiere souscription payante) et AbonnementPlan.jsx (changement de plan
// / ajustement du nombre de licences) — evite de dupliquer la logique de
// polling deja construite (voir historique : commentaire sur pawapay-callback
// qui active reellement l abonnement cote serveur, le client ne fait que
// relire le resultat).

const CORRESPONDENTS = [
  { id: 'MTN_MOMO_BEN', label: 'MTN Mobile Money', pays: 'Benin', color: '#f59e0b' },
  { id: 'MOOV_BEN', label: 'Moov Money', pays: 'Benin', color: '#0078d4' },
  { id: 'MOOV_TGO', label: 'Moov Money', pays: 'Togo', color: '#0078d4' },
  { id: 'ORANGE_SEN', label: 'Orange Money', pays: 'Senegal', color: '#f97316' },
  { id: 'WAVE_SEN', label: 'Wave', pays: 'Senegal', color: '#00c896' },
]

const bB = { display:'inline-flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:6,fontSize:13,fontWeight:500,cursor:'pointer',border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.6)',fontFamily:'Inter,sans-serif',transition:'all 0.15s' }
const bP = { ...bB, background:'#0078d4', borderColor:'#0078d4', color:'#fff' }

export default function PawapayCheckoutModal({ open, planNom, planCode, montant, periode, nombreLicences, agenceId, onClose, onSuccess }) {
  const [payForm, setPayForm] = useState({ phone:'', correspondent:'MTN_MOMO_BEN' })
  const [payStatus, setPayStatus] = useState(null) // null | 'pending' | 'success' | 'failed'
  const [depositId, setDepositId] = useState(null)
  const [sending, setSending] = useState(false)

  if (!open) return null

  const reset = () => { setPayForm({ phone:'', correspondent:'MTN_MOMO_BEN' }); setPayStatus(null); setDepositId(null); setSending(false) }
  const close = () => { reset(); onClose() }

  const pollStatus = (depId) => {
    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      try {
        const { data } = await supabase.functions.invoke('pawapay-status', { body: { depositId: depId } })
        if (data?.status === 'COMPLETED') {
          clearInterval(interval)
          // L activation reelle (abonnement + agence_licences_achetees) se fait
          // cote serveur via pawapay-callback (service_role) : on relit juste.
          let confirmed = false
          for (let tries = 0; tries < 6 && !confirmed; tries++) {
            const { data: ab } = await supabase.from('abonnements').select('statut,plan').eq('agence_id', agenceId).single()
            if (ab?.statut === 'actif' && ab?.plan === planCode) confirmed = true
            else await new Promise(r => setTimeout(r, 1500))
          }
          setPayStatus('success')
          setTimeout(() => { close(); onSuccess?.() }, 1800)
        } else if (data?.status === 'FAILED' || data?.status === 'REJECTED') {
          clearInterval(interval)
          setPayStatus('failed')
        } else if (attempts >= 20) {
          clearInterval(interval)
          setPayStatus('failed')
        }
      } catch { /* on continue le polling malgre une erreur reseau ponctuelle */ }
    }, 5000)
  }

  const lancerPaiement = async () => {
    if (!payForm.phone || payForm.phone.length < 8) return
    setSending(true)
    setPayStatus('pending')
    try {
      const { data, error } = await supabase.functions.invoke('pawapay-deposit', {
        body: {
          amount: montant,
          currency: 'XOF',
          phone: payForm.phone.replace(/\s/g, ''),
          correspondent: payForm.correspondent,
          agence_id: agenceId,
          plan_id: planCode,
          nombre_licences: nombreLicences,
          periode,
        }
      })
      if (error || !data?.success) { setPayStatus('failed'); setSending(false); return }
      setDepositId(data.depositId)
      pollStatus(data.depositId)
    } catch { setPayStatus('failed'); setSending(false) }
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:'#0d1117',border:'1px solid rgba(255,255,255,0.12)',borderRadius:14,width:'100%',maxWidth:480,padding:28}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <div>
            <div style={{fontSize:17,fontWeight:700,color:'#e6edf3'}}>Paiement Mobile Money</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginTop:2}}>
              Plan {planNom} — {nombreLicences} licence(s) — {Number(montant||0).toLocaleString('fr-FR')} FCFA{periode==='annuel'?'/an':'/mois'}
            </div>
          </div>
          {payStatus!=='pending' && <button onClick={close} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)',fontSize:22}}>×</button>}
        </div>

        {payStatus===null && (
          <div>
            <div style={{marginBottom:14}}>
              <label style={{display:'block',fontSize:11.5,fontWeight:600,color:'rgba(255,255,255,0.4)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}}>Operateur Mobile Money</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {CORRESPONDENTS.map(op=>(
                  <div key={op.id} onClick={()=>setPayForm(p=>({...p,correspondent:op.id}))} style={{padding:'10px 12px',borderRadius:8,border:`1.5px solid ${payForm.correspondent===op.id?op.color:'rgba(255,255,255,0.08)'}`,background:payForm.correspondent===op.id?op.color+'12':'rgba(255,255,255,0.02)',cursor:'pointer',transition:'all 0.15s'}}>
                    <div style={{fontSize:12.5,fontWeight:600,color:payForm.correspondent===op.id?op.color:'rgba(255,255,255,0.6)'}}>{op.label}</div>
                    <div style={{fontSize:11,color:'rgba(255,255,255,0.3)'}}>{op.pays}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{marginBottom:20}}>
              <label style={{display:'block',fontSize:11.5,fontWeight:600,color:'rgba(255,255,255,0.4)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}}>Numero de telephone</label>
              <input style={{width:'100%',padding:'10px 12px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:7,color:'#e6edf3',fontFamily:'Inter,sans-serif',fontSize:15,outline:'none',colorScheme:'dark',boxSizing:'border-box'}}
                type="tel" placeholder="Ex: 22996000000" value={payForm.phone} onChange={e=>setPayForm(p=>({...p,phone:e.target.value}))}/>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.25)',marginTop:5}}>Incluez le code pays (229 pour Benin, 228 pour Togo)</div>
            </div>
            <div style={{padding:'10px 14px',background:'rgba(0,120,212,0.06)',border:'1px solid rgba(0,120,212,0.15)',borderRadius:8,marginBottom:16}}>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.5)',lineHeight:1.6}}>Vous allez recevoir une notification USSD sur votre telephone. Approuvez le paiement pour activer votre abonnement.</div>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button style={{...bB}} onClick={close}>Annuler</button>
              <button style={{...bP,opacity:sending?0.6:1}} disabled={sending} onClick={lancerPaiement}>{sending?'Envoi...':'Payer '+Number(montant||0).toLocaleString('fr-FR')+' FCFA'}</button>
            </div>
          </div>
        )}

        {payStatus==='pending' && (
          <div style={{textAlign:'center',padding:'20px 0'}}>
            <div style={{marginBottom:16,display:"flex",justifyContent:"center"}}><Smartphone size={40} color="#0078d4"/></div>
            <div style={{fontSize:16,fontWeight:600,color:'#e6edf3',marginBottom:8}}>En attente de confirmation</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:20,lineHeight:1.7}}>Une notification USSD a ete envoyee sur votre telephone.<br/>Approuvez le paiement pour continuer.</div>
            <div style={{display:'flex',justifyContent:'center',gap:6}}>
              {[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:'50%',background:'#0078d4',animation:`ppcm-pulse 1.4s ease-in-out ${i*0.2}s infinite`}}/>)}
            </div>
            <style>{`@keyframes ppcm-pulse{0%,80%,100%{opacity:0.3;transform:scale(0.8)}40%{opacity:1;transform:scale(1)}}`}</style>
            <div style={{marginTop:20,fontSize:12,color:'rgba(255,255,255,0.25)'}}>Ref: {depositId?.slice(0,8)}...</div>
          </div>
        )}

        {payStatus==='success' && (
          <div style={{textAlign:'center',padding:'20px 0'}}>
            <div style={{marginBottom:16,display:"flex",justifyContent:"center"}}><CheckCircle2 size={40} color="#00c896"/></div>
            <div style={{fontSize:16,fontWeight:600,color:'#00c896',marginBottom:8}}>Paiement confirme !</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>Votre abonnement {planNom} est maintenant actif.</div>
          </div>
        )}

        {payStatus==='failed' && (
          <div style={{textAlign:'center',padding:'20px 0'}}>
            <div style={{marginBottom:16,display:"flex",justifyContent:"center"}}><XCircle size={40} color="#ef4444"/></div>
            <div style={{fontSize:16,fontWeight:600,color:'#ef4444',marginBottom:8}}>Paiement echoue</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:16}}>Le paiement n a pas pu etre traite.</div>
            <button style={{...bP,margin:'0 auto'}} onClick={()=>{setPayStatus(null);setSending(false)}}>Reessayer</button>
          </div>
        )}
      </div>
    </div>
  )
}
