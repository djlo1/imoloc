import imolocIcon from '../assets/imoloc-icon.png'

// Logo officiel Imoloc (charte graphique fournie) : icône réelle + nom en
// Montserrat ExtraBold, dans les couleurs de la charte. Remplace les icônes
// "maison" dessinées à la main qui servaient de placeholder sur les pages
// publiques (Login, Register, Landing) avant que la charte ne soit fournie.
const PALETTE = {
  bleuMarine: '#0B2D6B',
  bleuPrincipal: '#007BFF',
  grisAnthracite: '#2F3A4A',
}

export default function Logo({ size = 32, subtitle = false, variant = 'dark', textSize, gap = 10 }) {
  const textColor = variant === 'light' ? '#fff' : PALETTE.bleuMarine
  const subColor = variant === 'light' ? 'rgba(255,255,255,0.75)' : PALETTE.bleuPrincipal
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap, textDecoration: 'none' }}>
      <img src={imolocIcon} alt="Imoloc" width={size} height={size} style={{ borderRadius: size * 0.22, flexShrink: 0, display: 'block' }} />
      <div>
        <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: textSize || size * 0.5, color: textColor, letterSpacing: '-0.01em', lineHeight: 1 }}>Imoloc</div>
        {subtitle && (
          <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 600, fontSize: (textSize || size * 0.5) * 0.32, color: subColor, letterSpacing: '0.06em', lineHeight: 1, marginTop: 3 }}>
            GESTION IMMOBILIÈRE
          </div>
        )}
      </div>
    </div>
  )
}
