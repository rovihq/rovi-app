const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async () => {
  try {
    // Simple ping — just count profiles to keep the project active
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error('Keep-alive ping failed:', error.message)
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }

    console.log(`Supabase keep-alive ping successful — ${count} profiles`)
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Keep-alive ping successful`,
        timestamp: new Date().toISOString()
      })
    }
  } catch (err) {
    console.error('Keep-alive error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
