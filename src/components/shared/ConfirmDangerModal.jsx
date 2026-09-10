import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

/**
 * Confirmation a deux niveaux pour une action a consequences reelles :
 * une case a cocher explicite doit etre validee avant que le bouton de
 * confirmation ne s'active (contrairement a un simple Oui/Non passif).
 * Reutilisable partout dans l'app (conversion Location<->Vente,
 * resiliation de bail, suppression avec historique, etc.).
 */
export default function ConfirmDangerModal({
  open, title, message, checkboxLabel,
  confirmLabel = 'Continuer', cancelLabel = 'Annuler',
  onConfirm, onCancel,
}) {
  const [checked, setChecked] = useState(false)

  useEffect(() => { if (open) setChecked(false) }, [open])

  if (!open) return null

  return (
    <div className="cdm-ov" onClick={e=>e.target===e.currentTarget&&onCancel?.()}>
      <style>{`
        .cdm-ov{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px}
        .cdm-panel{background:#161b22;border:1px solid rgba(239,68,68,0.25);border-radius:12px;width:min(440px,100%);box-shadow:0 20px 60px rgba(0,0,0,0.5);animation:cdm-pop 0.15s ease}
        @keyframes cdm-pop{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}
        .cdm-head{display:flex;align-items:flex-start;gap:12px;padding:20px 20px 0}
        .cdm-icon{width:36px;height:36px;border-radius:9px;background:rgba(239,68,68,0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#ef4444}
        .cdm-title{font-size:15.5px;font-weight:700;color:#e6edf3;margin-bottom:2px}
        .cdm-cls{margin-left:auto;background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.35);padding:4px;border-radius:5px;display:flex;flex-shrink:0}
        .cdm-cls:hover{color:#e6edf3;background:rgba(255,255,255,0.06)}
        .cdm-msg{font-size:13px;line-height:1.55;color:rgba(255,255,255,0.55);padding:10px 20px 0 68px}
        .cdm-cb-row{display:flex;align-items:flex-start;gap:10px;margin:16px 20px 0 68px;padding:12px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.18);border-radius:8px;cursor:pointer}
        .cdm-cb{width:17px;height:17px;border-radius:4px;border:1.5px solid rgba(239,68,68,0.5);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;transition:all 0.12s}
        .cdm-cb.on{background:#ef4444;border-color:#ef4444}
        .cdm-cb-lbl{font-size:12.5px;line-height:1.5;color:rgba(255,255,255,0.75)}
        .cdm-foot{display:flex;gap:10px;padding:20px}
        .cdm-btn{flex:1;padding:10px;border-radius:6px;font-size:13.5px;font-weight:600;cursor:pointer;border:none;font-family:Inter,sans-serif;transition:all 0.15s}
        .cdm-btn-cancel{background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);border:1px solid rgba(255,255,255,0.1)}
        .cdm-btn-cancel:hover{background:rgba(255,255,255,0.09)}
        .cdm-btn-confirm{background:#ef4444;color:#fff}
        .cdm-btn-confirm:hover:not(:disabled){background:#dc2626}
        .cdm-btn-confirm:disabled{opacity:0.35;cursor:not-allowed}
      `}</style>
      <div className="cdm-panel">
        <div className="cdm-head">
          <div className="cdm-icon"><AlertTriangle size={18}/></div>
          <div style={{flex:1}}>
            <div className="cdm-title">{title}</div>
          </div>
          <button className="cdm-cls" onClick={onCancel}><X size={16}/></button>
        </div>
        <div className="cdm-msg">{message}</div>
        <div className="cdm-cb-row" onClick={()=>setChecked(c=>!c)}>
          <div className={`cdm-cb ${checked?'on':''}`}>
            {checked&&<svg width="9" height="9" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
          </div>
          <div className="cdm-cb-lbl">{checkboxLabel}</div>
        </div>
        <div className="cdm-foot">
          <button className="cdm-btn cdm-btn-cancel" onClick={onCancel}>{cancelLabel}</button>
          <button className="cdm-btn cdm-btn-confirm" disabled={!checked} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
