const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Price ID to account tier mapping
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
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let stripeEvent

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return { statusCode: 400, body: `Webhook Error: ${err.message}` }
  }

  console.log('Stripe event received:', stripeEvent.type)

  switch (stripeEvent.type) {

    case 'checkout.session.completed': {
      const session = stripeEvent.data.object
      const customerEmail = session.customer_email || session.customer_details?.email

      if (!customerEmail) {
        console.error('No email found in session')
        break
      }

      // Get price details from the session
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['line_items']
      })
      const lineItemPriceId = fullSession.line_items?.data?.[0]?.price?.id
      const tierInfo = PRICE_TO_TIER[lineItemPriceId]

      if (!tierInfo) {
        console.error('Unknown price ID:', lineItemPriceId)
        break
      }

      // Find user in Supabase by email
      const { data: users } = await supabase.auth.admin.listUsers()
      const user = users?.users?.find(u => u.email === customerEmail)

      if (!user) {
        console.error('User not found for email:', customerEmail)
        break
      }

      // Update their profile
      const updateData = {
        account_tier: tierInfo.tier,
        stripe_customer_id: session.customer,
      }

      if (tierInfo.tier === 'enterprise') {
        updateData.enterprise_since = new Date().toISOString()
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)

      if (error) {
        console.error('Failed to update profile:', error)
      } else {
        console.log(`✓ Updated ${customerEmail} to ${tierInfo.tier} tier`)
      }
      break
    }

    case 'customer.subscription.deleted': {
      // Subscription cancelled — downgrade to standard
      const subscription = stripeEvent.data.object
      const customerId = subscription.customer

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('stripe_customer_id', customerId)
        .single()

      if (profile) {
        await supabase.from('profiles').update({
          account_tier: 'standard'
        }).eq('id', profile.id)
        console.log(`✓ Downgraded ${customerId} to standard after cancellation`)
      }
      break
    }

    case 'invoice.payment_failed': {
      // Payment failed — notify but don't downgrade yet
      const invoice = stripeEvent.data.object
      console.log('Payment failed for customer:', invoice.customer)
      break
    }

    case 'customer.subscription.updated': {
      // Subscription changed (upgrade/downgrade)
      const subscription = stripeEvent.data.object
      const customerId = subscription.customer
      const priceId = subscription.items?.data?.[0]?.price?.id
      const tierInfo = PRICE_TO_TIER[priceId]

      if (tierInfo) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          await supabase.from('profiles').update({
            account_tier: tierInfo.tier,
            ...(tierInfo.tier === 'enterprise' ? { enterprise_since: new Date().toISOString() } : {})
          }).eq('id', profile.id)
          console.log(`✓ Updated subscription tier to ${tierInfo.tier}`)
        }
      }
      break
    }

    default:
      console.log(`Unhandled event type: ${stripeEvent.type}`)
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true })
  }
}
