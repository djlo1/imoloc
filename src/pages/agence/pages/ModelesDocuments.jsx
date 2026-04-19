import { useState, useEffect, useRef } from "react"
import { supabase } from "../../../lib/supabase"
import toast from "react-hot-toast"

// ─── BIBLIOTHEQUE DE TEMPLATES ───────────────────────────────────────────────
const BIBLIOTHEQUE = [
  // BAIL
  { id:"azur",       name:"Azur Moderne",      type:"bail",    color:"#0078d4", cat:"Contemporain" },
  { id:"qc",         name:"Officiel Quebec",    type:"bail",    color:"#005a8e", cat:"Formulaire"   },
  { id:"lettre",     name:"Lettre Pro",         type:"bail",    color:"#2d6a4f", cat:"Courrier"     },
  { id:"legal",      name:"Legal Corners",      type:"bail",    color:"#1b2a4a", cat:"Juridique"    },
  { id:"sidebar_v",  name:"Sidebar Violet",     type:"bail",    color:"#6b21a8", cat:"Corporate"    },
  { id:"diagonal",   name:"Diagonal Rouge",     type:"bail",    color:"#c0392b", cat:"Dynamique"    },
  { id:"noir_or",    name:"Noir et Or",         type:"bail",    color:"#b8860b", cat:"Luxe"         },
  { id:"sidebar_g",  name:"Emeraude Sidebar",   type:"bail",    color:"#059669", cat:"Nature"       },
  { id:"split",      name:"Split Bicolore",     type:"bail",    color:"#0f4c81", cat:"Moderne"      },
  { id:"dark_exec",  name:"Executive Sombre",   type:"bail",    color:"#00bcd4", cat:"Premium"      },
  { id:"marine",     name:"Luxe Marine Or",     type:"bail",    color:"#1a237e", cat:"Cabinet"      },
  { id:"benin",      name:"Standard Benin",     type:"bail",    color:"#008751", cat:"Local"        },
  { id:"minimal",    name:"Minimaliste Total",  type:"bail",    color:"#222222", cat:"Epure"        },
  { id:"gradient",   name:"Degrade Premium",    type:"bail",    color:"#f39c12", cat:"Contemporain" },
  { id:"frame",      name:"Cadre Double",       type:"bail",    color:"#795548", cat:"Classique"    },
  // FACTURE
  { id:"fact_moderne",  name:"Facture Moderne",    type:"facture", color:"#0078d4", cat:"Contemporain" },
  { id:"fact_quittance",name:"Quittance de Loyer", type:"facture", color:"#2d6a4f", cat:"Officiel"    },
  { id:"fact_appel",    name:"Appel de Loyer",     type:"facture", color:"#1a237e", cat:"Formel"      },
  { id:"fact_recu",     name:"Recu de Paiement",   type:"facture", color:"#b8860b", cat:"Simple"      },
  { id:"fact_pro",      name:"Facture Pro",         type:"facture", color:"#6b21a8", cat:"Premium"     },
]

const DEFAULT_CONTENT_BAIL = `<h2>ENTRE LES SOUSSIGNES</h2>
<p><strong>Le Bailleur :</strong> {{proprietaire.nom}}, ci-apres denomme le Bailleur</p>
<p><strong>Le Locataire :</strong> {{locataire.nom}}, ci-apres denomme le Locataire</p>
<h2>IL A ETE CONVENU CE QUI SUIT</h2>
<h3>Article 1 — Objet</h3>
<p>Le Bailleur loue au Locataire les locaux situes a : <strong>{{bien.adresse}}</strong></p>
<h3>Article 2 — Duree</h3>
<p>Bail de <strong>{{duree_mois}} mois</strong> a compter du <strong>{{date_debut}}</strong> jusqu au <strong>{{date_fin}}</strong>.</p>
<h3>Article 3 — Loyer</h3>
<p>Loyer mensuel de <strong>{{loyer}} FCFA</strong>, payable le 1er de chaque mois.</p>
<h3>Article 4 — Depot de garantie</h3>
<p>Depot de garantie de <strong>{{caution}} FCFA</strong>, remboursable en fin de bail.</p>
<h3>Article 5 — Obligations du locataire</h3>
<p>User paisiblement des locaux, payer le loyer aux echeances, maintenir en bon etat.</p>
<h3>Article 6 — Resiliation</h3>
<p>Preavis de 30 jours requis par la partie souhaitant mettre fin au bail.</p>
<br/><p>Fait a ____________, le ____________</p><br/>
<p><strong>Signature du Bailleur</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>Signature du Locataire</strong></p>
<br/><p>_________________________ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; _________________________</p>`

const DEFAULT_CONTENT_FACTURE = `<h2>FACTURE / QUITTANCE</h2>
<table style="width:100%;border-collapse:collapse;margin-bottom:20px">
  <tr style="background:#f5f5f5"><th style="padding:8px;border:1px solid #ddd;text-align:left">Description</th><th style="padding:8px;border:1px solid #ddd">Montant</th></tr>
  <tr><td style="padding:8px;border:1px solid #ddd">Loyer mensuel — {{bien.adresse}}</td><td style="padding:8px;border:1px solid #ddd;text-align:right">{{loyer}} FCFA</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd">Commission agence</td><td style="padding:8px;border:1px solid #ddd;text-align:right">— FCFA</td></tr>
  <tr style="font-weight:bold"><td style="padding:8px;border:1px solid #ddd">TOTAL</td><td style="padding:8px;border:1px solid #ddd;text-align:right">{{loyer}} FCFA</td></tr>
</table>
<p>Periode : {{date_debut}} au {{date_fin}}</p>
<p>Locataire : <strong>{{locataire.nom}}</strong></p>
<p>Bien : <strong>{{bien.adresse}}</strong></p>
<br/><p>Signature du Bailleur : _________________________</p>`

// ─── THUMBNAILS ──────────────────────────────────────────────────────────────
function mkThumb(tpl) {
  const col = tpl.color
  const line = (w,op) => `<div style="height:3px;background:${op||"rgba(0,0,0,0.08)"};border-radius:2px;margin-bottom:4px;width:${w}%"></div>`

  if (tpl.type === "facture") {
    const fthumbs = {
      fact_moderne: `<div style="height:100%;background:#fff;font-family:Arial;overflow:hidden">
        <div style="background:${col};height:28%;padding:6px 10px;display:flex;align-items:center;justify-content:space-between">
          <div style="color:#fff;font-weight:700;font-size:8px">AGENCE</div>
          <div style="text-align:right;color:rgba(255,255,255,0.8);font-size:7px;line-height:1.5"><div>Cotonou</div><div>+229 XX</div></div>
        </div>
        <div style="padding:8px 10px">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <div><div style="font-size:9px;font-weight:700;color:${col}">FACTURE</div><div style="font-size:6px;color:#aaa">N° 2024-001</div></div>
            <div style="text-align:right;font-size:6px;color:#888"><div>Date: 01/01/2024</div><div>Echeance: 31/01</div></div>
          </div>
          <div style="background:#f9f9f9;border:1px solid #eee;padding:4px;margin-bottom:4px">
            <div style="display:grid;grid-template-columns:1fr auto;gap:2px">
              <div style="font-size:5px;color:#666">Loyer mensuel</div><div style="font-size:5px;color:#333;text-align:right">150 000 F</div>
              <div style="font-size:5px;color:#666">Commission</div><div style="font-size:5px;color:#333;text-align:right">15 000 F</div>
            </div>
            <div style="border-top:1px solid #ddd;margin-top:3px;padding-top:2px;display:flex;justify-content:space-between">
              <div style="font-size:5.5px;font-weight:700;color:${col}">TOTAL</div><div style="font-size:5.5px;font-weight:700;color:${col}">165 000 F</div>
            </div>
          </div>
        </div>
      </div>`,
      fact_quittance: `<div style="height:100%;background:#fff;font-family:Georgia,serif;overflow:hidden;padding:6px">
        <div style="border:2px solid ${col};padding:5px;height:calc(100% - 12px)">
          <div style="text-align:center;border-bottom:1px solid ${col}44;padding-bottom:4px;margin-bottom:4px">
            <div style="font-size:9px;font-weight:700;color:${col}">QUITTANCE DE LOYER</div>
            <div style="font-size:5px;color:#888">Je soussigne, proprietaire</div>
          </div>
          <div style="font-size:5.5px;color:#555;line-height:1.8">
            <div>Locataire : <strong>{{locataire.nom}}</strong></div>
            <div>Loyer : <strong>{{loyer}} FCFA</strong></div>
            <div>Periode : <strong>{{date_debut}} au {{date_fin}}</strong></div>
            <div>Bien : <strong>{{bien.adresse}}</strong></div>
          </div>
          <div style="margin-top:5px;border-top:1px solid #ddd;padding-top:3px;font-size:5px;color:#888;text-align:right">Signature : ___________</div>
        </div>
      </div>`,
      fact_appel: `<div style="height:100%;background:#fff;font-family:Arial;overflow:hidden">
        <div style="background:${col};padding:6px 10px;display:flex;justify-content:space-between;align-items:center">
          <div style="color:#fff;font-size:8px;font-weight:700">AGENCE IMMO</div>
          <div style="background:rgba(255,255,255,0.2);padding:2px 6px;border-radius:3px"><div style="font-size:6px;color:#fff;font-weight:700">APPEL DE LOYER</div></div>
        </div>
        <div style="padding:6px 8px">
          <div style="background:${col}11;border-left:3px solid ${col};padding:4px 6px;margin-bottom:5px">
            <div style="font-size:7px;font-weight:700;color:${col}">AVIS D APPEL DE LOYER</div>
            <div style="font-size:5px;color:#888">Mois de Janvier 2024</div>
          </div>
          <div style="font-size:5.5px;color:#555;line-height:1.7">
            <div>A : {{locataire.nom}}</div>
            <div>Bien : {{bien.adresse}}</div>
          </div>
          <div style="margin-top:5px;background:#f5f5f5;padding:4px;border-radius:3px;display:flex;justify-content:space-between">
            <div style="font-size:6px;font-weight:700;color:#333">Montant a regler</div>
            <div style="font-size:7px;font-weight:900;color:${col}">{{loyer}} FCFA</div>
          </div>
        </div>
      </div>`,
      fact_recu: `<div style="height:100%;background:#fff;font-family:Arial;overflow:hidden;padding:6px">
        <div style="text-align:center;margin-bottom:5px">
          <div style="font-size:9px;font-weight:700;color:${col}">RECU DE PAIEMENT</div>
          <div style="width:30px;height:2px;background:${col};margin:3px auto"></div>
        </div>
        <div style="border:1px solid #eee;padding:5px;border-radius:4px">
          <div style="display:flex;justify-content:space-between;margin-bottom:3px">
            <span style="font-size:5.5px;color:#888">Recu de</span>
            <span style="font-size:5.5px;color:#333;font-weight:600">{{locataire.nom}}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:3px">
            <span style="font-size:5.5px;color:#888">Somme de</span>
            <span style="font-size:6px;color:${col};font-weight:700">{{loyer}} FCFA</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="font-size:5.5px;color:#888">Pour</span>
            <span style="font-size:5.5px;color:#333">Loyer {{date_debut}}</span>
          </div>
        </div>
        <div style="margin-top:5px;border-top:1px solid #ddd;padding-top:3px;display:flex;justify-content:space-between">
          <div style="font-size:5px;color:#aaa">Le Bailleur</div>
          <div style="font-size:5px;color:#aaa">____________</div>
        </div>
      </div>`,
      fact_pro: `<div style="height:100%;background:#fff;font-family:Arial;overflow:hidden">
        <div style="background:${col};padding:6px 10px;display:flex;justify-content:space-between;align-items:center">
          <div style="color:#fff;font-size:8px;font-weight:700">AGENCE IMMO</div>
          <div style="text-align:right"><div style="font-size:7px;font-weight:900;color:#fff">FACTURE</div><div style="font-size:5px;color:rgba(255,255,255,0.7)">N° 2024-001</div></div>
        </div>
        <div style="height:3px;background:linear-gradient(to right,${col},${col}44)"></div>
        <div style="padding:6px 8px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:5px">
            <div style="font-size:5.5px;color:#555;line-height:1.7"><div style="font-weight:700;color:#333;font-size:6px">FACTURER A</div><div>{{locataire.nom}}</div><div>{{bien.adresse}}</div></div>
            <div style="text-align:right;font-size:5.5px;color:#555;line-height:1.7"><div style="font-weight:700;color:#333;font-size:6px">DETAILS</div><div>Date: 01/01/2024</div><div>Ref: BAIL-001</div></div>
          </div>
          <div style="background:${col}11;border-left:2px solid ${col};padding:3px 5px">
            <div style="display:flex;justify-content:space-between"><span style="font-size:5.5px;color:#666">Total</span><span style="font-size:6px;font-weight:700;color:${col}">{{loyer}} FCFA</span></div>
          </div>
        </div>
      </div>`,
    }
    return fthumbs[tpl.id] || fthumbs.fact_moderne
  }

  const bthumbs = {
    azur: `<div style="height:100%;background:#fff;overflow:hidden;font-family:Arial">
      <div style="background:${col};height:42%;padding:8px 12px;display:flex;flex-direction:column;justify-content:space-between">
        <div style="display:flex;justify-content:space-between;align-items:center"><div style="background:rgba(255,255,255,0.2);border-radius:2px;padding:2px 6px;font-size:6px;font-weight:700;color:#fff">LOGO</div><div style="font-size:6px;color:rgba(255,255,255,0.7);text-align:right">+229 XX<br/>mail</div></div>
        <div style="font-size:11px;font-weight:900;color:#fff;letter-spacing:.5px">CONTRAT DE BAIL</div>
      </div>
      <div style="background:${col}dd;height:4px"></div>
      <div style="padding:8px 12px">${line(100)}${line(85)}${line(92)}${line(68)}</div>
    </div>`,
    qc: `<div style="height:100%;background:#fff;overflow:hidden;font-family:Arial">
      <div style="background:${col};padding:7px 10px;display:flex;justify-content:space-between;align-items:center">
        <div style="background:rgba(255,255,255,0.2);border-radius:2px;padding:2px 5px;font-size:6px;font-weight:700;color:#fff">LOGO</div>
        <div style="text-align:right"><div style="font-size:22px;font-weight:900;color:#fff;line-height:1">BAIL</div><div style="font-size:6px;color:rgba(255,255,255,0.85)">de logement</div></div>
      </div>
      <div style="background:#e8a200;padding:2px 8px"><div style="font-size:4.5px;font-weight:700;color:#fff">FORMULAIRE OBLIGATOIRE</div></div>
      <div style="padding:5px 8px;display:grid;grid-template-columns:1fr 1fr;gap:4px">
        <div style="border:1.5px solid ${col};padding:4px;border-radius:2px"><div style="font-size:5px;font-weight:700;color:${col};margin-bottom:3px">A - LOCATEUR</div>${line(100,"#ddd")}${line(100,"#ddd")}</div>
        <div style="border:1.5px solid ${col};padding:4px;border-radius:2px"><div style="font-size:5px;font-weight:700;color:${col};margin-bottom:3px">LOCATAIRE</div>${line(100,"#ddd")}${line(100,"#ddd")}</div>
      </div>
    </div>`,
    lettre: `<div style="height:100%;background:#fff;overflow:hidden;font-family:Georgia,serif;display:flex">
      <div style="width:6px;background:${col};flex-shrink:0"></div>
      <div style="flex:1;padding:8px 10px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div><div style="font-size:8px;font-weight:700;color:#111">AGENCE IMMO</div><div style="font-size:5.5px;color:#888;margin-top:1px">Cotonou</div></div>
          <div style="background:${col}22;border-radius:2px;padding:2px 5px;font-size:5.5px;font-weight:700;color:${col}">LOGO</div>
        </div>
        <div style="text-align:right;margin-bottom:6px"><div style="font-size:6.5px;font-weight:700;color:#222">DESTINATAIRE</div><div style="font-size:5px;color:#aaa">Adresse</div></div>
        <div style="font-size:6px;color:${col};font-weight:600;margin-bottom:4px">Objet : Contrat de bail</div>
        ${line(100)}${line(95)}${line(80)}${line(70)}
      </div>
    </div>`,
    legal: `<div style="height:100%;background:#fff;overflow:hidden;font-family:serif;position:relative">
      <div style="position:absolute;top:0;left:0;width:0;height:0;border-style:solid;border-width:52px 52px 0 0;border-color:${col} transparent transparent transparent"></div>
      <div style="position:absolute;top:0;right:0;width:0;height:0;border-style:solid;border-width:0 52px 52px 0;border-color:transparent ${col} transparent transparent"></div>
      <div style="position:absolute;bottom:0;left:0;width:0;height:0;border-style:solid;border-width:36px 0 0 36px;border-color:transparent transparent transparent ${col}"></div>
      <div style="position:absolute;bottom:0;right:0;width:0;height:0;border-style:solid;border-width:0 0 36px 36px;border-color:transparent transparent ${col} transparent"></div>
      <div style="padding:10px 14px;text-align:center;margin-top:8px">
        <div style="background:${col}22;border-radius:2px;padding:2px 7px;font-size:6px;font-weight:700;color:${col};display:inline-block;margin-bottom:4px">LOGO</div>
        <div style="font-size:11px;font-weight:900;color:${col};margin:4px 0 3px;letter-spacing:.8px">LEASE AGREEMENT</div>
        <div style="width:56px;height:2.5px;background:${col};margin:0 auto 8px"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px"><div style="border:1px solid #ccc;height:16px;border-radius:2px"></div><div style="border:1px solid #ccc;height:16px;border-radius:2px"></div></div>
      </div>
    </div>`,
    sidebar_v: `<div style="height:100%;background:#fff;overflow:hidden;font-family:Arial;display:flex">
      <div style="width:38%;background:${col};padding:8px;display:flex;flex-direction:column;justify-content:space-between">
        <div style="background:rgba(255,255,255,0.2);border-radius:2px;padding:2px 5px;font-size:6px;font-weight:700;color:#fff;display:inline-block">LOGO</div>
        <div><div style="font-size:8px;font-weight:700;color:#fff;line-height:1.3">CONTRAT<br/>DE BAIL</div><div style="width:20px;height:2px;background:rgba(255,255,255,0.5);margin-top:4px"></div></div>
        <div style="font-size:5px;color:rgba(255,255,255,0.6)">AGENCE IMMO</div>
      </div>
      <div style="flex:1;padding:8px 10px;display:flex;flex-direction:column;justify-content:center">${line(100)}${line(90)}${line(75)}${line(95)}${line(60)}${line(85)}</div>
    </div>`,
    diagonal: `<div style="height:100%;background:#fff;overflow:hidden;font-family:Arial;position:relative">
      <div style="position:absolute;top:0;left:0;right:0;height:100%;background:${col};clip-path:polygon(0 0,60% 0,40% 100%,0 100%)"></div>
      <div style="position:relative;padding:8px 12px;display:flex;height:100%;flex-direction:column;justify-content:space-between">
        <div style="background:rgba(255,255,255,0.2);border-radius:2px;padding:2px 5px;font-size:6px;font-weight:700;color:#fff;display:inline-block">LOGO</div>
        <div><div style="font-size:11px;font-weight:900;color:#fff">CONTRAT</div><div style="font-size:11px;font-weight:900;color:#fff">DE BAIL</div></div>
        <div style="margin-left:44%">${line(100)}${line(80)}${line(95)}</div>
      </div>
    </div>`,
    noir_or: `<div style="height:100%;background:#111;overflow:hidden;font-family:Georgia,serif">
      <div style="border-bottom:1px solid ${col};padding:8px 12px;display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:6px"><div style="width:22px;height:22px;border-radius:50%;border:1.5px solid ${col};display:flex;align-items:center;justify-content:center"><span style="font-size:10px;color:${col}">★</span></div><div style="font-size:6.5px;font-weight:700;color:${col};letter-spacing:1px">AGENCE</div></div>
        <div style="width:22px;height:22px;border-radius:50%;border:1.5px solid ${col};display:flex;align-items:center;justify-content:center"><span style="font-size:10px;color:${col}">★</span></div>
      </div>
      <div style="padding:8px 12px"><div style="text-align:center;border:1px solid ${col};padding:5px;margin-bottom:6px"><div style="font-size:10px;font-weight:700;color:${col};letter-spacing:2px">CONTRAT DE BAIL</div></div>
      <div style="height:2px;background:#222;margin-bottom:3px;width:100%"></div><div style="height:2px;background:#222;margin-bottom:3px;width:85%"></div><div style="height:2px;background:#222;width:92%"></div></div>
    </div>`,
    sidebar_g: `<div style="height:100%;background:#fff;overflow:hidden;font-family:Arial;display:flex">
      <div style="width:42%;background:${col};padding:8px;display:flex;flex-direction:column;gap:6px">
        <div style="background:rgba(255,255,255,0.2);border-radius:2px;padding:2px 5px;font-size:6px;font-weight:700;color:#fff;display:inline-block">LOGO</div>
        <div style="font-size:9px;font-weight:800;color:#fff;line-height:1.2;margin-top:4px">CONTRAT<br/>DE BAIL</div>
        <div style="background:rgba(255,255,255,0.15);border-radius:2px;padding:3px 5px"><div style="font-size:5px;color:rgba(255,255,255,0.9)">AGENCE IMMO</div></div>
        <div style="margin-top:auto;font-size:5px;color:rgba(255,255,255,0.6)">Cotonou</div>
      </div>
      <div style="flex:1;padding:8px 10px"><div style="font-size:7px;font-weight:700;color:${col};margin-bottom:5px;border-bottom:1px solid ${col};padding-bottom:3px">Informations</div>${line(100)}${line(85)}${line(95)}${line(70)}${line(90)}</div>
    </div>`,
    split: `<div style="height:100%;background:#fff;overflow:hidden;font-family:Arial">
      <div style="height:50%;background:${col};padding:8px 12px;display:flex;align-items:flex-end;justify-content:space-between">
        <div><div style="font-size:12px;font-weight:900;color:#fff">CONTRAT</div><div style="font-size:12px;font-weight:900;color:rgba(255,255,255,0.6)">DE BAIL</div></div>
        <div style="background:rgba(255,255,255,0.2);border-radius:2px;padding:2px 5px;font-size:6px;font-weight:700;color:#fff">LOGO</div>
      </div>
      <div style="height:50%;padding:8px 12px;display:flex;flex-direction:column;justify-content:center"><div style="font-size:6.5px;font-weight:700;color:#333;margin-bottom:5px">AGENCE IMMO</div>${line(100)}${line(80)}${line(92)}</div>
    </div>`,
    dark_exec: `<div style="height:100%;background:#0d1117;overflow:hidden;font-family:Arial">
      <div style="padding:8px 12px;border-bottom:1px solid #30363d;display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:7px;font-weight:700;color:#e6edf3">AGENCE IMMO</div>
        <div style="background:${col};border-radius:3px;padding:2px 6px"><div style="font-size:5px;font-weight:700;color:#fff">BAIL</div></div>
      </div>
      <div style="padding:10px 12px"><div style="font-size:11px;font-weight:900;color:${col};letter-spacing:.5px;margin-bottom:2px">CONTRAT DE BAIL</div><div style="font-size:5.5px;color:#8b949e;margin-bottom:8px">Document officiel</div>
      <div style="height:2px;background:#21262d;margin-bottom:3px;width:100%"></div><div style="height:2px;background:#21262d;margin-bottom:3px;width:88%"></div><div style="height:2px;background:#21262d;width:75%"></div></div>
    </div>`,
    marine: `<div style="height:100%;background:#fff;overflow:hidden;font-family:Georgia,serif">
      <div style="background:${col};padding:8px 12px;display:flex;justify-content:space-between;align-items:center">
        <div style="background:rgba(255,255,255,0.15);border-radius:2px;padding:2px 6px;font-size:6px;font-weight:700;color:#fff">LOGO</div>
        <div style="text-align:right"><div style="font-size:7px;color:rgba(255,255,255,0.8)">AGENCE IMMO</div><div style="font-size:5.5px;color:#c9a84c;font-style:italic">Cabinet Immobilier</div></div>
      </div>
      <div style="height:4px;background:linear-gradient(to right,#c9a84c,#f0d080,#c9a84c)"></div>
      <div style="padding:7px 12px"><div style="text-align:center;margin-bottom:5px"><div style="font-size:10px;font-weight:700;color:${col};letter-spacing:1px">CONTRAT DE BAIL</div><div style="display:flex;align-items:center;justify-content:center;gap:4px;margin-top:3px"><div style="height:1px;background:#c9a84c;width:22px"></div><div style="font-size:10px;color:#c9a84c">✦</div><div style="height:1px;background:#c9a84c;width:22px"></div></div></div>${line(100)}${line(88)}${line(76)}</div>
    </div>`,
    benin: `<div style="height:100%;background:#fff;overflow:hidden;font-family:Arial">
      <div style="height:5px;display:flex"><div style="flex:1;background:#008751"></div><div style="flex:1;background:#fcd116"></div><div style="flex:1;background:#e8112d"></div></div>
      <div style="padding:7px 10px;border-bottom:2px solid ${col};display:flex;justify-content:space-between;align-items:center">
        <div style="background:${col}22;border-radius:2px;padding:2px 5px;font-size:6px;font-weight:700;color:${col}">LOGO</div>
        <div style="text-align:center"><div style="font-size:7px;font-weight:700;color:${col}">AGENCE</div><div style="font-size:5px;color:#aaa">Agree MEHU</div></div>
        <div style="display:flex;flex-direction:column;width:14px;height:22px;border-radius:1px;overflow:hidden"><div style="flex:1;background:#008751"></div><div style="flex:1;background:#fcd116"></div><div style="flex:1;background:#e8112d"></div></div>
      </div>
      <div style="padding:6px 10px"><div style="text-align:center;font-size:9px;font-weight:700;color:${col};margin-bottom:4px">CONTRAT DE BAIL</div>${line(100)}${line(85)}${line(90)}</div>
    </div>`,
    minimal: `<div style="height:100%;background:#fff;overflow:hidden;font-family:Helvetica,Arial;padding:9px">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #111;padding-bottom:6px;margin-bottom:8px">
        <div><div style="font-size:8px;font-weight:700;color:#111">AGENCE IMMO</div></div>
        <div style="background:#11111122;border-radius:2px;padding:2px 5px;font-size:5.5px;font-weight:700;color:#111">LOGO</div>
      </div>
      <div style="font-size:10.5px;font-weight:700;color:#111;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px">Contrat de bail</div>
      <div style="width:18px;height:2px;background:#111;margin-bottom:7px"></div>
      ${line(100,"rgba(0,0,0,0.07)")}${line(86,"rgba(0,0,0,0.07)")}${line(95,"rgba(0,0,0,0.07)")}${line(70,"rgba(0,0,0,0.07)")}
    </div>`,
    gradient: `<div style="height:100%;background:linear-gradient(180deg,${col} 0%,#fff 55%);overflow:hidden;font-family:Arial">
      <div style="padding:8px 12px;display:flex;justify-content:space-between;align-items:center">
        <div style="background:rgba(255,255,255,0.2);border-radius:2px;padding:2px 6px;font-size:6px;font-weight:700;color:#fff">LOGO</div>
        <div style="font-size:6px;color:rgba(255,255,255,0.85);text-align:right">AGENCE</div>
      </div>
      <div style="padding:4px 12px"><div style="font-size:12px;font-weight:900;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.2)">CONTRAT</div><div style="font-size:12px;font-weight:900;color:rgba(255,255,255,0.85)">DE BAIL</div></div>
      <div style="padding:8px 12px;margin-top:4px">${line(100)}${line(85)}${line(92)}</div>
    </div>`,
    frame: `<div style="height:100%;background:#fff;overflow:hidden;font-family:Georgia,serif;padding:6px">
      <div style="border:3px solid ${col};height:calc(100% - 12px);padding:5px;position:relative">
        <div style="border:1px solid ${col}55;height:100%;padding:5px;display:flex;flex-direction:column">
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${col}33;padding-bottom:4px;margin-bottom:5px">
            <div style="background:${col}22;border-radius:2px;padding:1px 5px;font-size:5.5px;font-weight:700;color:${col}">LOGO</div>
            <div style="font-size:6px;color:#888">AGENCE</div>
          </div>
          <div style="text-align:center;flex:1;display:flex;flex-direction:column;justify-content:center">
            <div style="font-size:10px;font-weight:700;color:${col}">CONTRAT DE BAIL</div>
            <div style="width:32px;height:2px;background:${col};margin:4px auto"></div>
            ${line(90)}${line(75)}${line(85)}
          </div>
        </div>
      </div>
    </div>`,
  }
  return bthumbs[tpl.id] || bthumbs.azur
}

// ─── RENDER FULL (apercu A4) ─────────────────────────────────────────────────
function renderFull(tpl, modele, content) {
  const col  = modele.couleur || tpl.color
  const nom  = modele.nom_agence || "Agence Immobiliere"
  const sl   = modele.slogan || ""
  const adr  = modele.adresse || ""
  const tel  = modele.telephone || ""
  const mail = modele.email || ""
  const web  = modele.site_web || ""
  const pied = modele.pied_page || ""
  const logo = modele.logo_url || ""
  const sz   = parseInt(modele.taille_logo)||65
  const L    = logo ? `<img src="${logo}" style="height:${sz}px;width:auto;object-fit:contain"/>` : ""
  const cts  = [tel,mail,web].filter(Boolean).map(x=>`<div>${x}</div>`).join("")
  const foot = pied ? `<div style="padding:10px 32px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:10px;color:#aaa;margin-top:40px"><span>${nom}</span><span>${pied}</span><span>Page 1/1</span></div>` : ""
  const body = content || `<p style="color:#bbb;font-style:italic">Contenu a saisir dans l editeur...</p>`

  const headers = {
    azur: `<div style="background:${col};padding:22px 32px;display:flex;align-items:center;justify-content:space-between"><div style="display:flex;align-items:center;gap:14px">${L}<div><div style="font-size:22px;font-weight:700;color:#fff">${nom}</div>${sl?`<div style="font-size:12px;color:rgba(255,255,255,0.8);margin-top:2px">${sl}</div>`:""}</div></div><div style="text-align:right;font-size:12px;color:rgba(255,255,255,0.9);line-height:1.9">${cts}</div></div>${adr?`<div style="background:${col}22;padding:7px 32px;font-size:11px;color:#555;border-bottom:2px solid ${col}">${adr}</div>`:""}`,
    qc: `<div style="background:${col};padding:14px 24px;display:flex;align-items:center;justify-content:space-between"><div style="display:flex;align-items:center;gap:14px">${L}<div><div style="font-size:13px;color:rgba(255,255,255,0.9)">${nom}</div></div></div><div><div style="font-size:42px;font-weight:900;color:#fff;line-height:1">BAIL</div><div style="font-size:14px;color:rgba(255,255,255,0.85)">de logement</div></div></div><div style="background:#e8a200;padding:7px 24px"><span style="font-size:11px;font-weight:700;color:#fff">FORMULAIRE OBLIGATOIRE — EN DOUBLE EXEMPLAIRE</span></div><div style="padding:16px 24px;display:grid;grid-template-columns:1fr 1fr;gap:12px"><div style="border:1.5px solid ${col};padding:12px;border-radius:4px"><div style="font-size:11px;font-weight:700;color:${col};margin-bottom:8px">A — ENTRE LE LOCATEUR</div><div style="height:1px;background:#ddd;margin-bottom:6px"></div><div style="height:1px;background:#ddd;margin-bottom:6px"></div></div><div style="border:1.5px solid ${col};padding:12px;border-radius:4px"><div style="font-size:11px;font-weight:700;color:${col};margin-bottom:8px">ET LE LOCATAIRE</div><div style="height:1px;background:#ddd;margin-bottom:6px"></div><div style="height:1px;background:#ddd;margin-bottom:6px"></div></div></div>`,
    lettre: `<div style="padding:32px 40px 20px;display:flex;gap:0"><div style="width:6px;background:${col};margin-right:24px;border-radius:3px;flex-shrink:0"></div><div style="flex:1"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px"><div style="font-size:13px;color:#555;line-height:1.8"><div style="font-weight:700;font-size:16px;color:#222;margin-bottom:4px">${nom}</div>${adr?`<div>${adr}</div>`:""}<div>${tel}</div><div>${mail}</div></div>${L}</div><div style="text-align:right;margin-bottom:28px"><div style="font-weight:700;font-size:14px;color:#222">DESTINATAIRE</div><div style="font-size:13px;color:#666">Adresse complete</div></div><div style="font-size:13px;color:#555;margin-bottom:8px">Objet : <span style="color:${col};font-weight:600">Contrat de bail locatif</span></div><div style="font-size:14px;font-weight:700;color:#222;margin-bottom:16px">Monsieur / Madame,</div></div></div>`,
    marine: `<div style="background:${col};padding:20px 32px;display:flex;justify-content:space-between;align-items:center">${L}<div style="text-align:right"><div style="font-size:18px;font-weight:700;color:#fff">${nom}</div><div style="font-size:12px;color:#c9a84c;font-style:italic">${sl}</div></div></div><div style="height:4px;background:linear-gradient(to right,#c9a84c,#f0d080,#c9a84c)"></div>${adr?`<div style="padding:7px 32px;font-size:11px;color:#666">${adr} | ${tel}</div>`:""}`,
    benin: `<div style="height:5px;display:flex"><div style="flex:1;background:#008751"></div><div style="flex:1;background:#fcd116"></div><div style="flex:1;background:#e8112d"></div></div><div style="padding:16px 32px;display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid ${col}">${L}<div style="text-align:center"><div style="font-size:20px;font-weight:700;color:${col}">${nom}</div>${sl?`<div style="font-size:11px;color:#888">${sl}</div>`:""}<div style="font-size:10px;color:#aaa;margin-top:3px">Agence agree MEHU Benin</div></div><div style="display:flex;flex-direction:column;width:28px;height:46px;border-radius:2px;overflow:hidden"><div style="flex:1;background:#008751"></div><div style="flex:1;background:#fcd116"></div><div style="flex:1;background:#e8112d"></div></div></div>`,
  }
  const header = headers[tpl.id] || headers.azur
  const titleHtml = ["qc","lettre","sidebar_v"].includes(tpl.id) ? "" : `<div style="text-align:center;margin:28px 0 32px"><div style="font-size:18px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${col};border-bottom:2px solid ${col};display:inline-block;padding-bottom:6px">${tpl.type==="facture"?"FACTURE":"CONTRAT DE BAIL"}</div></div>`

  return `<div style="font-family:Arial,sans-serif;background:#fff;min-height:297mm;color:#333">${header}${titleHtml}<div style="padding:20px 32px"><div style="font-size:13.5px;line-height:1.9;color:#333">${body}</div></div>${foot}</div>`
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────────────────────
export default function ModelesDocuments() {
  const [agence, setAgence]         = useState(null)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [vue, setVue]               = useState("bibliotheque") // bibliotheque | mes_modeles | editeur
  const [filterType, setFilterType] = useState("tous")
  const [filterSearch, setFilterSearch] = useState("")
  const [mesModeles, setMesModeles] = useState([])  // modeles sauvegardes par l agence
  const [modeleActifId, setModeleActifId] = useState(null)
  const [enEdition, setEnEdition]   = useState(null)  // { tplId, nom, couleur, logo_url, ... }
  const [content, setContent]       = useState("")
  const [editorKey, setEditorKey]   = useState(0)
  const [quillReady, setQuillReady] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const quillRef     = useRef(null)
  const logoInputRef = useRef(null)

  useEffect(()=>{ initData() },[])
  useEffect(()=>{ if (vue==="editeur") { setTimeout(()=>loadQuill(),100) } },[vue, editorKey])

  const initData = async () => {
    setLoading(true)
    try {
      const {data:{user}} = await supabase.auth.getUser()
      const {data:agList} = await supabase.from("agences").select("*")
      const ag = agList?.find(a=>a.profile_id===user.id)||agList?.[0]
      setAgence(ag)
      if (!ag?.id) return
      const {data:p} = await supabase.from("parametres_organisation").select("*").eq("agence_id",ag.id).single()
      if (p) {
        setMesModeles(p.mes_modeles||[])
        setModeleActifId(p.modele_actif_id||null)
        // compat ancienne version
        if (p.modele_entete && (!p.mes_modeles || p.mes_modeles.length===0)) {
          const ev = p.modele_entete
          setMesModeles([{
            id:"modele_1", tplId: ev.selected_template||"azur",
            nom:"Mon modele", actif:true,
            couleur:ev.couleur_principale||"#0078d4",
            logo_url:ev.logo_url||ag.logo_url||"",
            nom_agence:ag.nom||"",
            slogan:ev.slogan||"",
            adresse:ev.adresse||ag.adresse||"",
            telephone:ev.telephone||ag.telephone||"",
            email:ev.email||ag.email||"",
            site_web:ev.site_web||ag.site_web||"",
            pied_page:ev.pied_page||"",
            taille_logo:ev.taille_logo||"65",
            content:ev.bail_content||"",
          }])
        }
      }
    } catch(e){console.error(e)}
    finally{setLoading(false)}
  }

  const loadQuill = () => {
    if (window.Quill){initQuill();return}
    if (!document.querySelector("#quill-css")){
      const l=document.createElement("link");l.id="quill-css";l.rel="stylesheet"
      l.href="https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.snow.min.css"
      document.head.appendChild(l)
    }
    const s=document.createElement("script")
    s.src="https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.min.js"
    s.onload=()=>initQuill()
    document.head.appendChild(s)
  }

  const initQuill = () => {
    setTimeout(()=>{
      const el=document.getElementById("quill-editor-zone")
      if (!el) return
      if (quillRef.current) { try{quillRef.current=null}catch(e){} }
      el.innerHTML=""
      quillRef.current=new window.Quill(el,{
        theme:"snow",placeholder:"Redigez le contenu ici...",
        modules:{toolbar:[[{header:[1,2,3,4,false]}],[{font:[]}],[{size:["small",false,"large","huge"]}],
          ["bold","italic","underline","strike"],[{color:[]},{background:[]}],[{align:[]}],
          [{list:"ordered"},{list:"bullet"}],[{indent:"-1"},{indent:"+1"}],
          ["blockquote"],["link","clean"]]}
      })
      if (content) quillRef.current.clipboard.dangerouslyPasteHTML(content)
      quillRef.current.on("text-change",()=>{setContent(quillRef.current.root.innerHTML)})
      setQuillReady(true)
    },400)
  }

  const ouvrirEditeur = (tpl, modeleExistant=null) => {
    const tplDef = BIBLIOTHEQUE.find(t=>t.id===tpl.id)||tpl
    const defaultContent = tplDef.type==="facture" ? DEFAULT_CONTENT_FACTURE : DEFAULT_CONTENT_BAIL
    if (modeleExistant) {
      setEnEdition({...modeleExistant, tplId:modeleExistant.tplId||tpl.id})
      setContent(modeleExistant.content||defaultContent)
    } else {
      const ag = agence||{}
      setEnEdition({
        id: null,
        tplId: tpl.id,
        nom: tpl.name + " — Personnalise",
        couleur: tpl.color,
        logo_url: ag.logo_url||"",
        nom_agence: ag.nom||"",
        slogan: "",
        adresse: ag.adresse||"",
        telephone: ag.telephone||"",
        email: ag.email||"",
        site_web: ag.site_web||"",
        pied_page: "",
        taille_logo: "65",
        content: defaultContent,
      })
      setContent(defaultContent)
    }
    quillRef.current=null
    setQuillReady(false)
    setEditorKey(k=>k+1)
    setVue("editeur")
  }

  const sauvegarderModele = async () => {
    if (!agence?.id || !enEdition) return
    setSaving(true)
    try {
      const modeleData = {...enEdition, content, updatedAt: new Date().toISOString()}
      let nouveauxModeles
      if (enEdition.id) {
        nouveauxModeles = mesModeles.map(m=>m.id===enEdition.id ? modeleData : m)
      } else {
        const newId = "modele_"+Date.now()
        modeleData.id = newId
        modeleData.createdAt = new Date().toISOString()
        nouveauxModeles = [...mesModeles, modeleData]
      }
      const {error} = await supabase.from("parametres_organisation").upsert({
        agence_id:agence.id,
        mes_modeles:nouveauxModeles,
        updated_at:new Date().toISOString(),
      },{onConflict:"agence_id"})
      if (error) throw error
      setMesModeles(nouveauxModeles)
      setEnEdition(prev=>({...prev,id:modeleData.id}))
      toast.success("Modele sauvegarde !")
    } catch(e){toast.error(e.message)}
    finally{setSaving(false)}
  }

  const activerModele = async (modele) => {
    if (!agence?.id) return
    const nouveauxModeles = mesModeles.map(m=>({...m,actif:m.id===modele.id}))
    const {error} = await supabase.from("parametres_organisation").upsert({
      agence_id:agence.id,
      mes_modeles:nouveauxModeles,
      modele_actif_id:modele.id,
      updated_at:new Date().toISOString(),
    },{onConflict:"agence_id"})
    if (error){toast.error(error.message);return}
    setMesModeles(nouveauxModeles)
    setModeleActifId(modele.id)
    toast.success(`"${modele.nom}" est maintenant le modele actif !`)
  }

  const supprimerModele = async (modele) => {
    if (!confirm(`Supprimer "${modele.nom}" ?`)) return
    const nouveauxModeles = mesModeles.filter(m=>m.id!==modele.id)
    await supabase.from("parametres_organisation").upsert({
      agence_id:agence.id,
      mes_modeles:nouveauxModeles,
      updated_at:new Date().toISOString(),
    },{onConflict:"agence_id"})
    setMesModeles(nouveauxModeles)
    toast.success("Modele supprime")
  }

  const handleLogoUpload = (file) => {
    if (!file) return
    if (file.size>3*1024*1024){toast.error("Logo trop lourd");return}
    setLogoUploading(true)
    const r=new FileReader()
    r.onload=(ev)=>{setEnEdition(prev=>({...prev,logo_url:ev.target.result}));setLogoUploading(false);toast.success("Logo charge !")}
    r.readAsDataURL(file)
  }

  const tplFiltered = BIBLIOTHEQUE.filter(t=>{
    const typeOk = filterType==="tous" || t.type===filterType
    const searchOk = !filterSearch || t.name.toLowerCase().includes(filterSearch.toLowerCase()) || t.cat.toLowerCase().includes(filterSearch.toLowerCase())
    return typeOk && searchOk
  })

  const currentTpl = enEdition ? (BIBLIOTHEQUE.find(t=>t.id===enEdition.tplId)||BIBLIOTHEQUE[0]) : BIBLIOTHEQUE[0]

  if (loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:400,color:"rgba(255,255,255,0.3)"}}>Chargement...</div>

  return (
    <>
      <style>{`
        .md-root{min-height:100%;animation:md-in 0.2s ease}
        @keyframes md-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        .md-topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px}
        .md-h1{font-size:22px;font-weight:700;color:#e6edf3;letter-spacing:-0.02em;margin-bottom:3px}
        .md-sub{font-size:13px;color:rgba(255,255,255,0.4)}
        .md-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:5px;font-size:13px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.6);font-family:Inter,sans-serif;transition:all 0.15s;white-space:nowrap}
        .md-btn:hover:not(:disabled){background:rgba(255,255,255,0.09);color:#e6edf3}
        .md-btn-p{background:#0078d4;border-color:#0078d4;color:#fff}.md-btn-p:hover{background:#006cc1}
        .md-btn-g{background:rgba(0,200,150,0.08);border-color:rgba(0,200,150,0.22);color:#00c896}
        .md-btn-y{background:rgba(245,158,11,0.08);border-color:rgba(245,158,11,0.22);color:#f59e0b}
        .md-btn-r{background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.22);color:#ef4444}
        .md-vues{display:flex;gap:2px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:7px;padding:3px;width:fit-content;margin-bottom:20px}
        .md-vue{padding:7px 18px;border-radius:5px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:none;font-family:Inter,sans-serif;color:rgba(255,255,255,0.45);transition:all 0.15s}
        .md-vue.on{background:rgba(255,255,255,0.1);color:#e6edf3}
        .md-filters{display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap}
        .md-ftab{padding:5px 14px;border-radius:100px;font-size:12.5px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.09);background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.45);font-family:Inter,sans-serif;transition:all 0.15s}
        .md-ftab.on{background:rgba(0,120,212,0.12);border-color:rgba(0,120,212,0.3);color:#4da6ff}
        .md-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px}
        .md-tcard{background:rgba(255,255,255,0.02);border:2px solid rgba(255,255,255,0.06);border-radius:12px;overflow:hidden;cursor:pointer;transition:all 0.2s}
        .md-tcard:hover{border-color:rgba(0,120,212,0.4);transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.35)}
        .md-tthumb{height:120px;overflow:hidden;position:relative}
        .md-tinfo{padding:10px 12px}
        .md-tname{font-size:12.5px;font-weight:600;color:#e6edf3;margin-bottom:1px}
        .md-tcat{font-size:10px;color:rgba(255,255,255,0.3);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.06em}
        .md-ttype{font-size:9.5px;padding:1px 7px;border-radius:100px;font-weight:600;margin-bottom:6px;display:inline-block}
        .md-tuse{width:100%;padding:7px;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;border:none;background:#0078d4;color:#fff;font-family:Inter,sans-serif;transition:all 0.15s}
        .md-tuse:hover{background:#006cc1}
        .md-editor-wrap{display:grid;grid-template-columns:260px 1fr 360px;gap:14px;align-items:start}
        .md-settings{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:10px;overflow:hidden}
        .md-shead{padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.07);font-size:13px;font-weight:600;color:#e6edf3}
        .md-sbody{padding:14px 16px;display:flex;flex-direction:column;gap:12px;max-height:calc(100vh - 200px);overflow-y:auto}
        .md-sbody::-webkit-scrollbar{width:3px}.md-sbody::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        .md-lbl{display:block;font-size:11.5px;font-weight:600;color:rgba(255,255,255,0.45);margin-bottom:5px}
        .md-inp{width:100%;padding:7px 10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:5px;font-family:Inter,sans-serif;font-size:13px;color:#e6edf3;outline:none;transition:border-color 0.15s;color-scheme:dark;box-sizing:border-box}
        .md-inp:focus{border-color:#0078d4}
        .md-logo-zone{border:2px dashed rgba(255,255,255,0.12);border-radius:7px;padding:12px;text-align:center;cursor:pointer;transition:all 0.2s}
        .md-logo-zone:hover{border-color:rgba(0,120,212,0.4);background:rgba(0,120,212,0.04)}
        .md-editor-panel{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:10px;overflow:hidden;min-height:500px}
        .md-ehead{padding:11px 15px;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between}
        .md-vars{display:flex;gap:5px;flex-wrap:wrap;padding:7px 10px;background:rgba(255,255,255,0.02);border-bottom:1px solid rgba(255,255,255,0.07)}
        .md-var{padding:2px 8px;border-radius:4px;font-size:10.5px;font-weight:600;background:rgba(108,99,255,0.1);border:1px solid rgba(108,99,255,0.25);color:#a78bfa;cursor:pointer;font-family:monospace}
        .md-var:hover{background:rgba(108,99,255,0.2)}
        .md-preview-panel{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:10px;overflow:hidden;position:sticky;top:16px}
        .md-prev-head{padding:9px 13px;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;justify-content:space-between;align-items:center}
        .md-prev-body{height:calc(100vh - 230px);overflow-y:auto;background:#f5f5f5}
        .md-mes-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
        .md-mes-card{background:rgba(255,255,255,0.02);border:1.5px solid rgba(255,255,255,0.07);border-radius:10px;overflow:hidden;transition:all 0.2s}
        .md-mes-card.actif{border-color:#00c896;box-shadow:0 0 0 2px rgba(0,200,150,0.15)}
        #quill-editor-zone{min-height:400px}
        .ql-toolbar.ql-snow{background:rgba(255,255,255,0.03);border:none;border-bottom:1px solid rgba(255,255,255,0.07)!important;padding:7px 10px}
        .ql-container.ql-snow{border:none!important;font-size:14px}
        .ql-editor{min-height:380px;padding:14px 18px;color:#333;background:#fff}
        .ql-toolbar .ql-stroke{stroke:rgba(255,255,255,0.5)!important}
        .ql-toolbar .ql-fill{fill:rgba(255,255,255,0.5)!important}
        .ql-toolbar .ql-picker-label{color:rgba(255,255,255,0.5)!important}
        .ql-toolbar button:hover .ql-stroke,.ql-toolbar .ql-active .ql-stroke{stroke:#0078d4!important}
        @media(max-width:1200px){.md-editor-wrap{grid-template-columns:240px 1fr}}
        @media(max-width:960px){.md-editor-wrap{grid-template-columns:1fr}.md-preview-panel{display:none}}
      `}</style>

      <div className="md-root">
        <div className="md-topbar">
          <div>
            <div className="md-h1">Modeles de Documents</div>
            <div className="md-sub">
              {vue==="bibliotheque" && `${tplFiltered.length} templates disponibles`}
              {vue==="mes_modeles" && `${mesModeles.length} modele${mesModeles.length!==1?"s":""} personnalise${mesModeles.length!==1?"s":""}`}
              {vue==="editeur" && `Edition : ${enEdition?.nom||"Nouveau modele"}`}
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            {vue==="editeur" && <>
              <button className="md-btn" onClick={()=>setVue("mes_modeles")}>← Mes modeles</button>
              <button className="md-btn md-btn-p" disabled={saving} onClick={sauvegarderModele}>{saving?"Sauvegarde...":"Sauvegarder"}</button>
            </>}
          </div>
        </div>

        <div className="md-vues">
          {[["bibliotheque","Bibliotheque"],["mes_modeles","Mes modeles"]].map(([k,l])=>(
            <button key={k} className={"md-vue"+(vue===k?" on":"")} onClick={()=>setVue(k)}>{l}</button>
          ))}
        </div>

        {/* ── BIBLIOTHEQUE ── */}
        {vue==="bibliotheque" && <>
          <div className="md-filters">
            <div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:6,padding:"6px 12px",marginRight:4}}>
              <svg width="13" height="13" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z"/></svg>
              <input value={filterSearch} onChange={e=>setFilterSearch(e.target.value)} placeholder="Rechercher..." style={{background:"none",border:"none",outline:"none",fontFamily:"Inter,sans-serif",fontSize:13,color:"#e6edf3",width:160}}/>
              {filterSearch&&<button onClick={()=>setFilterSearch("")} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.3)",fontSize:16,padding:0}}>×</button>}
            </div>
            {[["tous","Tous"],["bail","Bail"],["facture","Facture / Quittance"]].map(([v,l])=>(
              <button key={v} className={"md-ftab"+(filterType===v?" on":"")} onClick={()=>setFilterType(v)}>{l}</button>
            ))}
          </div>
          <div className="md-gallery">
            {tplFiltered.map(tpl=>(
              <div key={tpl.id} className="md-tcard">
                <div className="md-tthumb" dangerouslySetInnerHTML={{__html:mkThumb(tpl)}}/>
                <div className="md-tinfo">
                  <div className="md-tname">{tpl.name}</div>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                    <span className="md-ttype" style={{background:tpl.type==="facture"?"rgba(245,158,11,0.1)":"rgba(0,120,212,0.1)",color:tpl.type==="facture"?"#f59e0b":"#4da6ff",border:`1px solid ${tpl.type==="facture"?"rgba(245,158,11,0.2)":"rgba(0,120,212,0.2)"}`}}>{tpl.type==="facture"?"FACTURE":"BAIL"}</span>
                    <span className="md-tcat">{tpl.cat}</span>
                  </div>
                  <button className="md-tuse" onClick={()=>ouvrirEditeur(tpl)}>Personnaliser ce modele</button>
                </div>
              </div>
            ))}
          </div>
        </>}

        {/* ── MES MODELES ── */}
        {vue==="mes_modeles" && <>
          <div style={{marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.4)"}}>
              {modeleActifId ? `Modele actif : ${mesModeles.find(m=>m.id===modeleActifId)?.nom||"—"}` : "Aucun modele actif"}
            </div>
            <button className="md-btn md-btn-p" onClick={()=>setVue("bibliotheque")}>+ Ajouter depuis la bibliotheque</button>
          </div>
          {mesModeles.length===0 ? (
            <div style={{textAlign:"center",padding:"60px 20px",border:"1px dashed rgba(255,255,255,0.1)",borderRadius:12}}>
              <div style={{fontSize:36,marginBottom:12,opacity:0.3}}>📄</div>
              <div style={{fontSize:16,fontWeight:600,color:"rgba(255,255,255,0.4)",marginBottom:12}}>Aucun modele personnalise</div>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.25)",marginBottom:20}}>Choisissez un modele dans la bibliotheque et personnalisez-le</div>
              <button className="md-btn md-btn-p" style={{margin:"0 auto"}} onClick={()=>setVue("bibliotheque")}>Parcourir la bibliotheque</button>
            </div>
          ):(
            <div className="md-mes-grid">
              {mesModeles.map(modele=>{
                const tpl = BIBLIOTHEQUE.find(t=>t.id===modele.tplId)||BIBLIOTHEQUE[0]
                const isActif = modele.id===modeleActifId
                return (
                  <div key={modele.id} className={"md-mes-card"+(isActif?" actif":"")}>
                    <div style={{height:100,overflow:"hidden",cursor:"pointer"}} onClick={()=>ouvrirEditeur(tpl,modele)}
                      dangerouslySetInnerHTML={{__html:mkThumb({...tpl,color:modele.couleur||tpl.color})}}/>
                    <div style={{padding:"12px 14px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                        <span style={{fontSize:13.5,fontWeight:600,color:"#e6edf3",flex:1}}>{modele.nom}</span>
                        {isActif && <span style={{fontSize:10,padding:"2px 7px",borderRadius:"100px",background:"rgba(0,200,150,0.12)",color:"#00c896",fontWeight:700,border:"1px solid rgba(0,200,150,0.2)"}}>ACTIF</span>}
                      </div>
                      <div style={{fontSize:11.5,color:"rgba(255,255,255,0.3)",marginBottom:12}}>
                        {tpl.name} · {tpl.type==="facture"?"Facture":"Bail"} · Modifie {new Date(modele.updatedAt||modele.createdAt||Date.now()).toLocaleDateString("fr-FR")}
                      </div>
                      <div style={{display:"flex",gap:6}}>
                        <button className="md-btn" style={{flex:1,justifyContent:"center",padding:"7px"}} onClick={()=>ouvrirEditeur(tpl,modele)}>Modifier</button>
                        {!isActif && <button className="md-btn md-btn-g" style={{flex:1,justifyContent:"center",padding:"7px"}} onClick={()=>activerModele(modele)}>Activer</button>}
                        <button className="md-btn md-btn-r" style={{padding:"7px 10px"}} onClick={()=>supprimerModele(modele)}>✕</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>}

        {/* ── EDITEUR ── */}
        {vue==="editeur" && enEdition && (
          <div className="md-editor-wrap">
            <div className="md-settings">
              <div className="md-shead">Parametres du modele</div>
              <div className="md-sbody">
                <div>
                  <label className="md-lbl">Nom du modele</label>
                  <input className="md-inp" value={enEdition.nom||""} onChange={e=>setEnEdition(p=>({...p,nom:e.target.value}))}/>
                </div>
                <div>
                  <label className="md-lbl">Logo</label>
                  {enEdition.logo_url?(
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                      <img src={enEdition.logo_url} alt="" style={{height:40,width:"auto",objectFit:"contain",borderRadius:4,background:"rgba(255,255,255,0.05)",padding:3,border:"1px solid rgba(255,255,255,0.1)"}}/>
                      <div>
                        <button className="md-btn" style={{fontSize:11,padding:"3px 8px",marginBottom:3,display:"block"}} onClick={()=>logoInputRef.current?.click()}>{logoUploading?"...":"Changer"}</button>
                        <button className="md-btn" style={{fontSize:11,padding:"3px 8px",color:"#ef4444"}} onClick={()=>setEnEdition(p=>({...p,logo_url:""}))}>X</button>
                      </div>
                    </div>
                  ):(
                    <div className="md-logo-zone" onClick={()=>logoInputRef.current?.click()}>
                      <div style={{fontSize:20,marginBottom:3,opacity:0.3}}>+</div>
                      <div style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>{logoUploading?"Chargement...":"Uploader le logo"}</div>
                      <div style={{fontSize:11,color:"rgba(255,255,255,0.2)"}}>PNG JPG SVG max 3MB</div>
                    </div>
                  )}
                  <input ref={logoInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>e.target.files[0]&&handleLogoUpload(e.target.files[0])}/>
                </div>
                <div>
                  <label className="md-lbl">Couleur principale</label>
                  <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
                    <input type="color" value={enEdition.couleur||"#0078d4"} onChange={e=>setEnEdition(p=>({...p,couleur:e.target.value}))} style={{width:34,height:30,padding:2,borderRadius:4,border:"1px solid rgba(255,255,255,0.1)",background:"none",cursor:"pointer"}}/>
                    <input className="md-inp" value={enEdition.couleur||"#0078d4"} onChange={e=>setEnEdition(p=>({...p,couleur:e.target.value}))} style={{flex:1,fontFamily:"monospace",fontSize:12}}/>
                  </div>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                    {["#0078d4","#005a8e","#c0392b","#1b2a4a","#6b21a8","#059669","#b8860b","#e74c3c","#008751","#f39c12","#1a237e","#222222"].map(c=>(
                      <div key={c} onClick={()=>setEnEdition(p=>({...p,couleur:c}))} style={{width:20,height:20,borderRadius:4,background:c,cursor:"pointer",border:(enEdition.couleur||"#0078d4")===c?"2.5px solid #fff":"2px solid transparent"}}/>
                    ))}
                  </div>
                </div>
                <div><label className="md-lbl">Taille logo : {enEdition.taille_logo||"65"}px</label><input type="range" min="30" max="120" value={enEdition.taille_logo||"65"} onChange={e=>setEnEdition(p=>({...p,taille_logo:e.target.value}))} style={{width:"100%",cursor:"pointer",accentColor:"#0078d4"}}/></div>
                {[["nom_agence","Nom agence"],["slogan","Slogan"],["adresse","Adresse"],["telephone","Telephone"],["email","Email"],["site_web","Site web"],["pied_page","Pied de page"]].map(([k,l])=>(
                  <div key={k}><label className="md-lbl">{l}</label><input className="md-inp" value={enEdition[k]||""} onChange={e=>setEnEdition(p=>({...p,[k]:e.target.value}))}/></div>
                ))}
                <div style={{paddingTop:8,borderTop:"1px solid rgba(255,255,255,0.07)"}}>
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.35)",marginBottom:8}}>Template de base : <strong style={{color:"rgba(255,255,255,0.55)"}}>{currentTpl.name}</strong></div>
                  <button className="md-btn" style={{width:"100%",justifyContent:"center"}} onClick={()=>setVue("bibliotheque")}>Changer de template</button>
                </div>
              </div>
            </div>

            <div key={editorKey} className="md-editor-panel">
              <div className="md-ehead">
                <span style={{fontSize:13,fontWeight:600,color:"#e6edf3"}}>{enEdition.nom||"Nouveau modele"}</span>
                <button className="md-btn md-btn-g" style={{fontSize:11,padding:"4px 10px"}}
                  onClick={()=>{const def=currentTpl.type==="facture"?DEFAULT_CONTENT_FACTURE:DEFAULT_CONTENT_BAIL;if(quillRef.current){quillRef.current.clipboard.dangerouslyPasteHTML(def);setContent(def)}}}>
                  Contenu type
                </button>
              </div>
              <div className="md-vars">
                <span style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginRight:4}}>Variables :</span>
                {["{{locataire.nom}}","{{proprietaire.nom}}","{{bien.adresse}}","{{loyer}}","{{date_debut}}","{{date_fin}}","{{caution}}","{{duree_mois}}"].map(v=>(
                  <span key={v} className="md-var" onClick={()=>{if(quillRef.current){const r=quillRef.current.getSelection();quillRef.current.insertText(r?r.index:0,v)}}}>{v}</span>
                ))}
              </div>
              <div id="quill-editor-zone" style={{background:"#fff"}}/>
            </div>

            <div className="md-preview-panel">
              <div className="md-prev-head">
                <span style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.5)"}}>Apercu</span>
                <span style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>{currentTpl.name}</span>
              </div>
              <div className="md-prev-body">
                <div style={{transform:"scale(0.52)",transformOrigin:"top left",width:"192.3%"}}
                  dangerouslySetInnerHTML={{__html:renderFull(currentTpl,enEdition,content)}}/>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
