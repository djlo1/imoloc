import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function SignatureModal({ isOpen, onClose, onSigned, document_type, document_id, agence_id, signataire_nom, signataire_role, signataire_email }) {
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [hasSig, setHasSig] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('dessiner')
  const [nomTape, setNomTape] = useState('')
  const [fonteIdx, setFonteIdx] = useState(0)
  const FONTES = [
    { name:'Cursive',  css:'cursive' },
    { name:'Classique',css:'Georgia, serif' },
    { name:'Moderne',  css:'Arial, sans-serif' },
  ]

  useEffect(() => { if (isOpen && tab==='dessiner') setTimeout(()=>initCanvas(),120) }, [isOpen, tab])
  useEffect(() => { if (isOpen) setNomTape(signataire_nom||'') }, [isOpen, signataire_nom])

  const initCanvas = () => {
    const cv = canvasRef.current; if (!cv) return
    const ctx = cv.getContext('2d')
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,cv.width,cv.height)
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    setHasSig(false)
  }

  const getPos = (e, cv) => {
    const r = cv.getBoundingClientRect()
    const sx = cv.width/r.width, sy = cv.height/r.height
    if (e.touches) return { x:(e.touches[0].clientX-r.left)*sx, y:(e.touches[0].clientY-r.top)*sy }
    return { x:(e.clientX-r.left)*sx, y:(e.clientY-r.top)*sy }
  }

  const startDraw = (e) => {
    e.preventDefault()
    const cv = canvasRef.current, ctx = cv.getContext('2d'), pos = getPos(e,cv)
    ctx.beginPath(); ctx.moveTo(pos.x,pos.y)
    setDrawing(true); setHasSig(true)
  }
  const draw = (e) => {
    e.preventDefault()
    if (!drawing) return
    const cv = canvasRef.current, ctx = cv.getContext('2d'), pos = getPos(e,cv)
    ctx.lineTo(pos.x,pos.y); ctx.stroke()
  }
  const stopDraw = (e) => { e.preventDefault(); setDrawing(false) }

  const genSigText = () => {
    const cv = document.createElement('canvas'); cv.width=500; cv.height=150
    const ctx = cv.getContext('2d')
    ctx.fillStyle='#fff'; ctx.fillRect(0,0,500,150)
    ctx.fillStyle='#111'; ctx.font=`46px ${FONTES[fonteIdx].css}`
    ctx.textAlign='center'; ctx.textBaseline='middle'
    ctx.fillText(nomTape||signataire_nom||'Signature', 250, 75)
    return cv.toDataURL('image/png')
  }

  const signer = async () => {
    if (!document_id||!agence_id) { toast.error('Informations manquantes'); return }
    let sigData = ''
    if (tab==='dessiner') {
      if (!hasSig) { toast.error('Veuillez dessiner votre signature'); return }
      sigData = canvasRef.current.toDataURL('image/png')
    } else {
      if (!nomTape.trim()) { toast.error('Veuillez saisir votre nom'); return }
      sigData = genSigText()
    }
    setSaving(true)
    try {
      const { error } = await supabase.from('signatures').insert({
        agence_id, document_type, document_id,
        signataire_nom: nomTape||signataire_nom,
        signataire_email: signataire_email||'',
        signataire_role: signataire_role||'agent',
        signature_data: sigData,
        statut: 'signe',
        date_signature: new Date().toISOString(),
      })
      if (error) throw error
      toast.success('Document signe !')
      onSigned && onSigned({ signature_data:sigData, signataire_nom:nomTape||signataire_nom, signataire_role })
      onClose()
    } catch(e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  if (!isOpen) return null

  const bB = { display:'inline-flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:6,fontSize:13,fontWeight:500,cursor:'pointer',border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.6)',fontFamily:'Inter,sans-serif',transition:'all 0.15s' }
  const bP = { ...bB, background:'#0078d4', borderColor:'#0078d4', color:'#fff' }
  const inp = { width:'100%',padding:'9px 12px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,color:'#e6edf3',fontFamily:'Inter,sans-serif',fontSize:14,outline:'none',colorScheme:'dark',boxSizing:'border-box' }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'#0d1117',border:'1px solid rgba(255,255,255,0.12)',borderRadius:14,width:'100%',maxWidth:520,padding:28}}>

        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
          <div style={{fontSize:17,fontWeight:700,color:'#e6edf3'}}>Signature electronique</div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)',fontSize:22,lineHeight:1}}>x</button>
        </div>
        <div style={{fontSize:12.5,color:'rgba(255,255,255,0.4)',marginBottom:20}}>
          Signataire : <strong style={{color:'#e6edf3'}}>{signataire_nom}</strong>
          {signataire_role && <span style={{marginLeft:8,fontSize:11,padding:'1px 8px',borderRadius:100,background:'rgba(0,120,212,0.1)',color:'#4da6ff',border:'1px solid rgba(0,120,212,0.2)'}}>{signataire_role}</span>}
        </div>

        <div style={{display:'flex',gap:2,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:7,padding:3,marginBottom:20,width:'fit-content'}}>
          {[['dessiner','Dessiner'],['taper','Taper mon nom']].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{...bB,padding:'6px 14px',background:tab===k?'rgba(255,255,255,0.1)':'none',color:tab===k?'#e6edf3':'rgba(255,255,255,0.4)',border:'none'}}>{l}</button>
          ))}
        </div>

        {tab==='dessiner' && (
          <div>
            <div style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:8}}>Dessinez votre signature ci-dessous</div>
            <div style={{border:'2px solid rgba(255,255,255,0.15)',borderRadius:8,overflow:'hidden',background:'#fff',cursor:'crosshair',marginBottom:10,touchAction:'none'}}>
              <canvas ref={canvasRef} width={500} height={160}
                style={{display:'block',width:'100%',height:160}}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
              />
            </div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <button style={{...bB,fontSize:11,padding:'4px 12px'}} onClick={()=>initCanvas()}>Effacer</button>
              {hasSig && <span style={{fontSize:11,color:'#00c896'}}>Signature dessinee</span>}
            </div>
          </div>
        )}

        {tab==='taper' && (
          <div>
            <div style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:8}}>Saisissez votre nom complet</div>
            <input style={{...inp,marginBottom:14}} value={nomTape} onChange={e=>setNomTape(e.target.value)} placeholder="Votre nom complet"/>
            <div style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:8}}>Style de signature</div>
            <div style={{display:'flex',gap:8,marginBottom:14}}>
              {FONTES.map((f,i)=>(
                <div key={i} onClick={()=>setFonteIdx(i)} style={{flex:1,padding:'10px 8px',background:fonteIdx===i?'rgba(0,120,212,0.12)':'rgba(255,255,255,0.03)',border:`1px solid ${fonteIdx===i?'#0078d4':'rgba(255,255,255,0.1)'}`,borderRadius:8,cursor:'pointer',textAlign:'center'}}>
                  <div style={{fontSize:20,fontFamily:f.css,color:'#111',background:'#fff',padding:'3px 6px',borderRadius:4,marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{nomTape||'Signature'}</div>
                  <div style={{fontSize:10,color:'rgba(255,255,255,0.4)'}}>{f.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{padding:'10px 14px',background:'rgba(0,120,212,0.06)',border:'1px solid rgba(0,120,212,0.15)',borderRadius:8,marginTop:14,marginBottom:18}}>
          <div style={{fontSize:11.5,color:'rgba(255,255,255,0.5)',lineHeight:1.6}}>
            En signant, vous reconnaissez avoir pris connaissance de ce document et acceptez son contenu. Cette signature electronique a valeur legale.
          </div>
        </div>

        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button style={bB} onClick={onClose}>Annuler</button>
          <button style={{...bP,opacity:saving?0.6:1}} disabled={saving} onClick={signer}>
            {saving?'Signature en cours...':'Signer le document'}
          </button>
        </div>
      </div>
    </div>
  )
}
