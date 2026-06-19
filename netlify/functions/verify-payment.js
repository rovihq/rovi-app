const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PRICE_TO_ROLE = {
  'price_1Ti1ZfKU7iCToC2TK5PyMExD': { tier: 'standard', role: 'rep' },
  'price_1Ti1aAKU7iCToC2TMDDa2FOX': { tier: 'standard', role: 'supplier' },
  'price_1Tk5eCKU7iCToC2TXf25iuWa': { tier: 'enterprise', role: 'supplier' },
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  try {
    const { email } = JSON.parse(event.body)

    if (!email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email is required' }) }
    }

    // Search Stripe for a recent successful checkout session with this email
    const sessions = await stripe.checkout.sessions.list({
      limit: 10,
      expand: ['data.line_items'],
    })

    // Find a completed session matching this email
    const matchingSession = sessions.data.find(s =>
      (s.customer_email === email || s.customer_details?.email === email) &&
      s.status === 'complete' &&
      s.payment_status === 'paid'
    )

    if (!matchingSession) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No completed payment found for this email. Please check your email address or contact support.' })
      }
    }

    // Get the price ID from the session
    const priceId = matchingSession.line_items?.data?.[0]?.price?.id
    const roleInfo = PRICE_TO_ROLE[priceId]

    if (!roleInfo) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Unrecognized plan. Please contact support.' })
      }
    }

    // Check if user already exists in Supabase
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const existingUser = users?.find(u => u.email === email)

    if (existingUser) {
      // Update their role and tier
      await supabase.from('profiles').update({
        role: roleInfo.role,
        account_tier: roleInfo.tier,
        stripe_customer_id: matchingSession.customer,
        stripe_subscription_id: matchingSession.subscription,
        subscription_status: 'active',
        ...(roleInfo.tier === 'enterprise' ? { enterprise_since: new Date().toISOString() } : {})
      }).eq('id', existingUser.id)

      // Send password reset so they can log in
      await supabase.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: 'https://rovi-app.netlify.app/login' }
      })

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Account updated! Check your email to set your password.',
          role: roleInfo.role,
          isNew: false
        })
      }
    }

    // Create new Supabase account
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        role: roleInfo.role,
        full_name: matchingSession.customer_details?.name || '',
      }
    })

    if (createError) {
      console.error('Create user error:', createError)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to create account. Please contact support.' })
      }
    }

    // Update profile
    await supabase.from('profiles').update({
      role: roleInfo.role,
      account_tier: roleInfo.tier,
      stripe_customer_id: matchingSession.customer,
      stripe_subscription_id: matchingSession.subscription,
      subscription_status: 'active',
      full_name: matchingSession.customer_details?.name || '',
      ...(roleInfo.tier === 'enterprise' ? { enterprise_since: new Date().toISOString() } : {})
    }).eq('id', newUser.user.id)

    // Send password setup email
    await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: 'https://rovi-app.netlify.app/login' }
    })

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Account created! Check your email to set your password.',
        role: roleInfo.role,
        isNew: true
      })
    }

  } catch (error) {
    console.error('Verify payment error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Something went wrong. Please try again or contact support.' })
    }
  }
}
