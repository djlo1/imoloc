/**
 * Barre de progression simple. Choisit automatiquement une couleur
 * (rouge/orange/vert) selon le pourcentage si aucune couleur n'est fournie.
 */
export default function ProgressBar({ value, max = 100, color, height = 6, bg = 'rgba(255,255,255,0.08)', style }) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0))
  const autoColor = pct >= 80 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#00c896'
  const c = color || autoColor
  return (
    <div style={{ width: '100%', height, borderRadius: height / 2, background: bg, overflow: 'hidden', ...style }}>
      <div style={{ width: `${pct}%`, height: '100%', background: c, borderRadius: height / 2, transition: 'width 0.4s ease' }} />
    </div>
  )
}
