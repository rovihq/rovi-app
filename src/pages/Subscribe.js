import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'

const COLORS = {
  green: '#0F6E56', teal: '#5DCAA5', dark: '#1C1C1A',
  dark2: '#2C2C2A', border: '#E2E0D8', text2: '#5F5E5A',
  text3: '#A8A8A2', amber: '#EF9F27', amber2: '#FAEEDA',
  green3: '#E8F7F1', purple3: '#3C3489', purple2: '#EEEDFE',
  bg2: '#F0EDE6'
}

const PLANS = {
  rep: {
    id: 'rep',
    name: 'Rep Seat',
    price: 75,
    priceId: 'price_1Ti1ZfKU7iCToC2TK5PyMExD',
    color: '#3C3489',
    badge: 'Independent reps',
    tagline: "For reps whose supplier isn't on Rovi yet — full portal, bridge product",
    features: [
      { title: 'Full territory dashboard', desc: 'Doctors, orders and attainment in one place' },
      { title: 'Automatic order crediting', desc: 'Every order from your doctors credits to you' },
      { title: 'Commission tracking', desc: 'Real-time commission calculation per order' },
      { title: 'Doctor management', desc: 'Add doctors to your territory and track activity' },
      { title: 'Real-time order feed', desc: 'See every order the moment it comes in' },
      { title: 'Direct messaging', desc: 'Message doctors and suppliers in one place' },
    ]
  },
  supplier: {
    id: 'supplier',
    name: 'Supplier',
    price: 299,
    priceId: 'price_1Ti1aAKU7iCToC2TMDDa2FOX',
    color: COLORS.green,
    badge: 'Most popular',
    tagline: 'For 503B facilities — includes 3 rep seats, add more at $25/rep/mo',
    features: [
      { title: '3 rep seats included', desc: 'Add your reps directly — they get full portal access' },
      { title: 'Product catalog management', desc: 'Add and manage your full compound catalog' },
      { title: 'Order tracking', desc: 'Track every order status from New to Delivered' },
      { title: 'Rep performance dashboard', desc: 'Revenue and commission tracking per rep' },
      { title: 'AI demand alerts', desc: 'Get notified when stock is running low' },
      { title: 'Real-time messaging', desc: 'Message reps and doctors directly' },
      { title: 'Additional reps', desc: '$25/rep/mo beyond the first 3 included' },
    ]
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 999,
    priceId: 'price_1Tk5eCKU7iCToC2TXf25iuWa',
    color: COLORS.teal,
    badge: 'Unlimited reps',
    tagline: 'For large 503B facilities managing their entire rep network',
    features: [
      { title: 'Everything in Supplier', desc: 'Full supplier portal included' },
      { title: 'Unlimited rep seats', desc: 'Add as many reps as you need — no per-seat fees' },
      { title: 'Commission payroll automation', desc: 'Automated commission calculation and approval' },
      { title: 'CSV / PDF exports', desc: 'Export commission reports and revenue summaries' },
      { title: '1099 export', desc: 'Year-end tax documents for contractor reps' },
      { title: 'White-glove onboarding', desc: 'Dedicated setup call with our team' },
      { title: 'Dedicated account manager', desc: 'Your point of contact at Rovi' },
    ]
  }
}

const roleOptions = [
  { id: 'rep', label: 'Sales Rep', sub: '$75/month', color: '#3C3489', bg: '#F0EFFF', desc: 'Independent rep' },
  { id: 'supplier', label: '503B Supplier', sub: '$299/month', color: COLORS.green, bg: '#E8F7F1', desc: '3 rep seats included' },
  { id: 'enterprise', label: '503B Enterprise', sub: '$999/month', color: '#0A7A6A', bg: '#E0F5F0', desc: 'Unlimited reps' },
  { id: 'doctor', label: 'Doctor / Clinic', sub: 'Free forever', color: '#B07A00', bg: '#FFF8E6', desc: 'Always free' },
]

export default function Subscribe() {
  const navigate = useNavigate()
  const [selectedRole, setSelectedRole] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)

  const plan = selectedRole ? PLANS[selectedRole] : null

  const handleGetStarted = async () => {
    if (!plan || !plan.priceId) return
    if (!termsAccepted) {
      setError('Please accept the Terms of Service and Privacy Policy to continue.')
      return
    }
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

  return (
    <div style={{ minHeight: '100vh', background: '#F7F5F0', fontFamily: 'DM Sans, sans-serif' }}>

      {/* HEADER */}
      <div style={{ padding: '16px 40px', borderBottom: `0.5px solid ${COLORS.border}`, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo variant="light" height={32} />
        <button onClick={() => navigate('/login')}
          style={{ padding: '8px 16px', background: 'transparent', border: `0.5px solid #C8C6BE`, borderRadius: '7px', color: '#5F5E5A', fontSize: '13px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
          Already have an account? Sign in
        </button>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '48px 40px' }}>

        {/* HERO */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '11px', fontWeight: '500', color: COLORS.green, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '14px' }}>Simple pricing</div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#1C1C1A', marginBottom: '10px', lineHeight: '1.2' }}>
            The platform compounding runs on
          </div>
          <div style={{ fontSize: '14px', color: '#5F5E5A' }}>
            Doctors are always free. Suppliers include 3 rep seats. Scale as you grow.
          </div>
        </div>

        {/* ROLE SELECTOR */}
        <div style={{ marginBottom: '36px' }}>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#5F5E5A', marginBottom: '12px', textAlign: 'center' }}>I am a...</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
            {roleOptions.map(r => (
              <button key={r.id} onClick={() => {
                if (r.id === 'doctor') { navigate('/login?doctor=true'); return }
                setSelectedRole(r.id)
                setError('')
              }}
                style={{
                  padding: '18px 14px', borderRadius: '10px', cursor: 'pointer',
                  border: selectedRole === r.id ? `2px solid ${r.color}` : `0.5px solid ${COLORS.border}`,
                  background: selectedRole === r.id ? r.bg : 'white',
                  textAlign: 'center', transition: 'all 0.15s', fontFamily: 'DM Sans, sans-serif',
                  boxShadow: selectedRole === r.id ? `0 4px 16px ${r.color}25` : '0 1px 4px rgba(0,0,0,0.04)'
                }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: selectedRole === r.id ? r.color : '#1C1C1A', marginBottom: '4px' }}>{r.label}</div>
                <div style={{ fontSize: '12px', fontWeight: '500', color: selectedRole === r.id ? r.color : COLORS.text3 }}>{r.sub}</div>
                <div style={{ fontSize: '11px', color: COLORS.text3, marginTop: '3px' }}>{r.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* PLAN DETAILS */}
        {plan && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '20px', marginBottom: '24px' }}>

            {/* LEFT — Plan details */}
            <div style={{ background: 'white', border: `1.5px solid ${plan.color}`, borderRadius: '14px', padding: '28px', boxShadow: `0 4px 24px ${plan.color}18` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <span style={{ background: plan.color, color: plan.id === 'rep' ? 'white' : '#0D0D0B', fontSize: '10px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.5px' }}>
                  {plan.badge}
                </span>
                {plan.id === 'supplier' && (
                  <span style={{ background: COLORS.amber2, color: '#633806', fontSize: '10px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px' }}>
                    +$25/rep after 3
                  </span>
                )}
              </div>

              <div style={{ fontSize: '22px', fontWeight: '600', color: '#1C1C1A', marginBottom: '6px' }}>{plan.name}</div>
              <div style={{ fontSize: '13px', color: '#5F5E5A', marginBottom: '20px', lineHeight: '1.5' }}>{plan.tagline}</div>

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', marginBottom: '24px', paddingBottom: '20px', borderBottom: `0.5px solid ${COLORS.border}` }}>
                <div style={{ fontSize: '40px', fontWeight: '600', color: '#1C1C1A', lineHeight: 1 }}>${plan.price}</div>
                <div style={{ fontSize: '14px', color: '#A8A8A2', marginBottom: '6px' }}>/month</div>
                {plan.id === 'supplier' && (
                  <div style={{ marginLeft: '8px', fontSize: '12px', color: COLORS.green, fontWeight: '500', marginBottom: '6px' }}>· 3 seats included</div>
                )}
              </div>

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

              {plan.id === 'supplier' && (
                <div style={{ marginTop: '16px', padding: '12px 14px', background: COLORS.bg2, borderRadius: '8px', fontSize: '12px', color: COLORS.text2, lineHeight: '1.6' }}>
                  <strong>Scaling up?</strong> Add reps at $25/rep/mo beyond your 3 included seats. When you reach 25+ reps, upgrading to Enterprise at $999/mo saves you money and unlocks unlimited reps + commission payroll.
                </div>
              )}
            </div>

            {/* RIGHT — How it works + CTA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '14px', padding: '22px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1C1C1A', marginBottom: '16px' }}>How it works</div>
                {[
                  { step: '1', text: 'Click "Get started" below', sub: "Taken to Stripe's secure checkout" },
                  { step: '2', text: 'Enter email + payment details', sub: 'Account created automatically after payment' },
                  { step: '3', text: 'Check your email', sub: 'Receive a link to set your password' },
                  { step: '4', text: 'Log in and get started', sub: 'Dashboard ready immediately' },
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: plan.color, color: plan.id === 'rep' ? 'white' : '#0D0D0B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', flexShrink: 0 }}>{s.step}</div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '500', color: '#1C1C1A' }}>{s.text}</div>
                      <div style={{ fontSize: '11px', color: '#A8A8A2', marginTop: '1px' }}>{s.sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Terms checkbox */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px', background: COLORS.bg2, borderRadius: '8px', marginBottom: '4px' }}>
                <input type="checkbox" id="terms" checked={termsAccepted} onChange={e => { setTermsAccepted(e.target.checked); setError('') }}
                  style={{ marginTop: '2px', width: '15px', height: '15px', accentColor: COLORS.green, flexShrink: 0, cursor: 'pointer' }} />
                <label htmlFor="terms" style={{ fontSize: '12px', color: COLORS.text2, lineHeight: '1.6', cursor: 'pointer' }}>
                  I agree to Rovi's{' '}
                  <a href="/terms" target="_blank" style={{ color: COLORS.green, fontWeight: '500' }}>Terms of Service</a>
                  {' '}and{' '}
                  <a href="/privacy" target="_blank" style={{ color: COLORS.green, fontWeight: '500' }}>Privacy Policy</a>.
                  I confirm I am a licensed healthcare professional or authorized business representative.
                </label>
              </div>

              <button onClick={handleGetStarted} disabled={loading || !termsAccepted}
                style={{ padding: '16px', background: !termsAccepted ? '#C8C6BE' : plan.color, color: !termsAccepted ? 'white' : plan.id === 'rep' ? 'white' : '#0D0D0B', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: !termsAccepted ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: loading ? 0.7 : 1, boxShadow: termsAccepted ? `0 4px 16px ${plan.color}35` : 'none' }}>
                {loading ? 'Redirecting to Stripe...' : `Get started → $${plan.price}/mo`}
              </button>

              {error && <div style={{ background: '#FCEBEB', color: '#791F1F', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>{error}</div>}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                {[
                  { icon: '🔒', text: 'Secured by Stripe' },
                  { icon: '↩', text: 'Cancel anytime' },
                  { icon: '💳', text: 'No setup fees' },
                ].map((t, i) => (
                  <div key={i} style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '8px', padding: '10px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: '16px', marginBottom: '4px' }}>{t.icon}</div>
                    <div style={{ fontSize: '11px', color: '#5F5E5A' }}>{t.text}</div>
                  </div>
                ))}
              </div>

              {plan.id === 'supplier' && (
                <div style={{ background: COLORS.dark, borderRadius: '10px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '500', color: '#F0EDE6', marginBottom: '10px' }}>Compare supplier plans</div>
                  {[
                    { label: 'Supplier — 3 reps', price: '$299/mo', color: COLORS.green },
                    { label: 'Supplier — 10 reps', price: '$474/mo', sub: '($299 + 7×$25)', color: COLORS.amber },
                    { label: 'Enterprise — unlimited', price: '$999/mo', sub: 'Best value at 25+ reps', color: COLORS.teal },
                  ].map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < 2 ? `0.5px solid #2C2C2A` : 'none' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#F0EDE6' }}>{r.label}</div>
                        {r.sub && <div style={{ fontSize: '10px', color: '#5F5E5A' }}>{r.sub}</div>}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: r.color }}>{r.price}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!plan && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#A8A8A2', fontSize: '14px' }}>
            Select your role above to see your plan details
          </div>
        )}

        <div style={{ textAlign: 'center', fontSize: '12px', color: '#A8A8A2', marginTop: '8px' }}>
          Doctors are always free — sign up via your rep's invite or{' '}
          <span onClick={() => navigate('/login?doctor=true')} style={{ color: COLORS.amber, cursor: 'pointer', fontWeight: '500' }}>create a free account here</span>
        </div>
      </div>
    </div>
  )
}
