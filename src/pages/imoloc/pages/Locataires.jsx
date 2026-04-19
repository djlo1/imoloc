import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'

export default function ImolocLocataires() {
  const navigate = useNavigate()
  const [locataires, setLocataires] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { data:{ user } } = await supabase.auth.getUser()
        const { data:agList } = await supabase.from('agences').select('*')
        const ag = agList?.find(a=>a.profile_id===user.id) || agList?.[0]
        if (ag?.id) {
          const { data } = await supabase.from('locataires').select('*').eq('agence_id', ag.id).order('created_at', {ascending:false})
          setLocataires(data||[])
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
        <span style={{color:"rgba(255,255,255,0.65)"}}>Locataires</span>
      </div>
      <div style={{fontSize:26,fontWeight:700,color:"#e6edf3",marginBottom:4}}>Locataires</div>
      <div style={{fontSize:13.5,color:"rgba(255,255,255,0.4)",marginBottom:24}}>{locataires.length} locataire{locataires.length!==1?"s":""}</div>
      {loading ? (
        <div style={{color:"rgba(255,255,255,0.3)",padding:40,textAlign:"center"}}>Chargement...</div>
      ) : locataires.length===0 ? (
        <div style={{color:"rgba(255,255,255,0.3)",padding:60,textAlign:"center"}}>
          <div style={{fontSize:44,marginBottom:14,opacity:0.3}}>👤</div>
          <div style={{fontSize:16,fontWeight:600}}>Aucun locataire</div>
        </div>
      ) : (
        <div style={{border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,overflow:"hidden"}}>
          {locataires.map((l,i)=>(
            <div key={l.id} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",borderBottom:i<locataires.length-1?"1px solid rgba(255,255,255,0.05)":"none"}}>
              <div style={{width:38,height:38,borderRadius:"50%",background:"linear-gradient(135deg,#6c63ff,#6c63ff88)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",flexShrink:0}}>
                {((l.prenom?.[0]||"")+(l.nom?.[0]||"")).toUpperCase()||"?"}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600,color:"#e6edf3"}}>{l.prenom} {l.nom}</div>
                <div style={{fontSize:12.5,color:"rgba(255,255,255,0.35)",marginTop:2}}>{l.telephone||l.email||"Pas de contact"}</div>
              </div>
              <span style={{fontSize:11,fontWeight:600,padding:"2px 9px",borderRadius:"100px",background:l.statut_global==="actif"?"rgba(0,200,150,0.1)":"rgba(255,255,255,0.06)",color:l.statut_global==="actif"?"#00c896":"rgba(255,255,255,0.35)"}}>{l.statut_global||"actif"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
