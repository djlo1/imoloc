import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useAuthStore } from './store/authStore'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import DashboardAgence from './pages/agence/Dashboard'
import DashboardProprietaire from './pages/proprietaire/Dashboard'
import DashboardLocataire from './pages/locataire/Dashboard'
import DashboardAdmin from './pages/admin/Dashboard'

function PrivateRoute({ children, roles }) {
  const { user, profile, loading } = useAuthStore()
  if (loading) return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh'}}>Chargement...</div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(profile?.role)) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { setUser, setProfile, setLoading } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setProfile(profile)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          setProfile(profile)
        } else {
          setUser(null)
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/agence/*" element={
        <PrivateRoute roles={['agence']}><DashboardAgence /></PrivateRoute>
      } />
      <Route path="/proprietaire/*" element={
        <PrivateRoute roles={['proprietaire']}><DashboardProprietaire /></PrivateRoute>
      } />
      <Route path="/locataire/*" element={
        <PrivateRoute roles={['locataire']}><DashboardLocataire /></PrivateRoute>
      } />
      <Route path="/admin/*" element={
        <PrivateRoute roles={['super_admin']}><DashboardAdmin /></PrivateRoute>
      } />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}