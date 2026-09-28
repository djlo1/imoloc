#!/usr/bin/env node
// Testeur d'email — envoie le VRAI modèle d'invitation Imoloc (copié depuis
// supabase/functions/send-invitation/index.ts) vers une boîte de test
// ethereal.email, générée à la volée. Rien n'est envoyé à un vrai
// destinataire : ethereal capture l'email et donne un lien de prévisualisation
// (rendu par un vrai client mail), sans toucher à Brevo ni à un compte réel.
//
// Usage : npm run test:email
// Options (variables d'environnement) :
//   PRENOM, NOM, EMAIL, AGENCE, ROLE, PASSWORD, FORCE_CHANGE=0|1

import nodemailer from 'nodemailer'

const LOGO = 'https://zecyfnurrcslukxvmpca.supabase.co/storage/v1/object/public/assets-publics/imoloc-icon-email.png'
const SUPPORT_EMAIL = 'immolocapps@gmail.com'

// ── Modèle d'email — à resynchroniser manuellement si
// supabase/functions/send-invitation/index.ts change. ──
function buildEmailHtml({ prenom, agenceName, email, role, password, force_change, loginUrl }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f2f1;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f2f1;padding:32px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff">

  <tr><td style="padding:24px 40px 20px">
    <img src="${LOGO}" width="48" height="48" alt="Imoloc" style="vertical-align:middle;border-radius:10px">
    <span style="font-family:Arial,sans-serif;font-size:22px;font-weight:800;color:#0B2D6B;vertical-align:middle;margin-left:12px">Imoloc</span>
  </td></tr>

  <tr><td style="padding:8px 40px 32px">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td valign="top" width="330">
        <h1 style="margin:0 0 14px;font-size:26px;line-height:1.25;font-weight:800;color:#1a1a1a">Bienvenue sur Imoloc, ${prenom}</h1>
        <p style="margin:0 0 20px;font-size:14.5px;color:#3a3a3a;line-height:1.6">
          Un compte vient d'être créé pour vous chez <strong>${agenceName}</strong>, en tant que <strong>${role}</strong>. Connectez-vous pour découvrir vos outils de gestion immobilière.
        </p>
        <a href="${loginUrl}" style="display:inline-block;padding:12px 26px;background:#007BFF;color:#fff;text-decoration:none;border-radius:4px;font-size:14.5px;font-weight:700">Accéder à Imoloc</a>
      </td>
      <td width="20"></td>
      <td valign="top" width="210">
        <table cellpadding="0" cellspacing="6"><tr>
          <td style="background:#007BFF;border-radius:8px;width:44px;height:44px;text-align:center;vertical-align:middle;font-family:Arial,sans-serif;font-weight:800;color:#fff;font-size:13px">Mgr</td>
          <td style="background:#6c63ff;border-radius:8px;width:44px;height:44px;text-align:center;vertical-align:middle;font-family:Arial,sans-serif;font-weight:800;color:#fff;font-size:13px">Loci</td>
        </tr><tr>
          <td style="background:#00c896;border-radius:8px;width:44px;height:44px;text-align:center;vertical-align:middle;font-family:Arial,sans-serif;font-weight:800;color:#fff;font-size:13px">Séc</td>
          <td style="background:#f59e0b;border-radius:8px;width:44px;height:44px;text-align:center;vertical-align:middle;font-family:Arial,sans-serif;font-weight:800;color:#fff;font-size:13px">Ins</td>
        </tr></table>
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:0 40px 32px">
    <div style="font-size:15px;font-weight:700;color:#1a1a1a;margin-bottom:10px">Vos identifiants de connexion</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;border-radius:8px"><tr><td style="padding:18px 20px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:6px 0;font-size:13.5px;color:#555">Compte</td><td style="padding:6px 0;font-size:13.5px;color:#1a1a1a;text-align:right"><a href="mailto:${email}" style="color:#007BFF;text-decoration:underline">${email}</a></td></tr>
        <tr><td style="padding:6px 0;font-size:13.5px;color:#555">Mot de passe temporaire</td><td style="padding:6px 0;text-align:right"><span style="font-family:monospace;font-size:13.5px;font-weight:700;color:#00875a;background:#e6f7ef;padding:3px 10px;border-radius:5px">${password}</span></td></tr>
        <tr><td style="padding:6px 0;font-size:13.5px;color:#555">Organisation</td><td style="padding:6px 0;font-size:13.5px;color:#1a1a1a;text-align:right">${agenceName}</td></tr>
        <tr><td style="padding:6px 0;font-size:13.5px;color:#555">Rôle</td><td style="padding:6px 0;font-size:13.5px;color:#1a1a1a;text-align:right">${role}</td></tr>
      </table>
    </td></tr></table>
    ${force_change ? `
    <div style="margin-top:14px;padding:12px 16px;background:#fff8e6;border:1px solid #f5d98a;border-radius:6px;font-size:13px;color:#7a5c00;line-height:1.5">
      Vous devrez modifier votre mot de passe lors de votre première connexion.
    </div>` : ''}
  </td></tr>

  <tr><td style="padding:0 40px 28px" align="center">
    <table cellpadding="0" cellspacing="0"><tr>
      ${[['Mgr','#007BFF'],['Loci','#6c63ff'],['Séc','#00c896'],['Ins','#f59e0b'],['Ast','#00b0c8'],['Hub','#8764b8']].map(([label,bg])=>`
      <td style="padding:0 6px">
        <div style="width:34px;height:34px;background:${bg};border-radius:7px;text-align:center;line-height:34px;font-family:Arial,sans-serif;font-weight:800;color:#fff;font-size:10.5px">${label}</div>
      </td>`).join('')}
    </tr></table>
  </td></tr>

  <tr><td style="padding:0 40px 8px">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:16px 0;border-top:1px solid #eee">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td width="40" valign="top" style="font-size:22px">✨</td>
          <td valign="top">
            <div style="font-size:15px;font-weight:700;color:#1a1a1a;margin-bottom:3px">Loci AI, votre assistant</div>
            <div style="font-size:13.5px;color:#555;line-height:1.5;margin-bottom:6px">Posez vos questions et laissez Loci vous aider dans vos tâches quotidiennes.</div>
            <a href="${loginUrl}" style="font-size:13px;color:#007BFF;text-decoration:underline">En savoir plus</a>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:16px 0;border-top:1px solid #eee">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td width="40" valign="top" style="font-size:22px">🛡️</td>
          <td valign="top">
            <div style="font-size:15px;font-weight:700;color:#1a1a1a;margin-bottom:3px">Sécurité et permissions</div>
            <div style="font-size:13.5px;color:#555;line-height:1.5;margin-bottom:6px">Vos accès sont protégés et gérés finement par votre organisation.</div>
            <a href="${loginUrl}" style="font-size:13px;color:#007BFF;text-decoration:underline">En savoir plus</a>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:16px 0;border-top:1px solid #eee">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td width="40" valign="top" style="font-size:22px">📊</td>
          <td valign="top">
            <div style="font-size:15px;font-weight:700;color:#1a1a1a;margin-bottom:3px">Imoloc Insights</div>
            <div style="font-size:13.5px;color:#555;line-height:1.5;margin-bottom:6px">Suivez l'activité de votre organisation grâce à des rapports clairs.</div>
            <a href="${loginUrl}" style="font-size:13px;color:#007BFF;text-decoration:underline">En savoir plus</a>
          </td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:0 40px 32px">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;border-radius:8px"><tr><td style="padding:22px;text-align:center">
      <div style="font-size:20px;margin-bottom:8px">❓</div>
      <div style="font-size:14px;color:#1a1a1a"><strong>Besoin d'aide ?</strong> <a href="mailto:${SUPPORT_EMAIL}" style="color:#007BFF;text-decoration:underline">Contactez le support</a>.</div>
    </td></tr></table>
  </td></tr>

  <tr><td style="background:#f7f7f7;padding:22px 40px">
    <p style="margin:0 0 10px;font-size:11.5px;color:#888;font-style:italic;line-height:1.5">Ce message vous a été envoyé car un compte Imoloc a été créé pour vous par ${agenceName}.</p>
    <p style="margin:0 0 6px;font-size:11.5px;color:#888">© 2026 Imoloc</p>
    <p style="margin:0 0 12px;font-size:11.5px;color:#888">DJLOTECH Society · Cotonou, Bénin</p>
    <img src="${LOGO}" width="32" height="32" alt="Imoloc" style="border-radius:7px">
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

async function main() {
  const prenom = process.env.PRENOM || 'Jean'
  const nom = process.env.NOM || 'Dupont'
  const email = process.env.EMAIL || 'jean.dupont@gmail.com'
  const agenceName = process.env.AGENCE || 'Agence Cotonou Centre'
  const role = process.env.ROLE || 'Agent'
  const password = process.env.PASSWORD || 'Xk7#mQ2vLp9!'
  const force_change = process.env.FORCE_CHANGE !== '0'
  const loginUrl = 'https://imoloc.example.com/login'

  console.log('Création d\'une boîte de test ethereal.email…')
  const testAccount = await nodemailer.createTestAccount()

  const transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: { user: testAccount.user, pass: testAccount.pass },
  })

  const html = buildEmailHtml({ prenom, agenceName, email, role, password, force_change, loginUrl })

  const info = await transporter.sendMail({
    from: '"Imoloc" <immolocapps@gmail.com>',
    to: email,
    subject: `Invitation à rejoindre ${agenceName} sur Imoloc`,
    html,
  })

  console.log('\nEmail envoyé vers la boîte de test.')
  console.log('Aperçu (rendu réel, comme un vrai client mail) :')
  console.log('  ' + nodemailer.getTestMessageUrl(info))
  console.log('\n(Boîte de test éphémère : ' + testAccount.user + ')')
}

main().catch((err) => {
  console.error('Erreur :', err.message)
  process.exit(1)
})
