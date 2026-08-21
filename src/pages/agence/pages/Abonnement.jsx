import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'
import {
  ArrowClockwise16Regular as RefreshCw,
  ArrowDownload16Regular as Download,
  DocumentArrowDown16Regular as FileDown,
  People16Regular as Users,
  Search16Regular as Search,
  List16Regular as List,
  ArrowSort16Regular as ArrowSort,
  ArrowSortUp16Regular as ArrowSortUp,
  ArrowSortDown16Regular as ArrowSortDown,
  ChevronDown16Regular as ChevronDown,
  Info16Regular as Info,
  CheckmarkCircle16Filled as CheckCircle2,
  MoreHorizontal16Regular as MoreHorizontal,
  DocumentText16Regular as FileText,
  DocumentText32Regular as FileTextLarge,
  BookOpen16Regular as BookOpen,
  Link16Regular as Link2,
  Dismiss16Regular as X,
  DataBarVertical16Regular as BarChartIcon,
} from '@fluentui/react-icons'

const FACTURE_STATUT_CFG = {
  paye:    { color:'#00c896', bg:'rgba(0,200,150,0.1)', label:'Payee' },
  en_attente: { color:'#f59e0b', bg:'rgba(245,158,11,0.1)', label:'En attente' },
  echoue:  { color:'#ef4444', bg:'rgba(239,68,68,0.1)', label:'Echouee' },
  annulee: { color:'#8b949e', bg:'rgba(139,148,158,0.1)', label:'Annulee' },
}

const PAYS = [
  { nom:'Afghanistan', indicatif:'93', code:'AF' },
  { nom:'Åland Islands', indicatif:'358', code:'AX' },
  { nom:'Albania', indicatif:'355', code:'AL' },
  { nom:'Algeria', indicatif:'213', code:'DZ' },
  { nom:'American Samoa', indicatif:'1684', code:'AS' },
  { nom:'Andorra', indicatif:'376', code:'AD' },
  { nom:'Angola', indicatif:'244', code:'AO' },
  { nom:'Anguilla', indicatif:'1264', code:'AI' },
  { nom:'Antarctica', indicatif:'672', code:'AQ' },
  { nom:'Antigua and Barbuda', indicatif:'1268', code:'AG' },
  { nom:'Argentina', indicatif:'54', code:'AR' },
  { nom:'Armenia', indicatif:'374', code:'AM' },
  { nom:'Aruba', indicatif:'297', code:'AW' },
  { nom:'Australia', indicatif:'61', code:'AU' },
  { nom:'Austria', indicatif:'43', code:'AT' },
  { nom:'Azerbaijan', indicatif:'994', code:'AZ' },
  { nom:'Bahamas', indicatif:'1242', code:'BS' },
  { nom:'Bahrain', indicatif:'973', code:'BH' },
  { nom:'Bangladesh', indicatif:'880', code:'BD' },
  { nom:'Barbados', indicatif:'1246', code:'BB' },
  { nom:'Belarus', indicatif:'375', code:'BY' },
  { nom:'Belgium', indicatif:'32', code:'BE' },
  { nom:'Belize', indicatif:'501', code:'BZ' },
  { nom:'Benin', indicatif:'229', code:'BJ', longueur:8 },
  { nom:'Bermuda', indicatif:'1441', code:'BM' },
  { nom:'Bhutan', indicatif:'975', code:'BT' },
  { nom:'Bolivia', indicatif:'591', code:'BO' },
  { nom:'Bosnia and Herzegovina', indicatif:'387', code:'BA' },
  { nom:'Botswana', indicatif:'267', code:'BW' },
  { nom:'Bouvet Island', indicatif:'47', code:'BV' },
  { nom:'Brazil', indicatif:'55', code:'BR' },
  { nom:'British Indian Ocean Territory', indicatif:'246', code:'IO' },
  { nom:'Brunei Darussalam', indicatif:'673', code:'BN' },
  { nom:'Bulgaria', indicatif:'359', code:'BG' },
  { nom:'Burkina Faso', indicatif:'226', code:'BF' },
  { nom:'Burundi', indicatif:'257', code:'BI' },
  { nom:'Cambodia', indicatif:'855', code:'KH' },
  { nom:'Cameroon', indicatif:'237', code:'CM' },
  { nom:'Canada', indicatif:'1', code:'CA' },
  { nom:'Cape Verde', indicatif:'238', code:'CV' },
  { nom:'Cayman Islands', indicatif:'1345', code:'KY' },
  { nom:'Central African Republic', indicatif:'236', code:'CF' },
  { nom:'Chad', indicatif:'235', code:'TD' },
  { nom:'Chile', indicatif:'56', code:'CL' },
  { nom:'China', indicatif:'86', code:'CN' },
  { nom:'Christmas Island', indicatif:'61', code:'CX' },
  { nom:'Cocos (Keeling) Islands', indicatif:'61', code:'CC' },
  { nom:'Colombia', indicatif:'57', code:'CO' },
  { nom:'Comoros', indicatif:'269', code:'KM' },
  { nom:'Congo', indicatif:'242', code:'CG' },
  { nom:'Congo, The Democratic Republic of the Congo', indicatif:'243', code:'CD' },
  { nom:'Cook Islands', indicatif:'682', code:'CK' },
  { nom:'Costa Rica', indicatif:'506', code:'CR' },
  { nom:'Côte d\'Ivoire', indicatif:'225', code:'CI' },
  { nom:'Croatia', indicatif:'385', code:'HR' },
  { nom:'Cuba', indicatif:'53', code:'CU' },
  { nom:'Cyprus', indicatif:'357', code:'CY' },
  { nom:'Czech Republic', indicatif:'420', code:'CZ' },
  { nom:'Denmark', indicatif:'45', code:'DK' },
  { nom:'Djibouti', indicatif:'253', code:'DJ' },
  { nom:'Dominica', indicatif:'1767', code:'DM' },
  { nom:'Dominican Republic', indicatif:'1849', code:'DO' },
  { nom:'Ecuador', indicatif:'593', code:'EC' },
  { nom:'Egypt', indicatif:'20', code:'EG' },
  { nom:'El Salvador', indicatif:'503', code:'SV' },
  { nom:'Equatorial Guinea', indicatif:'240', code:'GQ' },
  { nom:'Eritrea', indicatif:'291', code:'ER' },
  { nom:'Estonia', indicatif:'372', code:'EE' },
  { nom:'Ethiopia', indicatif:'251', code:'ET' },
  { nom:'Falkland Islands (Malvinas)', indicatif:'500', code:'FK' },
  { nom:'Faroe Islands', indicatif:'298', code:'FO' },
  { nom:'Fiji', indicatif:'679', code:'FJ' },
  { nom:'Finland', indicatif:'358', code:'FI' },
  { nom:'France', indicatif:'33', code:'FR' },
  { nom:'French Guiana', indicatif:'594', code:'GF' },
  { nom:'French Polynesia', indicatif:'689', code:'PF' },
  { nom:'French Southern Territories', indicatif:'262', code:'TF' },
  { nom:'Gabon', indicatif:'241', code:'GA' },
  { nom:'Gambia', indicatif:'220', code:'GM' },
  { nom:'Georgia', indicatif:'995', code:'GE' },
  { nom:'Germany', indicatif:'49', code:'DE' },
  { nom:'Ghana', indicatif:'233', code:'GH' },
  { nom:'Gibraltar', indicatif:'350', code:'GI' },
  { nom:'Greece', indicatif:'30', code:'GR' },
  { nom:'Greenland', indicatif:'299', code:'GL' },
  { nom:'Grenada', indicatif:'1473', code:'GD' },
  { nom:'Guadeloupe', indicatif:'590', code:'GP' },
  { nom:'Guam', indicatif:'1671', code:'GU' },
  { nom:'Guatemala', indicatif:'502', code:'GT' },
  { nom:'Guernsey', indicatif:'44', code:'GG' },
  { nom:'Guinea', indicatif:'224', code:'GN' },
  { nom:'Guinea-Bissau', indicatif:'245', code:'GW' },
  { nom:'Guyana', indicatif:'592', code:'GY' },
  { nom:'Haiti', indicatif:'509', code:'HT' },
  { nom:'Heard Island and Mcdonald Islands', indicatif:'672', code:'HM' },
  { nom:'Holy See (Vatican City State)', indicatif:'379', code:'VA' },
  { nom:'Honduras', indicatif:'504', code:'HN' },
  { nom:'Hong Kong', indicatif:'852', code:'HK' },
  { nom:'Hungary', indicatif:'36', code:'HU' },
  { nom:'Iceland', indicatif:'354', code:'IS' },
  { nom:'India', indicatif:'91', code:'IN' },
  { nom:'Indonesia', indicatif:'62', code:'ID' },
  { nom:'Iran', indicatif:'98', code:'IR' },
  { nom:'Iraq', indicatif:'964', code:'IQ' },
  { nom:'Ireland', indicatif:'353', code:'IE' },
  { nom:'Isle of Man', indicatif:'44', code:'IM' },
  { nom:'Israel', indicatif:'972', code:'IL' },
  { nom:'Italy', indicatif:'39', code:'IT' },
  { nom:'Jamaica', indicatif:'1876', code:'JM' },
  { nom:'Japan', indicatif:'81', code:'JP' },
  { nom:'Jersey', indicatif:'44', code:'JE' },
  { nom:'Jordan', indicatif:'962', code:'JO' },
  { nom:'Kazakhstan', indicatif:'7', code:'KZ' },
  { nom:'Kenya', indicatif:'254', code:'KE' },
  { nom:'Kiribati', indicatif:'686', code:'KI' },
  { nom:'Korea, Democratic People\'s Republic of Korea', indicatif:'850', code:'KP' },
  { nom:'Korea, Republic of South Korea', indicatif:'82', code:'KR' },
  { nom:'Kosovo', indicatif:'383', code:'XK' },
  { nom:'Kuwait', indicatif:'965', code:'KW' },
  { nom:'Kyrgyzstan', indicatif:'996', code:'KG' },
  { nom:'Laos', indicatif:'856', code:'LA' },
  { nom:'Latvia', indicatif:'371', code:'LV' },
  { nom:'Lebanon', indicatif:'961', code:'LB' },
  { nom:'Lesotho', indicatif:'266', code:'LS' },
  { nom:'Liberia', indicatif:'231', code:'LR' },
  { nom:'Libyan Arab Jamahiriya', indicatif:'218', code:'LY' },
  { nom:'Liechtenstein', indicatif:'423', code:'LI' },
  { nom:'Lithuania', indicatif:'370', code:'LT' },
  { nom:'Luxembourg', indicatif:'352', code:'LU' },
  { nom:'Macao', indicatif:'853', code:'MO' },
  { nom:'Macedonia', indicatif:'389', code:'MK' },
  { nom:'Madagascar', indicatif:'261', code:'MG' },
  { nom:'Malawi', indicatif:'265', code:'MW' },
  { nom:'Malaysia', indicatif:'60', code:'MY' },
  { nom:'Maldives', indicatif:'960', code:'MV' },
  { nom:'Mali', indicatif:'223', code:'ML' },
  { nom:'Malta', indicatif:'356', code:'MT' },
  { nom:'Marshall Islands', indicatif:'692', code:'MH' },
  { nom:'Martinique', indicatif:'596', code:'MQ' },
  { nom:'Mauritania', indicatif:'222', code:'MR' },
  { nom:'Mauritius', indicatif:'230', code:'MU' },
  { nom:'Mayotte', indicatif:'262', code:'YT' },
  { nom:'Mexico', indicatif:'52', code:'MX' },
  { nom:'Micronesia, Federated States of Micronesia', indicatif:'691', code:'FM' },
  { nom:'Moldova', indicatif:'373', code:'MD' },
  { nom:'Monaco', indicatif:'377', code:'MC' },
  { nom:'Mongolia', indicatif:'976', code:'MN' },
  { nom:'Montenegro', indicatif:'382', code:'ME' },
  { nom:'Montserrat', indicatif:'1664', code:'MS' },
  { nom:'Morocco', indicatif:'212', code:'MA' },
  { nom:'Mozambique', indicatif:'258', code:'MZ' },
  { nom:'Myanmar', indicatif:'95', code:'MM' },
  { nom:'Namibia', indicatif:'264', code:'NA' },
  { nom:'Nauru', indicatif:'674', code:'NR' },
  { nom:'Nepal', indicatif:'977', code:'NP' },
  { nom:'Netherlands', indicatif:'31', code:'NL' },
  { nom:'Netherlands Antilles', indicatif:'599', code:'AN' },
  { nom:'New Caledonia', indicatif:'687', code:'NC' },
  { nom:'New Zealand', indicatif:'64', code:'NZ' },
  { nom:'Nicaragua', indicatif:'505', code:'NI' },
  { nom:'Niger', indicatif:'227', code:'NE' },
  { nom:'Nigeria', indicatif:'234', code:'NG' },
  { nom:'Niue', indicatif:'683', code:'NU' },
  { nom:'Norfolk Island', indicatif:'672', code:'NF' },
  { nom:'Northern Mariana Islands', indicatif:'1670', code:'MP' },
  { nom:'Norway', indicatif:'47', code:'NO' },
  { nom:'Oman', indicatif:'968', code:'OM' },
  { nom:'Pakistan', indicatif:'92', code:'PK' },
  { nom:'Palau', indicatif:'680', code:'PW' },
  { nom:'Palestinian Territory, Occupied', indicatif:'970', code:'PS' },
  { nom:'Panama', indicatif:'507', code:'PA' },
  { nom:'Papua New Guinea', indicatif:'675', code:'PG' },
  { nom:'Paraguay', indicatif:'595', code:'PY' },
  { nom:'Peru', indicatif:'51', code:'PE' },
  { nom:'Philippines', indicatif:'63', code:'PH' },
  { nom:'Pitcairn', indicatif:'64', code:'PN' },
  { nom:'Poland', indicatif:'48', code:'PL' },
  { nom:'Portugal', indicatif:'351', code:'PT' },
  { nom:'Puerto Rico', indicatif:'1939', code:'PR' },
  { nom:'Qatar', indicatif:'974', code:'QA' },
  { nom:'Romania', indicatif:'40', code:'RO' },
  { nom:'Russia', indicatif:'7', code:'RU' },
  { nom:'Rwanda', indicatif:'250', code:'RW' },
  { nom:'Reunion', indicatif:'262', code:'RE' },
  { nom:'Saint Barthelemy', indicatif:'590', code:'BL' },
  { nom:'Saint Helena, Ascension and Tristan Da Cunha', indicatif:'290', code:'SH' },
  { nom:'Saint Kitts and Nevis', indicatif:'1869', code:'KN' },
  { nom:'Saint Lucia', indicatif:'1758', code:'LC' },
  { nom:'Saint Martin', indicatif:'590', code:'MF' },
  { nom:'Saint Pierre and Miquelon', indicatif:'508', code:'PM' },
  { nom:'Saint Vincent and the Grenadines', indicatif:'1784', code:'VC' },
  { nom:'Samoa', indicatif:'685', code:'WS' },
  { nom:'San Marino', indicatif:'378', code:'SM' },
  { nom:'Sao Tome and Principe', indicatif:'239', code:'ST' },
  { nom:'Saudi Arabia', indicatif:'966', code:'SA' },
  { nom:'Senegal', indicatif:'221', code:'SN', longueur:9 },
  { nom:'Serbia', indicatif:'381', code:'RS' },
  { nom:'Seychelles', indicatif:'248', code:'SC' },
  { nom:'Sierra Leone', indicatif:'232', code:'SL' },
  { nom:'Singapore', indicatif:'65', code:'SG' },
  { nom:'Slovakia', indicatif:'421', code:'SK' },
  { nom:'Slovenia', indicatif:'386', code:'SI' },
  { nom:'Solomon Islands', indicatif:'677', code:'SB' },
  { nom:'Somalia', indicatif:'252', code:'SO' },
  { nom:'South Africa', indicatif:'27', code:'ZA' },
  { nom:'South Sudan', indicatif:'211', code:'SS' },
  { nom:'South Georgia and the South Sandwich Islands', indicatif:'500', code:'GS' },
  { nom:'Spain', indicatif:'34', code:'ES' },
  { nom:'Sri Lanka', indicatif:'94', code:'LK' },
  { nom:'Sudan', indicatif:'249', code:'SD' },
  { nom:'Suriname', indicatif:'597', code:'SR' },
  { nom:'Svalbard and Jan Mayen', indicatif:'47', code:'SJ' },
  { nom:'Swaziland', indicatif:'268', code:'SZ' },
  { nom:'Sweden', indicatif:'46', code:'SE' },
  { nom:'Switzerland', indicatif:'41', code:'CH' },
  { nom:'Syrian Arab Republic', indicatif:'963', code:'SY' },
  { nom:'Taiwan', indicatif:'886', code:'TW' },
  { nom:'Tajikistan', indicatif:'992', code:'TJ' },
  { nom:'Tanzania, United Republic of Tanzania', indicatif:'255', code:'TZ' },
  { nom:'Thailand', indicatif:'66', code:'TH' },
  { nom:'Timor-Leste', indicatif:'670', code:'TL' },
  { nom:'Togo', indicatif:'228', code:'TG', longueur:8 },
  { nom:'Tokelau', indicatif:'690', code:'TK' },
  { nom:'Tonga', indicatif:'676', code:'TO' },
  { nom:'Trinidad and Tobago', indicatif:'1868', code:'TT' },
  { nom:'Tunisia', indicatif:'216', code:'TN' },
  { nom:'Turkey', indicatif:'90', code:'TR' },
  { nom:'Turkmenistan', indicatif:'993', code:'TM' },
  { nom:'Turks and Caicos Islands', indicatif:'1649', code:'TC' },
  { nom:'Tuvalu', indicatif:'688', code:'TV' },
  { nom:'Uganda', indicatif:'256', code:'UG' },
  { nom:'Ukraine', indicatif:'380', code:'UA' },
  { nom:'United Arab Emirates', indicatif:'971', code:'AE' },
  { nom:'United Kingdom', indicatif:'44', code:'GB' },
  { nom:'United States', indicatif:'1', code:'US' },
  { nom:'Uruguay', indicatif:'598', code:'UY' },
  { nom:'Uzbekistan', indicatif:'998', code:'UZ' },
  { nom:'Vanuatu', indicatif:'678', code:'VU' },
  { nom:'Venezuela', indicatif:'58', code:'VE' },
  { nom:'Vietnam', indicatif:'84', code:'VN' },
  { nom:'Virgin Islands, British', indicatif:'1284', code:'VG' },
  { nom:'Virgin Islands, U.S.', indicatif:'1340', code:'VI' },
  { nom:'Wallis and Futuna', indicatif:'681', code:'WF' },
  { nom:'Yemen', indicatif:'967', code:'YE' },
  { nom:'Zambia', indicatif:'260', code:'ZM' },
  { nom:'Zimbabwe', indicatif:'263', code:'ZW' },
]

const CARTES = [
  { id:'visa', label:'Visa', logo:'/logos/visa.svg' },
  { id:'mastercard', label:'Mastercard', logo:'/logos/mastercard.svg' },
  { id:'amex', label:'American Express', logo:'/logos/amex.svg' },
  { id:'discover', label:'Discover', logo:'/logos/discover.png' },
]

const OPERATEURS = [
  { id:'MTN', label:'MTN Mobile Money', pays:['Benin'], codes:{ Benin:'MTN_MOMO_BEN' } },
  { id:'MOOV', label:'Moov Money', pays:['Benin','Togo'], codes:{ Benin:'MOOV_BEN', Togo:'MOOV_TGO' }, logo:'/logos/moov-money.png' },
  { id:'ORANGE', label:'Orange Money', pays:['Senegal'], codes:{ Senegal:'ORANGE_SEN' }, logo:'/logos/orange-money.png' },
  { id:'WAVE', label:'Wave', pays:['Senegal'], codes:{ Senegal:'WAVE_SEN' }, logo:'/logos/wave.png' },
]

const DEPARTEMENTS_VILLES = {
  Benin: {
    'Alibori': ['Banikoara','Gogounou','Kandi','Karimama','Malanville','Segbana'],
    'Atacora': ['Boukoumbe','Cobly','Kerou','Kouande','Materi','Natitingou','Pehunco','Tanguieta','Toucountouna'],
    'Atlantique': ['Abomey-Calavi','Allada','Kpomasse','Ouidah','So-Ava','Toffo','Tori-Bossito','Ze'],
    'Borgou': ['Bembereke','Kalale','Ndali','Nikki','Parakou','Perere','Sinende','Tchaourou'],
    'Collines': ['Bante','Dassa-Zoume','Glazoue','Ouesse','Savalou','Save'],
    'Couffo': ['Aplahoue','Djakotomey','Dogbo','Klouekanme','Lalo','Toviklin'],
    'Donga': ['Bassila','Copargo','Djougou','Ouake'],
    'Littoral': ['Cotonou'],
    'Mono': ['Athieme','Bopa','Come','Grand-Popo','Houeyogbe','Lokossa'],
    'Oueme': ['Adjarra','Adjohoun','Agueagues','Akpro-Misserete','Avrankou','Bonou','Dangbo','Porto-Novo','Seme-Kpodji'],
    'Plateau': ['Adja-Ouere','Ifangni','Ketou','Pobe','Sakete'],
    'Zou': ['Abomey','Agbangnizoun','Bohicon','Cove','Djidja','Ouinhi','Za-Kpota','Zagnanado','Zogbodomey'],
  },
  Togo: {
    'Maritime': ['Lome','Tsevie','Aneho','Tabligbo','Vogan'],
    'Plateaux': ['Atakpame','Kpalime','Notse','Amlame','Badou'],
    'Centrale': ['Sokode','Sotouboua','Tchamba','Bassar'],
    'Kara': ['Kara','Bafilo','Niamtougou','Pagouda'],
    'Savanes': ['Dapaong','Mango','Cinkasse'],
  },
  Senegal: {
    'Dakar': ['Dakar','Pikine','Guediawaye','Rufisque','Bargny'],
    'Thies': ['Thies','Mbour','Tivaouane','Joal-Fadiouth'],
    'Diourbel': ['Diourbel','Touba','Mbacke','Bambey'],
    'Fatick': ['Fatick','Foundiougne','Gossas'],
    'Kaolack': ['Kaolack','Guinguineo','Nioro du Rip'],
    'Kaffrine': ['Kaffrine','Birkelane','Koungheul','Malem Hodar'],
    'Louga': ['Louga','Kebemer','Linguere'],
    'Saint-Louis': ['Saint-Louis','Dagana','Podor','Richard-Toll'],
    'Matam': ['Matam','Kanel','Ranerou'],
    'Tambacounda': ['Tambacounda','Bakel','Goudiry','Koumpentoum'],
    'Kedougou': ['Kedougou','Salemata','Saraya'],
    'Kolda': ['Kolda','Velingara','Medina Yoro Foula'],
    'Sedhiou': ['Sedhiou','Bounkiling','Goudomp'],
    'Ziguinchor': ['Ziguinchor','Bignona','Oussouye'],
  },
}

const operateursDisponibles = (paysNom) => OPERATEURS.filter(o => o.pays.includes(paysNom))

const validerMethode = (m) => {
  const err = {}
  if (!m.pays) err.pays = 'Selectionnez un pays'
  else if (operateursDisponibles(m.pays).length === 0) err.operateur = 'Mobile Money n est pas disponible pour ce pays'
  else if (!m.operateur) err.operateur = 'Selectionnez un operateur'

  if (!m.nomTitulaire.trim()) err.nomTitulaire = 'Entrez le nom du titulaire'

  const clean = (m.telephone || '').replace(/[\s-]/g, '')
  const paysInfo = PAYS.find(p => p.nom === m.pays)
  if (!clean) err.telephone = 'Entrez un numero de telephone'
  else if (!/^\d+$/.test(clean)) err.telephone = 'Chiffres uniquement'
  else if (paysInfo?.longueur && clean.length !== paysInfo.longueur) err.telephone = `${paysInfo.longueur} chiffres attendus (hors indicatif)`
  else if (!paysInfo?.longueur && (clean.length < 4 || clean.length > 14)) err.telephone = 'Numero invalide'

  if (!m.adresse1.trim()) err.adresse1 = 'Entrez la ligne d adresse 1'
  if (DEPARTEMENTS_VILLES[m.pays] && !m.departement) err.departement = 'Selectionnez un departement'
  if (!m.ville.trim()) err.ville = 'Entrez une ville'
  return err
}

const bB = { display:'inline-flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:2,fontSize:13,fontWeight:500,cursor:'pointer',border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.6)',fontFamily:'Inter,sans-serif',transition:'all 0.15s' }
const bP = { ...bB, background:'#0078d4', borderColor:'#0078d4', color:'#fff' }
const fmt = n => Number(n||0).toLocaleString('fr-FR')

const fieldStyle = (hasError, disabled) => ({
  width:'100%', padding:'10px 34px 10px 12px', background:disabled?'rgba(255,255,255,0.02)':'rgba(255,255,255,0.06)',
  border:`1px solid ${hasError ? '#ef4444' : 'rgba(255,255,255,0.35)'}`, borderRadius:2,
  color:'#e6edf3', fontFamily:'Inter,sans-serif', fontSize:14, outline:'none', colorScheme:'dark', boxSizing:'border-box',
})

function Chevron({ error }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={error?'#ef4444':'rgba(255,255,255,0.5)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
      <path d="M6 9l6 6 6-6"/>
    </svg>
  )
}

function FieldError({ message }) {
  if (!message) return null
  return <div style={{ fontSize:11.5, color:'#ef4444', marginTop:5 }}>{message}</div>
}

function OperateurBadge({ operateurId, size=32 }) {
  const op = OPERATEURS.find(o => o.id === operateurId)
  if (op?.logo) return <img src={op.logo} alt={op.label} style={{ width:size, height:size, objectFit:'contain', flexShrink:0 }}/>
  return <div style={{ width:size, height:size, background:'#ffcc00', display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.26, fontWeight:800, color:'#111', flexShrink:0 }}>MTN</div>
}

function Combobox({ value, onChange, options, placeholder, freeText=false, disabled=false, error=false }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)
  useEffect(() => {
    const onClick = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])
  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <input
        disabled={disabled}
        value={open ? query : (value || '')}
        onFocus={() => { setOpen(true); setQuery('') }}
        onChange={e => { setQuery(e.target.value); if (freeText) onChange(e.target.value) }}
        placeholder={placeholder}
        style={fieldStyle(error, disabled)}
      />
      <Chevron error={error}/>
      {open && filtered.length > 0 && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, maxHeight:200, overflowY:'auto', background:'#161b22', border:'1px solid rgba(255,255,255,0.25)', borderRadius:2, zIndex:20, boxShadow:'0 8px 24px rgba(0,0,0,0.4)' }}>
          {filtered.map(o => (
            <div key={o} onMouseDown={() => { onChange(o); setOpen(false); setQuery('') }}
              style={{ padding:'8px 12px', fontSize:13.5, color:'#e6edf3', cursor:'pointer' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'}
              onMouseLeave={e=>e.currentTarget.style.background='none'}>{o}</div>
          ))}
        </div>
      )}
    </div>
  )
}

const FLUENT_TABLE_CSS = `
.fl-row { border-left:2px solid transparent; transition:background-color 0.1s ease; }
.fl-row:hover { background-color:#252525; }
.fl-row-selected { background-color:#292929; border-left:2px solid #0078d4; }
.fl-checkbox { width:16px; height:16px; border-radius:2px; border:1px solid rgba(255,255,255,0.35); background:transparent; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; transition:border-color 0.1s ease, background-color 0.1s ease; }
.fl-row:hover .fl-checkbox { border-color:#0078d4; }
.fl-checkbox-checked, .fl-row:hover .fl-checkbox-checked { background:#0078d4; border-color:#0078d4; }
.fl-th { position:relative; text-align:left; padding:0 12px; height:36px; font-size:11px; font-weight:600; color:rgba(255,255,255,0.5); background:rgba(255,255,255,0.035); border-bottom:1px solid #2b2b2b; white-space:nowrap; overflow:hidden; }
.fl-td { padding:0 12px; height:36px; vertical-align:middle; font-size:13px; color:#ffffff; border-bottom:1px solid #2b2b2b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
`

const FACTURE_COL_DEFAULTS = {
  checkbox:36, numero:190, created_at:160, periode_debut:180,
  agence_id:180, montant:150, statut:200, paie:100, telecharger:190,
}
const FACTURE_COLONNES = [
  { key:'numero', label:'ID de facture', field:'numero' },
  { key:'created_at', label:'Date de facture (UTC)', field:'created_at' },
  { key:'periode_debut', label:'Periode de facturation', field:'periode_debut' },
  { key:'agence_id', label:'Profil de facturation', field:'agence_id' },
  { key:'montant', label:'Montant total', field:'montant' },
  { key:'statut', label:'Etat', field:'statut' },
  { key:'paie', label:'Paie', sortable:false },
  { key:'telecharger', label:'Telecharger la facture', sortable:false },
]

function FluentCheckbox({ checked, onChange }) {
  return (
    <div role="checkbox" aria-checked={checked} onClick={e=>{e.stopPropagation();onChange(!checked)}}
      className={`fl-checkbox${checked ? ' fl-checkbox-checked' : ''}`}>
      {checked && (
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
          <path d="M2 8l4 4 8-8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  )
}

function ResizeHandle({ onResize }) {
  const dragging = useRef(false)
  const lastX = useRef(0)
  useEffect(() => {
    const onMove = e => {
      if (!dragging.current) return
      const delta = e.clientX - lastX.current
      lastX.current = e.clientX
      onResize(delta)
    }
    const onUp = () => {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [onResize])
  return (
    <div
      onMouseDown={e => { e.preventDefault(); e.stopPropagation(); dragging.current = true; lastX.current = e.clientX; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none' }}
      onClick={e => e.stopPropagation()}
      style={{ position:'absolute', top:0, right:-4, width:8, height:'100%', cursor:'col-resize', zIndex:5 }}
    />
  )
}

function ColHeader({ label, sortable=true, sortDir=null, onSort, onResize }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top:0, left:0 })
  const btnRef = useRef(null)
  const menuRef = useRef(null)
  useEffect(() => {
    if (!open) return
    const onClick = e => {
      if (btnRef.current?.contains(e.target)) return
      if (menuRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const onScroll = () => setOpen(false)
    document.addEventListener('mousedown', onClick)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('mousedown', onClick)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])
  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      const menuWidth = 170
      const overflowsRight = r.left - 8 + menuWidth > window.innerWidth
      setPos({ top: r.bottom + 9, left: overflowsRight ? r.right - menuWidth + 8 : r.left - 8, flip: overflowsRight })
    }
    setOpen(o => !o)
  }
  const menuItemStyle = { padding:'8px 14px', fontSize:13, color:'#ffffff', cursor:'pointer', whiteSpace:'nowrap' }
  const SortIcon = sortDir === 'asc' ? ArrowSortUp : sortDir === 'desc' ? ArrowSortDown : ArrowSort
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5, position:'relative' }}>
      <span style={{ textTransform:'uppercase', overflow:'hidden', textOverflow:'ellipsis' }}>{label}</span>
      {sortable && <SortIcon style={{ opacity:sortDir?1:0.5, flexShrink:0, color:sortDir?'#4da6ff':undefined }}/>}
      <button ref={btnRef} onClick={e=>{e.stopPropagation();toggle()}}
        style={{ background:'none', border:'none', padding:0, display:'flex', cursor:'pointer', color:'inherit', flexShrink:0 }}>
        <ChevronDown style={{ opacity:0.5, flexShrink:0 }}/>
      </button>
      {onResize && <ResizeHandle onResize={onResize}/>}
      {open && createPortal(
        <div ref={menuRef} style={{ position:'fixed', top:pos.top, left:pos.left, background:'#202020', border:'1px solid rgba(255,255,255,0.12)', borderRadius:4, boxShadow:'0 8px 24px rgba(0,0,0,0.5)', zIndex:1000, minWidth:170, padding:'4px 0', textTransform:'none', fontWeight:400, fontFamily:'Inter,sans-serif' }}>
          <div style={{ position:'absolute', top:-5, left:pos.flip?undefined:14, right:pos.flip?14:undefined, width:10, height:10, background:'#202020', borderLeft:'1px solid rgba(255,255,255,0.12)', borderTop:'1px solid rgba(255,255,255,0.12)', transform:'rotate(45deg)' }}/>
          <div style={menuItemStyle}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.08)'}
            onMouseLeave={e=>e.currentTarget.style.background='none'}
            onClick={()=>setOpen(false)}>Redimensionner <span style={{opacity:0.4,fontSize:11}}>(glisser le bord)</span></div>
          {sortable && (
            <div style={menuItemStyle}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.08)'}
              onMouseLeave={e=>e.currentTarget.style.background='none'}
              onClick={()=>{onSort?.();setOpen(false)}}>Trier {sortDir==='asc' ? '(Z → A)' : sortDir==='desc' ? '(reinitialiser)' : '(A → Z)'}</div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

function FilterPill({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const onClick = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])
  const current = options.find(o => o.value === value)
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px', background:'#252525', border:'1px solid rgba(255,255,255,0.1)', borderRadius:4, color:'#ffffff', fontSize:12, fontWeight:600, fontFamily:'Inter,sans-serif', cursor:'pointer' }}
        onMouseEnter={e=>e.currentTarget.style.background='#2f2f2f'}
        onMouseLeave={e=>e.currentTarget.style.background='#252525'}>
        <span>{label} : {current?.label ?? value}</span>
        <ChevronDown style={{ opacity:0.6, flexShrink:0 }}/>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, background:'#202020', border:'1px solid rgba(255,255,255,0.12)', borderRadius:4, boxShadow:'0 8px 24px rgba(0,0,0,0.5)', zIndex:30, minWidth:190, padding:'4px 0' }}>
          {options.map(o => (
            <div key={o.value} onClick={()=>{onChange(o.value);setOpen(false)}}
              style={{ padding:'8px 14px', fontSize:13, color:'#ffffff', cursor:'pointer', whiteSpace:'nowrap' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.08)'}
              onMouseLeave={e=>e.currentTarget.style.background='none'}>{o.label}</div>
          ))}
        </div>
      )}
    </div>
  )
}

function SearchBox({ value, onChange, placeholder='Rechercher', style={} }) {
  return (
    <div style={{ position:'relative', ...style }}>
      <Search style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.35)', pointerEvents:'none' }}/>
      <input value={value} onChange={onChange} placeholder={placeholder}
        style={{ width:'100%', padding:'7px 12px 7px 30px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:2, color:'#e6edf3', fontSize:12.5, fontFamily:'Inter,sans-serif', outline:'none', boxSizing:'border-box' }}/>
    </div>
  )
}

const VUES_FACTURES = [
  { id:'liste', label:'Liste', Icon:List },
  { id:'graphique', label:'Graphique', Icon:BarChartIcon },
]

function ViewSwitcher({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const onClick = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])
  const courant = VUES_FACTURES.find(v => v.id === value) || VUES_FACTURES[0]
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:2, color:'#e6edf3', fontSize:12.5, fontFamily:'Inter,sans-serif', cursor:'pointer', minWidth:110 }}>
        <courant.Icon/>
        <span style={{ flex:1, textAlign:'left' }}>{courant.label}</span>
        <ChevronDown style={{ opacity:0.5, flexShrink:0 }}/>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'100%', right:0, marginTop:4, background:'#1f1f1f', border:'1px solid rgba(255,255,255,0.12)', borderRadius:2, boxShadow:'0 8px 24px rgba(0,0,0,0.4)', zIndex:30, minWidth:130, padding:'4px 0' }}>
          {VUES_FACTURES.map(v => (
            <div key={v.id} onClick={()=>{onChange(v.id);setOpen(false)}}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', fontSize:13, color:'#e6edf3', cursor:'pointer', background:v.id===value?'rgba(0,120,212,0.12)':'none' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'}
              onMouseLeave={e=>e.currentTarget.style.background=v.id===value?'rgba(0,120,212,0.12)':'none'}>
              <v.Icon/><span>{v.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FactureBarChart({ factures, fmt }) {
  const [hoverIdx, setHoverIdx] = useState(null)
  const parMois = {}
  factures.forEach(f => {
    const d = new Date(f.created_at)
    const cle = `${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
    parMois[cle] = (parMois[cle]||0) + Number(f.montant||0)
  })
  const entrees = Object.entries(parMois).sort((a,b) => {
    const [ma,ya] = a[0].split('/'); const [mb,yb] = b[0].split('/')
    return new Date(ya,ma-1) - new Date(yb,mb-1)
  })
  if (entrees.length === 0) {
    return (
      <div style={{ textAlign:'center', padding:'60px', color:'rgba(255,255,255,0.3)' }}>
        <BarChartIcon style={{ marginBottom:12, opacity:0.3, width:32, height:32 }}/>
        <div style={{ fontSize:14 }}>Aucune donnee a afficher</div>
      </div>
    )
  }
  const maxVal = Math.max(...entrees.map(([,v])=>v), 1)
  const paliers = 4
  const step = Math.ceil(maxVal/paliers/100)*100 || 1
  const plafond = step*paliers
  return (
    <div style={{ padding:'24px 24px 8px', background:'rgba(255,255,255,0.02)', borderRadius:2 }}>
      <div style={{ display:'flex' }}>
        <div style={{ display:'flex', flexDirection:'column', justifyContent:'space-between', height:240, marginRight:12, fontSize:11, color:'rgba(255,255,255,0.4)', textAlign:'right' }}>
          {Array.from({length:paliers+1},(_,i)=>plafond-i*step).map(v => <div key={v}>{v>=1000 ? `${(v/1000).toFixed(v%1000===0?0:1)}k` : v}</div>)}
        </div>
        <div style={{ flex:1, position:'relative' }}>
          {Array.from({length:paliers+1},(_,i)=>i).map(i => (
            <div key={i} style={{ position:'absolute', left:0, right:0, top:`${(i/paliers)*100}%`, borderTop:'1px solid rgba(255,255,255,0.06)' }}/>
          ))}
          <div style={{ display:'flex', alignItems:'flex-end', height:240, gap:Math.max(4, 32-entrees.length), position:'relative' }}>
            {entrees.map(([mois,val], i) => (
              <div key={mois}
                onMouseEnter={()=>setHoverIdx(i)}
                onMouseLeave={()=>setHoverIdx(null)}
                style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', height:'100%', cursor:'pointer' }}>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)', marginBottom:4 }}>{val>0 ? fmt(val) : ''}</div>
                <div style={{ width:'60%', maxWidth:36, height:`${Math.max((val/plafond)*100, val>0?2:0)}%`, background:hoverIdx===i?'#6cb6ff':'#4da6ff', borderRadius:'2px 2px 0 0', transition:'background-color 0.1s ease' }}/>
              </div>
            ))}
          </div>
          {hoverIdx !== null && (
            <div style={{
              position:'absolute', left:`${(hoverIdx+0.5)/entrees.length*100}%`,
              bottom:`calc(${Math.max((entrees[hoverIdx][1]/plafond)*100, entrees[hoverIdx][1]>0?2:0)}% + 14px)`,
              transform:'translateX(-50%)', background:'#1f1f1f', border:'1px solid rgba(255,255,255,0.12)', borderLeft:'3px solid #4da6ff',
              borderRadius:2, padding:'10px 16px', boxShadow:'0 8px 24px rgba(0,0,0,0.5)', zIndex:10, pointerEvents:'none', whiteSpace:'nowrap',
            }}>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', marginBottom:8 }}>{entrees[hoverIdx][0]}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginBottom:2 }}>Montant total</div>
              <div style={{ fontSize:20, fontWeight:700, color:'#4da6ff' }}>{fmt(entrees[hoverIdx][1])}</div>
            </div>
          )}
        </div>
      </div>
      <div style={{ display:'flex', marginLeft:44 }}>
        {entrees.map(([mois]) => (
          <div key={mois} style={{ flex:1, textAlign:'center', fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:8 }}>{mois}</div>
        ))}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:20, paddingTop:14, borderTop:'1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ width:10, height:10, background:'#4da6ff', borderRadius:1, flexShrink:0 }}/>
        <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>Montant total</span>
      </div>
      <div style={{ borderLeft:'3px solid #4da6ff', paddingLeft:14, marginTop:14, paddingBottom:10 }}>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:4 }}>Montant total</div>
        <div style={{ fontSize:22, fontWeight:700, color:'#e6edf3' }}>{fmt(entrees.reduce((s,[,v])=>s+v,0))} {factures[0]?.devise || 'FCFA'}</div>
      </div>
    </div>
  )
}

function Select({ value, onChange, children, error=false, style={} }) {
  return (
    <div style={{ position:'relative', ...style }}>
      <select value={value} onChange={onChange}
        style={{ ...fieldStyle(error), appearance:'none', WebkitAppearance:'none', MozAppearance:'none', cursor:'pointer' }}>
        {children}
      </select>
      <Chevron error={error}/>
    </div>
  )
}

function FactureDetail({ facture:f, agence, fmt, statutCfg }) {
  const [bannerOuverte, setBannerOuverte] = useState(true)
  const exporterTransactionCSV = () => {
    const lignes = [
      ['Date','Periode de service (UTC)','Type','Famille de produit','Type de produit','Reference SKU du produit','Section facture','Prix e...','Quantite','Frais','Taxe','Total'],
      [dateFacture, periodeLabel, 'Paiement', 'Imoloc', 'Abonnement Imoloc', f.abonnement_id ? String(f.abonnement_id).slice(0,8) : 'N/A', agence?.nom||'', `${fmt(montant)} ${devise}`, 1, `${fmt(montant)} ${devise}`, `0 ${devise}`, `${fmt(montant)} ${devise}`],
    ]
    const csv = lignes.map(l => l.map(c => `"${String(c??'').replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿'+csv], { type:'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${f.numero}-transactions.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  const sc = statutCfg[f.statut] || statutCfg.en_attente
  const paye = f.statut === 'paye'
  const dateFacture = new Date(f.created_at).toLocaleDateString('fr-FR')
  const datePaiement = f.date_paiement ? new Date(f.date_paiement).toLocaleDateString('fr-FR') : (paye ? dateFacture : '—')
  const periodeDebut = f.periode_debut ? new Date(f.periode_debut) : new Date(f.created_at)
  const periodeFinCalc = f.periode_fin ? new Date(f.periode_fin) : new Date(periodeDebut.getFullYear(), periodeDebut.getMonth()+1, periodeDebut.getDate())
  const periodeLabel = `${periodeDebut.toLocaleDateString('fr-FR')} - ${periodeFinCalc.toLocaleDateString('fr-FR')}`
  const montant = Number(f.montant||0)
  const devise = f.devise || 'FCFA'

  const ligneStyle = { display:'flex', justifyContent:'space-between', padding:'8px 0', fontSize:13, borderBottom:'1px solid rgba(255,255,255,0.05)' }
  const labelStyle = { color:'rgba(255,255,255,0.45)' }
  const valStyle = { color:'#e6edf3', textAlign:'right' }

  return (
    <div>
      <div style={{ fontSize:26, fontWeight:700, color:'#e6edf3', marginBottom:16 }}>{f.numero}</div>

      <div style={{ display:'flex', gap:24, marginBottom:20, flexWrap:'wrap' }}>
        <a href="#" onClick={e=>e.preventDefault()} style={{ fontSize:13, color:'#4da6ff', textDecoration:'none', display:'flex', alignItems:'center', gap:6 }}><FileText/> Preparer le fichier d utilisation</a>
        <a href="#" onClick={e=>e.preventDefault()} style={{ fontSize:13, color:'#4da6ff', textDecoration:'none', display:'flex', alignItems:'center', gap:6 }}><Download/> Telechargement <ChevronDown/></a>
        <a href="#" onClick={e=>e.preventDefault()} style={{ fontSize:13, color:'#4da6ff', textDecoration:'none', display:'flex', alignItems:'center', gap:6 }}><Link2/> Liens utiles <ChevronDown/></a>
      </div>

      {bannerOuverte && (
        <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'14px 16px', background:'rgba(0,120,212,0.06)', borderRadius:2, marginBottom:28 }}>
          <Info style={{ color:'#4da6ff', flexShrink:0, marginTop:1 }}/>
          <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.6)', lineHeight:1.7, flex:1 }}>
            Cette facture concerne les achats d abonnement, les renouvellements et les frais recurrents a la date indiquee. La periode de service que vous payez est repertoriee dans chaque abonnement ci-dessous.{' '}
            <a href="#" onClick={e=>e.preventDefault()} style={{ color:'#4da6ff' }}>En savoir plus sur le calendrier de facturation</a>
          </div>
          <button onClick={()=>setBannerOuverte(false)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', display:'flex', flexShrink:0 }}><X/></button>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:32, marginBottom:32 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'#e6edf3', marginBottom:12 }}>Montant du</div>
          <div style={{ fontSize:28, fontWeight:700, color:'#e6edf3', marginBottom:8 }}>{paye ? '0,00' : fmt(montant)} {devise}</div>
          {paye ? (
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12.5, color:'#00c896' }}><CheckCircle2/> Cette facture a ete payee le {datePaiement}</div>
          ) : (
            <div style={{ fontSize:12.5, color:sc.color }}>{sc.label}</div>
          )}
        </div>

        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'#e6edf3', marginBottom:12 }}>Details de la facture</div>
          <div style={ligneStyle}><span style={labelStyle}>Date de facture (UTC)</span><span style={valStyle}>{dateFacture}</span></div>
          <div style={ligneStyle}><span style={labelStyle}>Date de paiement (UTC)</span><span style={valStyle}>{datePaiement}</span></div>
          <div style={ligneStyle}><span style={labelStyle}>Periode de facturation (UTC)</span><span style={valStyle}>{periodeLabel}</span></div>
          <div style={ligneStyle}><span style={labelStyle}>Numero de BDC</span><span style={valStyle}>Non defini</span></div>
          <div style={ligneStyle}><span style={labelStyle}>Profil de facturation</span><span style={{...valStyle,color:'#4da6ff'}}>{agence?.nom}</span></div>
          <div style={ligneStyle}><span style={labelStyle}>Compte de facturation</span><span style={{...valStyle,color:'#4da6ff'}}>{agence?.nom}</span></div>
        </div>

        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'#e6edf3', marginBottom:12 }}>Recapitulatif de facturation</div>
          <div style={ligneStyle}><span style={labelStyle}>Frais</span><span style={valStyle}>{fmt(montant)} {devise}</span></div>
          <div style={ligneStyle}><span style={labelStyle}>Credits</span><span style={valStyle}>- 0 {devise}</span></div>
          <div style={ligneStyle}><span style={labelStyle}>Sous-total</span><span style={valStyle}>{fmt(montant)} {devise}</span></div>
          <div style={ligneStyle}><span style={labelStyle}>Taxe</span><span style={valStyle}>+ 0 {devise}</span></div>
          <div style={{...ligneStyle, borderBottom:'none', fontWeight:700}}><span style={{...labelStyle,color:'#e6edf3'}}>Montant total</span><span style={valStyle}>{fmt(montant)} {devise}</span></div>
        </div>
      </div>

      <div style={{ display:'flex', gap:32, marginBottom:24, flexWrap:'wrap' }}>
        <div style={{ borderLeft:'3px solid #d6249f', paddingLeft:14 }}>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:4 }}>Nombre total de transactions</div>
          <div style={{ fontSize:20, fontWeight:700, color:'#e6edf3' }}>1</div>
        </div>
        <div style={{ borderLeft:'3px solid #0078d4', paddingLeft:14 }}>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:4 }}>Total des frais/credits</div>
          <div style={{ fontSize:20, fontWeight:700, color:'#e6edf3' }}>{fmt(montant)} {devise}</div>
        </div>
        <div style={{ borderLeft:'3px solid #00c896', paddingLeft:14 }}>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:4 }}>Montant total</div>
          <div style={{ fontSize:20, fontWeight:700, color:'#e6edf3' }}>{fmt(montant)} {devise}</div>
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:18, marginBottom:16, flexWrap:'wrap', paddingBottom:14, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <a href="#" onClick={e=>{e.preventDefault();exporterTransactionCSV()}} style={{ fontSize:13, color:'#4da6ff', textDecoration:'none', display:'flex', alignItems:'center', gap:6 }}><Download/> Exporter vers un fichier CSV</a>
        <SearchBox value="" onChange={()=>{}} style={{ marginLeft:'auto', minWidth:180 }}/>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18, flexWrap:'wrap' }}>
        <FilterPill label="Type de transaction" value="tout" onChange={()=>{}} options={[{value:'tout',label:'Tout'}]}/>
        <FilterPill label="Section facture" value="tout" onChange={()=>{}} options={[{value:'tout',label:'Tout'}]}/>
      </div>

      <div style={{ width:'100%' }}>
        <div style={{ overflowX:'auto', overflowY:'visible' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:1100 }}>
          <thead><tr>
            {['Date','Periode de service (UTC)','Type','Famille de produit','Type de produit','Reference SKU du produit','Section facture','Prix e...','Quantite','Frais','Taxe','Total'].map(h=>(
              <th key={h} className="fl-th"><ColHeader label={h} sortable={false}/></th>
            ))}
          </tr></thead>
          <tbody>
            <tr className="fl-row">
              <td className="fl-td">{dateFacture}</td>
              <td className="fl-td">{periodeLabel}</td>
              <td className="fl-td">Paiement</td>
              <td className="fl-td">Imoloc</td>
              <td className="fl-td">Abonnement Imoloc</td>
              <td className="fl-td">{f.abonnement_id ? String(f.abonnement_id).slice(0,8) : 'N/A'}</td>
              <td className="fl-td" style={{ color:'#4da6ff' }}>{agence?.nom}</td>
              <td className="fl-td" style={{ color:'#ffffff' }}>{fmt(montant)} {devise}</td>
              <td className="fl-td" style={{ color:'#ffffff' }}>1</td>
              <td className="fl-td" style={{ color:'#ffffff' }}>{fmt(montant)} {devise}</td>
              <td className="fl-td" style={{ color:'#ffffff' }}>0 {devise}</td>
              <td className="fl-td" style={{ fontWeight:600, color:'#ffffff' }}>{fmt(montant)} {devise}</td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}

export default function Abonnement() {
  const location = useLocation()
  const navigate = useNavigate()
  const tab = location.pathname.endsWith('/modes') ? 'paiement' : 'factures'
  const setTab = (t) => navigate(t === 'paiement' ? '/agence/abonnement/modes' : '/agence/abonnement')

  const [agence, setAgence]       = useState(null)
  const [factures, setFactures]   = useState([])
  const [methodes, setMethodes]   = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => { init() }, [])

  const init = async () => {
    setLoading(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      const { data:agList } = await supabase.from('agences').select('*')
      const ag = agList?.find(a => a.profile_id === user.id) || agList?.[0]
      setAgence(ag)
      if (ag?.id) {
        const { data:f } = await supabase.from('factures').select('*').eq('agence_id', ag.id).order('created_at',{ascending:false})
        setFactures(f||[])
        const { data:m } = await supabase.from('methodes_paiement').select('*').eq('agence_id', ag.id)
        setMethodes(m||[])
      }
    } catch(e) { console.error('Init error:', e) }
    finally { setLoading(false) }
  }

  const [factureSearch, setFactureSearch] = useState('')
  const [factureStatutFilter, setFactureStatutFilter] = useState('tout')
  const [factureDuree, setFactureDuree] = useState('12mois')
  const [exclureZero, setExclureZero] = useState(false)
  const [selectedFactures, setSelectedFactures] = useState([])
  const [factureDetail, setFactureDetail] = useState(null)
  const [factureSortField, setFactureSortField] = useState(null)
  const [factureSortDir, setFactureSortDir] = useState('asc')
  const [vueFactures, setVueFactures] = useState('liste')
  const [factureColWidths, setFactureColWidths] = useState({})
  const resizeFactureCol = (key, delta) => setFactureColWidths(w => ({ ...w, [key]: Math.max(60, (w[key] ?? FACTURE_COL_DEFAULTS[key] ?? 140) + delta) }))
  const toggleFactureSort = (field) => {
    if (!field) return
    if (factureSortField !== field) { setFactureSortField(field); setFactureSortDir('asc'); return }
    if (factureSortDir === 'asc') { setFactureSortDir('desc'); return }
    setFactureSortField(null)
  }

  const toggleSelectFacture = (id) => setSelectedFactures(s => s.includes(id) ? s.filter(x=>x!==id) : [...s, id])
  const toggleSelectAllFactures = (list) => setSelectedFactures(s => (list.length>0 && list.every(f=>s.includes(f.id))) ? [] : list.map(f=>f.id))

  const exporterCSV = (list) => {
    const lignes = [
      ['ID de facture','Date de facture','Periode de facturation','Profil de facturation','Montant total','Etat'],
      ...list.map(f => [f.numero, new Date(f.created_at).toLocaleDateString('fr-FR'), f.periode_debut?new Date(f.periode_debut).toLocaleDateString('fr-FR'):'', agence?.nom||'', `${fmt(f.montant)} ${f.devise||'FCFA'}`, FACTURE_STATUT_CFG[f.statut]?.label||f.statut])
    ]
    const csv = lignes.map(l => l.map(c => `"${String(c??'').replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿'+csv], { type:'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `factures-${agence?.nom||'imoloc'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const [showAddMethod, setShowAddMethod] = useState(false)
  const [methodeType, setMethodeType] = useState('mobile') // 'mobile' | 'carte'
  const emptyMethod = (pays='Benin') => ({
    pays, indicatif: PAYS.find(p=>p.nom===pays)?.indicatif || '229', operateur: '',
    nomTitulaire: '', telephone: '', adresse1: '', adresse2: '', departement: '', ville: '', codePostal: '',
  })
  const emptyCard = (pays='Benin') => ({
    nomTitulaire: '', numeroCarte: '', moisExp: '', anneeExp: '', cvv: '',
    adresse1: '', adresse2: '', ville: '', departement: '', codePostal: '', pays,
  })
  const [newMethod, setNewMethod] = useState(emptyMethod())
  const [newCard, setNewCard] = useState(emptyCard())
  const [methodErrors, setMethodErrors] = useState({})
  const [savingMethod, setSavingMethod] = useState(false)
  const clearErr = (field) => setMethodErrors(e => (e[field] ? { ...e, [field]:undefined } : e))

  const ouvrirAjoutMethode = () => {
    const paysDefaut = PAYS.find(p => p.nom === agence?.pays)?.nom || 'Benin'
    setNewMethod(emptyMethod(paysDefaut))
    setNewCard(emptyCard(paysDefaut))
    setMethodeType('mobile')
    setMethodErrors({})
    setShowAddMethod(true)
  }

  const choisirPays = (paysNom) => {
    setNewMethod(p => ({
      ...p,
      pays: paysNom,
      indicatif: PAYS.find(x => x.nom === paysNom)?.indicatif || p.indicatif,
      operateur: OPERATEURS.find(o => o.id === p.operateur)?.pays.includes(paysNom) ? p.operateur : '',
      departement: '', ville: '',
    }))
    setMethodErrors({})
  }

  const ajouterMethode = async () => {
    const err = validerMethode(newMethod)
    if (Object.keys(err).length) { setMethodErrors(err); return }
    setSavingMethod(true)
    const op = OPERATEURS.find(o => o.id === newMethod.operateur)
    const clean = newMethod.telephone.replace(/[\s-]/g, '')
    const numeroComplet = newMethod.indicatif + clean
    const masque = '•'.repeat(Math.max(clean.length - 4, 0)) + clean.slice(-4)
    const { error } = await supabase.from('methodes_paiement').insert({
      agence_id: agence.id,
      type: 'Mobile Money',
      nom_titulaire: newMethod.nomTitulaire.trim(),
      par_defaut: methodes.length === 0,
      statut: 'actif',
      details: {
        correspondent: op.codes[newMethod.pays],
        operateurId: op.id,
        operateur: op.label,
        pays: newMethod.pays,
        phone: numeroComplet,
        phoneMasque: masque,
        adresse1: newMethod.adresse1.trim(),
        adresse2: newMethod.adresse2.trim(),
        departement: newMethod.departement,
        ville: newMethod.ville.trim(),
        codePostal: newMethod.codePostal.trim(),
      },
    })
    setSavingMethod(false)
    if (error) { toast.error(error.message); return }
    toast.success('Methode de paiement ajoutee')
    setShowAddMethod(false)
    init()
  }

  const definirParDefaut = async (id) => {
    await supabase.from('methodes_paiement').update({ par_defaut: false }).eq('agence_id', agence.id)
    const { error } = await supabase.from('methodes_paiement').update({ par_defaut: true }).eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Methode par defaut mise a jour')
    init()
  }

  const supprimerMethode = async (id) => {
    const { error } = await supabase.from('methodes_paiement').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Methode de paiement supprimee')
    init()
  }

  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:400,color:'rgba(255,255,255,0.3)' }}>Chargement...</div>

  const montantDu = factures.filter(f=>f.statut!=='paye').reduce((s,f)=>s+Number(f.montant||0),0)
  const dureeLimite = { '3mois':3, '12mois':12, 'tout':null }[factureDuree]
  const facturesFiltrees = factures
    .filter(f => factureStatutFilter==='tout' || f.statut===factureStatutFilter)
    .filter(f => !factureSearch || f.numero?.toLowerCase().includes(factureSearch.toLowerCase()))
    .filter(f => !exclureZero || Number(f.montant||0) > 0)
    .filter(f => !dureeLimite || new Date(f.created_at) >= new Date(Date.now() - dureeLimite*30*24*60*60*1000))
    .sort((a,b) => {
      if (!factureSortField) return 0
      let va = a[factureSortField], vb = b[factureSortField]
      if (factureSortField==='montant') { va = Number(va||0); vb = Number(vb||0) }
      else { va = va ?? ''; vb = vb ?? '' }
      const cmp = va > vb ? 1 : va < vb ? -1 : 0
      return factureSortDir==='asc' ? cmp : -cmp
    })
  const methodeParDefaut = methodes.find(m=>m.par_defaut)

  return (
    <>
      <div style={{ width:'100%' }}>
        <style>{FLUENT_TABLE_CSS}</style>

        <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:14 }}>
          Accueil <span style={{ margin:'0 4px' }}>&gt;</span>{' '}
          {factureDetail ? (
            <a href="#" onClick={e=>{e.preventDefault();setFactureDetail(null)}} style={{ color:'#4da6ff', textDecoration:'none' }}>Factures et paiements</a>
          ) : (
            <span style={{ color:'rgba(255,255,255,0.6)' }}>Factures et paiements</span>
          )}
        </div>

        {factureDetail ? (
          <FactureDetail facture={factureDetail} agence={agence} fmt={fmt} statutCfg={FACTURE_STATUT_CFG}/>
        ) : (<>

        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:10, marginBottom:20 }}>
          <div style={{ fontSize:26, fontWeight:700, color:'#e6edf3' }}>Factures et paiements</div>
          <a href="#" onClick={e=>e.preventDefault()} style={{ fontSize:12.5, color:'#4da6ff', textDecoration:'none', display:'flex', alignItems:'center', gap:6, marginTop:6 }}><BookOpen/> Decouvrez plus d informations sur la nouvelle experience de facturation.</a>
        </div>

        <div style={{ display:'flex', gap:24, borderBottom:'1px solid rgba(255,255,255,0.08)', marginBottom:20 }}>
          {[['factures','Factures'],['paiement','Methodes de paiement']].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{ background:'none', border:'none', borderBottom:tab===k?'2px solid #4da6ff':'2px solid transparent', padding:'0 0 10px', fontSize:14, fontWeight:tab===k?700:500, color:tab===k?'#e6edf3':'rgba(255,255,255,0.5)', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>{l}</button>
          ))}
        </div>

        {/* ── FACTURES ── */}
        {tab==='factures' && (
          <div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.55)', marginBottom:20, lineHeight:1.7 }}>
              Les factures fournissent un recapitulatif de vos frais et des instructions pour effectuer des paiements. Certaines sont generees dans les 24 heures suivant un paiement individuel, d autres sont generees a la fin de la periode de facturation.{' '}
              <a href="#" onClick={e=>e.preventDefault()} style={{ color:'#4da6ff' }}>En savoir plus sur les factures</a>
            </div>

            <div style={{ fontSize:13, fontWeight:700, color:'#e6edf3', marginBottom:8 }}>Affichage du compte de facturation</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.55)', marginBottom:20 }}>
              Factures connectees a <span style={{ color:'#4da6ff', fontWeight:600 }}>{agence?.nom}</span>
            </div>

            <div style={{ display:'flex', gap:10, padding:'14px 16px', background:'rgba(0,120,212,0.06)', borderRadius:2, marginBottom:24 }}>
              <Info style={{ color:'#4da6ff', flexShrink:0, marginTop:1 }}/>
              <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.6)', lineHeight:1.7 }}>
                Les factures sont generees automatiquement a chaque paiement Mobile Money confirme (essai gratuit, souscription ou renouvellement d abonnement). Retrouvez le detail de chaque transaction ci-dessous.
              </div>
            </div>

            <div style={{ display:'flex', gap:32, marginBottom:20 }}>
              <div style={{ borderLeft:'3px solid #d6249f', paddingLeft:14 }}>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:4 }}>Total invoices</div>
                <div style={{ fontSize:22, fontWeight:700, color:'#e6edf3' }}>{factures.length}</div>
              </div>
              <div style={{ borderLeft:'3px solid #0078d4', paddingLeft:14 }}>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:4 }}>Montant du</div>
                <div style={{ fontSize:22, fontWeight:700, color:'#e6edf3' }}>{fmt(montantDu)} FCFA</div>
              </div>
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:18, marginBottom:14, flexWrap:'wrap', paddingBottom:14, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={init} style={{ background:'none', border:'none', color:'#4da6ff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'Inter,sans-serif', display:'flex', alignItems:'center', gap:6 }}><RefreshCw/> Actualiser</button>
              <button onClick={()=>exporterCSV(selectedFactures.length?facturesFiltrees.filter(f=>selectedFactures.includes(f.id)):facturesFiltrees)} style={{ background:'none', border:'none', color:'#4da6ff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'Inter,sans-serif', display:'flex', alignItems:'center', gap:6 }}><Download/> Exporter vers un fichier CSV</button>
              <span style={{ fontSize:13, color:'rgba(255,255,255,0.25)', cursor:'default', display:'flex', alignItems:'center', gap:6 }}><FileDown/> Telecharger</span>
              <span style={{ fontSize:13, color:'rgba(255,255,255,0.25)', cursor:'default', display:'flex', alignItems:'center', gap:6 }}><Users/> Gerer l acces</span>
              <SearchBox value={factureSearch} onChange={e=>setFactureSearch(e.target.value)} style={{ minWidth:180 }}/>
              <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:16 }}>
                <a href="#" onClick={e=>e.preventDefault()} style={{ fontSize:12.5, color:'#4da6ff', textDecoration:'none' }}>M aider a comprendre ce tableau</a>
                <ViewSwitcher value={vueFactures} onChange={setVueFactures}/>
              </div>
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18, flexWrap:'wrap' }}>
              <FilterPill label="Etat" value={factureStatutFilter} onChange={setFactureStatutFilter}
                options={[{value:'tout',label:'Tout'}, ...Object.entries(FACTURE_STATUT_CFG).map(([k,v])=>({value:k,label:v.label}))]}/>
              <FilterPill label="Profil de facturation" value={agence?.nom||''} onChange={()=>{}}
                options={[{value:agence?.nom||'', label:agence?.nom||''}]}/>
              <FilterPill label="Duree" value={factureDuree} onChange={setFactureDuree}
                options={[
                  {value:'3mois', label:'3 derniers mois'},
                  {value:'12mois', label:'12 derniers mois'},
                  {value:'tout', label:'Tout'},
                ]}/>
              <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12.5, color:'rgba(255,255,255,0.5)', cursor:'pointer', marginLeft:8 }}>
                <input type="checkbox" checked={exclureZero} onChange={e=>setExclureZero(e.target.checked)} />
                Exclure les factures a 0 $
              </label>
            </div>

            <div style={{ width:'100%' }}>
              {vueFactures === 'graphique' ? (
                <FactureBarChart factures={facturesFiltrees} fmt={fmt}/>
              ) : facturesFiltrees.length === 0 ? (
                <div style={{ textAlign:'center', padding:'60px', color:'rgba(255,255,255,0.3)' }}>
                  <FileTextLarge style={{ marginBottom:12, opacity:0.3 }}/>
                  <div style={{ fontSize:14 }}>{factures.length===0 ? 'Aucune facture pour le moment' : 'Aucune facture ne correspond a ce filtre'}</div>
                  {factures.length===0 && <div style={{ fontSize:12.5, marginTop:6, color:'rgba(255,255,255,0.25)' }}>Vos factures apparaitront ici des qu un paiement sera effectue.</div>}
                </div>
              ) : (
                <div style={{ overflowX:'auto', overflowY:'visible' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', minWidth:900, tableLayout:'fixed' }}>
                  <colgroup>
                    <col style={{ width:factureColWidths.checkbox ?? FACTURE_COL_DEFAULTS.checkbox }}/>
                    {FACTURE_COLONNES.map(c => <col key={c.key} style={{ width:factureColWidths[c.key] ?? FACTURE_COL_DEFAULTS[c.key] }}/>)}
                  </colgroup>
                  <thead><tr>
                    <th className="fl-th">
                      <FluentCheckbox checked={facturesFiltrees.length>0 && facturesFiltrees.every(f=>selectedFactures.includes(f.id))} onChange={()=>toggleSelectAllFactures(facturesFiltrees)}/>
                    </th>
                    {FACTURE_COLONNES.map(c=>(
                      <th key={c.key} className="fl-th">
                        <ColHeader label={c.label} sortable={c.sortable!==false} sortDir={factureSortField===c.field ? factureSortDir : null}
                          onSort={()=>toggleFactureSort(c.field)}
                          onResize={delta=>resizeFactureCol(c.key, delta)}/>
                      </th>
                    ))}
                  </tr></thead>
                  <tbody>{facturesFiltrees.map(f=>{
                    const sc = FACTURE_STATUT_CFG[f.statut] || FACTURE_STATUT_CFG.en_attente
                    const selected = selectedFactures.includes(f.id)
                    return <tr key={f.id} className={`fl-row${selected ? ' fl-row-selected' : ''}`}>
                      <td className="fl-td">
                        <FluentCheckbox checked={selected} onChange={()=>toggleSelectFacture(f.id)}/>
                      </td>
                      <td className="fl-td" style={{ fontWeight:600 }}>
                        <a href="#" onClick={e=>{e.preventDefault();setFactureDetail(f)}} style={{ color:'#4da6ff', textDecoration:'none', cursor:'pointer' }}>{f.numero}</a>{' '}
                        <Info style={{ color:'rgba(255,255,255,0.3)', verticalAlign:-1 }}/>
                      </td>
                      <td className="fl-td">{new Date(f.created_at).toLocaleDateString('fr-FR')}</td>
                      <td className="fl-td">
                        {f.periode_debut ? new Date(f.periode_debut).toLocaleDateString('fr-FR') : new Date(f.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="fl-td" style={{ color:'#4da6ff' }}>{agence?.nom}</td>
                      <td className="fl-td" style={{ fontWeight:600, color:'#ffffff' }}>{fmt(f.montant)} {f.devise||'FCFA'}</td>
                      <td className="fl-td">
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          {f.statut==='paye' && <CheckCircle2 style={{ color:'#00c896', flexShrink:0 }} fill="#00c896" stroke="#0d1117"/>}
                          <span style={{ fontSize:12.5, color:sc.color }}>{f.statut==='paye' ? `Paye le ${f.date_paiement?new Date(f.date_paiement).toLocaleDateString('fr-FR'):new Date(f.created_at).toLocaleDateString('fr-FR')}` : sc.label}</span>
                        </div>
                      </td>
                      <td className="fl-td" style={{ color:'rgba(255,255,255,0.3)' }}>N/A</td>
                      <td className="fl-td">
                        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                          <a href="#" onClick={e=>{e.preventDefault();toast('Le telechargement PDF de facture arrive bientot')}} style={{ color:'#4da6ff', textDecoration:'none', fontSize:12.5, display:'flex', alignItems:'center', gap:4 }}><Download/> Telecharger</a>
                          <button onClick={e=>{e.preventDefault();setFactureDetail(f)}} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.5)', cursor:'pointer', display:'flex', padding:0 }}><MoreHorizontal/></button>
                        </div>
                      </td>
                    </tr>
                  })}</tbody>
                </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── METHODES DE PAIEMENT ── */}
        {tab==='paiement' && (
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'#e6edf3', marginBottom:8 }}>Affichage du compte de facturation</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.55)', marginBottom:4 }}>
              Modes de paiement connectes a <span style={{ color:'#4da6ff', fontWeight:600 }}>{agence?.nom}</span>
            </div>
            <a href="#" onClick={e=>e.preventDefault()} style={{ fontSize:13, color:'#4da6ff', display:'inline-block', marginBottom:20 }}>Changer de compte de facturation</a>

            <div>
              <a href="#" onClick={e=>e.preventDefault()} style={{ fontSize:13, color:'#4da6ff' }}>En savoir plus sur la gestion des modes de paiement.</a>
            </div>

            <div style={{ fontSize:20, fontWeight:700, color:'#e6edf3', margin:'28px 0 6px' }}>Vos modes de paiement</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.55)', marginBottom:16, lineHeight:1.7 }}>
              Voici les modes de paiement dont vous etes proprietaire. Ils ne sont pas automatiquement affectes a un comptes de facturation.
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:24, marginBottom:16, paddingBottom:14, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={ouvrirAjoutMethode} style={{ background:'none', border:'none', color:'#4da6ff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'Inter,sans-serif', display:'flex', alignItems:'center', gap:6 }}>+ Ajouter une methode de paiement</button>
              <button onClick={init} style={{ background:'none', border:'none', color:'#4da6ff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'Inter,sans-serif', display:'flex', alignItems:'center', gap:6 }}><RefreshCw/> Actualiser</button>
            </div>

            <div style={{ marginBottom:36 }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr>{['Mode de paiement','Date d expiration ↑','Statut d expiration','Type'].map(h=>(
                  <th key={h} style={{ textAlign:'left', padding:'10px 16px 10px 0', fontSize:12.5, fontWeight:400, color:'rgba(255,255,255,0.45)', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>{h}</th>
                ))}<th style={{ borderBottom:'1px solid rgba(255,255,255,0.1)' }}/></tr></thead>
                {methodes.length > 0 && <tbody>{methodes.map(m=>(
                  <tr key={m.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding:'14px 16px 14px 0' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <OperateurBadge operateurId={m.details?.operateurId} size={32}/>
                        <div>
                          <div style={{ fontSize:14, fontWeight:600, color:'#e6edf3' }}>{m.details?.operateur || 'Mobile Money'}</div>
                          <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>{m.nom_titulaire} &middot; {m.details?.phoneMasque || m.details?.phone} &middot; {m.details?.pays}</div>
                        </div>
                        {m.par_defaut && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:2, background:'rgba(0,200,150,0.1)', color:'#00c896', marginLeft:4 }}>Par defaut</span>}
                      </div>
                    </td>
                    <td style={{ padding:'14px 16px 14px 0', fontSize:13, color:'rgba(255,255,255,0.4)' }}>&mdash;</td>
                    <td style={{ padding:'14px 16px 14px 0', fontSize:13, color:'rgba(255,255,255,0.4)' }}>Sans expiration</td>
                    <td style={{ padding:'14px 16px 14px 0', fontSize:13, color:'rgba(255,255,255,0.6)' }}>{m.type}</td>
                    <td style={{ padding:'14px 0', textAlign:'right', whiteSpace:'nowrap' }}>
                      {!m.par_defaut && <button onClick={()=>definirParDefaut(m.id)} style={{ background:'none', border:'none', color:'#4da6ff', fontSize:12, cursor:'pointer', fontFamily:'Inter,sans-serif', marginRight:14 }}>Definir par defaut</button>}
                      <button onClick={()=>supprimerMethode(m.id)} style={{ background:'none', border:'none', color:'#ef4444', fontSize:12, cursor:'pointer', fontFamily:'Inter,sans-serif' }}>Supprimer</button>
                    </td>
                  </tr>
                ))}</tbody>}
              </table>
              {methodes.length === 0 && (
                <div style={{ textAlign:'center', padding:'50px' }}>
                  <div style={{ fontSize:14, color:'rgba(255,255,255,0.85)', marginBottom:10 }}>Vous n avez ajoute aucun mode de paiement</div>
                  <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)' }}>Ajoutez un mode de paiement, puis vous pouvez l afficher et le gerer ici.</div>
                </div>
              )}
            </div>

            <div style={{ fontSize:20, fontWeight:700, color:'#e6edf3', marginBottom:6 }}>Modes de paiement par defaut &mdash; {agence?.nom}</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.55)', marginBottom:16, lineHeight:1.7 }}>
              Vous pouvez remplacer le mode de paiement de ce compte en selectionnant les points, puis en selectionnant Remplacer.
            </div>
            <div style={{ marginBottom:16 }}>
              <span style={{ fontSize:12.5, color:'rgba(255,255,255,0.4)', marginRight:8 }}>Filtres : </span>
              <FilterPill label="Profil de facturation" value="tous" onChange={()=>{}} options={[{value:'tous',label:'Tous'}]}/>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr>{['Mode de paiement par defaut','Profil de facturation','Date d expiration ↑','Type'].map(h=>(
                <th key={h} style={{ textAlign:'left', padding:'10px 16px 10px 0', fontSize:12.5, fontWeight:400, color:'rgba(255,255,255,0.45)', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>{h}</th>
              ))}</tr></thead>
              {methodeParDefaut && <tbody>
                <tr>
                  <td style={{ padding:'14px 16px 14px 0' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <OperateurBadge operateurId={methodeParDefaut.details?.operateurId} size={28}/>
                      <div style={{ fontSize:13.5, fontWeight:600, color:'#e6edf3' }}>{methodeParDefaut.details?.operateur || 'Mobile Money'} &middot; {methodeParDefaut.nom_titulaire}</div>
                    </div>
                  </td>
                  <td style={{ padding:'14px 16px 14px 0', fontSize:13, color:'#4da6ff' }}>{agence?.nom}</td>
                  <td style={{ padding:'14px 16px 14px 0', fontSize:13, color:'rgba(255,255,255,0.4)' }}>&mdash;</td>
                  <td style={{ padding:'14px 16px 14px 0', fontSize:13, color:'rgba(255,255,255,0.6)' }}>{methodeParDefaut.type}</td>
                </tr>
              </tbody>}
            </table>
            {!methodeParDefaut && (
              <div style={{ textAlign:'center', padding:'40px' }}>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.3)' }}>Aucun mode de paiement par defaut defini</div>
              </div>
            )}
          </div>
        )}

        </>)}

        {/* PANNEAU LATERAL AJOUT METHODE DE PAIEMENT (style Microsoft admin) */}
        {showAddMethod && (
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:500}} onClick={()=>setShowAddMethod(false)}>
            <div onClick={e=>e.stopPropagation()} style={{position:'absolute',top:0,right:0,height:'100%',width:'100%',maxWidth:560,background:'#0d1117',borderLeft:'1px solid rgba(255,255,255,0.12)',boxShadow:'-8px 0 32px rgba(0,0,0,0.4)',display:'flex',flexDirection:'column',animation:'slideInRight 0.2s ease-out'}}>
              <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                <div style={{fontSize:18,fontWeight:700,color:'#e6edf3'}}>Ajouter une methode de paiement</div>
                <button onClick={()=>setShowAddMethod(false)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)',fontSize:20}}>x</button>
              </div>

              <div style={{padding:'20px 24px',overflowY:'auto',flex:1}}>

                <div style={{display:'flex',gap:24,borderBottom:'1px solid rgba(255,255,255,0.08)',marginBottom:24}}>
                  {[['mobile','Portefeuille Mobile Money'],['carte','Carte de credit ou de debit']].map(([k,l])=>(
                    <button key={k} onClick={()=>{setMethodeType(k);setMethodErrors({})}}
                      style={{background:'none',border:'none',borderBottom:methodeType===k?'2px solid #4da6ff':'2px solid transparent',padding:'0 0 10px',fontSize:13,fontWeight:methodeType===k?700:500,color:methodeType===k?'#e6edf3':'rgba(255,255,255,0.5)',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>{l}</button>
                  ))}
                </div>

                {methodeType==='mobile' ? (<>
                <div style={{fontSize:12.5,color:'rgba(255,255,255,0.4)',lineHeight:1.6,marginBottom:24}}>
                  Ce mode de paiement sera enregistre sur votre compte pour vos prochains abonnements. Rien n est debite automatiquement : chaque paiement doit etre approuve sur votre telephone.
                </div>

                <div style={{fontSize:11.5,fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10}}>Nous prenons en charge les operateurs suivants</div>
                <div style={{display:'flex',alignItems:'stretch',marginBottom:24,width:'fit-content',borderRadius:2,overflow:'hidden'}}>
                  {OPERATEURS.map(op=>(
                    <div key={op.id} style={{padding:8,background:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <OperateurBadge operateurId={op.id} size={24}/>
                    </div>
                  ))}
                </div>

                <div style={{marginBottom:16}}>
                  <label style={{display:'block',fontSize:11.5,fontWeight:600,color:'rgba(255,255,255,0.4)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Pays</label>
                  <Combobox value={newMethod.pays} onChange={choisirPays} options={PAYS.map(p=>p.nom)} placeholder="Rechercher un pays" error={!!methodErrors.pays}/>
                  <FieldError message={methodErrors.pays}/>
                </div>

                <div style={{marginBottom:20}}>
                  <label style={{display:'block',fontSize:11.5,fontWeight:600,color:'rgba(255,255,255,0.4)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Operateur Mobile Money</label>
                  {operateursDisponibles(newMethod.pays).length === 0 ? (
                    <div style={{fontSize:12.5,color:'rgba(255,255,255,0.4)',padding:'10px 12px',background:'rgba(255,255,255,0.03)',borderRadius:2}}>
                      Mobile Money n est pas encore disponible pour ce pays. Vous pouvez ajouter une carte de credit ou de debit a la place.
                    </div>
                  ) : (<>
                    <Combobox
                      value={OPERATEURS.find(o=>o.id===newMethod.operateur)?.label || ''}
                      onChange={label=>{const op=OPERATEURS.find(o=>o.label===label);setNewMethod(p=>({...p,operateur:op?.id||''}));clearErr('operateur')}}
                      options={operateursDisponibles(newMethod.pays).map(o=>o.label)}
                      placeholder="Rechercher un operateur" error={!!methodErrors.operateur}/>
                    <FieldError message={methodErrors.operateur}/>
                  </>)}
                </div>

                <div style={{fontSize:11.5,fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10,marginTop:24}}>Coordonnees de paiement</div>

                <div style={{marginBottom:14}}>
                  <label style={{display:'block',fontSize:12.5,color:'rgba(255,255,255,0.6)',marginBottom:6}}>Nom du titulaire du moyen de paiement *</label>
                  <input value={newMethod.nomTitulaire} onChange={e=>{setNewMethod(p=>({...p,nomTitulaire:e.target.value}));clearErr('nomTitulaire')}}
                    placeholder="Ex: Jeanne Testeuse"
                    style={fieldStyle(!!methodErrors.nomTitulaire)}/>
                  <FieldError message={methodErrors.nomTitulaire}/>
                </div>

                <div style={{marginBottom:20}}>
                  <label style={{display:'block',fontSize:12.5,color:'rgba(255,255,255,0.6)',marginBottom:6}}>Numero de telephone *</label>
                  <div style={{display:'flex',gap:8}}>
                    <Select value={newMethod.indicatif} onChange={e=>setNewMethod(p=>({...p,indicatif:e.target.value}))} style={{width:100,flexShrink:0}}>
                      {PAYS.map(p=><option key={p.nom+p.indicatif} value={p.indicatif}>+{p.indicatif}</option>)}
                    </Select>
                    <div style={{flex:1,position:'relative'}}>
                      <input type="tel" value={newMethod.telephone} onChange={e=>{setNewMethod(p=>({...p,telephone:e.target.value}));clearErr('telephone')}}
                        placeholder="96000000"
                        style={{...fieldStyle(!!methodErrors.telephone),padding:'10px 12px'}}/>
                    </div>
                  </div>
                  {methodErrors.telephone ? <FieldError message={methodErrors.telephone}/> : <div style={{fontSize:11,color:'rgba(255,255,255,0.25)',marginTop:5}}>Indicatif pre-rempli selon le pays, modifiable si besoin</div>}
                </div>

                <div style={{fontSize:11.5,fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10,marginTop:24}}>Adresse</div>

                <div style={{marginBottom:14}}>
                  <label style={{display:'block',fontSize:12.5,color:'rgba(255,255,255,0.6)',marginBottom:6}}>Ligne d adresse 1 *</label>
                  <input value={newMethod.adresse1} onChange={e=>{setNewMethod(p=>({...p,adresse1:e.target.value}));clearErr('adresse1')}}
                    style={fieldStyle(!!methodErrors.adresse1)}/>
                  <FieldError message={methodErrors.adresse1}/>
                </div>

                <div style={{marginBottom:14}}>
                  <label style={{display:'block',fontSize:12.5,color:'rgba(255,255,255,0.6)',marginBottom:6}}>Ligne d adresse 2 (en option)</label>
                  <input value={newMethod.adresse2} onChange={e=>setNewMethod(p=>({...p,adresse2:e.target.value}))}
                    style={fieldStyle(false)}/>
                </div>

                {DEPARTEMENTS_VILLES[newMethod.pays] ? (<>
                  <div style={{marginBottom:14}}>
                    <label style={{display:'block',fontSize:12.5,color:'rgba(255,255,255,0.6)',marginBottom:6}}>Departement *</label>
                    <Combobox value={newMethod.departement}
                      onChange={d=>{setNewMethod(p=>({...p,departement:d,ville:''}));clearErr('departement')}}
                      options={Object.keys(DEPARTEMENTS_VILLES[newMethod.pays]||{})}
                      placeholder="Rechercher un departement" disabled={!newMethod.pays} error={!!methodErrors.departement}/>
                    <FieldError message={methodErrors.departement}/>
                  </div>
                  <div style={{marginBottom:14}}>
                    <label style={{display:'block',fontSize:12.5,color:'rgba(255,255,255,0.6)',marginBottom:6}}>Ville *</label>
                    <Combobox value={newMethod.ville}
                      onChange={v=>{setNewMethod(p=>({...p,ville:v}));clearErr('ville')}}
                      options={DEPARTEMENTS_VILLES[newMethod.pays]?.[newMethod.departement] || []}
                      placeholder="Rechercher ou saisir une ville" freeText disabled={!newMethod.departement} error={!!methodErrors.ville}/>
                    <FieldError message={methodErrors.ville}/>
                  </div>
                </>) : (<>
                  <div style={{marginBottom:14}}>
                    <label style={{display:'block',fontSize:12.5,color:'rgba(255,255,255,0.6)',marginBottom:6}}>Departement / Region *</label>
                    <input value={newMethod.departement} onChange={e=>{setNewMethod(p=>({...p,departement:e.target.value}));clearErr('departement')}}
                      style={fieldStyle(!!methodErrors.departement)}/>
                    <FieldError message={methodErrors.departement}/>
                  </div>
                  <div style={{marginBottom:14}}>
                    <label style={{display:'block',fontSize:12.5,color:'rgba(255,255,255,0.6)',marginBottom:6}}>Ville *</label>
                    <input value={newMethod.ville} onChange={e=>{setNewMethod(p=>({...p,ville:e.target.value}));clearErr('ville')}}
                      style={fieldStyle(!!methodErrors.ville)}/>
                    <FieldError message={methodErrors.ville}/>
                  </div>
                </>)}

                <div style={{marginBottom:8}}>
                  <label style={{display:'block',fontSize:12.5,color:'rgba(255,255,255,0.6)',marginBottom:6}}>Code postal (facultatif)</label>
                  <input value={newMethod.codePostal} onChange={e=>setNewMethod(p=>({...p,codePostal:e.target.value}))}
                    style={{...fieldStyle(false),width:'50%'}}/>
                </div>
                </>) : (<>
                <div style={{fontSize:11.5,fontWeight:600,color:'rgba(255,255,255,0.4)',marginBottom:8}}>Nous acceptons les cartes suivantes</div>
                <div style={{display:'flex',alignItems:'stretch',marginBottom:24,width:'fit-content',borderRadius:2,overflow:'hidden'}}>
                  {CARTES.map(c=>(
                    <div key={c.id} style={{padding:8,background:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <img src={c.logo} alt={c.label} style={{height:24,width:'auto',objectFit:'contain'}}/>
                    </div>
                  ))}
                </div>

                <div style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:20}}>* Obligatoire</div>

                <div style={{marginBottom:14}}>
                  <label style={{display:'block',fontSize:12.5,color:'rgba(255,255,255,0.6)',marginBottom:6}}>Nom du titulaire de la carte *</label>
                  <input value={newCard.nomTitulaire} onChange={e=>setNewCard(p=>({...p,nomTitulaire:e.target.value}))}
                    style={fieldStyle(false)}/>
                </div>

                <div style={{marginBottom:14}}>
                  <label style={{display:'block',fontSize:12.5,color:'rgba(255,255,255,0.6)',marginBottom:6}}>Numero de carte *</label>
                  <input inputMode="numeric" autoComplete="off" value={newCard.numeroCarte} onChange={e=>setNewCard(p=>({...p,numeroCarte:e.target.value}))}
                    style={fieldStyle(false)}/>
                </div>

                <div style={{display:'flex',gap:8,marginBottom:14}}>
                  <div style={{flex:1}}>
                    <label style={{display:'block',fontSize:12.5,color:'rgba(255,255,255,0.6)',marginBottom:6}}>Mois d exp. *</label>
                    <Select value={newCard.moisExp} onChange={e=>setNewCard(p=>({...p,moisExp:e.target.value}))}>
                      <option value="">MM</option>
                      {Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0')).map(m=><option key={m} value={m}>{m}</option>)}
                    </Select>
                  </div>
                  <div style={{flex:1}}>
                    <label style={{display:'block',fontSize:12.5,color:'rgba(255,255,255,0.6)',marginBottom:6}}>Annee d exp. *</label>
                    <Select value={newCard.anneeExp} onChange={e=>setNewCard(p=>({...p,anneeExp:e.target.value}))}>
                      <option value="">AA</option>
                      {Array.from({length:15},(_,i)=>String(new Date().getFullYear()+i).slice(-2)).map(a=><option key={a} value={a}>{a}</option>)}
                    </Select>
                  </div>
                </div>

                <div style={{marginBottom:20,maxWidth:140}}>
                  <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12.5,color:'rgba(255,255,255,0.6)',marginBottom:6}}>Cryptogramme visuel * <Info title="3 chiffres au dos de la carte" style={{color:'rgba(255,255,255,0.3)',cursor:'help'}}/></label>
                  <input inputMode="numeric" autoComplete="off" maxLength={4} value={newCard.cvv} onChange={e=>setNewCard(p=>({...p,cvv:e.target.value}))}
                    style={fieldStyle(false)}/>
                </div>

                <div style={{marginBottom:14}}>
                  <label style={{display:'block',fontSize:12.5,color:'rgba(255,255,255,0.6)',marginBottom:6}}>Ligne d adresse 1 *</label>
                  <input value={newCard.adresse1} onChange={e=>setNewCard(p=>({...p,adresse1:e.target.value}))}
                    style={fieldStyle(false)}/>
                </div>

                <div style={{marginBottom:14}}>
                  <label style={{display:'block',fontSize:12.5,color:'rgba(255,255,255,0.6)',marginBottom:6}}>Ligne d adresse 2 (en option)</label>
                  <input value={newCard.adresse2} onChange={e=>setNewCard(p=>({...p,adresse2:e.target.value}))}
                    style={fieldStyle(false)}/>
                </div>

                <div style={{marginBottom:14}}>
                  <label style={{display:'block',fontSize:12.5,color:'rgba(255,255,255,0.6)',marginBottom:6}}>Ville *</label>
                  {DEPARTEMENTS_VILLES[newCard.pays] ? (
                    <Combobox value={newCard.ville} onChange={v=>setNewCard(p=>({...p,ville:v}))}
                      options={DEPARTEMENTS_VILLES[newCard.pays]?.[newCard.departement] || []}
                      placeholder="Rechercher ou saisir une ville" freeText/>
                  ) : (
                    <input value={newCard.ville} onChange={e=>setNewCard(p=>({...p,ville:e.target.value}))}
                      style={fieldStyle(false)}/>
                  )}
                </div>

                <div style={{marginBottom:14}}>
                  <label style={{display:'block',fontSize:12.5,color:'rgba(255,255,255,0.6)',marginBottom:6}}>Departement *</label>
                  {DEPARTEMENTS_VILLES[newCard.pays] ? (
                    <Combobox value={newCard.departement} onChange={d=>setNewCard(p=>({...p,departement:d,ville:''}))}
                      options={Object.keys(DEPARTEMENTS_VILLES[newCard.pays]||{})} placeholder="--Selectionner--"/>
                  ) : (
                    <input value={newCard.departement} onChange={e=>setNewCard(p=>({...p,departement:e.target.value}))}
                      placeholder="--Selectionner--"
                      style={fieldStyle(false)}/>
                  )}
                </div>

                <div style={{marginBottom:14}}>
                  <label style={{display:'block',fontSize:12.5,color:'rgba(255,255,255,0.6)',marginBottom:6}}>Code postal *</label>
                  <input value={newCard.codePostal} onChange={e=>setNewCard(p=>({...p,codePostal:e.target.value}))}
                    style={{...fieldStyle(false),width:'50%'}}/>
                </div>

                <div style={{marginBottom:20}}>
                  <label style={{display:'block',fontSize:12.5,color:'rgba(255,255,255,0.6)',marginBottom:6}}>Pays/region *</label>
                  <Combobox value={newCard.pays} onChange={p2=>setNewCard(p=>({...p,pays:p2,departement:'',ville:''}))} options={PAYS.map(p=>p.nom)} placeholder="Rechercher un pays"/>
                </div>

                <div style={{fontSize:11.5,color:'rgba(255,255,255,0.4)',lineHeight:1.6,marginBottom:8}}>
                  Cette option de paiement sera enregistree sur votre compte.
                </div>
                <div style={{fontSize:12,color:'#f59e0b',padding:'8px 12px',background:'rgba(245,158,11,0.08)',borderRadius:2}}>
                  Le paiement par carte sera bientot disponible. Ce formulaire n enregistre rien pour l instant.
                </div>
                </>)}
              </div>

              <div style={{display:'flex',gap:8,justifyContent:'flex-end',padding:'16px 24px',borderTop:'1px solid rgba(255,255,255,0.07)'}}>
                <button style={bB} onClick={()=>setShowAddMethod(false)}>Annuler</button>
                {methodeType==='mobile' ? (
                  <button style={{...bP,opacity:savingMethod?0.6:1}} disabled={savingMethod} onClick={ajouterMethode}>{savingMethod?'Ajout...':'Ajouter'}</button>
                ) : (
                  <button style={{...bP,opacity:0.4,cursor:'not-allowed'}} disabled title="Paiement par carte bientot disponible">Ajouter</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
