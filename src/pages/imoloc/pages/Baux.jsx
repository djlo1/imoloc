import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'

const STATUT_CFG = {
  en_attente:{color:"#f59e0b",bg:"rgba(245,158,11,0.12)",label:"En attente"},
  actif:     {color:"#00c896",bg:"rgba(0,200,150,0.12)", label:"Actif"},
  expire:    {color:"#6c63ff",bg:"rgba(108,99,255,0.12)",label:"Expire"},
  resilie:   {color:"#ef4444",bg:"rgba(239,68,68,0.12)", label:"Resilie"},
}
const fmt = (n) => n!=null ? Number(n).toLocaleString("fr-FR") : "-"

export default function ImolocBaux() {
  const navigate = useNavigate()
  const [baux, setBaux] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { data:{ user } } = await supabase.auth.getUser()
        const { data:agList } = await supabase.from("agences").select("*")
        const ag = agList?.find(a=>a.profile_id===user.id) || agList?.[0]
        if (ag?.id) {
          const { data } = await supabase.from("baux")
            .select("*, biens(nom,ville), locataires(nom,prenom)")
            .eq("agence_id", ag.id)
            .order("created_at", {ascending:false})
          setBaux(data||[])
        }
      } catch(e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  return (
    <div style={{minHeight:"100%"}}>
      <div style={{display:"flex",alignItems:"center",gap:7,fontSize:12.5,color:"rgba(255,255,255,0.4)",marginBottom:18}}>
        <span style={{cursor:"pointer"}} onClick={()=>navigate("/imoloc")}>Centre Imoloc</span>
        <span style={{color:"rgba(255,255,255,0.2)"}}>›</span>
        <span style={{color:"rgba(255,255,255,0.65)"}}>Baux et Contrats</span>
      </div>
      <div style={{fontSize:26,fontWeight:700,color:"#e6edf3",marginBottom:4}}>Baux et Contrats</div>
      <div style={{fontSize:13.5,color:"rgba(255,255,255,0.4)",marginBottom:24}}>{baux.length} bail{baux.length!==1?"x":""}</div>
      {loading ? (
        <div style={{color:"rgba(255,255,255,0.3)",padding:40,textAlign:"center"}}>Chargement...</div>
      ) : baux.length===0 ? (
        <div style={{color:"rgba(255,255,255,0.3)",padding:60,textAlign:"center"}}>
          <div style={{fontSize:44,marginBottom:14,opacity:0.3}}>📄</div>
          <div style={{fontSize:16,fontWeight:600}}>Aucun bail</div>
        </div>
      ) : (
        <div style={{border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,overflow:"hidden"}}>
          {baux.map((b,i)=>{
            const cfg = STATUT_CFG[b.statut]||STATUT_CFG.en_attente
            return (
              <div key={b.id} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",borderBottom:i<baux.length-1?"1px solid rgba(255,255,255,0.05)":"none"}}>
                <div style={{width:38,height:38,borderRadius:8,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.09)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>📄</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600,color:"#e6edf3"}}>{b.biens?.nom||"Bien inconnu"}</div>
                  <div style={{fontSize:12.5,color:"rgba(255,255,255,0.35)",marginTop:2}}>{b.locataires?.prenom} {b.locataires?.nom||"—"} · {fmt(b.loyer_mensuel)} FCFA/mois</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <span style={{fontSize:11,fontWeight:600,padding:"2px 9px",borderRadius:"100px",background:cfg.bg,color:cfg.color}}>{cfg.label}</span>
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.3)",marginTop:4}}>{b.date_debut?new Date(b.date_debut).toLocaleDateString("fr-FR"):"—"}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
