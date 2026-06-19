const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PRICE_TO_TIER = {
  'price_1Ti1ZfKU7iCToC2TK5PyMExD': { tier: 'standard', role: 'rep' },
  'price_1Ti1aAKU7iCToC2TMDDa2FOX': { tier: 'standard', role: 'supplier' },
  'price_1Tk5eCKU7iCToC2TXf25iuWa': { tier: 'enterprise', role: 'supplier' },
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  const sig = event.headers['stripe-signature']
  let stripeEvent

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature failed:', err.message)
    return { statusCode: 400, body: `Webhook Error: ${err.message}` }
  }

  console.log('Event:', stripeEvent.type)

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object
    const customerEmail = session.customer_email || session.customer_details?.email

    if (!customerEmail) {
      console.error('No email in session')
      return { statusCode: 200, body: JSON.stringify({ received: true }) }
    }

    // Get price ID from session
    const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['line_items']
    })
    const priceId = fullSession.line_items?.data?.[0]?.price?.id
    const tierInfo = PRICE_TO_TIER[priceId]

    if (!tierInfo) {
      console.error('Unknown price ID:', priceId)
      return { statusCode: 200, body: JSON.stringify({ received: true }) }
    }

    // Check if user already exists in Supabase
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const existingUser = users?.find(u => u.email === customerEmail)

    if (existingUser) {
      // User exists — just update their role and tier
      await supabase.from('profiles').update({
        role: tierInfo.role,
        account_tier: tierInfo.tier,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        subscription_status: 'active',
        ...(tierInfo.tier === 'enterprise' ? { enterprise_since: new Date().toISOString() } : {})
      }).eq('id', existingUser.id)

      console.log(`✓ Updated existing user ${customerEmail} → ${tierInfo.role} / ${tierInfo.tier}`)
    } else {
      // User doesn't exist — create their account automatically
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: customerEmail,
        email_confirm: true,
        user_metadata: {
          role: tierInfo.role,
          full_name: session.customer_details?.name || '',
        }
      })

      if (createError) {
        console.error('Failed to create user:', createError)
        return { statusCode: 200, body: JSON.stringify({ received: true }) }
      }

      // Update their profile with role and Stripe info
      await supabase.from('profiles').update({
        role: tierInfo.role,
        account_tier: tierInfo.tier,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        subscription_status: 'active',
        full_name: session.customer_details?.name || '',
        ...(tierInfo.tier === 'enterprise' ? { enterprise_since: new Date().toISOString() } : {})
      }).eq('id', newUser.user.id)

      // Send password reset email so they can set their password and log in
      await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: customerEmail,
        options: {
          redirectTo: 'https://rovi-app.netlify.app/login'
        }
      })

      console.log(`✓ Created new user ${customerEmail} → ${tierInfo.role} / ${tierInfo.tier}`)
    }
  }

  if (stripeEvent.type === 'customer.subscription.deleted') {
    const customerId = stripeEvent.data.object.customer
    const { data: profile } = await supabase
      .from('profiles').select('id').eq('stripe_customer_id', customerId).single()
    if (profile) {
      await supabase.from('profiles').update({
        account_tier: 'standard',
        subscription_status: 'cancelled'
      }).eq('id', profile.id)
      console.log(`✓ Cancelled subscription for ${customerId}`)
    }
  }

  if (stripeEvent.type === 'customer.subscription.updated') {
    const subscription = stripeEvent.data.object
    const priceId = subscription.items?.data?.[0]?.price?.id
    const tierInfo = PRICE_TO_TIER[priceId]
    if (tierInfo) {
      const { data: profile } = await supabase
        .from('profiles').select('id').eq('stripe_customer_id', subscription.customer).single()
      if (profile) {
        await supabase.from('profiles').update({
          role: tierInfo.role,
          account_tier: tierInfo.tier,
          subscription_status: subscription.status,
          ...(tierInfo.tier === 'enterprise' ? { enterprise_since: new Date().toISOString() } : {})
        }).eq('id', profile.id)
        console.log(`✓ Updated subscription → ${tierInfo.role} / ${tierInfo.tier}`)
      }
    }
  }

  if (stripeEvent.type === 'invoice.payment_failed') {
    const customerId = stripeEvent.data.object.customer
    const { data: profile } = await supabase
      .from('profiles').select('id').eq('stripe_customer_id', customerId).single()
    if (profile) {
      await supabase.from('profiles').update({ subscription_status: 'past_due' }).eq('id', profile.id)
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) }
}
