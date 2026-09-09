import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useAuthStore } from './store/authStore'

// Chaque espace n'est charge que lorsqu'on y accede, au lieu d'un seul
// bundle de ~1.5 Mo contenant tout le code de l'application.
const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))
const DashboardAgence = lazy(() => import('./pages/agence/Dashboard'))
const DashboardProprietaire = lazy(() => import('./pages/proprietaire/Dashboard'))
const DashboardLocataire = lazy(() => import('./pages/locataire/Dashboard'))
const DashboardAdmin = lazy(() => import('./pages/admin/Dashboard'))
const ImolocApp = lazy(() => import('./pages/imoloc/ImolocApp'))

function Loader() {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#0d1117',color:'#4da6ff',fontFamily:'Inter,sans-serif',fontSize:14,gap:10}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{animation:'spin 0.8s linear infinite'}}>
        <path strokeLinecap="round" d="M12 3v3m0 12v3M3 12h3m12 0h3"/>
      </svg>
      Chargement...
    </div>
  )
}

function PrivateRoute({ children, roles }) {
  const { user, profile, loading } = useAuthStore()
  if (loading) return <Loader />
  if (!user) return <Navigate to="/login" replace />
  if (roles && profile && !roles.includes(profile.role)) {
    // Rediriger vers le bon dashboard selon le rôle
    const AGENCE_ROLES = ['agence','global_admin','user_admin','billing_admin','reports_reader','security_admin','password_admin','agent','comptable','lecteur']
    if (AGENCE_ROLES.includes(profile.role)) return <Navigate to="/agence" replace />
    if (profile.role === 'proprietaire') return <Navigate to="/proprietaire" replace />
    if (profile.role === 'locataire') return <Navigate to="/locataire" replace />
    if (profile.role === 'super_admin') return <Navigate to="/admin" replace />
  }
  return children
}

export default function App() {
  const { setUser, setProfile, setLoading } = useAuthStore()

  useEffect(() => {
    let mounted = true
    const fetchProfile = async (userId) => {
      try {
        const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
        if (mounted) setProfile(data || { id: userId, role: 'global_admin' })
      } catch {
        if (mounted) setProfile({ id: userId, role: 'global_admin' })
      } finally {
        if (mounted) setLoading(false)
      }
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (session?.user) { setUser(session.user); fetchProfile(session.user.id) }
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (event === 'SIGNED_OUT') { setUser(null); setProfile(null); setLoading(false); return }
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        const current = useAuthStore.getState().profile
        if (!current || current.id !== session.user.id) fetchProfile(session.user.id)
      }
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/agence/*" element={<PrivateRoute roles={['agence','global_admin','user_admin','billing_admin','reports_reader','security_admin','password_admin','agent','comptable','lecteur']}><DashboardAgence /></PrivateRoute>} />
        <Route path="/proprietaire/*" element={<PrivateRoute roles={['proprietaire']}><DashboardProprietaire /></PrivateRoute>} />
        <Route path="/locataire/*" element={<PrivateRoute><DashboardLocataire /></PrivateRoute>} />
        <Route path="/admin/*" element={<PrivateRoute roles={['super_admin']}><DashboardAdmin /></PrivateRoute>} />
        <Route path="/imoloc/*" element={<ImolocApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
