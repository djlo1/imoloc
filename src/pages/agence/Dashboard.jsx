import { useState, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import RequireLicencedApp from './components/RequireLicencedApp'
import RequireResource from './components/RequireResource'

// Chaque page n'est chargee que lorsqu on y navigue.
const Overview = lazy(() => import('./pages/Overview'))
const Biens = lazy(() => import('./pages/Biens'))
const Locataires = lazy(() => import('./pages/Locataires'))
const Paiements = lazy(() => import('./pages/Paiements'))
const Facturation = lazy(() => import('./pages/Facturation'))
const Baux = lazy(() => import('./pages/Baux'))
const Utilisateurs = lazy(() => import('./pages/Utilisateurs'))
const Contacts = lazy(() => import('./pages/Contacts'))
const Nouveautes = lazy(() => import('./pages/Nouveautes'))
const ImolocCenter = lazy(() => import('./imoloc/ImolocCenter'))
const Organisation = lazy(() => import('./pages/Organisation'))
const Abonnement = lazy(() => import('./pages/Abonnement'))
const AbonnementPlan = lazy(() => import('./pages/AbonnementPlan'))
const Securite = lazy(() => import('./pages/Securite'))
const Parametres = lazy(() => import('./pages/Parametres'))
// Rapports.jsx (agence) etait entierement decoratif (boutons PDF/Excel sans
// onClick, aucune requete Supabase) — reutilise la vraie page imoloc, deja
// autonome et generique (fetch par agence_id via profile_id, aucun chemin
// /imoloc/... code en dur), diagnostic B2.
const Rapports = lazy(() => import('../imoloc/pages/Rapports'))
const Integrations = lazy(() => import('./pages/Integrations'))
const Loci = lazy(() => import('./pages/Loci'))
const ModelesDocuments = lazy(() => import('./pages/ModelesDocuments'))
const Tickets = lazy(() => import('./pages/Tickets'))

function PageLoader() {
  return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:300,color:'rgba(255,255,255,0.3)',fontSize:13}}>Chargement...</div>
}

export default function DashboardAgence() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body,#root{width:100%;min-height:100vh}

        /* ── Layout principal ── */
        .ac-root{display:flex;flex-direction:column;width:100vw;min-height:100vh;background:#0d1117;font-family:'Segoe UI','Inter',sans-serif;color:#e6edf3}

        /* Header pleine largeur EN HAUT */
        .ac-header{width:100%;flex-shrink:0}

        /* Contenu sous le header = sidebar + page */
        .ac-body{display:flex;flex:1;min-height:0;overflow:hidden}

        /* Sidebar */
        .ac-sidebar{flex-shrink:0}

        /* Overlay mobile */
        .ac-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99;backdrop-filter:blur(4px);display:none}
        @media(max-width:768px){.ac-overlay{display:block}}

        /* Zone de contenu */
        .ac-main{flex:1;overflow-y:auto;min-width:0}
        .ac-inner{padding:clamp(16px, 3vw, 24px) clamp(16px, 3.5vw, 28px)}
      `}</style>

      <div className="ac-root">
        {/* ── HEADER PLEINE LARGEUR ── */}
        <div className="ac-header">
          <Header
            onMenuClick={() => setMobileOpen(true)}
            onToggleSidebar={() => setCollapsed(!collapsed)}
          />
        </div>

        {/* ── CORPS = SIDEBAR + CONTENU ── */}
        <div className="ac-body">
          {mobileOpen && <div className="ac-overlay" onClick={() => setMobileOpen(false)}/>}

          <div className="ac-sidebar">
            <Sidebar
              collapsed={collapsed}
              mobileOpen={mobileOpen}
              onClose={() => setMobileOpen(false)}
            />
          </div>

          <div className="ac-main">
            <div className="ac-inner">
              <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route index element={<Overview />} />
                <Route path="loci" element={<RequireLicencedApp app="loci_ai"><Loci /></RequireLicencedApp>} />
                <Route path="loci/chat" element={<RequireLicencedApp app="loci_ai"><Loci /></RequireLicencedApp>} />
                <Route path="loci/outils" element={<RequireLicencedApp app="loci_ai"><Loci /></RequireLicencedApp>} />
                <Route path="biens" element={<RequireLicencedApp app="imoloc_manager"><RequireResource code="biens"><Biens /></RequireResource></RequireLicencedApp>} />
                <Route path="biens/*" element={<RequireLicencedApp app="imoloc_manager"><RequireResource code="biens"><Biens /></RequireResource></RequireLicencedApp>} />
                <Route path="locataires" element={<RequireLicencedApp app="imoloc_manager"><RequireResource code="locataires"><Locataires /></RequireResource></RequireLicencedApp>} />
                <Route path="locataires/*" element={<RequireLicencedApp app="imoloc_manager"><RequireResource code="locataires"><Locataires /></RequireResource></RequireLicencedApp>} />
                <Route path="paiements" element={<RequireLicencedApp app="imoloc_manager"><RequireResource code="paiements"><Paiements /></RequireResource></RequireLicencedApp>} />
                <Route path="paiements/factures-diverses" element={<RequireLicencedApp app="imoloc_manager"><RequireResource code="factures_releves"><Facturation /></RequireResource></RequireLicencedApp>} />
                <Route path="paiements/releves-proprietaires" element={<RequireLicencedApp app="imoloc_manager"><RequireResource code="factures_releves"><Facturation /></RequireResource></RequireLicencedApp>} />
                <Route path="paiements/depenses-charges" element={<RequireLicencedApp app="imoloc_manager"><RequireResource code="factures_releves"><Facturation /></RequireResource></RequireLicencedApp>} />
                <Route path="baux" element={<RequireLicencedApp app="imoloc_manager"><RequireResource code="baux"><Baux /></RequireResource></RequireLicencedApp>} />
                <Route path="utilisateurs" element={<RequireResource code="utilisateurs"><Utilisateurs /></RequireResource>} />
                <Route path="utilisateurs/contacts" element={<RequireResource code="utilisateurs"><Contacts /></RequireResource>} />
                <Route path="nouveautes" element={<Nouveautes />} />
                <Route path="modeles" element={<ModelesDocuments />} />
                <Route path="imoloc/*" element={<RequireLicencedApp app="imoloc_manager"><ImolocCenter /></RequireLicencedApp>} />
                <Route path="utilisateurs/contacts" element={<RequireResource code="utilisateurs"><Utilisateurs /></RequireResource>} />
                <Route path="utilisateurs/invites" element={<RequireResource code="invitations"><Utilisateurs /></RequireResource>} />
                <Route path="utilisateurs/supprimes" element={<RequireResource code="utilisateurs"><Utilisateurs /></RequireResource>} />
                <Route path="utilisateurs/*" element={<RequireResource code="utilisateurs"><Utilisateurs /></RequireResource>} />
                <Route path="organisation" element={<Organisation />} />
                <Route path="abonnement" element={<RequireResource code="facturation_abonnement"><Abonnement /></RequireResource>} />
                <Route path="abonnement/modes" element={<RequireResource code="facturation_abonnement"><Abonnement /></RequireResource>} />
                <Route path="abonnement/plan" element={<RequireResource code="facturation_abonnement"><AbonnementPlan /></RequireResource>} />
                <Route path="securite" element={<RequireResource code="securite"><Securite /></RequireResource>} />
                <Route path="parametres" element={<Parametres />} />
                <Route path="parametres/*" element={<Parametres />} />
                <Route path="rapports" element={<RequireLicencedApp app="imoloc_insights"><RequireResource code="rapports"><Rapports /></RequireResource></RequireLicencedApp>} />
                <Route path="tickets" element={<RequireLicencedApp app="imoloc_manager"><RequireResource code="tickets_sinistres"><Tickets /></RequireResource></RequireLicencedApp>} />
                <Route path="tickets/*" element={<RequireLicencedApp app="imoloc_manager"><RequireResource code="tickets_sinistres"><Tickets /></RequireResource></RequireLicencedApp>} />
                <Route path="integrations" element={<RequireLicencedApp app="imoloc_hub"><RequireResource code="integrations"><Integrations /></RequireResource></RequireLicencedApp>} />
                <Route path="*" element={<Navigate to="/agence" replace />} />
              </Routes>
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
