import { useState, useEffect, useRef } from "react"
import { supabase } from "../../../lib/supabase"
import toast from "react-hot-toast"

const TEMPLATES = [
  { id:"azur",       name:"Azur Moderne",       cat:"Contemporain",  color:"#0078d4" },
  { id:"qc",         name:"Officiel Quebec",     cat:"Formulaire",    color:"#005a8e" },
  { id:"lettre",     name:"Lettre Pro",          cat:"Courrier",      color:"#2d6a4f" },
  { id:"legal",      name:"Legal Corners",       cat:"Juridique",     color:"#1b2a4a" },
  { id:"sidebar_v",  name:"Sidebar Violet",      cat:"Corporate",     color:"#6b21a8" },
  { id:"diagonal",   name:"Diagonal Rouge",      cat:"Dynamique",     color:"#c0392b" },
  { id:"noir_or",    name:"Noir et Or",          cat:"Luxe",          color:"#b8860b" },
  { id:"sidebar_g",  name:"Emeraude Sidebar",    cat:"Nature",        color:"#059669" },
  { id:"split",      name:"Split Bicolore",      cat:"Moderne",       color:"#0f4c81" },
  { id:"dark_exec",  name:"Executive Sombre",    cat:"Premium",       color:"#00bcd4" },
  { id:"geo_red",    name:"Geometrique",         cat:"Design",        color:"#e74c3c" },
  { id:"marine",     name:"Luxe Marine Or",      cat:"Cabinet",       color:"#1a237e" },
  { id:"pastel",     name:"Pastel Elegant",      cat:"Doux",          color:"#8e44ad" },
  { id:"benin",      name:"Standard Benin",      cat:"Local",         color:"#008751" },
  { id:"gradient",   name:"Degrade Premium",     cat:"Contemporain",  color:"#f39c12" },
  { id:"circle",     name:"Cercle Accent",       cat:"Canva Style",   color:"#16a085" },
  { id:"tricolor",   name:"Bandeau Tricolore",   cat:"Officiel",      color:"#003189" },
  { id:"frame",      name:"Cadre Double",        cat:"Classique",     color:"#795548" },
  { id:"minimal",    name:"Minimaliste Total",   cat:"Epure",         color:"#222222" },
  { id:"vierge",     name:"Page Vierge",         cat:"Libre",         color:"#aaaaaa" },
]

function mkThumb(id, col, nom, logo) {
  const L = logo
    ? '<img src="'+logo+'" style="height:22px;width:auto;object-fit:contain;max-width:60px"/>'
    : '<div style="background:rgba(255,255,255,0.22);border-radius:3px;padding:3px 7px;font-size:7px;font-weight:800;color:#fff;letter-spacing:.5px">LOGO</div>'
  const LD = logo
    ? '<img src="'+logo+'" style="height:22px;width:auto;object-fit:contain;max-width:60px"/>'
    : '<div style="background:'+col+'22;border-radius:3px;padding:3px 7px;font-size:7px;font-weight:800;color:'+col+';letter-spacing:.5px">LOGO</div>'
  const line = (w,op)=>'<div style="height:3px;background:'+(op||'rgba(0,0,0,0.08)')+';border-radius:2px;margin-bottom:4px;width:'+w+'%"></div>'
  const wline = (w)=>'<div style="height:3px;background:rgba(255,255,255,0.25);border-radius:2px;margin-bottom:4px;width:'+w+'%"></div>'

  const T = {
    azur: `
      <div style="height:100%;background:#fff;overflow:hidden;font-family:Arial">
        <div style="background:${col};height:42%;padding:8px 12px;display:flex;flex-direction:column;justify-content:space-between">
          <div style="display:flex;justify-content:space-between;align-items:center">${L}<div style="font-size:7px;color:rgba(255,255,255,0.7);text-align:right">+229 XX<br/>mail@ag</div></div>
          <div style="font-size:11px;font-weight:900;color:#fff;letter-spacing:.5px">CONTRAT DE BAIL</div>
        </div>
        <div style="background:${col}ee;height:5px"></div>
        <div style="padding:8px 12px">${line(100)}${line(85)}${line(92)}${line(68)}</div>
      </div>`,

    qc: `
      <div style="height:100%;background:#fff;overflow:hidden;font-family:Arial">
        <div style="background:${col};padding:7px 10px;display:flex;justify-content:space-between;align-items:center">
          <div>${L}<div style="font-size:5px;color:rgba(255,255,255,0.7);margin-top:2px">www.rdl.gouv.qc.ca</div></div>
          <div style="text-align:right"><div style="font-size:22px;font-weight:900;color:#fff;line-height:1">BAIL</div><div style="font-size:7px;color:rgba(255,255,255,0.85)">de logement</div></div>
        </div>
        <div style="background:#e8a200;padding:2px 8px"><div style="font-size:5px;font-weight:700;color:#fff">FORMULAIRE OBLIGATOIRE — EN DOUBLE EXEMPLAIRE</div></div>
        <div style="padding:5px 8px;display:grid;grid-template-columns:1fr 1fr;gap:4px">
          <div style="border:1.5px solid ${col};padding:4px;border-radius:2px">
            <div style="font-size:5.5px;font-weight:700;color:${col};margin-bottom:3px">A - LOCATEUR</div>
            ${line(100,"#ddd")}${line(100,"#ddd")}
          </div>
          <div style="border:1.5px solid ${col};padding:4px;border-radius:2px">
            <div style="font-size:5.5px;font-weight:700;color:${col};margin-bottom:3px">ET LOCATAIRE</div>
            ${line(100,"#ddd")}${line(100,"#ddd")}
          </div>
        </div>
      </div>`,

    lettre: `
      <div style="height:100%;background:#fff;overflow:hidden;font-family:Georgia,serif;display:flex">
        <div style="width:6px;background:${col};flex-shrink:0"></div>
        <div style="flex:1;padding:8px 10px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <div>
              <div style="font-size:8px;font-weight:700;color:#111">${nom}</div>
              <div style="font-size:5.5px;color:#888;margin-top:1px">Cotonou, Bénin · +229 XX XX</div>
            </div>
            ${LD}
          </div>
          <div style="text-align:right;margin-bottom:6px">
            <div style="font-size:6.5px;font-weight:700;color:#222">DESTINATAIRE</div>
            <div style="font-size:5.5px;color:#aaa">Adresse complete</div>
          </div>
          <div style="font-size:6px;color:${col};font-weight:600;margin-bottom:4px">Objet : Contrat de bail</div>
          ${line(100)}${line(95)}${line(80)}${line(70)}
        </div>
      </div>`,

    legal: `
      <div style="height:100%;background:#fff;overflow:hidden;font-family:serif;position:relative">
        <div style="position:absolute;top:0;left:0;width:0;height:0;border-style:solid;border-width:52px 52px 0 0;border-color:${col} transparent transparent transparent"></div>
        <div style="position:absolute;top:0;right:0;width:0;height:0;border-style:solid;border-width:0 52px 52px 0;border-color:transparent ${col} transparent transparent"></div>
        <div style="position:absolute;bottom:0;left:0;width:0;height:0;border-style:solid;border-width:36px 0 0 36px;border-color:transparent transparent transparent ${col}"></div>
        <div style="position:absolute;bottom:0;right:0;width:0;height:0;border-style:solid;border-width:0 0 36px 36px;border-color:transparent transparent ${col} transparent"></div>
        <div style="padding:10px 14px;text-align:center;margin-top:8px">
          ${LD}
          <div style="font-size:11px;font-weight:900;color:${col};margin:6px 0 3px;letter-spacing:.8px">LEASE AGREEMENT</div>
          <div style="width:56px;height:2.5px;background:${col};margin:0 auto 8px"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">
            <div style="border:1px solid #ccc;height:18px;border-radius:2px"></div>
            <div style="border:1px solid #ccc;height:18px;border-radius:2px"></div>
          </div>
        </div>
      </div>`,

    sidebar_v: `
      <div style="height:100%;background:#fff;overflow:hidden;font-family:Arial;display:flex">
        <div style="width:38%;background:${col};padding:8px;display:flex;flex-direction:column;justify-content:space-between">
          ${L}
          <div>
            <div style="font-size:8px;font-weight:700;color:#fff;line-height:1.3">CONTRAT<br/>DE BAIL</div>
            <div style="width:20px;height:2px;background:rgba(255,255,255,0.5);margin-top:4px"></div>
          </div>
          <div style="font-size:5px;color:rgba(255,255,255,0.6)">${nom}</div>
        </div>
        <div style="flex:1;padding:8px 10px;display:flex;flex-direction:column;justify-content:center">
          ${line(100)}${line(90)}${line(75)}${line(95)}${line(60)}${line(85)}
        </div>
      </div>`,

    diagonal: `
      <div style="height:100%;background:#fff;overflow:hidden;font-family:Arial;position:relative">
        <div style="position:absolute;top:0;left:0;right:0;height:100%;background:${col};clip-path:polygon(0 0,60% 0,40% 100%,0 100%)"></div>
        <div style="position:relative;padding:8px 12px;display:flex;height:100%;flex-direction:column;justify-content:space-between">
          <div style="display:flex;justify-content:space-between">
            ${L}
            <div style="font-size:6px;color:#333;text-align:right;margin-left:auto">+229 XX XX<br/>mail@ag.bj</div>
          </div>
          <div>
            <div style="font-size:11px;font-weight:900;color:#fff">CONTRAT</div>
            <div style="font-size:11px;font-weight:900;color:#fff">DE BAIL</div>
          </div>
          <div style="margin-left:44%">${line(100)}${line(80)}${line(95)}</div>
        </div>
      </div>`,

    noir_or: `
      <div style="height:100%;background:#111;overflow:hidden;font-family:Georgia,serif">
        <div style="border-bottom:1px solid ${col};padding:8px 12px;display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex;align-items:center;gap:6px">
            <div style="width:22px;height:22px;border-radius:50%;border:1.5px solid ${col};display:flex;align-items:center;justify-content:center"><span style="font-size:10px;color:${col}">★</span></div>
            <div style="font-size:6.5px;font-weight:700;color:${col};letter-spacing:1px">${nom}</div>
          </div>
          <div style="width:22px;height:22px;border-radius:50%;border:1.5px solid ${col};display:flex;align-items:center;justify-content:center"><span style="font-size:10px;color:${col}">★</span></div>
        </div>
        <div style="padding:8px 12px">
          <div style="text-align:center;border:1px solid ${col};padding:5px;margin-bottom:6px">
            <div style="font-size:10px;font-weight:700;color:${col};letter-spacing:2px">CONTRAT DE BAIL</div>
          </div>
          <div style="height:2px;background:#222;margin-bottom:3px;width:100%"></div>
          <div style="height:2px;background:#222;margin-bottom:3px;width:85%"></div>
          <div style="height:2px;background:#222;width:92%"></div>
        </div>
      </div>`,

    sidebar_g: `
      <div style="height:100%;background:#fff;overflow:hidden;font-family:Arial;display:flex">
        <div style="width:42%;background:${col};padding:8px;display:flex;flex-direction:column;gap:6px">
          ${L}
          <div style="font-size:9px;font-weight:800;color:#fff;line-height:1.2;margin-top:4px">CONTRAT<br/>DE BAIL</div>
          <div style="background:rgba(255,255,255,0.2);border-radius:2px;padding:3px 5px">
            <div style="font-size:5px;color:rgba(255,255,255,0.9)">${nom}</div>
          </div>
          <div style="margin-top:auto;font-size:5px;color:rgba(255,255,255,0.6)">+229 · mail</div>
        </div>
        <div style="flex:1;padding:8px 10px">
          <div style="font-size:7px;font-weight:700;color:${col};margin-bottom:5px;border-bottom:1px solid ${col};padding-bottom:3px">Informations</div>
          ${line(100)}${line(85)}${line(95)}${line(70)}${line(90)}
        </div>
      </div>`,

    split: `
      <div style="height:100%;background:#fff;overflow:hidden;font-family:Arial">
        <div style="height:50%;background:${col};padding:8px 12px;display:flex;align-items:flex-end;justify-content:space-between">
          <div><div style="font-size:12px;font-weight:900;color:#fff">CONTRAT</div><div style="font-size:12px;font-weight:900;color:rgba(255,255,255,0.6)">DE BAIL</div></div>
          ${L}
        </div>
        <div style="height:50%;padding:8px 12px;display:flex;flex-direction:column;justify-content:center">
          <div style="font-size:6.5px;font-weight:700;color:#333;margin-bottom:5px">${nom}</div>
          ${line(100)}${line(80)}${line(92)}
        </div>
      </div>`,

    dark_exec: `
      <div style="height:100%;background:#0d1117;overflow:hidden;font-family:Arial">
        <div style="padding:8px 12px;border-bottom:1px solid #30363d;display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:7px;font-weight:700;color:#e6edf3">${nom}</div>
          <div style="background:${col};border-radius:3px;padding:2px 6px"><div style="font-size:5px;font-weight:700;color:#fff">BAIL</div></div>
        </div>
        <div style="padding:10px 12px">
          <div style="font-size:11px;font-weight:900;color:${col};letter-spacing:.5px;margin-bottom:2px">CONTRAT DE BAIL</div>
          <div style="font-size:5.5px;color:#8b949e;margin-bottom:8px">Document officiel · ${nom}</div>
          <div style="height:2px;background:#21262d;margin-bottom:3px;width:100%"></div>
          <div style="height:2px;background:#21262d;margin-bottom:3px;width:88%"></div>
          <div style="height:2px;background:#21262d;width:75%"></div>
        </div>
      </div>`,

    geo_red: `
      <div style="height:100%;background:#fff;overflow:hidden;font-family:Arial;position:relative">
        <div style="position:absolute;top:-20px;right:-20px;width:80px;height:80px;border-radius:50%;background:${col}22"></div>
        <div style="position:absolute;bottom:-15px;left:-15px;width:60px;height:60px;border-radius:50%;background:${col}15"></div>
        <div style="position:absolute;top:15px;right:15px;width:30px;height:30px;border-radius:50%;background:${col}"></div>
        <div style="padding:8px 12px;position:relative">
          <div style="font-size:6.5px;font-weight:700;color:#333;margin-bottom:2px">${nom}</div>
          <div style="font-size:11px;font-weight:900;color:${col};margin-bottom:2px">CONTRAT</div>
          <div style="font-size:11px;font-weight:900;color:#222">DE BAIL</div>
          <div style="width:28px;height:3px;background:${col};border-radius:2px;margin:5px 0"></div>
          ${line(85)}${line(100)}${line(72)}
        </div>
      </div>`,

    marine: `
      <div style="height:100%;background:#fff;overflow:hidden;font-family:Georgia,serif">
        <div style="background:${col};padding:8px 12px;display:flex;justify-content:space-between;align-items:center">
          ${L}
          <div style="text-align:right"><div style="font-size:7px;color:rgba(255,255,255,0.8)">${nom}</div><div style="font-size:5.5px;color:#c9a84c;font-style:italic">Cabinet Immobilier</div></div>
        </div>
        <div style="height:4px;background:linear-gradient(to right,#c9a84c,#f0d080,#c9a84c)"></div>
        <div style="padding:7px 12px">
          <div style="text-align:center;margin-bottom:5px">
            <div style="font-size:10px;font-weight:700;color:${col};letter-spacing:1px">CONTRAT DE BAIL</div>
            <div style="display:flex;align-items:center;justify-content:center;gap:4px;margin-top:3px">
              <div style="height:1px;background:#c9a84c;width:22px"></div>
              <div style="font-size:10px;color:#c9a84c">✦</div>
              <div style="height:1px;background:#c9a84c;width:22px"></div>
            </div>
          </div>
          ${line(100)}${line(88)}${line(76)}
        </div>
      </div>`,

    pastel: `
      <div style="height:100%;background:linear-gradient(135deg,#fdf4ff 0%,#ede9fe 100%);overflow:hidden;font-family:Arial">
        <div style="padding:8px 12px;display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid ${col}">
          ${LD}
          <div style="background:${col};border-radius:20px;padding:3px 10px"><div style="font-size:6px;font-weight:700;color:#fff">BAIL</div></div>
        </div>
        <div style="padding:8px 12px">
          <div style="font-size:10px;font-weight:800;color:${col};margin-bottom:4px">CONTRAT DE BAIL</div>
          <div style="font-size:5.5px;color:#888;margin-bottom:6px">${nom}</div>
          <div style="height:3px;background:${col}33;border-radius:2px;margin-bottom:3px;width:100%"></div>
          <div style="height:3px;background:${col}33;border-radius:2px;margin-bottom:3px;width:82%"></div>
          <div style="height:3px;background:${col}33;border-radius:2px;width:95%"></div>
        </div>
      </div>`,

    benin: `
      <div style="height:100%;background:#fff;overflow:hidden;font-family:Arial">
        <div style="height:5px;display:flex"><div style="flex:1;background:#008751"></div><div style="flex:1;background:#fcd116"></div><div style="flex:1;background:#e8112d"></div></div>
        <div style="padding:7px 10px;border-bottom:2px solid ${col};display:flex;justify-content:space-between;align-items:center">
          ${LD}
          <div style="text-align:center"><div style="font-size:7px;font-weight:700;color:${col}">${nom}</div><div style="font-size:5px;color:#aaa">Agence Agree MEHU</div></div>
          <div style="display:flex;flex-direction:column;width:14px;height:22px;border-radius:1px;overflow:hidden"><div style="flex:1;background:#008751"></div><div style="flex:1;background:#fcd116"></div><div style="flex:1;background:#e8112d"></div></div>
        </div>
        <div style="padding:6px 10px">
          <div style="text-align:center;font-size:9px;font-weight:700;color:${col};margin-bottom:4px">CONTRAT DE BAIL</div>
          ${line(100)}${line(85)}${line(90)}
        </div>
      </div>`,

    gradient: `
      <div style="height:100%;background:linear-gradient(180deg,${col} 0%,#fff 55%);overflow:hidden;font-family:Arial">
        <div style="padding:8px 12px;display:flex;justify-content:space-between;align-items:center">
          ${L}
          <div style="font-size:6px;color:rgba(255,255,255,0.85);text-align:right">${nom}</div>
        </div>
        <div style="padding:4px 12px">
          <div style="font-size:12px;font-weight:900;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.2)">CONTRAT</div>
          <div style="font-size:12px;font-weight:900;color:rgba(255,255,255,0.85)">DE BAIL</div>
        </div>
        <div style="padding:8px 12px;margin-top:4px">
          ${line(100)}${line(85)}${line(92)}
        </div>
      </div>`,

    circle: `
      <div style="height:100%;background:#fff;overflow:hidden;font-family:Arial;position:relative">
        <div style="position:absolute;top:-25px;left:-25px;width:90px;height:90px;border-radius:50%;background:${col}"></div>
        <div style="position:absolute;bottom:-20px;right:-20px;width:70px;height:70px;border-radius:50%;background:${col}22"></div>
        <div style="padding:10px 12px;position:relative">
          <div style="margin-bottom:2px">${LD}</div>
          <div style="font-size:11px;font-weight:900;color:#222;margin-top:8px">CONTRAT<br/>DE BAIL</div>
          <div style="width:24px;height:3px;background:${col};border-radius:2px;margin:5px 0"></div>
          <div style="font-size:6px;color:#888;margin-bottom:6px">${nom}</div>
          ${line(90)}${line(75)}${line(100)}
        </div>
      </div>`,

    tricolor: `
      <div style="height:100%;background:#fff;overflow:hidden;font-family:Arial">
        <div style="display:flex;height:14px">
          <div style="flex:1;background:#002395"></div>
          <div style="flex:1;background:#fff;border-top:1px solid #ddd;border-bottom:1px solid #ddd"></div>
          <div style="flex:1;background:#ED2939"></div>
        </div>
        <div style="padding:6px 10px;border-bottom:2px solid ${col};display:flex;justify-content:space-between;align-items:center">
          ${LD}
          <div style="text-align:center"><div style="font-size:7px;font-weight:700;color:${col}">${nom}</div><div style="font-size:5px;color:#aaa">Agence Immobiliere Officielle</div></div>
        </div>
        <div style="padding:7px 10px;text-align:center">
          <div style="font-size:10px;font-weight:800;color:${col}">CONTRAT DE BAIL</div>
          <div style="font-size:5.5px;color:#aaa;margin:2px 0 5px">Convention locative — Droit OHADA</div>
          ${line(100)}${line(82)}${line(90)}
        </div>
      </div>`,

    frame: `
      <div style="height:100%;background:#fff;overflow:hidden;font-family:Georgia,serif;padding:6px">
        <div style="border:3px solid ${col};height:calc(100% - 12px);padding:5px;position:relative">
          <div style="border:1px solid ${col}55;height:100%;padding:5px;display:flex;flex-direction:column">
            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${col}33;padding-bottom:4px;margin-bottom:5px">
              ${LD}
              <div style="font-size:6px;color:#888">${nom}</div>
            </div>
            <div style="text-align:center;flex:1;display:flex;flex-direction:column;justify-content:center">
              <div style="font-size:10px;font-weight:700;color:${col}">CONTRAT DE BAIL</div>
              <div style="width:32px;height:2px;background:${col};margin:4px auto"></div>
              ${line(90)}${line(75)}${line(85)}
            </div>
          </div>
        </div>
      </div>`,

    minimal: `
      <div style="height:100%;background:#fff;overflow:hidden;font-family:Helvetica,Arial;padding:9px">
        <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #111;padding-bottom:6px;margin-bottom:8px">
          <div><div style="font-size:8px;font-weight:700;color:#111;letter-spacing:.3px">${nom}</div></div>
          ${LD}
        </div>
        <div style="font-size:10.5px;font-weight:700;color:#111;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px">Contrat de bail</div>
        <div style="width:18px;height:2px;background:#111;margin-bottom:7px"></div>
        ${line(100,"rgba(0,0,0,0.07)")}${line(86,"rgba(0,0,0,0.07)")}${line(95,"rgba(0,0,0,0.07)")}${line(70,"rgba(0,0,0,0.07)")}
      </div>`,

    vierge: `
      <div style="height:100%;background:#f8f8f8;overflow:hidden;display:flex;align-items:center;justify-content:center;flex-direction:column;border:2px dashed #ccc">
        <div style="width:36px;height:36px;border-radius:50%;border:2.5px solid #ccc;display:flex;align-items:center;justify-content:center;margin-bottom:6px">
          <div style="font-size:20px;color:#ccc;line-height:1;margin-top:-2px">+</div>
        </div>
        <div style="font-size:7.5px;font-weight:700;color:#bbb;letter-spacing:.8px">PAGE VIERGE</div>
        <div style="font-size:6px;color:#ccc;margin-top:3px">Personnaliser librement</div>
      </div>`,
  }
  return T[id] || T.azur
}

function renderFull(tpl, e, content) {
  const col = e.couleur_principale || tpl.color || "#0078d4"
  const nom = e.nom_agence || "Agence Immobiliere"
  const sl = e.slogan || ""
  const adr = e.adresse || ""
  const tel = e.telephone || ""
  const mail = e.email || ""
  const web = e.site_web || ""
  const pied = e.pied_page || ""
  const logo = e.logo_url || ""
  const sz = parseInt(e.taille_logo)||65
  const L = logo ? '<img src="'+logo+'" style="height:'+sz+'px;width:auto;object-fit:contain"/>' : ""
  const contacts = [tel,mail,web].filter(Boolean).map(x=>"<div>"+x+"</div>").join("")
  const footerHtml = pied ? '<div style="padding:10px 32px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:10px;color:#aaa;margin-top:40px"><span>'+nom+"</span><span>"+pied+"</span><span>Page 1/1</span></div>" : ""
  const body = content || '<p style="color:#bbb;font-style:italic">Contenu du bail a saisir dans l editeur...</p>'

  const headers = {
    azur: '<div style="background:'+col+';padding:22px 32px;display:flex;align-items:center;justify-content:space-between">'+
      '<div style="display:flex;align-items:center;gap:14px">'+L+'<div><div style="font-size:22px;font-weight:700;color:#fff">'+nom+'</div>'+(sl?'<div style="font-size:12px;color:rgba(255,255,255,0.8);margin-top:2px">'+sl+'</div>':'')+'</div></div>'+
      '<div style="text-align:right;font-size:12px;color:rgba(255,255,255,0.9);line-height:1.9">'+contacts+'</div></div>'+
      (adr?'<div style="background:'+col+'22;padding:7px 32px;font-size:11px;color:#555;border-bottom:2px solid '+col+'">'+adr+'</div>':""),

    qc: '<div style="background:'+col+';padding:14px 24px;display:flex;align-items:center;justify-content:space-between">'+
      '<div style="display:flex;align-items:center;gap:14px">'+L+'<div><div style="font-size:13px;color:rgba(255,255,255,0.9)">'+nom+'</div>'+(adr?'<div style="font-size:11px;color:rgba(255,255,255,0.7)">'+adr+'</div>':'')+'</div></div>'+
      '<div style="text-align:right"><div style="font-size:42px;font-weight:900;color:#fff;line-height:1">BAIL</div><div style="font-size:14px;color:rgba(255,255,255,0.85)">de logement</div></div></div>'+
      '<div style="background:#e8a200;padding:7px 24px;display:flex;justify-content:space-between"><span style="font-size:11px;font-weight:700;color:#fff">FORMULAIRE OBLIGATOIRE — EN DOUBLE EXEMPLAIRE</span><span style="font-size:11px;color:rgba(255,255,255,0.8)">'+tel+' | '+mail+'</span></div>'+
      '<div style="padding:16px 24px"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div style="border:1.5px solid '+col+';padding:12px;border-radius:4px"><div style="font-size:11px;font-weight:700;color:'+col+';margin-bottom:8px">A — ENTRE LE LOCATEUR</div><div style="height:1px;background:#ddd;margin-bottom:6px"></div><div style="height:1px;background:#ddd;margin-bottom:6px"></div><div style="height:1px;background:#ddd"></div></div>'+
      '<div style="border:1.5px solid '+col+';padding:12px;border-radius:4px"><div style="font-size:11px;font-weight:700;color:'+col+';margin-bottom:8px">ET LE LOCATAIRE</div><div style="height:1px;background:#ddd;margin-bottom:6px"></div><div style="height:1px;background:#ddd;margin-bottom:6px"></div><div style="height:1px;background:#ddd"></div></div></div></div>',

    lettre: '<div style="padding:32px 40px 20px;display:flex;gap:0"><div style="width:6px;background:'+col+';margin-right:24px;border-radius:3px;flex-shrink:0"></div><div style="flex:1">'+
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px">'+
      '<div style="font-size:13px;color:#555;line-height:1.8"><div style="font-weight:700;font-size:16px;color:#222;margin-bottom:4px">'+nom+'</div>'+(adr?'<div>'+adr+'</div>':'')+'<div>'+tel+'</div><div>'+mail+'</div>'+(web?'<div>'+web+'</div>':'')+'</div>'+L+'</div>'+
      '<div style="text-align:right;margin-bottom:28px"><div style="font-weight:700;font-size:14px;color:#222">DESTINATAIRE</div><div style="font-size:13px;color:#666;margin-top:4px">Adresse complete</div></div>'+
      '<div style="font-size:13px;color:#555;margin-bottom:8px">Objet : <span style="color:'+col+';font-weight:600">Contrat de bail locatif</span></div>'+
      '<div style="font-size:14px;font-weight:700;color:#222;margin-bottom:16px">Monsieur / Madame,</div></div></div>',

    legal: '<div style="position:relative"><div style="position:absolute;top:0;left:0;width:0;height:0;border-style:solid;border-width:80px 80px 0 0;border-color:'+col+' transparent transparent transparent"></div>'+
      '<div style="position:absolute;top:0;right:0;width:0;height:0;border-style:solid;border-width:0 80px 80px 0;border-color:transparent '+col+' transparent transparent"></div>'+
      '<div style="padding:32px 36px 20px;text-align:center">'+L+
      '<div style="font-size:30px;font-weight:900;color:'+col+';letter-spacing:1px;margin:16px 0 6px">LEASE AGREEMENT</div>'+
      '<div style="width:90px;height:3px;background:'+col+';margin:0 auto 12px"></div>'+
      '<div style="font-size:12px;color:#888">'+nom+' | '+adr+'</div><div style="font-size:12px;color:#888">'+tel+' | '+mail+'</div>'+
      '</div><div style="padding:0 36px;display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px">'+
      '<div style="border:1px solid #ddd;padding:12px;border-radius:3px"><div style="font-size:11px;font-weight:700;color:'+col+';margin-bottom:6px">Lessor (Landlord)</div><div style="border-bottom:1px solid #bbb;height:24px"></div></div>'+
      '<div style="border:1px solid #ddd;padding:12px;border-radius:3px"><div style="font-size:11px;font-weight:700;color:'+col+';margin-bottom:6px">Lessee (Tenant)</div><div style="border-bottom:1px solid #bbb;height:24px"></div></div></div></div>',

    sidebar_v: '<div style="display:flex;min-height:297mm"><div style="width:200px;background:'+col+';padding:28px 20px;flex-shrink:0;display:flex;flex-direction:column">'+L+
      '<div style="margin-top:28px"><div style="font-size:20px;font-weight:700;color:#fff;line-height:1.3">CONTRAT<br/>DE BAIL</div>'+
      '<div style="width:32px;height:3px;background:rgba(255,255,255,0.5);margin:12px 0"></div></div>'+
      '<div style="margin-top:auto;font-size:11px;color:rgba(255,255,255,0.6);line-height:1.7">'+nom+'<br/>'+(adr||"")+'<br/>'+tel+'<br/>'+mail+'</div></div>'+
      '<div style="flex:1;padding:28px 32px"><div style="font-size:22px;font-weight:700;color:'+col+';margin-bottom:4px">'+nom+'</div>'+
      '<div style="font-size:13px;color:#888;margin-bottom:24px">'+(sl||"")+'</div></div></div>',

    default: '<div style="background:'+col+';padding:22px 32px;display:flex;align-items:center;justify-content:space-between">'+
      '<div style="display:flex;align-items:center;gap:14px">'+L+'<div><div style="font-size:22px;font-weight:700;color:#fff">'+nom+'</div>'+(sl?'<div style="font-size:12px;color:rgba(255,255,255,0.8)">'+sl+'</div>':'')+'</div></div>'+
      '<div style="text-align:right;font-size:12px;color:rgba(255,255,255,0.9);line-height:1.9">'+contacts+'</div></div>'+
      (adr?'<div style="padding:7px 32px;font-size:11px;color:#555;border-bottom:1px solid #eee">'+adr+'</div>':""),
  }

  const header = headers[tpl.id] || headers.default
  const title = ['qc','lettre','legal','sidebar_v'].includes(tpl.id) ? "" :
    '<div style="text-align:center;margin:28px 0 32px"><div style="font-size:18px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:'+col+';border-bottom:2px solid '+col+';display:inline-block;padding-bottom:6px">CONTRAT DE BAIL</div></div>'
  const bodyBg = ['noir_or','dark_exec'].includes(tpl.id) ? "#fff" : "#fff"

  return '<div style="font-family:Arial,sans-serif;background:'+bodyBg+';min-height:297mm;color:#333">'+
    header + title +
    '<div style="padding:20px 32px"><div style="font-size:13.5px;line-height:1.9;color:#333">'+body+'</div></div>'+
    footerHtml+'</div>'
}

export default function ModelesDocuments() {
  const [agence, setAgence]           = useState(null)
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [view, setView]               = useState("gallery")
  const [selTpl, setSelTpl]           = useState("azur")
  const [bailContent, setBailContent] = useState("")
  const [quillReady, setQuillReady]   = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const quillRef     = useRef(null)
  const logoInputRef = useRef(null)

  const [entete, setEntete] = useState({
    logo_url:"", nom_agence:"", slogan:"", adresse:"",
    telephone:"", email:"", site_web:"",
    couleur_principale:"#0078d4",
    pied_page:"", taille_logo:"65",
  })
  const setE = (k,v) => setEntete(f=>({...f,[k]:v}))

  useEffect(()=>{ initData() },[])
  useEffect(()=>{ if (view==="editor"){ quillRef.current=null; setQuillReady(false); setTimeout(()=>loadQuill(),50) } },[view,selTpl])

  const initData = async () => {
    setLoading(true)
    try {
      const {data:{user}} = await supabase.auth.getUser()
      const {data:agList} = await supabase.from("agences").select("*")
      const ag = agList?.find(a=>a.profile_id===user.id)||agList?.[0]
      setAgence(ag)
      if (!ag?.id) return
      const {data:p} = await supabase.from("parametres_organisation").select("*").eq("agence_id",ag.id).single()
      if (p?.modele_entete) {
        const ev = p.modele_entete
        setEntete(prev=>({...prev,
          logo_url:ev.logo_url||ag.logo_url||"",
          nom_agence:ag.nom||"",
          slogan:ev.slogan||"",
          adresse:ev.adresse||ag.adresse||"",
          telephone:ev.telephone||ag.telephone||"",
          email:ev.email||ag.email||"",
          site_web:ev.site_web||ag.site_web||"",
          couleur_principale:ev.couleur_principale||p.couleur_principale||"#0078d4",
          pied_page:ev.pied_page||"",
          taille_logo:ev.taille_logo||"65",
        }))
        if (ev.selected_template) setSelTpl(ev.selected_template)
        if (ev.bail_content) setBailContent(ev.bail_content)
      } else {
        setEntete(prev=>({...prev,nom_agence:ag.nom||"",adresse:ag.adresse||"",telephone:ag.telephone||"",email:ag.email||"",site_web:ag.site_web||""}))
      }
    } catch(err){console.error(err)}
    finally{setLoading(false)}
  }

  const loadQuill = () => {
    if (window.Quill){initQuill();return}
    if (!document.querySelector("#quill-css")){
      const link=document.createElement("link");link.id="quill-css";link.rel="stylesheet"
      link.href="https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.snow.min.css"
      document.head.appendChild(link)
    }
    const s=document.createElement("script")
    s.src="https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.min.js"
    s.onload=()=>initQuill()
    document.head.appendChild(s)
  }

  const initQuill = () => {
    setTimeout(()=>{
      const el=document.getElementById("quill-editor-zone")
      if (!el||quillRef.current) return
      quillRef.current=new window.Quill(el,{
        theme:"snow",placeholder:"Redigez le contenu du bail ici...",
        modules:{toolbar:[[{header:[1,2,3,4,false]}],[{font:[]}],[{size:["small",false,"large","huge"]}],
          ["bold","italic","underline","strike"],[{color:[]},{background:[]}],[{align:[]}],
          [{list:"ordered"},{list:"bullet"}],[{indent:"-1"},{indent:"+1"}],
          ["blockquote"],["link","clean"],[{script:"sub"},{script:"super"}]]}
      })
      if (bailContent) quillRef.current.clipboard.dangerouslyPasteHTML(bailContent)
      quillRef.current.on("text-change",()=>{setBailContent(quillRef.current.root.innerHTML)})
      setQuillReady(true)
    },300)
  }

  const handleLogoUpload = (file) => {
    if (!file) return
    if (file.size>3*1024*1024){toast.error("Logo trop lourd (max 3MB)");return}
    setLogoUploading(true)
    const reader=new FileReader()
    reader.onload=(ev)=>{setE("logo_url",ev.target.result);setLogoUploading(false);toast.success("Logo charge !")}
    reader.readAsDataURL(file)
  }

  const saveModele = async () => {
    if (!agence?.id) return
    setSaving(true)
    try {
      const data={...entete,selected_template:selTpl,bail_content:bailContent}
      const {error}=await supabase.from("parametres_organisation").upsert({
        agence_id:agence.id,modele_entete:data,
        couleur_principale:entete.couleur_principale,updated_at:new Date().toISOString(),
      },{onConflict:"agence_id"})
      if (error) throw error
      toast.success("Modele sauvegarde !")
    } catch(err){toast.error(err.message)}
    finally{setSaving(false)}
  }

  const currentTpl = TEMPLATES.find(t=>t.id===selTpl)||TEMPLATES[0]

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
        .md-tabs{display:flex;gap:2px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:7px;padding:3px;margin-bottom:20px;width:fit-content}
        .md-tab{padding:7px 18px;border-radius:5px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:none;font-family:Inter,sans-serif;color:rgba(255,255,255,0.45);transition:all 0.15s}
        .md-tab.on{background:rgba(255,255,255,0.1);color:#e6edf3}
        .md-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px}
        .md-tcard{background:rgba(255,255,255,0.02);border:2px solid rgba(255,255,255,0.06);border-radius:12px;overflow:hidden;cursor:pointer;transition:all 0.2s}
        .md-tcard:hover{border-color:rgba(0,120,212,0.5);transform:translateY(-3px);box-shadow:0 12px 32px rgba(0,0,0,0.4)}
        .md-tcard.on{border-color:#0078d4;box-shadow:0 0 0 3px rgba(0,120,212,0.25)}
        .md-tthumb{height:130px;overflow:hidden;position:relative;border-radius:0}
        .md-tinfo{padding:10px 12px}
        .md-tname{font-size:13px;font-weight:600;color:#e6edf3;margin-bottom:1px}
        .md-tcat{font-size:10px;color:rgba(255,255,255,0.3);margin-bottom:5px;text-transform:uppercase;letter-spacing:0.06em}
        .md-tuse{width:100%;padding:7px;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;border:none;background:#0078d4;color:#fff;font-family:Inter,sans-serif;transition:all 0.15s}
        .md-tuse:hover{background:#006cc1}
        .md-tuse.current{background:rgba(0,120,212,0.15);color:#4da6ff;border:1px solid rgba(0,120,212,0.3)}
        .md-editor-wrap{display:grid;grid-template-columns:260px 1fr 360px;gap:14px;align-items:start}
        .md-settings{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:10px;overflow:hidden}
        .md-shead{padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.07);font-size:13px;font-weight:600;color:#e6edf3}
        .md-sbody{padding:14px 16px;display:flex;flex-direction:column;gap:12px;max-height:calc(100vh - 200px);overflow-y:auto}
        .md-sbody::-webkit-scrollbar{width:3px}.md-sbody::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        .md-lbl{display:block;font-size:11.5px;font-weight:600;color:rgba(255,255,255,0.45);margin-bottom:5px}
        .md-inp{width:100%;padding:7px 10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:5px;font-family:Inter,sans-serif;font-size:13px;color:#e6edf3;outline:none;transition:border-color 0.15s;color-scheme:dark;box-sizing:border-box}
        .md-inp:focus{border-color:#0078d4}
        .md-logo-zone{border:2px dashed rgba(255,255,255,0.12);border-radius:8px;padding:14px;text-align:center;cursor:pointer;transition:all 0.2s}
        .md-logo-zone:hover{border-color:rgba(0,120,212,0.4);background:rgba(0,120,212,0.04)}
        .md-editor-panel{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:10px;overflow:hidden}
        .md-ehead{padding:11px 15px;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between}
        .md-vars{display:flex;gap:5px;flex-wrap:wrap;padding:7px 10px;background:rgba(255,255,255,0.02);border-bottom:1px solid rgba(255,255,255,0.07)}
        .md-var{padding:2px 8px;border-radius:4px;font-size:10.5px;font-weight:600;background:rgba(108,99,255,0.1);border:1px solid rgba(108,99,255,0.25);color:#a78bfa;cursor:pointer;font-family:monospace}
        .md-var:hover{background:rgba(108,99,255,0.2)}
        .md-preview-panel{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:10px;overflow:hidden;position:sticky;top:16px}
        .md-prev-head{padding:9px 13px;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;justify-content:space-between;align-items:center}
        .md-prev-body{height:calc(100vh - 230px);overflow-y:auto;background:#f5f5f5}
        #quill-editor-zone{min-height:420px}
        .ql-toolbar.ql-snow{background:rgba(255,255,255,0.03);border:none;border-bottom:1px solid rgba(255,255,255,0.07)!important;padding:7px 10px}
        .ql-container.ql-snow{border:none!important;font-size:14px}
        .ql-editor{min-height:400px;padding:14px 18px;color:#333;background:#fff}
        .ql-toolbar .ql-stroke{stroke:rgba(255,255,255,0.5)!important}
        .ql-toolbar .ql-fill{fill:rgba(255,255,255,0.5)!important}
        .ql-toolbar .ql-picker-label{color:rgba(255,255,255,0.5)!important}
        .ql-toolbar button:hover .ql-stroke,.ql-toolbar .ql-active .ql-stroke{stroke:#0078d4!important}
        @media(max-width:1200px){.md-editor-wrap{grid-template-columns:240px 1fr}}
        @media(max-width:960px){.md-editor-wrap{grid-template-columns:1fr}.md-preview-panel{display:none}}
      `}</style>

      <div className="md-root">
        <div className="md-topbar">
          <div><div className="md-h1">Modeles de Documents</div><div className="md-sub">20 templates Canva-style pour vos contrats de bail</div></div>
          <div style={{display:"flex",gap:8}}>
            {view==="editor"&&<button className="md-btn" onClick={()=>setView("gallery")}>← Galerie</button>}
            <button className="md-btn md-btn-p" disabled={saving} onClick={saveModele}>{saving?"Sauvegarde...":"Sauvegarder"}</button>
          </div>
        </div>

        <div className="md-tabs">
          {[["gallery","Galerie (20 modeles)"],["editor","Editeur"]].map(([k,l])=>(
            <button key={k} className={"md-tab"+(view===k?" on":"")} onClick={()=>setView(k)}>{l}</button>
          ))}
        </div>

        {view==="gallery"&&(<>
          <div style={{marginBottom:16,padding:"10px 14px",borderRadius:8,background:"rgba(0,120,212,0.06)",border:"1px solid rgba(0,120,212,0.12)",fontSize:13,color:"rgba(255,255,255,0.5)"}}>
            Modele selectionne : <strong style={{color:"#e6edf3"}}>{currentTpl.name}</strong>
          </div>
          <div className="md-gallery">
            {TEMPLATES.map(tpl=>(
              <div key={tpl.id} className={"md-tcard"+(selTpl===tpl.id?" on":"")}>
                <div className="md-tthumb" onClick={()=>setSelTpl(tpl.id)}
                  dangerouslySetInnerHTML={{__html:mkThumb(tpl.id,tpl.color,"AGENCE","")}}
                />
                <div className="md-tinfo">
                  <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}>
                    <span className="md-tname">{tpl.name}</span>
                    {selTpl===tpl.id&&<span style={{fontSize:9,padding:"1px 5px",borderRadius:"100px",background:"rgba(0,120,212,0.2)",color:"#4da6ff",fontWeight:700}}>ACTUEL</span>}
                  </div>
                  <div className="md-tcat">{tpl.cat}</div>
                  <button className={"md-tuse"+(selTpl===tpl.id?" current":"")} onClick={()=>{setSelTpl(tpl.id);quillRef.current=null;setQuillReady(false);setView("editor")}}>
                    {selTpl===tpl.id?"Editer ce modele":"Utiliser ce modele"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>)}

        {view==="editor"&&(
          <div className="md-editor-wrap">
            <div className="md-settings">
              <div className="md-shead">Parametres</div>
              <div className="md-sbody">
                <div>
                  <label className="md-lbl">Logo de l agence</label>
                  {entete.logo_url?(
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                      <img src={entete.logo_url} alt="" style={{height:44,width:"auto",objectFit:"contain",borderRadius:4,background:"rgba(255,255,255,0.05)",padding:3,border:"1px solid rgba(255,255,255,0.1)"}}/>
                      <div>
                        <button className="md-btn" style={{fontSize:11,padding:"3px 8px",marginBottom:3,display:"block"}} onClick={()=>logoInputRef.current?.click()}>{logoUploading?"...":"Changer"}</button>
                        <button className="md-btn" style={{fontSize:11,padding:"3px 8px",color:"#ef4444"}} onClick={()=>setE("logo_url","")}>X</button>
                      </div>
                    </div>
                  ):(
                    <div className="md-logo-zone" onClick={()=>logoInputRef.current?.click()}>
                      <div style={{fontSize:24,marginBottom:4,opacity:0.3}}>+</div>
                      <div style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>{logoUploading?"Chargement...":"Cliquer pour ajouter le logo"}</div>
                      <div style={{fontSize:11,color:"rgba(255,255,255,0.2)"}}>PNG JPG SVG max 3MB</div>
                    </div>
                  )}
                  <input ref={logoInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>e.target.files[0]&&handleLogoUpload(e.target.files[0])}/>
                </div>
                <div>
                  <label className="md-lbl">Couleur principale</label>
                  <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
                    <input type="color" value={entete.couleur_principale} onChange={e=>setE("couleur_principale",e.target.value)} style={{width:36,height:32,padding:2,borderRadius:4,border:"1px solid rgba(255,255,255,0.1)",background:"none",cursor:"pointer"}}/>
                    <input className="md-inp" value={entete.couleur_principale} onChange={e=>setE("couleur_principale",e.target.value)} style={{flex:1,fontFamily:"monospace",fontSize:12}}/>
                  </div>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                    {["#0078d4","#005a8e","#c0392b","#1b2a4a","#6b21a8","#059669","#b8860b","#e74c3c","#008751","#f39c12","#16a085","#1a237e","#0f4c81","#003189","#795548","#222222"].map(c=>(
                      <div key={c} onClick={()=>setE("couleur_principale",c)} style={{width:20,height:20,borderRadius:4,background:c,cursor:"pointer",border:entete.couleur_principale===c?"2.5px solid #fff":"2px solid transparent",transition:"transform 0.1s"}} title={c}/>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="md-lbl">Taille logo : {entete.taille_logo}px</label>
                  <input type="range" min="30" max="120" value={entete.taille_logo} onChange={e=>setE("taille_logo",e.target.value)} style={{width:"100%",cursor:"pointer",accentColor:"#0078d4"}}/>
                </div>
                {[["nom_agence","Nom agence"],["slogan","Slogan"],["adresse","Adresse"],["telephone","Telephone"],["email","Email"],["site_web","Site web"],["pied_page","Pied de page"]].map(([k,l])=>(
                  <div key={k}><label className="md-lbl">{l}</label><input className="md-inp" value={entete[k]} onChange={e=>setE(k,e.target.value)}/></div>
                ))}
                <div>
                  <label className="md-lbl">Modele</label>
                  <select className="md-inp" value={selTpl} onChange={e=>{setSelTpl(e.target.value);quillRef.current=null;setQuillReady(false);setTimeout(()=>initQuill(),200)}}>
                    {TEMPLATES.map(t=><option key={t.id} value={t.id} style={{background:"#161b22"}}>{t.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="md-editor-panel">
              <div className="md-ehead">
                <span style={{fontSize:13,fontWeight:600,color:"#e6edf3"}}>Contenu du bail — {currentTpl.name}</span>
                <button className="md-btn" style={{fontSize:11,padding:"4px 10px",color:"#00c896",borderColor:"rgba(0,200,150,0.2)",background:"rgba(0,200,150,0.06)"}}
                  onClick={()=>{if(quillRef.current){quillRef.current.clipboard.dangerouslyPasteHTML(getDefaultContent());setBailContent(getDefaultContent())}}}>
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
                  dangerouslySetInnerHTML={{__html:renderFull(currentTpl,entete,bailContent)}}/>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function getDefaultContent() {
  return `<h2>ENTRE LES SOUSSIGNES</h2>
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
<p>User paisiblement des locaux, payer le loyer aux echeances, maintenir en bon etat, ne pas sous-louer sans accord.</p>
<h3>Article 6 — Obligations du bailleur</h3>
<p>Delivrer un logement en bon etat, assurer la jouissance paisible, effectuer les reparations necessaires.</p>
<h3>Article 7 — Resiliation</h3>
<p>Preavis de 30 jours requis par la partie souhaitant mettre fin au bail.</p>
<br/><p>Fait a ____________, le ____________</p><br/>
<p><strong>Signature du Bailleur</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>Signature du Locataire</strong></p>
<br/><p>_________________________ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; _________________________</p>`
}
