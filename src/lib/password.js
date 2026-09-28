// Règle de complexité des mots de passe Imoloc — identique au texte affiché
// à l'utilisateur partout dans l'app (assistant "Ajouter un utilisateur",
// réinitialisation, changement forcé) : 8 à 256 caractères, et au moins 3
// des 4 catégories majuscule/minuscule/chiffre/symbole. Un seul endroit pour
// que la règle affichée et la règle appliquée ne divergent jamais.
export function passwordRuleMet(pw) {
  if (!pw || pw.length < 8 || pw.length > 256) return false
  const varieties = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter(r => r.test(pw)).length
  return varieties >= 3
}

export function passwordStrength(pw) {
  if (!pw) return null
  if (!passwordRuleMet(pw)) return { label: 'Faible', color: '#ef4444' }
  return pw.length >= 12 ? { label: 'Fort', color: '#00c896' } : { label: 'Moyen', color: '#f59e0b' }
}

export function generatePassword() {
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const digits = '0123456789'
  const symbols = '!@#$%*?'
  const all = lower + upper + digits + symbols
  const pick = (set) => set[Math.floor(Math.random() * set.length)]
  const required = [pick(lower), pick(upper), pick(digits), pick(symbols)]
  const rest = Array.from({ length: 8 }, () => pick(all))
  const chars = [...required, ...rest]
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}
