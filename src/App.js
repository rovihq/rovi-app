import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Subscribe from './pages/Subscribe'
import PaymentSuccess from './pages/PaymentSuccess'
import ResetPassword from './pages/ResetPassword'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import SupplierDashboard from './pages/SupplierDashboard'
import RepDashboard from './pages/RepDashboard'
import DoctorDashboard from './pages/DoctorDashboard'
import AdminDashboard from './pages/AdminDashboard'

const ADMIN_EMAILS = ['admin@rovihq.com', 'desiree@rovihq.com']

const Spinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1C1C1A', color: '#5DCAA5', fontSize: '18px' }}>
    Loading Rovi...
  </div>
)

const AuthRedirectHandler = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.includes('type=recovery')) {
      navigate('/reset-password' + hash)
    }
  }, [navigate])

  return null
}

const PrivateRoute = ({ children, role }) => {
  const { user, profile, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (role && profile?.role !== role) return <Navigate to="/login" replace />
  return children
}

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (!ADMIN_EMAILS.includes(user.email)) return <Navigate to="/" replace />
  return children
}

const RoleRedirect = () => {
  const { user, profile, loading } = useAuth()
  if (loading) return <Login />
  if (!user) return <Navigate to="/login" replace />
  if (ADMIN_EMAILS.includes(user.email)) return <Navigate to="/admin" replace />
  if (profile?.role === 'supplier') return <Navigate to="/supplier" replace />
  if (profile?.role === 'rep') return <Navigate to="/rep" replace />
  if (profile?.role === 'doctor') return <Navigate to="/doctor" replace />
  return <Navigate to="/login" replace />
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AuthRedirectHandler />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/subscribe" element={<Subscribe />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/" element={<RoleRedirect />} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/supplier" element={<PrivateRoute role="supplier"><SupplierDashboard /></PrivateRoute>} />
          <Route path="/rep" element={<PrivateRoute role="rep"><RepDashboard /></PrivateRoute>} />
          <Route path="/doctor" element={<PrivateRoute role="doctor"><DoctorDashboard /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
