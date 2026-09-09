import { FileText } from 'lucide-react'

export default function Baux() {
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:400,color:'rgba(255,255,255,0.3)',textAlign:'center',gap:16}}>
      <FileText size={52} style={{opacity:0.3}}/>
      <div style={{fontSize:18,fontWeight:600,color:'rgba(255,255,255,0.4)'}}>Gestion des Baux</div>
      <div style={{fontSize:14,maxWidth:400}}>Créez et gérez vos contrats de bail, signatures électroniques et renouvellements. Cette section sera disponible prochainement.</div>
    </div>
  )
}
