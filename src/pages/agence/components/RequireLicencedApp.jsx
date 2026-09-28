import { Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppAccess } from '../../../lib/abonnement'

const MESSAGES = {
  suspendu: {
    titre: 'Abonnement suspendu',
    texte: "Faute de paiement, l'accès à cette application est suspendu. Régularisez votre situation pour la retrouver — Imoloc Admin reste accessible.",
    cta: 'Réactiver mon abonnement',
    lien: '/agence/abonnement/plan',
  },
  sans_licence: {
    titre: 'Aucune licence attribuée',
    texte: "Vous n'avez pas encore de licence pour cette application. Demandez à un administrateur de vous en attribuer une depuis Utilisateurs actifs.",
    cta: 'Voir mon profil',
    lien: '/agence/utilisateurs',
  },
}

// Applications payantes (Imoloc Manager, ImoField, Imo Assist, Imoloc
// Insights, Loci AI, ImoConnect) bloquees soit quand l abonnement de
// l agence est suspendu, soit quand l utilisateur connecte n a lui-meme
// aucune licence active pour cette application (cas "Creer un utilisateur
// sans licence de produit" dans AddUserModal.jsx — jusqu ici sans aucun
// effet reel). Le proprietaire de l agence garde toujours acces (voir
// useAppAccess). Imoloc Admin et Imoloc ID ne passent jamais par ce garde.
export default function RequireLicencedApp({ app, children }) {
  const { allowed, reason, loading } = useAppAccess(app)
  if (loading) return null
  if (allowed) return children
  const m = MESSAGES[reason] || MESSAGES.sans_licence
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:400,textAlign:'center',padding:24}}>
      <Lock size={40} color="#ef4444" style={{marginBottom:16}}/>
      <div style={{fontSize:18,fontWeight:700,color:'#e6edf3',marginBottom:8}}>{m.titre}</div>
      <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',maxWidth:380,lineHeight:1.6,marginBottom:20}}>{m.texte}</div>
      <Link to={m.lien} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'9px 20px',borderRadius:6,fontSize:13,fontWeight:600,background:'#0078d4',color:'#fff',textDecoration:'none'}}>
        {m.cta}
      </Link>
    </div>
  )
}
