import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

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
    { id: 'rep', label: 'Sales Rep', sub: '$75/month', color: '#3C3489', bg: COLORS.purple2 },
    { id: 'supplier', label: '503B Supplier', sub: '$299/month', color: COLORS.green, bg: COLORS.green3 },
    { id: 'enterprise', label: '503B Enterprise', sub: '$999/month', color: COLORS.teal, bg: '#0F2E28' },
    { id: 'doctor', label: 'Doctor / Clinic', sub: 'Free forever', color: COLORS.amber, bg: '#2E1F00' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: COLORS.dark, fontFamily: 'DM Sans, sans-serif' }}>

      {/* HEADER */}
      <div style={{ padding: '20px 40px', borderBottom: `0.5px solid ${COLORS.dark2}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '22px', fontWeight: '700', color: '#F0EDE6' }}>
          Rovi<span style={{ color: COLORS.teal }}>.</span>
        </div>
        <button onClick={() => navigate('/login')}
          style={{ padding: '8px 16px', background: 'transparent', border: `0.5px solid #3D3D3A`, borderRadius: '7px', color: '#888780', fontSize: '13px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
          Already have an account? Sign in
        </button>
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '48px 40px' }}>

        {/* HERO */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ fontSize: '11px', fontWeight: '500', color: COLORS.teal, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '14px' }}>Get started</div>
          <div style={{ fontSize: '34px', fontWeight: '600', color: '#F0EDE6', marginBottom: '12px', lineHeight: '1.2' }}>
            The platform compounding runs on
          </div>
          <div style={{ fontSize: '15px', color: '#888780' }}>
            Select your role to see your plan and get started
          </div>
        </div>

        {/* ROLE SELECTOR */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#888780', marginBottom: '14px', textAlign: 'center' }}>I am a...</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
            {roleOptions.map(r => (
              <button key={r.id} onClick={() => {
                if (r.id === 'doctor') { navigate('/login?doctor=true'); return }
                setSelectedRole(r.id)
                setError('')
              }}
                style={{
                  padding: '18px 14px', borderRadius: '10px', cursor: 'pointer',
                  border: selectedRole === r.id ? `1.5px solid ${r.color}` : `0.5px solid #2C2C2A`,
                  background: selectedRole === r.id ? r.bg : '#161614',
                  textAlign: 'center', transition: 'all 0.15s', fontFamily: 'DM Sans, sans-serif'
                }}>
                <div style={{ fontSize: '14px', fontWeight: '500', color: selectedRole === r.id ? r.color : '#F0EDE6', marginBottom: '4px' }}>{r.label}</div>
                <div style={{ fontSize: '12px', color: selectedRole === r.id ? r.color : '#5F5E5A', opacity: 0.8 }}>{r.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* PLAN DETAILS */}
        {plan && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>

            {/* LEFT — Plan summary */}
            <div style={{ background: '#161614', border: `0.5px solid ${plan.color}`, borderRadius: '14px', padding: '28px', boxShadow: `0 0 40px ${plan.color}15` }}>
              <span style={{ background: plan.color, color: plan.id === 'rep' ? 'white' : COLORS.dark, fontSize: '10px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.5px', display: 'inline-block', marginBottom: '20px' }}>
                Selected plan
              </span>
              <div style={{ fontSize: '22px', fontWeight: '600', color: '#F0EDE6', marginBottom: '6px' }}>{plan.name}</div>
              <div style={{ fontSize: '13px', color: '#5F5E5A', marginBottom: '24px', lineHeight: '1.5' }}>{plan.tagline}</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', marginBottom: '28px' }}>
                <div style={{ fontSize: '40px', fontWeight: '600', color: '#F0EDE6', lineHeight: 1 }}>${plan.price}</div>
                <div style={{ fontSize: '14px', color: '#5F5E5A', marginBottom: '6px' }}>/month</div>
              </div>

              <div style={{ borderTop: `0.5px solid #2C2C2A`, paddingTop: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: '500', color: '#5F5E5A', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '14px' }}>What's included</div>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                    <span style={{ color: plan.color, fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>✓</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#F0EDE6', marginBottom: '1px' }}>{f.title}</div>
                      <div style={{ fontSize: '11px', color: '#5F5E5A', lineHeight: '1.4' }}>{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT — CTA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              <div style={{ background: '#161614', border: `0.5px solid #2C2C2A`, borderRadius: '14px', padding: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#F0EDE6', marginBottom: '16px' }}>How it works</div>
                {[
                  { step: '1', text: 'Click "Get started" below', sub: "You'll be taken to Stripe's secure payment page" },
                  { step: '2', text: 'Enter your email and payment details', sub: 'Your account is created automatically after payment' },
                  { step: '3', text: 'Check your email', sub: "You'll receive a link to set your password" },
                  { step: '4', text: 'Log in and get started', sub: 'Your dashboard is ready immediately' },
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: plan.color, color: plan.id === 'rep' ? 'white' : COLORS.dark, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', flexShrink: 0 }}>{s.step}</div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#F0EDE6' }}>{s.text}</div>
                      <div style={{ fontSize: '11px', color: '#5F5E5A', marginTop: '2px' }}>{s.sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={handleGetStarted} disabled={loading}
                style={{ padding: '16px', background: plan.color, color: plan.id === 'rep' ? 'white' : COLORS.dark, border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Redirecting to Stripe...' : `Get started — $${plan.price}/mo`}
              </button>

              {error && <div style={{ background: '#3D1A1A', color: '#F87171', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>{error}</div>}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                {[
                  { icon: '🔒', text: 'Secured by Stripe' },
                  { icon: '↩', text: 'Cancel anytime' },
                  { icon: '💳', text: 'No setup fees' },
                ].map((t, i) => (
                  <div key={i} style={{ background: '#161614', border: `0.5px solid #2C2C2A`, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', marginBottom: '4px' }}>{t.icon}</div>
                    <div style={{ fontSize: '11px', color: '#5F5E5A' }}>{t.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!plan && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#3D3D3A', fontSize: '14px' }}>
            Select your role above to see your plan details
          </div>
        )}

        <div style={{ textAlign: 'center', fontSize: '12px', color: '#3D3D3A', marginTop: '16px' }}>
          Doctors are always free — sign up via your rep's invite or{' '}
          <span onClick={() => navigate('/login?doctor=true')} style={{ color: COLORS.amber, cursor: 'pointer' }}>create a free account here</span>
        </div>
      </div>
    </div>
  )
}
