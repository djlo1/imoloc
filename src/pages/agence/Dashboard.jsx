import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Overview from './pages/Overview'
import Biens from './pages/Biens'
import Locataires from './pages/Locataires'
import Paiements from './pages/Paiements'
import Baux from './pages/Baux'
import Utilisateurs from './pages/Utilisateurs'
import Organisation from './pages/Organisation'
import Abonnement from './pages/Abonnement'
import Securite from './pages/Securite'
import Parametres from './pages/Parametres'
import Rapports from './pages/Rapports'
import Integrations from './pages/Integrations'
import Loci from './pages/Loci'

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
        .ac-root{display:flex;flex-direction:column;width:100vw;min-height:100vh;background:#0d1117;font-family:'Inter',sans-serif;color:#e6edf3}

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
        .ac-inner{padding:24px 28px}
        @media(max-width:768px){.ac-inner{padding:16px}}
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
              <Routes>
                <Route index element={<Overview />} />
                <Route path="loci" element={<Loci />} />
                <Route path="loci/chat" element={<Loci />} />
                <Route path="loci/outils" element={<Loci />} />
                <Route path="biens" element={<Biens />} />
                <Route path="biens/*" element={<Biens />} />
                <Route path="locataires" element={<Locataires />} />
                <Route path="locataires/*" element={<Locataires />} />
                <Route path="paiements" element={<Paiements />} />
                <Route path="baux" element={<Baux />} />
                <Route path="utilisateurs" element={<Utilisateurs />} />
                <Route path="utilisateurs/*" element={<Utilisateurs />} />
                <Route path="organisation" element={<Organisation />} />
                <Route path="abonnement" element={<Abonnement />} />
                <Route path="abonnement/*" element={<Abonnement />} />
                <Route path="securite" element={<Securite />} />
                <Route path="parametres" element={<Parametres />} />
                <Route path="parametres/*" element={<Parametres />} />
                <Route path="rapports" element={<Rapports />} />
                <Route path="integrations" element={<Integrations />} />
                <Route path="*" element={<Navigate to="/agence" replace />} />
              </Routes>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
