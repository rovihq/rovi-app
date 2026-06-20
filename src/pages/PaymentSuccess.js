import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'

const COLORS = {
  green: '#0F6E56', teal: '#5DCAA5', dark: '#1C1C1A',
  border: '#E2E0D8', text2: '#5F5E5A', text3: '#A8A8A2',
  amber: '#EF9F27', green3: '#E8F7F1', red: '#E24B4A'
}

export default function PaymentSuccess() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/.netlify/functions/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        setError(data.error || 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }

      setSuccess(data)
    } catch (err) {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F5F0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Logo variant="light" height={36} />
        </div>

        <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '16px', padding: '36px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>

          {!success ? (
            <>
              {/* Payment confirmed icon */}
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: COLORS.green3, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px' }}>
                  ✓
                </div>
                <div style={{ fontSize: '22px', fontWeight: '600', color: COLORS.dark, marginBottom: '8px' }}>
                  Payment received!
                </div>
                <div style={{ fontSize: '14px', color: COLORS.text2, lineHeight: '1.6' }}>
                  Enter the email address you used during checkout to activate your account.
                </div>
              </div>

              <form onSubmit={handleVerify}>
                <label style={{ fontSize: '12px', fontWeight: '500', color: COLORS.text2, display: 'block', marginBottom: '6px' }}>
                  Email address used at checkout
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  style={{ width: '100%', padding: '12px 14px', border: `0.5px solid ${COLORS.border}`, borderRadius: '8px', fontSize: '14px', outline: 'none', marginBottom: '12px', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }}
                />

                {error && (
                  <div style={{ background: '#FCEBEB', color: '#791F1F', padding: '12px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '12px', lineHeight: '1.5' }}>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading || !email}
                  style={{ width: '100%', padding: '13px', background: loading || !email ? COLORS.border : COLORS.green, color: loading || !email ? COLORS.text3 : 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: loading || !email ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  {loading ? 'Verifying payment...' : 'Activate my account →'}
                </button>
              </form>

              <div style={{ marginTop: '20px', padding: '14px', background: '#F7F5F0', borderRadius: '8px', fontSize: '12px', color: COLORS.text3, lineHeight: '1.6' }}>
                <strong style={{ color: COLORS.text2 }}>What happens next:</strong><br />
                After verifying your payment we'll send you an email to set your password. Once set you can log in and access your dashboard immediately.
              </div>
            </>
          ) : (
            <>
              {/* Success state */}
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: COLORS.green3, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px' }}>
                  🎉
                </div>
                <div style={{ fontSize: '22px', fontWeight: '600', color: COLORS.dark, marginBottom: '8px' }}>
                  {success.isNew ? 'Account created!' : 'Account activated!'}
                </div>
                <div style={{ fontSize: '14px', color: COLORS.text2, lineHeight: '1.6', marginBottom: '20px' }}>
                  We've sent a password setup link to <strong>{email}</strong>.<br />
                  Check your inbox and click the link to set your password.
                </div>

                <div style={{ background: COLORS.green3, border: `0.5px solid #9FE1CB`, borderRadius: '10px', padding: '16px', marginBottom: '20px', textAlign: 'left' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#085041', marginBottom: '8px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Your account</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: '#085041' }}>Email</span>
                    <span style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark }}>{email}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: '#085041' }}>Role</span>
                    <span style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark, textTransform: 'capitalize' }}>{success.role}</span>
                  </div>
                </div>

                <button onClick={() => navigate('/login')}
                  style={{ width: '100%', padding: '13px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  Go to sign in →
                </button>

                <div style={{ marginTop: '12px', fontSize: '12px', color: COLORS.text3 }}>
                  Didn't receive the email? Check your spam folder or{' '}
                  <span onClick={() => setSuccess(null)} style={{ color: COLORS.green, cursor: 'pointer' }}>try again</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: COLORS.text3 }}>
          Need help? Email us at{' '}
          <a href="mailto:info@rovihq.com" style={{ color: COLORS.green }}>info@rovihq.com</a>
        </div>
      </div>
    </div>
  )
}
