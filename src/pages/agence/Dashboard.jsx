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

export default function DashboardAgence() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body,#root{width:100%;min-height:100vh}
        .ac{display:flex;width:100vw;min-height:100vh;background:#0d1117;font-family:'Inter',sans-serif;color:#e6edf3;overflow:hidden}
        .ac-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99;backdrop-filter:blur(4px);display:none}
        .ac-main{display:flex;flex-direction:column;flex:1;min-width:0}
        .ac-content{flex:1;overflow-y:auto;padding:0;min-height:calc(100vh - 48px)}
        .ac-content-inner{padding:24px 28px;max-width:1400px}
        @media(max-width:768px){.ac-overlay{display:block}.ac-content-inner{padding:16px}}
      `}</style>
      <div className="ac">
        {mobileOpen && <div className="ac-overlay" onClick={() => setMobileOpen(false)}/>}
        <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)}/>
        <div className="ac-main">
          <Header
            onMenuClick={() => setMobileOpen(true)}
            onToggleSidebar={() => setCollapsed(!collapsed)}
            collapsed={collapsed}
          />
          <div className="ac-content">
            <div className="ac-content-inner">
              <Routes>
                <Route index element={<Overview />} />
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
