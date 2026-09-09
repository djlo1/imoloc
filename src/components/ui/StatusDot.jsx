/**
 * Pastille de statut a positionner sur un avatar/icone (parent en position:relative).
 */
export default function StatusDot({ color = '#00c896', size = 8, ring = '#161b22', style }) {
  return (
    <span style={{
      position: 'absolute', bottom: 0, right: 0, width: size, height: size,
      borderRadius: '50%', background: color, border: `2px solid ${ring}`, ...style,
    }} />
  )
}
