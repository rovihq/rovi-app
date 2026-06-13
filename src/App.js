import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import SupplierDashboard from './pages/SupplierDashboard'
import RepDashboard from './pages/RepDashboard'
import DoctorDashboard from './pages/DoctorDashboard'

const PrivateRoute = ({ children, role }) => {
  const { user, profile, loading } = useAuth()
  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#1C1C1A',color:'#5DCAA5',fontSize:'18px'}}>
      Loading Rovi...
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (role && profile?.role !== role) return <Navigate to="/login" replace />
  return children
}

const RoleRedirect = () => {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (profile?.role === 'supplier') return <Navigate to="/supplier" replace />
  if (profile?.role === 'rep') return <Navigate to="/rep" replace />
  if (profile?.role === 'doctor') return <Navigate to="/doctor" replace />
  return <Navigate to="/login" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RoleRedirect />} />
        <Route path="/supplier" element={
          <PrivateRoute role="supplier"><SupplierDashboard /></PrivateRoute>
        } />
        <Route path="/rep" element={
          <PrivateRoute role="rep"><RepDashboard /></PrivateRoute>
        } />
        <Route path="/doctor" element={
          <PrivateRoute role="doctor"><DoctorDashboard /></PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
