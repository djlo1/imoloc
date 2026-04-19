import { useState, useEffect, useRef } from "react"
import { supabase } from "../../../lib/supabase"
import toast from "react-hot-toast"

const TEMPLATES = [
  { id:"moderne",     name:"Moderne Bleu",     cat:"Contemporain", color:"#0078d4", desc:"Bandeau colore, texte blanc, design actuel" },
  { id:"qc_officiel", name:"Officiel Quebec",  cat:"Formulaire",   color:"#006994", desc:"Style formulaire officiel, sections colorees" },
  { id:"lettre_fr",   name:"Lettre Francaise", cat:"Courrier Pro", color:"#2d6a4f", desc:"Mise en page lettre francaise, sobre et elegant" },
  { id:"legal_us",    name:"Legal US Corners", cat:"Legal US",     color:"#1b2a4a", desc:"Coins decores bleu marine, tres structure" },
  { id:"wonder",      name:"Corporate Violet", cat:"Corporate",    color:"#6b21a8", desc:"Accent violet, barre pied, style tech" },
  { id:"classique",   name:"Classique Formel", cat:"Formel",       color:"#2c3e50", desc:"Encadrement double, serifs, tres academique" },
  { id:"europeen",    name:"Europeen Premium", cat:"International",color:"#003366", desc:"Grille 3 colonnes, ornement central" },
  { id:"djlotech",    name:"DJLOTECH Premium", cat:"Business",     color:"#0f4c81", desc:"Header degrade, ligne or, tres pro" },
  { id:"elegant",     name:"Elegant Or Noir",  cat:"Luxe",         color:"#b8860b", desc:"Fond sombre, or, prestige et standing" },
  { id:"benin",       name:"Standard Benin",   cat:"Local",        color:"#008751", desc:"Drapeau, agence agreee MEHU, droit local" },
  { id:"minimal",     name:"Minimaliste Pur",  cat:"Epure",        color:"#222222", desc:"Ligne fine, espaces blancs, epure total" },
  { id:"vierge",      name:"Page Vierge",      cat:"Libre",        color:"#aaaaaa", desc:"Partir de zero, page entierement libre" },
]

function renderThumb(tpl, logo, entete) {
  const col = (entete && entete.couleur_principale) || tpl.color
  const nom = (entete && entete.nom_agence) || "AGENCE"
  const L = logo ? '<img src="'+logo+'" style="height:12px;width:auto;object-fit:contain"/>' : '<div style="width:18px;height:10px;background:'+col+'44;border-radius:1px"></div>'
  const lines = (n,ww,cl)=>{ cl=cl||"#e0e0e0"; return Array.from({length:n},(_,i)=>'<div style="height:1.5px;background:'+cl+';margin-bottom:2px;width:'+ww[i%ww.length]+'%"></div>').join("") }

  if (tpl.id === "qc_officiel") return '<div style="background:#fff;height:100%;font-family:Arial;overflow:hidden"><div style="background:'+col+';padding:3px 6px;display:flex;align-items:center;justify-content:space-between">'+L+'<div style="text-align:right"><span style="color:#fff;font-size:8px;font-weight:900">BAIL</span></div></div><div style="background:#ffd700;padding:2px 6px"><span style="font-size:4px;font-weight:700;color:#333">FORMULAIRE OBLIGATOIRE EN DOUBLE EXEMPLAIRE</span></div><div style="padding:3px 5px"><div style="display:grid;grid-template-columns:1fr 1fr;gap:2px;margin-bottom:2px"><div style="border:1px solid #ccc;padding:2px"><span style="font-size:4px;font-weight:700;color:'+col+'">A LOCATEUR</span>'+lines(2,[100,100],"#ccc")+'</div><div style="border:1px solid #ccc;padding:2px"><span style="font-size:4px;font-weight:700;color:'+col+'">ET LOCATAIRE</span>'+lines(2,[100,100],"#ccc")+'</div></div><div style="border:1px solid #ccc;padding:2px"><span style="font-size:4px;font-weight:700;color:'+col+'">B DESCRIPTION</span>'+lines(1,[100],"#ccc")+'</div></div></div>'

  if (tpl.id === "lettre_fr") return '<div style="background:#fff;height:100%;font-family:Georgia,serif;overflow:hidden;padding:5px"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><div style="font-size:4.5px;color:#555;line-height:1.6"><div style="font-weight:700;color:#222">'+nom+'</div><div>Cotonou, Benin</div><div>+229 XX XX</div></div>'+L+'</div><div style="text-align:right;margin-bottom:3px;font-size:4.5px;color:#555"><div style="font-weight:700;color:#222">DESTINATAIRE</div><div>Adresse</div></div><div style="margin-bottom:3px;font-size:4.5px;color:'+col+'">Objet: Contrat de bail</div>'+lines(4,[100,100,85,70],"#ddd")+'<div style="border-top:1px solid '+col+';margin-top:3px;padding-top:2px;display:flex;justify-content:space-between"><span style="font-size:4px;color:#aaa">Tel</span><span style="font-size:4px;color:#aaa">Email</span></div></div>'

  if (tpl.id === "legal_us") return '<div style="background:#fff;height:100%;font-family:serif;overflow:hidden;position:relative"><div style="position:absolute;top:0;left:0;width:0;height:0;border-style:solid;border-width:28px 28px 0 0;border-color:'+col+' transparent transparent transparent"></div><div style="position:absolute;top:0;right:0;width:0;height:0;border-style:solid;border-width:0 28px 28px 0;border-color:transparent '+col+' transparent transparent"></div><div style="padding:5px 7px;text-align:center;margin-top:4px">'+L+'<div style="font-size:6.5px;font-weight:900;color:'+col+';margin:3px 0">LEASE AGREEMENT</div><div style="width:30px;height:1.5px;background:'+col+';margin:0 auto 3px"></div></div><div style="padding:0 5px">'+lines(5,[100,88,95,72,85])+'</div><div style="position:absolute;bottom:0;left:0;width:0;height:0;border-style:solid;border-width:18px 0 0 18px;border-color:transparent transparent transparent '+col+'"></div><div style="position:absolute;bottom:0;right:0;width:0;height:0;border-style:solid;border-width:0 0 18px 18px;border-color:transparent transparent '+col+' transparent"></div></div>'

  if (tpl.id === "wonder") return '<div style="background:#fff;height:100%;font-family:Arial;overflow:hidden"><div style="display:flex;align-items:center;justify-content:space-between;padding:4px 6px;border-bottom:2px solid '+col+'">'+L+'<div style="text-align:right;font-size:4px;color:#666"><div>+229 XX</div><div>mail</div></div></div><div style="padding:4px 6px"><div style="border-left:3px solid '+col+';padding-left:4px;margin-bottom:3px"><div style="font-size:6px;font-weight:700;color:'+col+'">CONTRAT DE BAIL</div></div>'+lines(5,[100,85,92,70,88])+'</div><div style="position:absolute;bottom:0;left:0;right:0;background:'+col+';padding:2px 5px;display:flex;justify-content:space-between"><span style="font-size:3.5px;color:rgba(255,255,255,0.8)">'+nom+'</span><span style="font-size:3.5px;color:rgba(255,255,255,0.5)">Page 1</span></div></div>'

  if (tpl.id === "djlotech") return '<div style="background:#fff;height:100%;font-family:Arial;overflow:hidden"><div style="background:linear-gradient(135deg,'+col+' 0%,#1565c0 100%);padding:5px 7px;display:flex;align-items:center;justify-content:space-between">'+L+'<div style="text-align:right"><div style="color:#fff;font-weight:700;font-size:5.5px">'+nom+'</div><div style="color:rgba(255,255,255,0.7);font-size:4px">Gestion Immo</div></div></div><div style="height:2px;background:linear-gradient(to right,'+col+',#ffd700)"></div><div style="padding:3px 5px"><div style="background:'+col+'11;border-left:2px solid '+col+';padding:2px 3px;margin-bottom:2px"><div style="font-size:5px;font-weight:700;color:'+col+'">CONTRAT DE BAIL</div></div>'+lines(4,[100,85,92,70])+'</div></div>'

  if (tpl.id === "elegant") return '<div style="background:#1a1a1a;height:100%;font-family:Georgia,serif;overflow:hidden"><div style="border-bottom:1px solid '+col+';padding:5px 6px;display:flex;align-items:center;justify-content:space-between">'+L+'<div style="text-align:center;flex:1"><div style="font-size:6px;font-weight:700;color:'+col+';letter-spacing:1px">'+nom+'</div></div></div><div style="padding:4px 5px"><div style="text-align:center;border:1px solid '+col+';padding:2px;margin-bottom:3px"><div style="font-size:5px;font-weight:700;color:'+col+'">CONTRAT DE BAIL</div></div>'+lines(4,[100,85,95,70],"#333")+'</div></div>'

  if (tpl.id === "benin") return '<div style="background:#fff;height:100%;font-family:Arial;overflow:hidden"><div style="background:'+col+';height:4px"></div><div style="padding:4px 5px;border-bottom:2px solid '+col+';display:flex;align-items:center;justify-content:space-between">'+L+'<div style="text-align:center"><div style="font-size:6px;font-weight:700;color:'+col+'">'+nom+'</div><div style="font-size:3.5px;color:#888">Agree MEHU Benin</div></div><div style="width:16px;height:26px;background:repeating-linear-gradient(0deg,#008751 0,#008751 8px,#fcd116 8px,#fcd116 16px,#e8112d 16px,#e8112d 24px);border-radius:1px"></div></div><div style="padding:2px 5px;text-align:center"><div style="font-size:5.5px;font-weight:700;color:'+col+'">CONTRAT DE BAIL</div></div>'+lines(3,[90,100,80])+'</div>'

  if (tpl.id === "vierge") return '<div style="background:#fff;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;border:1.5px dashed #ccc;padding:5px"><div style="font-size:22px;color:#ddd;margin-bottom:3px">+</div><div style="font-size:5.5px;color:#bbb;font-weight:600">Page vierge</div></div>'

  if (tpl.id === "classique") return '<div style="background:#fff;height:100%;font-family:Georgia,serif;overflow:hidden;padding:4px"><div style="border:2px solid '+col+';padding:4px;height:calc(100% - 10px)"><div style="border-bottom:1px solid '+col+'44;padding-bottom:2px;margin-bottom:2px;display:flex;align-items:center;justify-content:space-between">'+L+'<div style="font-size:6px;font-weight:700;color:'+col+';text-align:center">'+nom+'</div><div style="font-size:4px;color:#777">Tel</div></div><div style="text-align:center;margin:2px 0"><div style="font-size:5.5px;font-weight:700;color:'+col+'">CONTRAT DE BAIL</div></div>'+lines(4,[90,100,75,85])+'</div></div>'

  if (tpl.id === "europeen") return '<div style="background:#fff;height:100%;font-family:Palatino,serif;overflow:hidden;padding:4px"><div style="display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:3px;border-bottom:1px solid '+col+';padding-bottom:2px;margin-bottom:2px">'+L+'<div style="text-align:center"><div style="font-size:6px;font-weight:700;color:'+col+'">'+nom+'</div></div><div style="font-size:4px;color:#777">Tel</div></div><div style="text-align:center;margin:2px 0"><div style="font-size:5px;font-weight:700;color:'+col+'">CONTRAT DE BAIL</div><div style="display:flex;align-items:center;justify-content:center;gap:3px;margin-top:1px"><div style="width:12px;height:0.5px;background:'+col+'66"></div><div style="width:3px;height:3px;border-radius:50%;background:'+col+'"></div><div style="width:12px;height:0.5px;background:'+col+'66"></div></div></div>'+lines(4,[85,100,75,90])+'</div>'

  if (tpl.id === "lettre_fr") return '<div style="background:#fff;height:100%;font-family:Georgia;overflow:hidden;padding:5px"></div>'

  // moderne par defaut
  return '<div style="background:#fff;height:100%;font-family:Arial;overflow:hidden"><div style="background:'+col+';padding:5px 7px;display:flex;align-items:center;justify-content:space-between">'+L+'<div style="font-size:6px;font-weight:700;color:#fff">'+nom+'</div></div><div style="padding:5px 6px"><div style="text-align:center;margin:2px 0"><span style="font-size:5.5px;font-weight:700;color:'+col+';border-bottom:1px solid '+col+'">CONTRAT DE BAIL</span></div>'+lines(5,[100,85,92,70,95])+'</div></div>'
}


function renderFull(tpl, e, content) {
  const col = e.couleur_principale || tpl.color || "#0078d4"
  const logo = e.logo_url || ""
  const nom = e.nom_agence || "Agence Immobiliere"
  const slogan = e.slogan || ""
  const adr = e.adresse || ""
  const tel = e.telephone || ""
  const mail = e.email || ""
  const web = e.site_web || ""
  const pied = e.pied_page || ""
  const font = tpl.font || "Arial, sans-serif"
  const logoHtml = logo ? `<img src="${logo}" style="height:${e.taille_logo || 60}px;width:auto;object-fit:contain"/>` : ""
  const contacts = [tel,mail,web].filter(Boolean).map(x=>`<div>${x}</div>`).join("")

  const headers = {
    moderne: `
      <div style="background:${col};padding:22px 32px;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:14px">${logoHtml}<div><div style="font-size:22px;font-weight:700;color:#fff">${nom}</div>${slogan?`<div style="font-size:12px;color:rgba(255,255,255,0.8);margin-top:2px">${slogan}</div>`:""}</div></div>
        <div style="text-align:right;font-size:12px;color:rgba(255,255,255,0.9);line-height:1.9">${contacts}</div>
      </div>
      ${adr?`<div style="background:${col}22;padding:7px 32px;font-size:11.5px;color:#555;border-bottom:2px solid ${col}">${adr}</div>`:""}
    `,
    classique_fr: `
      <div style="margin:24px 28px 0;border:2px solid ${col}">
        <div style="padding:16px 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid ${col}44">
          ${logoHtml}
          <div style="text-align:center"><div style="font-size:20px;font-weight:700;color:${col};font-family:Georgia,serif">${nom}</div>${slogan?`<div style="font-size:12px;color:#666;font-style:italic;margin-top:2px">${slogan}</div>`:""}</div>
          <div style="text-align:right;font-size:11px;color:#555;line-height:1.9">${contacts}</div>
        </div>
        ${adr?`<div style="padding:7px 20px;text-align:center;font-size:11px;color:#666">${adr}</div>`:""}
      </div>
    `,
    business_us: `
      <div style="border-top:6px solid ${col}">
        <div style="padding:18px 32px;display:flex;align-items:flex-start;justify-content:space-between;border-bottom:2px solid ${col}">
          <div style="display:flex;align-items:center;gap:12px">${logoHtml}<div><div style="font-size:20px;font-weight:700;color:${col}">${nom}</div>${adr?`<div style="font-size:11px;color:#777;margin-top:2px">${adr}</div>`:""}</div></div>
          <div style="text-align:right;font-size:11px;color:#555;line-height:1.9">${contacts}</div>
        </div>
      </div>
    `,
    europeen: `
      <div style="padding:20px 32px">
        <div style="display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:16px;padding-bottom:14px;border-bottom:1px solid ${col}">
          ${logoHtml}
          <div style="text-align:center"><div style="font-size:20px;font-weight:700;color:${col};font-family:Palatino,serif">${nom}</div>${slogan?`<div style="font-size:11px;color:#888;letter-spacing:1px;margin-top:3px;text-transform:uppercase">${slogan}</div>`:""}</div>
          <div style="text-align:right;font-size:11px;color:#666;line-height:1.9">${contacts}${adr?`<div style="color:#999">${adr}</div>`:""}</div>
        </div>
      </div>
    `,
    standard: `
      <div style="padding:18px 32px;border-bottom:2px solid ${col};display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:12px">${logoHtml}<div><div style="font-size:20px;font-weight:700;color:#222">${nom}</div>${slogan?`<div style="font-size:11px;color:#888;margin-top:2px">${slogan}</div>`:""}</div></div>
        <div style="text-align:right;font-size:11px;color:#666;line-height:1.9">${contacts}${adr?`<div>${adr}</div>`:""}</div>
      </div>
    `,
    minimal: `
      <div style="padding:24px 40px 16px;display:flex;align-items:flex-end;justify-content:space-between;border-bottom:1px solid #222">
        <div style="display:flex;align-items:center;gap:12px">${logoHtml}<div><div style="font-size:18px;font-weight:600;color:#111">${nom}</div>${slogan?`<div style="font-size:11px;color:#aaa;margin-top:2px">${slogan}</div>`:""}</div></div>
        <div style="text-align:right;font-size:11px;color:#aaa;line-height:1.9">${contacts}${adr?`<div>${adr}</div>`:""}</div>
      </div>
    `,
    corporate: `
      <div style="background:${col}">
        <div style="padding:18px 32px;display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:12px">${logoHtml}<div><div style="font-size:20px;font-weight:700;color:#fff">${nom}</div>${slogan?`<div style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:2px">${slogan}</div>`:""}</div></div>
          <div style="text-align:right;font-size:11px;color:rgba(255,255,255,0.7);line-height:1.9">${contacts}</div>
        </div>
      </div>
      <div style="height:3px;background:linear-gradient(to right,${col}99,transparent)"></div>
      ${adr?`<div style="padding:6px 32px;font-size:11px;color:#888">${adr}</div>`:""}
    `,
    elegant: `
      <div style="background:#1a1a1a;padding:22px 32px;border-bottom:1px solid ${col};display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:14px">${logoHtml}<div><div style="font-size:20px;font-weight:700;color:${col};font-family:Georgia,serif;letter-spacing:1px">${nom.toUpperCase()}</div>${slogan?`<div style="font-size:10px;color:#888;letter-spacing:2px;margin-top:3px;text-transform:uppercase">${slogan}</div>`:""}</div></div>
        <div style="text-align:right;font-size:11px;color:#888;line-height:1.9">${contacts}</div>
      </div>
      ${adr?`<div style="background:#111;padding:6px 32px;font-size:11px;color:#666">${adr}</div>`:""}
    `,
    benin: `
      <div>
        <div style="background:${col};height:5px"></div>
        <div style="padding:16px 32px;display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid ${col}">
          ${logoHtml}
          <div style="text-align:center"><div style="font-size:20px;font-weight:700;color:${col}">${nom}</div>${slogan?`<div style="font-size:11px;color:#888;margin-top:2px">${slogan}</div>`:""}<div style="font-size:10px;color:#aaa;margin-top:2px">Agence agree - MEHU Benin</div></div>
          <div style="text-align:center"><div style="width:24px;height:40px;background:repeating-linear-gradient(0deg,#008751 0,#008751 13px,#fcd116 13px,#fcd116 26px,#e8112d 26px,#e8112d 40px);border-radius:2px"></div></div>
        </div>
        ${adr?`<div style="padding:6px 32px;font-size:11px;color:#666;text-align:center">${adr} | ${tel}</div>`:""}
      </div>
    `,
    profes: `
      <div style="background:${col}">
        <div style="padding:18px 32px;display:flex;align-items:center;gap:14px">${logoHtml}<div style="flex:1"><div style="font-size:20px;font-weight:700;color:#fff">${nom}</div>${slogan?`<div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:2px">${slogan}</div>`:""}</div><div style="text-align:right;font-size:11px;color:rgba(255,255,255,0.8);line-height:1.9">${contacts}</div></div>
      </div>
      <div style="height:2px;background:linear-gradient(to right,${col},#aaa,transparent)"></div>
      ${adr?`<div style="padding:6px 32px;font-size:11px;color:#888">${adr}</div>`:""}
    `,
    colore: `
      <div style="background:linear-gradient(135deg,${col} 0%,${col}cc 60%,#ff6b6b 100%);padding:22px 32px;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:14px">${logoHtml}<div><div style="font-size:22px;font-weight:700;color:#fff">${nom}</div>${slogan?`<div style="font-size:11px;color:rgba(255,255,255,0.85);margin-top:2px">${slogan}</div>`:""}</div></div>
        <div style="text-align:right;font-size:11px;color:rgba(255,255,255,0.9);line-height:1.9">${contacts}</div>
      </div>
      ${adr?`<div style="padding:7px 32px;font-size:11px;color:#666;background:${col}11">${adr}</div>`:""}
    `,
    none: ``,
  }

  const titles = {
    moderne: `<div style="text-align:center;margin:24px 0 32px"><div style="font-size:17px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${col};border-bottom:2px solid ${col};display:inline-block;padding-bottom:6px">CONTRAT DE BAIL</div></div>`,
    classique_fr: `<div style="text-align:center;margin:28px 0 24px"><div style="font-size:18px;font-weight:700;font-family:Georgia,serif;color:#333;letter-spacing:1px">CONTRAT DE BAIL IMMOBILIER</div><div style="width:80px;height:2px;background:${col};margin:10px auto"></div></div>`,
    business_us: `<div style="background:${col}11;border:1px solid ${col}33;padding:14px 32px;margin:20px 32px;text-align:center"><div style="font-size:16px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${col}">RESIDENTIAL LEASE AGREEMENT</div></div>`,
    europeen: `<div style="text-align:center;margin:22px 0"><div style="font-size:16px;font-weight:700;color:${col};font-family:Palatino,serif;letter-spacing:1px">CONTRAT DE BAIL IMMOBILIER</div><div style="display:flex;align-items:center;gap:8px;justify-content:center;margin-top:8px"><div style="flex:1;height:1px;background:${col}44;max-width:60px"></div><div style="width:6px;height:6px;border-radius:50%;background:${col}"></div><div style="flex:1;height:1px;background:${col}44;max-width:60px"></div></div></div>`,
    standard: `<div style="margin:20px 0 24px"><div style="font-size:16px;font-weight:700;color:${col};border-left:3px solid ${col};padding-left:12px">CONTRAT DE BAIL</div></div>`,
    minimal: `<div style="margin:28px 0 20px"><div style="font-size:15px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#222">Contrat de bail</div><div style="width:28px;height:2px;background:${col};margin-top:6px"></div></div>`,
    corporate: `<div style="background:${col}11;border-left:3px solid ${col};padding:12px 20px;margin:20px 0 24px"><div style="font-size:16px;font-weight:700;letter-spacing:1px;color:${col}">CONTRAT DE BAIL</div></div>`,
    elegant: `<div style="text-align:center;margin:28px 0;border:1px solid ${col};padding:14px;margin:24px 32px"><div style="font-size:16px;font-weight:700;color:${col};letter-spacing:3px;font-family:Georgia,serif">CONTRAT DE BAIL IMMOBILIER</div></div>`,
    benin: `<div style="text-align:center;margin:20px 0"><div style="font-size:16px;font-weight:700;color:${col};text-transform:uppercase;letter-spacing:1px">CONTRAT DE BAIL</div><div style="font-size:11px;color:#888;margin-top:4px">Conforme au droit immobilier beninois</div><div style="width:60px;height:2px;background:${col};margin:8px auto"></div></div>`,
    profes: `<div style="border-left:4px solid ${col};padding:10px 16px;margin:20px 0 24px;background:${col}08"><div style="font-size:16px;font-weight:700;color:${col};letter-spacing:1px">CONTRAT DE BAIL PROFESSIONNEL</div></div>`,
    colore: `<div style="text-align:center;margin:20px 0 28px"><div style="background:${col};color:#fff;display:inline-block;padding:8px 24px;border-radius:20px;font-size:15px;font-weight:700;letter-spacing:1.5px">CONTRAT DE BAIL</div></div>`,
    none: `<div style="text-align:center;margin:40px 0 32px"><div style="font-size:18px;font-weight:700;color:#333;letter-spacing:1px">CONTRAT DE BAIL</div><div style="width:60px;height:2px;background:#333;margin:8px auto"></div></div>`,
  }

  const header = headers[tpl.id] || headers.moderne
  const title = titles[tpl.id] || titles.moderne
  const bg = tpl.id === "elegant" ? "#fff" : "#fff"
  const padding = tpl.id === "classique_fr" || tpl.id === "business_us" ? "20px 32px" : "20px 32px"

  return `<div style="font-family:${font};background:${bg};min-height:297mm;color:#333">
    ${header}
    <div style="padding:${padding}">
      ${title}
      <div style="font-size:13.5px;line-height:1.9;color:#333">${content || "<p style=\"color:#bbb;font-style:italic\">Contenu du bail a saisir dans l editeur...</p>"}</div>
    </div>
    ${pied ? `<div style="padding:12px 32px;border-top:1px solid ${tpl.id==="elegant"?"#333":"#eee"};display:flex;justify-content:space-between;font-size:10px;color:${tpl.id==="elegant"?"#666":"#aaa"};margin-top:40px"><span>${nom}</span><span>${pied}</span><span>Page 1 / 1</span></div>` : ""}
  </div>`
}

export default function ModelesDocuments() {
  const [agence, setAgence]         = useState(null)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [view, setView]             = useState("gallery")
  const [selTpl, setSelTpl]         = useState("moderne")
  const [bailContent, setBailContent] = useState("")
  const [quillReady, setQuillReady] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const quillRef    = useRef(null)
  const logoInputRef= useRef(null)

  const [entete, setEntete] = useState({
    logo_url:"", nom_agence:"", slogan:"", adresse:"",
    telephone:"", email:"", site_web:"",
    couleur_principale:"#0078d4",
    pied_page:"", taille_logo:"70",
  })
  const setE = (k,v) => setEntete(f=>({...f,[k]:v}))

  useEffect(()=>{ initData() },[])

  useEffect(()=>{
    if (view !== "editor") return
    loadQuill()
  },[view])

  const initData = async () => {
    setLoading(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      const { data:agList }   = await supabase.from("agences").select("*")
      const ag = agList?.find(a=>a.profile_id===user.id) || agList?.[0]
      setAgence(ag)
      if (!ag?.id) return
      const { data:p } = await supabase.from("parametres_organisation").select("*").eq("agence_id",ag.id).single()
      if (p?.modele_entete) {
        const e = p.modele_entete
        setEntete(prev=>({
          ...prev,
          logo_url:          e.logo_url || ag.logo_url || "",
          nom_agence:        ag.nom || "",
          slogan:            e.slogan || "",
          adresse:           e.adresse || ag.adresse || "",
          telephone:         e.telephone || ag.telephone || "",
          email:             e.email || ag.email || "",
          site_web:          e.site_web || ag.site_web || "",
          couleur_principale:e.couleur_principale || p.couleur_principale || "#0078d4",
          pied_page:         e.pied_page || "",
          taille_logo:       e.taille_logo || "70",
        }))
        if (e.selected_template) setSelTpl(e.selected_template)
        if (e.bail_content) setBailContent(e.bail_content)
      } else {
        setEntete(prev=>({...prev, nom_agence:ag.nom||"", adresse:ag.adresse||"", telephone:ag.telephone||"", email:ag.email||"", site_web:ag.site_web||""}))
      }
    } catch(e){ console.error(e) }
    finally{ setLoading(false) }
  }

  const loadQuill = () => {
    if (window.Quill) { initQuill(); return }
    if (!document.querySelector("#quill-css")) {
      const link = document.createElement("link")
      link.id = "quill-css"
      link.rel = "stylesheet"
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.snow.min.css"
      document.head.appendChild(link)
    }
    const script = document.createElement("script")
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.min.js"
    script.onload = () => initQuill()
    document.head.appendChild(script)
  }

  const initQuill = () => {
    setTimeout(()=>{
      const el = document.getElementById("quill-editor-zone")
      if (!el || quillRef.current) return
      quillRef.current = new window.Quill(el, {
        theme:"snow",
        placeholder:"Redigez le contenu du bail ici...",
        modules:{
          toolbar:[
            [{ header:[1,2,3,4,false] }],
            [{ font:[] }],
            [{ size:["small",false,"large","huge"] }],
            ["bold","italic","underline","strike"],
            [{ color:[] },{ background:[] }],
            [{ align:[] }],
            [{ list:"ordered" },{ list:"bullet" }],
            [{ indent:"-1" },{ indent:"+1" }],
            ["blockquote","code-block"],
            ["link","clean"],
            [{ script:"sub" },{ script:"super" }],
          ]
        }
      })
      if (bailContent) quillRef.current.clipboard.dangerouslyPasteHTML(bailContent)
      quillRef.current.on("text-change",()=>{
        setBailContent(quillRef.current.root.innerHTML)
      })
      setQuillReady(true)
    },300)
  }

  const handleLogoUpload = (file) => {
    if (!file) return
    if (file.size > 2*1024*1024) { toast.error("Logo trop lourd (max 2MB)"); return }
    setLogoUploading(true)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setE("logo_url", ev.target.result)
      setLogoUploading(false)
      toast.success("Logo charge !")
    }
    reader.readAsDataURL(file)
  }

  const saveModele = async () => {
    if (!agence?.id) return
    setSaving(true)
    try {
      const data = { ...entete, selected_template:selTpl, bail_content:bailContent }
      const { error } = await supabase.from("parametres_organisation").upsert({
        agence_id:agence.id,
        modele_entete:data,
        couleur_principale:entete.couleur_principale,
        updated_at:new Date().toISOString(),
      },{ onConflict:"agence_id" })
      if (error) throw error
      toast.success("Modele sauvegarde !")
    } catch(e){ toast.error(e.message) }
    finally{ setSaving(false) }
  }

  const currentTpl = TEMPLATES.find(t=>t.id===selTpl) || TEMPLATES[0]

  if (loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:400,color:"rgba(255,255,255,0.3)"}}>Chargement...</div>

  return (
    <>
      <style>{`
        .md-root{display:flex;flex-direction:column;gap:0;min-height:100%}
        .md-topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px}
        .md-h1{font-size:22px;font-weight:700;color:#e6edf3;letter-spacing:-0.02em;margin-bottom:3px}
        .md-sub{font-size:13px;color:rgba(255,255,255,0.4)}
        .md-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:5px;font-size:13px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.6);font-family:Inter,sans-serif;transition:all 0.15s;white-space:nowrap}
        .md-btn:hover:not(:disabled){background:rgba(255,255,255,0.09);color:#e6edf3}
        .md-btn-p{background:#0078d4;border-color:#0078d4;color:#fff}.md-btn-p:hover{background:#006cc1}
        .md-btn-g{background:rgba(0,200,150,0.08);border-color:rgba(0,200,150,0.22);color:#00c896}
        .md-tabs{display:flex;gap:2px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:7px;padding:3px;margin-bottom:20px;width:fit-content}
        .md-tab{padding:7px 18px;border-radius:5px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:none;font-family:Inter,sans-serif;color:rgba(255,255,255,0.45);transition:all 0.15s}
        .md-tab.on{background:rgba(255,255,255,0.1);color:#e6edf3}
        .md-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}
        .md-tcard{background:rgba(255,255,255,0.02);border:1.5px solid rgba(255,255,255,0.08);border-radius:10px;overflow:hidden;cursor:pointer;transition:all 0.2s}
        .md-tcard:hover{border-color:rgba(0,120,212,0.35);transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.3)}
        .md-tcard.on{border-color:#0078d4;box-shadow:0 0 0 2px rgba(0,120,212,0.2)}
        .md-tthumb{height:120px;overflow:hidden;background:#f5f5f5;position:relative}
        .md-tinfo{padding:10px 12px}
        .md-tname{font-size:13px;font-weight:600;color:#e6edf3;margin-bottom:2px}
        .md-tcat{font-size:10.5px;color:rgba(255,255,255,0.35);margin-bottom:5px;text-transform:uppercase;letter-spacing:0.05em}
        .md-tdesc{font-size:11.5px;color:rgba(255,255,255,0.4);line-height:1.5;margin-bottom:8px}
        .md-tuse{width:100%;padding:7px;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;border:none;background:#0078d4;color:#fff;font-family:Inter,sans-serif;transition:background 0.15s}
        .md-tuse:hover{background:#006cc1}
        .md-editor-wrap{display:grid;grid-template-columns:280px 1fr 380px;gap:16px;align-items:start}
        .md-settings{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:10px;overflow:hidden}
        .md-shead{padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.07);font-size:13px;font-weight:600;color:#e6edf3}
        .md-sbody{padding:14px 16px;display:flex;flex-direction:column;gap:12px;max-height:calc(100vh - 200px);overflow-y:auto}
        .md-sbody::-webkit-scrollbar{width:3px}.md-sbody::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        .md-lbl{display:block;font-size:11.5px;font-weight:600;color:rgba(255,255,255,0.45);margin-bottom:5px}
        .md-inp{width:100%;padding:7px 10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:5px;font-family:Inter,sans-serif;font-size:13px;color:#e6edf3;outline:none;transition:border-color 0.15s;color-scheme:dark;box-sizing:border-box}
        .md-inp:focus{border-color:#0078d4}
        .md-logo-zone{border:2px dashed rgba(255,255,255,0.12);border-radius:7px;padding:14px;text-align:center;cursor:pointer;transition:all 0.2s}
        .md-logo-zone:hover{border-color:rgba(0,120,212,0.4);background:rgba(0,120,212,0.04)}
        .md-editor-panel{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:10px;overflow:hidden;min-height:600px}
        .md-ehead{padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between}
        .md-vars{display:flex;gap:6px;flex-wrap:wrap;padding:8px 12px;background:rgba(255,255,255,0.02);border-bottom:1px solid rgba(255,255,255,0.07)}
        .md-var{padding:3px 9px;border-radius:4px;font-size:11px;font-weight:600;background:rgba(108,99,255,0.1);border:1px solid rgba(108,99,255,0.25);color:#a78bfa;cursor:pointer;font-family:monospace}
        .md-var:hover{background:rgba(108,99,255,0.2)}
        .md-preview-panel{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:10px;overflow:hidden;position:sticky;top:16px}
        .md-prev-head{padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between}
        .md-prev-body{height:calc(100vh - 240px);overflow-y:auto;background:#f5f5f5}
        #quill-editor-zone{min-height:450px}
        .ql-toolbar.ql-snow{background:rgba(255,255,255,0.03);border:none;border-bottom:1px solid rgba(255,255,255,0.07)!important;padding:8px 12px}
        .ql-container.ql-snow{border:none!important;font-size:14px;color:#333}
        .ql-editor{min-height:420px;padding:16px 20px}
        .ql-toolbar .ql-stroke{stroke:rgba(255,255,255,0.5)!important}
        .ql-toolbar .ql-fill{fill:rgba(255,255,255,0.5)!important}
        .ql-toolbar .ql-picker-label{color:rgba(255,255,255,0.5)!important}
        .ql-toolbar button:hover .ql-stroke{stroke:#fff!important}
        .ql-toolbar .ql-active .ql-stroke{stroke:#0078d4!important}
        @media(max-width:1200px){.md-editor-wrap{grid-template-columns:240px 1fr}}
        @media(max-width:900px){.md-editor-wrap{grid-template-columns:1fr}.md-preview-panel{display:none}.md-gallery{grid-template-columns:repeat(2,1fr)}}
      `}</style>

      <div className="md-root">
        <div className="md-topbar">
          <div>
            <div className="md-h1">Modeles de Documents</div>
            <div className="md-sub">Personnalisez vos contrats de bail et factures</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {view==="editor"&&<button className="md-btn" onClick={()=>setView("gallery")}>Changer de modele</button>}
            <button className="md-btn md-btn-p" disabled={saving} onClick={saveModele}>{saving?"Sauvegarde...":"Sauvegarder"}</button>
          </div>
        </div>

        <div className="md-tabs">
          {[["gallery","Galerie de modeles"],["editor","Editeur"]].map(([k,l])=>(
            <button key={k} className={"md-tab"+(view===k?" on":"")} onClick={()=>setView(k)}>{l}</button>
          ))}
        </div>

        {view==="gallery"&&(
          <>
            <div style={{marginBottom:16,padding:"12px 16px",borderRadius:8,background:"rgba(0,120,212,0.07)",border:"1px solid rgba(0,120,212,0.15)",fontSize:13,color:"rgba(255,255,255,0.5)"}}>
              Selectionnez un modele puis cliquez <strong style={{color:"#4da6ff"}}>Utiliser ce modele</strong> pour acceder a l editeur. Modele actuel : <strong style={{color:"#e6edf3"}}>{currentTpl.name}</strong>
            </div>
            <div className="md-gallery">
              {TEMPLATES.map(tpl=>(
                <div key={tpl.id} className={"md-tcard"+(selTpl===tpl.id?" on":"")}>
                  <div className="md-tthumb" onClick={()=>setSelTpl(tpl.id)}>
                    <div style={{transform:"scale(1)",transformOrigin:"top left",width:"100%",height:"100%"}} dangerouslySetInnerHTML={{__html:renderThumb(tpl,entete.logo_url)}}/>
                  </div>
                  <div className="md-tinfo">
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                      <span className="md-tname">{tpl.name}</span>
                      {selTpl===tpl.id&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:"100px",background:"rgba(0,120,212,0.2)",color:"#4da6ff",fontWeight:700}}>ACTUEL</span>}
                    </div>
                    <div className="md-tcat">{tpl.cat}</div>
                    <div className="md-tdesc">{tpl.desc}</div>
                    <button className="md-tuse" onClick={()=>{setSelTpl(tpl.id);setView("editor")}}>
                      {selTpl===tpl.id?"Editer ce modele":"Utiliser ce modele"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {view==="editor"&&(
          <div className="md-editor-wrap">

            {/* Panel gauche: Parametres */}
            <div className="md-settings">
              <div className="md-shead">Parametres du modele</div>
              <div className="md-sbody">
                {/* Logo */}
                <div>
                  <label className="md-lbl">Logo</label>
                  {entete.logo_url?(
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                      <img src={entete.logo_url} alt="" style={{height:44,width:"auto",objectFit:"contain",borderRadius:5,background:"rgba(255,255,255,0.05)",padding:4,border:"1px solid rgba(255,255,255,0.1)"}}/>
                      <div>
                        <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",marginBottom:4}}>Logo charge</div>
                        <button className="md-btn" style={{fontSize:11,padding:"3px 8px"}} onClick={()=>logoInputRef.current?.click()}>{logoUploading?"Chargement...":"Changer"}</button>
                        <button className="md-btn" style={{fontSize:11,padding:"3px 8px",marginLeft:4,color:"#ef4444"}} onClick={()=>setE("logo_url","")}>Supprimer</button>
                      </div>
                    </div>
                  ):(
                    <div className="md-logo-zone" onClick={()=>logoInputRef.current?.click()}>
                      <div style={{fontSize:22,marginBottom:4,opacity:0.4}}>+</div>
                      <div style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>{logoUploading?"Chargement...":"Cliquer pour uploader"}</div>
                      <div style={{fontSize:11,color:"rgba(255,255,255,0.2)"}}>PNG JPG SVG max 2MB</div>
                    </div>
                  )}
                  <input ref={logoInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>e.target.files[0]&&handleLogoUpload(e.target.files[0])}/>
                </div>

                {/* Couleur */}
                <div>
                  <label className="md-lbl">Couleur principale</label>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <input type="color" value={entete.couleur_principale} onChange={e=>setE("couleur_principale",e.target.value)} style={{width:36,height:32,padding:2,borderRadius:5,border:"1px solid rgba(255,255,255,0.1)",background:"none",cursor:"pointer"}}/>
                    <input className="md-inp" value={entete.couleur_principale} onChange={e=>setE("couleur_principale",e.target.value)} style={{flex:1,fontFamily:"monospace",fontSize:12}}/>
                  </div>
                  <div style={{display:"flex",gap:4,marginTop:6,flexWrap:"wrap"}}>
                    {["#0078d4","#2c3e50","#e74c3c","#27ae60","#8e44ad","#e67e22","#b8860b","#1b2a4a","#008751","#1f3a5f"].map(c=>(
                      <div key={c} onClick={()=>setE("couleur_principale",c)} style={{width:18,height:18,borderRadius:3,background:c,cursor:"pointer",border:entete.couleur_principale===c?"2px solid #fff":"2px solid transparent",transition:"transform 0.1s"}}/>
                    ))}
                  </div>
                </div>

                {/* Taille logo */}
                <div>
                  <label className="md-lbl">Taille logo : {entete.taille_logo}px</label>
                  <input type="range" min="30" max="120" value={entete.taille_logo} onChange={e=>setE("taille_logo",e.target.value)} style={{width:"100%",cursor:"pointer",accentColor:"#0078d4"}}/>
                </div>

                {/* Infos */}
                {[["nom_agence","Nom agence"],["slogan","Slogan"],["adresse","Adresse"],["telephone","Telephone"],["email","Email"],["site_web","Site web"],["pied_page","Pied de page"]].map(([k,l])=>(
                  <div key={k}>
                    <label className="md-lbl">{l}</label>
                    <input className="md-inp" value={entete[k]} onChange={e=>setE(k,e.target.value)}/>
                  </div>
                ))}

                {/* Changer modele */}
                <div>
                  <label className="md-lbl">Modele actuel</label>
                  <select className="md-inp" value={selTpl} onChange={e=>{ setSelTpl(e.target.value); if(quillRef.current){ quillRef.current=null; setQuillReady(false); setTimeout(()=>initQuill(),100) } }}>
                    {TEMPLATES.map(t=><option key={t.id} value={t.id} style={{background:"#161b22"}}>{t.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Panel centre: Editeur Quill */}
            <div className="md-editor-panel">
              <div className="md-ehead">
                <span style={{fontSize:13,fontWeight:600,color:"#e6edf3"}}>Contenu du bail</span>
                <div style={{display:"flex",gap:6}}>
                  {!quillReady&&<span style={{fontSize:12,color:"rgba(255,255,255,0.3)"}}>Chargement editeur...</span>}
                  <button className="md-btn md-btn-g" style={{fontSize:11,padding:"4px 10px"}} onClick={()=>{if(quillRef.current){quillRef.current.clipboard.dangerouslyPasteHTML(getDefaultContent());setBailContent(getDefaultContent())}}}>
                    Contenu par defaut
                  </button>
                </div>
              </div>
              <div className="md-vars">
                <span style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginRight:4}}>Variables :</span>
                {["{{locataire.nom}}","{{proprietaire.nom}}","{{bien.adresse}}","{{loyer}}","{{date_debut}}","{{date_fin}}","{{caution}}"].map(v=>(
                  <span key={v} className="md-var" onClick={()=>{if(quillRef.current){const range=quillRef.current.getSelection();quillRef.current.insertText(range?range.index:0,v)}}}>{v}</span>
                ))}
              </div>
              <div id="quill-editor-zone" style={{background:"#fff"}}/>
            </div>

            {/* Panel droit: Preview */}
            <div className="md-preview-panel">
              <div className="md-prev-head">
                <span style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.5)"}}>Apercu A4</span>
                <span style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>{currentTpl.name}</span>
              </div>
              <div className="md-prev-body">
                <div style={{transform:"scale(0.55)",transformOrigin:"top left",width:"181.8%"}} dangerouslySetInnerHTML={{__html:renderFull(currentTpl,entete,bailContent)}}/>
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
<h3>Article 1 - OBJET</h3>
<p>Le Bailleur loue au Locataire les locaux situes a : <strong>{{bien.adresse}}</strong></p>
<h3>Article 2 - DUREE</h3>
<p>Le present bail est consenti pour une duree de {{duree_mois}} mois, prenant effet le <strong>{{date_debut}}</strong> et se terminant le <strong>{{date_fin}}</strong>.</p>
<h3>Article 3 - LOYER</h3>
<p>Le loyer mensuel est fixe a la somme de <strong>{{loyer}} FCFA</strong> payable le premier de chaque mois.</p>
<h3>Article 4 - DEPOT DE GARANTIE</h3>
<p>Il est verse a la signature du present bail un depot de garantie de <strong>{{caution}} FCFA</strong>.</p>
<h3>Article 5 - OBLIGATIONS DU LOCATAIRE</h3>
<p>Le Locataire s engage a : user paisiblement des locaux, payer le loyer aux echeances convenues, maintenir les locaux en bon etat d entretien, ne pas sous-louer sans accord ecrit du Bailleur.</p>
<h3>Article 6 - OBLIGATIONS DU BAILLEUR</h3>
<p>Le Bailleur s engage a : delivrer un logement en bon etat, assurer la jouissance paisible, effectuer les reparations necessaires.</p>
<h3>Article 7 - RESILIATION</h3>
<p>En cas de resiliation anticipee, un preavis de {{delai_preavis}} jours devra etre respecte.</p>
<br/>
<p>Fait a ____________, le ____________</p>
<br/>
<p><strong>Signature du Bailleur</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>Signature du Locataire</strong></p>
<br/><br/><br/>
<p>_________________________ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; _________________________</p>`
}
