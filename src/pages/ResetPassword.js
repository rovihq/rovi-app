import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const COLORS = {
  green: '#0F6E56', teal: '#5DCAA5', dark: '#1C1C1A',
  border: '#E2E0D8', text2: '#5F5E5A', text3: '#A8A8A2'
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [validSession, setValidSession] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setValidSession(true)
        setChecking(false)
      } else if (session) {
        setValidSession(true)
        setChecking(false)
      } else {
        setChecking(false)
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setValidSession(true)
        setChecking(false)
      }
    })
  }, [])

  const handleReset = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => navigate('/'), 2000)
  }

  const inputStyle = {
    width: '100%', padding: '12px 14px',
    border: `0.5px solid ${COLORS.border}`, borderRadius: '8px',
    background: 'white', color: COLORS.dark,
    fontSize: '14px', outline: 'none', marginBottom: '10px',
    fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box'
  }

  if (checking) return (
    <div style={{ minHeight: '100vh', background: '#F7F5F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ color: COLORS.text3, fontSize: '14px' }}>Verifying your reset link...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F7F5F0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '28px', fontWeight: '700', color: COLORS.dark }}>
            Rovi<span style={{ color: COLORS.teal }}>.</span>
          </div>
        </div>

        <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '16px', padding: '36px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>

          {success ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#E8F7F1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '24px' }}>✓</div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: COLORS.dark, marginBottom: '8px' }}>Password updated!</div>
              <div style={{ fontSize: '14px', color: COLORS.text2 }}>Taking you to your dashboard...</div>
            </div>
          ) : !validSession ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '600', color: COLORS.dark, marginBottom: '8px' }}>Invalid or expired link</div>
              <div style={{ fontSize: '14px', color: COLORS.text2, marginBottom: '20px' }}>This password reset link has expired. Please request a new one.</div>
              <button onClick={() => navigate('/login')}
                style={{ width: '100%', padding: '12px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: '20px', fontWeight: '600', color: COLORS.dark, marginBottom: '6px' }}>Set your password</div>
              <div style={{ fontSize: '13px', color: COLORS.text2, marginBottom: '24px' }}>Choose a strong password for your Rovi account.</div>

              {error && <div style={{ background: '#FCEBEB', color: '#791F1F', padding: '10px 12px', borderRadius: '7px', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}

              <form onSubmit={handleReset}>
                <label style={{ fontSize: '12px', fontWeight: '500', color: COLORS.text2, display: 'block', marginBottom: '5px' }}>New password</label>
                <input style={inputStyle} type="password" placeholder="Minimum 6 characters" value={password} onChange={e => setPassword(e.target.value)} required />

                <label style={{ fontSize: '12px', fontWeight: '500', color: COLORS.text2, display: 'block', marginBottom: '5px' }}>Confirm password</label>
                <input style={inputStyle} type="password" placeholder="Confirm your password" value={confirm} onChange={e => setConfirm(e.target.value)} required />

                <button type="submit" disabled={loading || !password || !confirm}
                  style={{ width: '100%', padding: '13px', background: loading || !password || !confirm ? '#E2E0D8' : COLORS.green, color: loading || !password || !confirm ? COLORS.text3 : 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: loading || !password ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', marginTop: '4px' }}>
                  {loading ? 'Updating password...' : 'Set password and sign in →'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
