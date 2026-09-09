import { ArrowUp, ArrowDown, Minus } from 'lucide-react'

/**
 * Petit indicateur de tendance (fleche + pourcentage), colore vert/rouge.
 * value positif = hausse (vert), negatif = baisse (rouge), 0/null = neutre.
 * Par defaut hausse=bon (vert). Passer invert pour les metriques ou une
 * hausse est mauvaise (ex: loyers en retard, taux d'impayes).
 */
export default function Trend({ value, suffix = '%', size = 11, invert = false }) {
  if (value === null || value === undefined || value === 0) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: size, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
        <Minus size={size} />0{suffix}
      </span>
    )
  }
  const up = value > 0
  const good = invert ? !up : up
  const color = good ? '#00c896' : '#ef4444'
  const Icon = up ? ArrowUp : ArrowDown
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: size, color, fontWeight: 600 }}>
      <Icon size={size} />{Math.abs(value)}{suffix}
    </span>
  )
}
