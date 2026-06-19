import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const COLORS = {
  green: '#0F6E56', teal: '#5DCAA5', dark: '#1C1C1A',
  dark2: '#2C2C2A', bg2: '#F0EDE6', border: '#E2E0D8',
  text2: '#5F5E5A', text3: '#A8A8A2', amber: '#EF9F27',
  amber2: '#FAEEDA', green3: '#E8F7F1'
}

const PLANS = [
  {
    id: 'doctor',
    name: 'Doctor',
    price: 0,
    priceId: null,
    color: COLORS.amber,
    badge: 'Always free',
    description: 'For doctors and clinics ordering compounded medications',
    features: [
      '60-second quick reorder',
      'Full product catalog access',
      'Order history and tracking',
      'Direct messaging with your rep',
      'Free forever — no credit card needed',
    ]
  },
  {
    id: 'rep',
    name: 'Rep Seat',
    price: 75,
    priceId: 'price_1Ti1ykKYDy8tFUxE9iYXGoZv',
    color: '#3C3489',
    badge: 'Most popular',
    description: 'For compounding sales reps managing doctors and orders',
    features: [
      'Full territory dashboard',
      'Automatic order crediting',
      'Commission tracking',
      'Doctor management',
      'Real-time order feed',
      'Messaging with doctors and suppliers',
    ]
  },
  {
    id: 'supplier',
    name: 'Supplier',
    price: 299,
    priceId: 'price_1Ti1ykKYDy8tFUxE8ieumm9T',
    color: COLORS.green,
    badge: 'For 503B facilities',
    description: 'For 503B suppliers managing catalog, orders, and reps',
    features: [
      'Full product catalog management',
      'Order tracking and status updates',
      'Rep performance dashboard',
      'Commission management',
      'AI demand alerts',
      'Real-time messaging',
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 999,
    priceId: 'price_1Tjq3mKYDy8tFUxE7QJuGJ4F',
    color: COLORS.teal,
    badge: 'Full platform',
    description: 'For large 503B facilities managing their entire rep network',
    features: [
      'Everything in Supplier',
      'Unlimited rep management',
      'Commission payroll automation',
      'Direct deposit to rep accounts',
      'CSV/PDF export reports',
      '1099 export for contractors',
      'White-glove onboarding',
      'Dedicated account manager',
    ]
  }
]

export default function Subscribe() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState('')

  const handleSubscribe = async (plan) => {
    if (!plan.priceId) return
    if (!user) { navigate('/login'); return }

    setLoading(plan.id)
    setError('')

    try {
      const response = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: plan.priceId,
          customerEmail: user.email,
        })
      })

      const data = await response.json()

      if (data.error) {
        setError(data.error)
        setLoading(null)
        return
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url

    } catch (err) {
      setError('Something went wrong. Please try again.')
      setLoading(null)
    }
  }

  const currentRole = profile?.role

  return (
    <div style={{ minHeight: '100vh', background: COLORS.dark, fontFamily: 'DM Sans, sans-serif' }}>

      {/* HEADER */}
      <div style={{ padding: '24px 40px', borderBottom: `0.5px solid ${COLORS.dark2}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '22px', fontWeight: '700', color: '#F0EDE6' }}>
          Rovi<span style={{ color: COLORS.teal }}>.</span>
        </div>
        {user && (
          <button onClick={() => navigate('/')}
            style={{ padding: '8px 16px', background: 'transparent', border: `0.5px solid #3D3D3A`, borderRadius: '7px', color: '#888780', fontSize: '13px', cursor: 'pointer' }}>
            ← Back to dashboard
          </button>
        )}
      </div>

      {/* HERO */}
      <div style={{ textAlign: 'center', padding: '60px 40px 40px' }}>
        <div style={{ fontSize: '11px', fontWeight: '500', color: COLORS.teal, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>
          Simple pricing
        </div>
        <div style={{ fontSize: '36px', fontWeight: '600', color: '#F0EDE6', marginBottom: '14px', lineHeight: '1.2' }}>
          The platform compounding runs on
        </div>
        <div style={{ fontSize: '16px', color: '#888780', maxWidth: '500px', margin: '0 auto' }}>
          Doctors are always free. Reps and suppliers pay one flat monthly rate — no setup fees, no contracts.
        </div>
      </div>

      {/* PLANS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', padding: '0 40px 60px', maxWidth: '1200px', margin: '0 auto' }}>
        {PLANS.map(plan => {
          const isCurrent = currentRole === plan.id
          const isLoading = loading === plan.id

          return (
            <div key={plan.id} style={{
              background: plan.id === 'enterprise' ? '#1A1A18' : '#161614',
              border: `0.5px solid ${isCurrent ? plan.color : plan.id === 'enterprise' ? COLORS.teal : '#2C2C2A'}`,
              borderRadius: '14px', padding: '28px', position: 'relative',
              boxShadow: plan.id === 'enterprise' ? `0 0 40px rgba(93,202,165,0.08)` : 'none'
            }}>
              <div style={{ marginBottom: '20px' }}>
                <span style={{ background: plan.color, color: plan.id === 'rep' ? 'white' : COLORS.dark, fontSize: '10px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.5px' }}>
                  {isCurrent ? '✓ Your current plan' : plan.badge}
                </span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#F0EDE6', marginBottom: '6px' }}>{plan.name}</div>
              <div style={{ fontSize: '12px', color: '#5F5E5A', marginBottom: '20px', lineHeight: '1.5' }}>{plan.description}</div>
              <div style={{ marginBottom: '24px' }}>
                {plan.price === 0 ? (
                  <div style={{ fontSize: '32px', fontWeight: '600', color: COLORS.amber }}>Free</div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                    <div style={{ fontSize: '32px', fontWeight: '600', color: '#F0EDE6' }}>${plan.price}</div>
                    <div style={{ fontSize: '13px', color: '#5F5E5A', marginBottom: '6px' }}>/month</div>
                  </div>
                )}
              </div>

              {plan.price === 0 ? (
                <button onClick={() => navigate('/login')}
                  style={{ width: '100%', padding: '11px', background: COLORS.amber2, color: '#633806', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', marginBottom: '24px' }}>
                  Get started free
                </button>
              ) : isCurrent ? (
                <button disabled
                  style={{ width: '100%', padding: '11px', background: '#2C2C2A', color: '#5F5E5A', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'not-allowed', marginBottom: '24px' }}>
                  Current plan
                </button>
              ) : (
                <button onClick={() => handleSubscribe(plan)} disabled={isLoading}
                  style={{ width: '100%', padding: '11px', background: plan.id === 'enterprise' ? COLORS.teal : plan.color, color: plan.id === 'enterprise' || plan.id === 'rep' ? COLORS.dark : 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', marginBottom: '24px', opacity: isLoading ? 0.7 : 1 }}>
                  {isLoading ? 'Redirecting to Stripe...' : plan.id === 'enterprise' ? 'Contact us' : `Subscribe — $${plan.price}/mo`}
                </button>
              )}

              <div style={{ borderTop: `0.5px solid #2C2C2A`, paddingTop: '20px' }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' }}>
                    <span style={{ color: plan.color, fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>✓</span>
                    <span style={{ fontSize: '12px', color: '#888780', lineHeight: '1.5' }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <div style={{ textAlign: 'center', padding: '0 40px 40px' }}>
          <div style={{ background: '#3D1A1A', color: '#F87171', padding: '12px 20px', borderRadius: '8px', fontSize: '13px', display: 'inline-block' }}>{error}</div>
        </div>
      )}

      <div style={{ textAlign: 'center', padding: '0 40px 60px', color: '#3D3D3A', fontSize: '12px' }}>
        Secured by Stripe · Cancel anytime · No setup fees · Texas-first early access
      </div>
    </div>
  )
}
