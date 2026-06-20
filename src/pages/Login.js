import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import Logo from '../components/Logo'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [showReset, setShowReset] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const subscribed = new URLSearchParams(window.location.search).get('subscribed')
  const doctorSignup = new URLSearchParams(window.location.search).get('doctor')

  // Doctor free signup state
  const [showDoctorForm, setShowDoctorForm] = useState(doctorSignup === 'true')
  const [doctorForm, setDoctorForm] = useState({ firstName: '', lastName: '', email: '', phone: '', company: '', password: '', confirm: '' })
  const [doctorLoading, setDoctorLoading] = useState(false)

  const handleSignIn = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      setError('Incorrect email or password. Please try again.')
      setLoading(false)
      return
    }
    navigate('/')
  }

  const handleDoctorSignup = async (e) => {
    e.preventDefault()
    setError('')
    if (doctorForm.password !== doctorForm.confirm) { setError('Passwords do not match.'); return }
    setDoctorLoading(true)
    const fullName = `${doctorForm.firstName} ${doctorForm.lastName}`.trim()
    const { error } = await supabase.auth.signUp({
      email: doctorForm.email,
      password: doctorForm.password,
      options: {
        data: {
          full_name: fullName,
          company_name: doctorForm.company,
          phone: doctorForm.phone,
          role: 'doctor'
        }
      }
    })
    if (error) { setError(error.message); setDoctorLoading(false); return }
    setMessage('Account created! You can now sign in.')
    setShowDoctorForm(false)
    setDoctorLoading(false)
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/login`
    })
    if (error) setError(error.message)
    else setMessage('Check your email for a password reset link.')
    setLoading(false)
  }

  const inputStyle = {
    width: '100%', padding: '12px 14px',
    border: '0.5px solid #3D3D3A', borderRadius: '8px',
    background: '#2C2C2A', color: '#F0EDE6',
    fontSize: '14px', outline: 'none', marginBottom: '10px',
    fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box'
  }

  const btnStyle = {
    width: '100%', padding: '13px',
    background: '#5DCAA5', color: '#0D0D0B',
    border: 'none', borderRadius: '8px',
    fontSize: '14px', fontWeight: '500', cursor: 'pointer',
    marginTop: '4px', fontFamily: 'DM Sans, sans-serif'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0B', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
            <Logo variant="dark" height={56} />
          </div>
          <div style={{ fontSize: '13px', color: '#5F5E5A', marginTop: '4px' }}>The platform compounding runs on</div>
        </div>

        <div style={{ background: '#1A1A18', border: '0.5px solid #2C2C2A', borderRadius: '16px', padding: '32px' }}>

          {/* Success banner after payment */}
          {subscribed && !showDoctorForm && (
            <div style={{ background: '#0F2E24', border: '0.5px solid #1D9E75', color: '#5DCAA5', padding: '14px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px', lineHeight: '1.6', textAlign: 'center' }}>
              🎉 <strong>Payment successful!</strong><br />
              Check your email to set your password, then sign in below.
            </div>
          )}

          {/* Error / message */}
          {error && <div style={{ background: '#3D1A1A', color: '#F87171', padding: '10px 12px', borderRadius: '7px', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
          {message && <div style={{ background: '#0F2E24', color: '#5DCAA5', padding: '10px 12px', borderRadius: '7px', fontSize: '13px', marginBottom: '12px' }}>{message}</div>}

          {/* DOCTOR FREE SIGNUP */}
          {showDoctorForm ? (
            <>
              <div style={{ fontSize: '16px', fontWeight: '500', color: '#F0EDE6', marginBottom: '4px' }}>Create your free account</div>
              <div style={{ fontSize: '13px', color: '#5F5E5A', marginBottom: '20px' }}>Rovi is always free for doctors and clinics.</div>
              <form onSubmit={handleDoctorSignup}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input style={{ ...inputStyle, flex: 1 }} placeholder="First name" value={doctorForm.firstName} onChange={e => setDoctorForm({...doctorForm, firstName: e.target.value})} required />
                  <input style={{ ...inputStyle, flex: 1 }} placeholder="Last name" value={doctorForm.lastName} onChange={e => setDoctorForm({...doctorForm, lastName: e.target.value})} required />
                </div>
                <input style={inputStyle} type="email" placeholder="Email address" value={doctorForm.email} onChange={e => setDoctorForm({...doctorForm, email: e.target.value})} required />
                <input style={inputStyle} type="tel" placeholder="Phone number" value={doctorForm.phone} onChange={e => setDoctorForm({...doctorForm, phone: e.target.value})} required />
                <input style={inputStyle} placeholder="Practice / clinic name" value={doctorForm.company} onChange={e => setDoctorForm({...doctorForm, company: e.target.value})} required />
                <input style={inputStyle} type="password" placeholder="Create password" value={doctorForm.password} onChange={e => setDoctorForm({...doctorForm, password: e.target.value})} required />
                <input style={inputStyle} type="password" placeholder="Confirm password" value={doctorForm.confirm} onChange={e => setDoctorForm({...doctorForm, confirm: e.target.value})} required />
                <button type="submit" style={{ ...btnStyle, background: '#EF9F27', color: '#0D0D0B' }} disabled={doctorLoading}>
                  {doctorLoading ? 'Creating account...' : 'Create free account'}
                </button>
              </form>
              <button onClick={() => setShowDoctorForm(false)}
                style={{ width: '100%', padding: '10px', background: 'transparent', color: '#5F5E5A', border: 'none', fontSize: '13px', cursor: 'pointer', marginTop: '8px', fontFamily: 'DM Sans, sans-serif' }}>
                ← Back to sign in
              </button>
            </>

          ) : showReset ? (
            <>
              <div style={{ fontSize: '16px', fontWeight: '500', color: '#F0EDE6', marginBottom: '8px' }}>Reset password</div>
              <div style={{ fontSize: '13px', color: '#888780', marginBottom: '20px' }}>Enter your email and we'll send you a reset link.</div>
              <form onSubmit={handleReset}>
                <input style={inputStyle} type="email" placeholder="Email address" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required />
                <button type="submit" style={btnStyle} disabled={loading}>{loading ? 'Sending...' : 'Send reset link'}</button>
              </form>
              <button onClick={() => { setShowReset(false); setError(''); setMessage('') }}
                style={{ width: '100%', padding: '10px', background: 'transparent', color: '#5F5E5A', border: 'none', fontSize: '13px', cursor: 'pointer', marginTop: '8px', fontFamily: 'DM Sans, sans-serif' }}>
                ← Back to sign in
              </button>
            </>

          ) : (
            <>
              <div style={{ fontSize: '16px', fontWeight: '500', color: '#F0EDE6', marginBottom: '20px' }}>Sign in to Rovi</div>
              <form onSubmit={handleSignIn}>
                <input style={inputStyle} type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required />
                <input style={inputStyle} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="submit" style={btnStyle} disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
              </form>
              <button onClick={() => { setShowReset(true); setError('') }}
                style={{ width: '100%', padding: '10px', background: 'transparent', color: '#5F5E5A', border: 'none', fontSize: '13px', cursor: 'pointer', marginTop: '8px', fontFamily: 'DM Sans, sans-serif' }}>
                Forgot password?
              </button>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
                <div style={{ flex: 1, height: '0.5px', background: '#2C2C2A' }} />
                <span style={{ fontSize: '12px', color: '#3D3D3A' }}>New to Rovi?</span>
                <div style={{ flex: 1, height: '0.5px', background: '#2C2C2A' }} />
              </div>

              {/* Get started options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button onClick={() => navigate('/subscribe')}
                  style={{ width: '100%', padding: '11px', background: 'transparent', border: '0.5px solid #5DCAA5', borderRadius: '8px', color: '#5DCAA5', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  Get started as a Rep or Supplier →
                </button>
                <button onClick={() => setShowDoctorForm(true)}
                  style={{ width: '100%', padding: '11px', background: 'transparent', border: '0.5px solid #EF9F27', borderRadius: '8px', color: '#EF9F27', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  Sign up free as a Doctor →
                </button>
              </div>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#3D3D3A' }}>
          Early access · Texas · rovihq.com
        </div>
      </div>
    </div>
  )
}
