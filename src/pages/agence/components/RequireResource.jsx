import { Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useResourceAccess } from '../../../lib/permissions'

const MESSAGES = {
  suspendu: {
    titre: 'Abonnement suspendu',
    texte: "Faute de paiement, l'accès à cette fonctionnalité est suspendu. Régularisez votre situation pour la retrouver.",
    cta: 'Réactiver mon abonnement',
    lien: '/agence/abonnement/plan',
  },
  sans_licence: {
    titre: 'Aucune licence attribuée',
    texte: "Vous n'avez pas de licence couvrant cette fonctionnalité. Demandez à un administrateur de vous en attribuer une.",
    cta: 'Voir mon profil',
    lien: '/agence/utilisateurs',
  },
  desactivee: {
    titre: 'Fonctionnalité non incluse dans vos accès',
    texte: "Cette fonctionnalité a été désactivée pour votre compte par un administrateur, même si votre licence la couvre normalement.",
    cta: 'Voir mon profil',
    lien: '/agence/utilisateurs',
  },
  sans_role: {
    titre: 'Accès réservé',
    texte: "Votre rôle actuel ne vous donne pas accès à cette fonctionnalité. Demandez à un administrateur de vous attribuer le rôle nécessaire.",
    cta: 'Voir mon profil',
    lien: '/agence/utilisateurs',
  },
}

// Garde au niveau de la "ressource" (composante d'un produit, ex. "biens",
// "baux") — plus fin que RequireLicencedApp (qui ne verifie que l'application
// dans son ensemble). Les deux se combinent : RequireLicencedApp protege
// l'application, RequireResource protege la composante precise a l'interieur.
export default function RequireResource({ code, children }) {
  const { allowed, reason, loading } = useResourceAccess(code)
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
