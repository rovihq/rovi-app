import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'

const COLORS = {
  green: '#0F6E56', teal: '#5DCAA5', dark: '#1C1C1A',
  dark2: '#2C2C2A', border: '#E2E0D8', text2: '#5F5E5A',
  text3: '#A8A8A2', amber: '#EF9F27', amber2: '#FAEEDA',
  green3: '#E8F7F1', purple3: '#3C3489', purple2: '#EEEDFE'
}

const PLANS = {
  rep: {
    id: 'rep',
    name: 'Rep Seat',
    price: 75,
    priceId: 'price_1Ti1ZfKU7iCToC2TK5PyMExD',
    color: '#3C3489',
    tagline: 'For compounding sales reps managing doctors and orders',
    features: [
      { title: 'Territory dashboard', desc: 'Full view of your doctors, orders and attainment' },
      { title: 'Automatic order crediting', desc: 'Every order from your doctors credits to you' },
      { title: 'Commission tracking', desc: 'Real-time commission calculation per order' },
      { title: 'Doctor management', desc: 'Add doctors to your territory and track activity' },
      { title: 'Real-time order feed', desc: 'See every order the moment it comes in' },
      { title: 'Direct messaging', desc: 'Message doctors and suppliers in one place' },
    ]
  },
  supplier: {
    id: 'supplier',
    name: 'Supplier Account',
    price: 299,
    priceId: 'price_1Ti1aAKU7iCToC2TMDDa2FOX',
    color: COLORS.green,
    tagline: 'For 503B facilities managing catalog, orders, and rep network',
    features: [
      { title: 'Product catalog management', desc: 'Add and manage your full compound catalog' },
      { title: 'Order tracking', desc: 'Track every order status from New to Delivered' },
      { title: 'Rep performance dashboard', desc: 'Revenue and commission tracking per rep' },
      { title: 'AI demand alerts', desc: 'Get notified when stock is running low' },
      { title: 'Commission management', desc: 'Set and adjust commission rates per rep' },
      { title: 'Real-time messaging', desc: 'Message reps directly from the platform' },
    ]
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 999,
    priceId: 'price_1Tk5eCKU7iCToC2TXf25iuWa',
    color: COLORS.teal,
    tagline: 'For large 503B facilities managing their entire rep network',
    features: [
      { title: 'Everything in Supplier', desc: 'Full supplier portal included' },
      { title: 'Unlimited rep management', desc: 'Add and manage unlimited reps from your portal' },
      { title: 'Commission payroll automation', desc: 'Automated commission calculation and approval' },
      { title: 'Direct deposit', desc: 'Pay reps directly via Stripe Connect' },
      { title: 'CSV / PDF exports', desc: 'Export commission reports and revenue summaries' },
      { title: '1099 export', desc: 'Year-end tax documents for contractor reps' },
      { title: 'White-glove onboarding', desc: 'Dedicated setup call with our team' },
      { title: 'Account manager', desc: 'Dedicated point of contact at Rovi' },
    ]
  }
}

export default function Subscribe() {
  const navigate = useNavigate()
  const [selectedRole, setSelectedRole] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const plan = selectedRole ? PLANS[selectedRole] : null

  const handleGetStarted = async () => {
    if (!plan || !plan.priceId) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: plan.priceId })
      })
      const data = await response.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      window.location.href = data.url
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const roleOptions = [
    { id: 'rep', label: 'Sales Rep', sub: '$75/month', color: '#3C3489', bg: '#F0EFFF' },
    { id: 'supplier', label: '503B Supplier', sub: '$299/month', color: COLORS.green, bg: '#E8F7F1' },
    { id: 'enterprise', label: '503B Enterprise', sub: '$999/month', color: '#0A7A6A', bg: '#E0F5F0' },
    { id: 'doctor', label: 'Doctor / Clinic', sub: 'Free forever', color: '#B07A00', bg: '#FFF8E6' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#F7F5F0', fontFamily: 'DM Sans, sans-serif' }}>

      {/* HEADER */}
      <div style={{ padding: '20px 40px', borderBottom: `0.5px solid #E2E0D8`, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo variant="light" height={36} />
        <button onClick={() => navigate('/login')}
          style={{ padding: '8px 16px', background: 'transparent', border: `0.5px solid #C8C6BE`, borderRadius: '7px', color: '#5F5E5A', fontSize: '13px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
          Already have an account? Sign in
        </button>
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '48px 40px' }}>

        {/* HERO */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ fontSize: '11px', fontWeight: '500', color: COLORS.green, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '14px' }}>Get started</div>
          <div style={{ fontSize: '34px', fontWeight: '600', color: '#1C1C1A', marginBottom: '12px', lineHeight: '1.2' }}>
            The platform compounding runs on
          </div>
          <div style={{ fontSize: '15px', color: '#5F5E5A' }}>
            Select your role to see your plan and get started
          </div>
        </div>

        {/* ROLE SELECTOR */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#5F5E5A', marginBottom: '14px', textAlign: 'center' }}>I am a...</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
            {roleOptions.map(r => (
              <button key={r.id} onClick={() => {
                if (r.id === 'doctor') { navigate('/login?doctor=true'); return }
                setSelectedRole(r.id)
                setError('')
              }}
                style={{
                  padding: '20px 14px', borderRadius: '10px', cursor: 'pointer',
                  border: selectedRole === r.id ? `2px solid ${r.color}` : `0.5px solid #E2E0D8`,
                  background: selectedRole === r.id ? r.bg : 'white',
                  textAlign: 'center', transition: 'all 0.15s', fontFamily: 'DM Sans, sans-serif',
                  boxShadow: selectedRole === r.id ? `0 4px 16px ${r.color}25` : '0 1px 4px rgba(0,0,0,0.06)'
                }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: selectedRole === r.id ? r.color : '#1C1C1A', marginBottom: '5px' }}>{r.label}</div>
                <div style={{ fontSize: '12px', color: selectedRole === r.id ? r.color : '#A8A8A2', fontWeight: '500' }}>{r.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* PLAN DETAILS */}
        {plan && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>

            {/* LEFT — Plan summary */}
            <div style={{ background: 'white', border: `1.5px solid ${plan.color}`, borderRadius: '14px', padding: '28px', boxShadow: `0 4px 24px ${plan.color}20` }}>
              <span style={{ background: plan.color, color: plan.id === 'rep' ? 'white' : '#0D0D0B', fontSize: '10px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.5px', display: 'inline-block', marginBottom: '20px' }}>
                Selected plan
              </span>
              <div style={{ fontSize: '22px', fontWeight: '600', color: '#1C1C1A', marginBottom: '6px' }}>{plan.name}</div>
              <div style={{ fontSize: '13px', color: '#5F5E5A', marginBottom: '24px', lineHeight: '1.5' }}>{plan.tagline}</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', marginBottom: '28px' }}>
                <div style={{ fontSize: '40px', fontWeight: '600', color: '#1C1C1A', lineHeight: 1 }}>${plan.price}</div>
                <div style={{ fontSize: '14px', color: '#A8A8A2', marginBottom: '6px' }}>/month</div>
              </div>

              <div style={{ borderTop: `0.5px solid #E2E0D8`, paddingTop: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#A8A8A2', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '14px' }}>What's included</div>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                    <span style={{ color: plan.color, fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>✓</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#1C1C1A', marginBottom: '1px' }}>{f.title}</div>
                      <div style={{ fontSize: '11px', color: '#A8A8A2', lineHeight: '1.4' }}>{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT — CTA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              <div style={{ background: 'white', border: `0.5px solid #E2E0D8`, borderRadius: '14px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1C1C1A', marginBottom: '16px' }}>How it works</div>
                {[
                  { step: '1', text: 'Click "Get started" below', sub: "You'll be taken to Stripe's secure payment page" },
                  { step: '2', text: 'Enter your email and payment details', sub: 'Your account is created automatically after payment' },
                  { step: '3', text: 'Check your email', sub: "You'll receive a link to set your password" },
                  { step: '4', text: 'Log in and get started', sub: 'Your dashboard is ready immediately' },
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: plan.color, color: plan.id === 'rep' ? 'white' : '#0D0D0B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', flexShrink: 0 }}>{s.step}</div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#1C1C1A' }}>{s.text}</div>
                      <div style={{ fontSize: '11px', color: '#A8A8A2', marginTop: '2px' }}>{s.sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={handleGetStarted} disabled={loading}
                style={{ padding: '16px', background: plan.color, color: plan.id === 'rep' ? 'white' : '#0D0D0B', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: loading ? 0.7 : 1, boxShadow: `0 4px 16px ${plan.color}40` }}>
                {loading ? 'Redirecting to Stripe...' : `Get started — $${plan.price}/mo`}
              </button>

              {error && <div style={{ background: '#FCEBEB', color: '#791F1F', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>{error}</div>}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                {[
                  { icon: '🔒', text: 'Secured by Stripe' },
                  { icon: '↩', text: 'Cancel anytime' },
                  { icon: '💳', text: 'No setup fees' },
                ].map((t, i) => (
                  <div key={i} style={{ background: 'white', border: `0.5px solid #E2E0D8`, borderRadius: '8px', padding: '10px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: '16px', marginBottom: '4px' }}>{t.icon}</div>
                    <div style={{ fontSize: '11px', color: '#5F5E5A' }}>{t.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!plan && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#A8A8A2', fontSize: '14px' }}>
            Select your role above to see your plan details
          </div>
        )}

        <div style={{ textAlign: 'center', fontSize: '12px', color: '#A8A8A2', marginTop: '16px' }}>
          Doctors are always free — sign up via your rep's invite or{' '}
          <span onClick={() => navigate('/login?doctor=true')} style={{ color: COLORS.amber, cursor: 'pointer', fontWeight: '500' }}>create a free account here</span>
        </div>
      </div>
    </div>
  )
}
