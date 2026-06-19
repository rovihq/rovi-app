import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [tab, setTab] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [showReset, setShowReset] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp, resetPassword } = useAuth()
  const navigate = useNavigate()
  const subscribed = new URLSearchParams(window.location.search).get('subscribed')

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
    // Navigate to root — RoleRedirect handles where to send them
    navigate('/')
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    if (!role) { setError('Please select your account type.'); return }
    setLoading(true)
    const fullName = `${firstName} ${lastName}`.trim()
    const roleMap = { rep: 'rep', supplier: 'supplier', doctor: 'doctor' }
    const { error } = await signUp(email, password, {
      full_name: fullName,
      phone,
      company_name: company,
      role: roleMap[role]
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setMessage('Account created! You can now sign in.')
    setTab('signin')
    setLoading(false)
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await resetPassword(resetEmail)
    if (error) setError(error.message)
    else setMessage('Check your email for a password reset link.')
    setLoading(false)
  }

  const inputStyle = {
    width: '100%', padding: '12px 14px',
    border: '0.5px solid #3D3D3A', borderRadius: '8px',
    background: '#2C2C2A', color: '#F0EDE6',
    fontSize: '14px', outline: 'none', marginBottom: '10px',
    fontFamily: 'DM Sans, sans-serif'
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
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#F0EDE6', letterSpacing: '-1px' }}>
            Rovi<span style={{ color: '#5DCAA5' }}>.</span>
          </div>
          <div style={{ fontSize: '13px', color: '#5F5E5A', marginTop: '6px' }}>The platform compounding runs on</div>
        </div>

        <div style={{ background: '#1A1A18', border: '0.5px solid #2C2C2A', borderRadius: '16px', padding: '32px' }}>

          {/* Tabs */}
          {!showReset && (
            <div style={{ display: 'flex', gap: '4px', background: '#111110', borderRadius: '8px', padding: '4px', marginBottom: '24px' }}>
              {['signin', 'signup'].map(t => (
                <button key={t} onClick={() => { setTab(t); setError(''); setMessage('') }}
                  style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500', fontFamily: 'DM Sans, sans-serif', background: tab === t ? '#2C2C2A' : 'transparent', color: tab === t ? '#F0EDE6' : '#5F5E5A' }}>
                  {t === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>
          )}

          {subscribed && (
            <div style={{ background: '#0F2E24', color: '#5DCAA5', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>
              🎉 Payment successful! Sign in below to access your account.
            </div>
          )}

          {/* Error / message */}
          {error && <div style={{ background: '#3D1A1A', color: '#F87171', padding: '10px 12px', borderRadius: '7px', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
          {message && <div style={{ background: '#0F2E24', color: '#5DCAA5', padding: '10px 12px', borderRadius: '7px', fontSize: '13px', marginBottom: '12px' }}>{message}</div>}

          {/* SIGN IN */}
          {tab === 'signin' && !showReset && (
            <form onSubmit={handleSignIn}>
              <input style={inputStyle} type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required />
              <input style={inputStyle} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
              <button type="submit" style={btnStyle} disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
              <button type="button" onClick={() => { setShowReset(true); setError(''); setMessage('') }}
                style={{ width: '100%', padding: '10px', background: 'transparent', color: '#5F5E5A', border: 'none', fontSize: '13px', cursor: 'pointer', marginTop: '8px', fontFamily: 'DM Sans, sans-serif' }}>
                Forgot password?
              </button>
            </form>
          )}

          {/* SIGN UP */}
          {tab === 'signup' && !showReset && (
            <form onSubmit={handleSignUp}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input style={{ ...inputStyle, flex: 1 }} type="text" placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                <input style={{ ...inputStyle, flex: 1 }} type="text" placeholder="Last name" value={lastName} onChange={e => setLastName(e.target.value)} required />
              </div>
              <input style={inputStyle} type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required />
              <input style={inputStyle} type="tel" placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)} required />
              <input style={inputStyle} type="text" placeholder="Company / Practice name" value={company} onChange={e => setCompany(e.target.value)} required />
              <select style={{ ...inputStyle, color: role ? '#F0EDE6' : '#5F5E5A' }} value={role} onChange={e => setRole(e.target.value)} required>
                <option value="">I am a...</option>
                <option value="rep">Sales Rep</option>
                <option value="supplier">Supplier / 503B Facility</option>
                <option value="doctor">Doctor / Clinic</option>
              </select>
              <input style={inputStyle} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
              <input style={inputStyle} type="password" placeholder="Confirm password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
              <button type="submit" style={btnStyle} disabled={loading}>{loading ? 'Creating account...' : 'Create account'}</button>
            </form>
          )}

          {/* FORGOT PASSWORD */}
          {showReset && (
            <form onSubmit={handleReset}>
              <div style={{ fontSize: '16px', fontWeight: '500', color: '#F0EDE6', marginBottom: '8px' }}>Reset password</div>
              <div style={{ fontSize: '13px', color: '#888780', marginBottom: '20px' }}>Enter your email and we'll send you a reset link.</div>
              <input style={inputStyle} type="email" placeholder="Email address" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required />
              <button type="submit" style={btnStyle} disabled={loading}>{loading ? 'Sending...' : 'Send reset link'}</button>
              <button type="button" onClick={() => { setShowReset(false); setError(''); setMessage('') }}
                style={{ width: '100%', padding: '10px', background: 'transparent', color: '#5F5E5A', border: 'none', fontSize: '13px', cursor: 'pointer', marginTop: '8px', fontFamily: 'DM Sans, sans-serif' }}>
                Back to sign in
              </button>
            </form>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#3D3D3A' }}>
          Early access · Texas · rovi-hq.netlify.app
        </div>
      </div>
    </div>
  )
}
