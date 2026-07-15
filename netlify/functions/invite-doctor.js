const { createClient } = require('@supabase/supabase-js')
const { Resend } = require('resend')

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' }

  try {
    const { doctorEmail, doctorName, practiceNamed, repId, repName, repCompany } = JSON.parse(event.body)

    if (!doctorEmail || !repId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) }
    }

    // Check if doctor already exists
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const existingUser = users.find(u => u.email?.toLowerCase() === doctorEmail.toLowerCase())

    let doctorId
    let isNew = false

    if (existingUser) {
      // Doctor already has an account — just create the connection
      doctorId = existingUser.id
      await supabase.from('profiles').update({ assigned_rep_id: repId }).eq('id', doctorId)
    } else {
      // Create new doctor account (no password — they'll set it via email link)
      isNew = true
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: doctorEmail,
        email_confirm: true,
        user_metadata: {
          full_name: doctorName,
          company_name: practiceNamed,
          role: 'doctor'
        }
      })
      if (createError) throw createError
      doctorId = newUser.user.id

      await supabase.from('profiles').update({
        full_name: doctorName,
        company_name: practiceNamed,
        role: 'doctor',
        assigned_rep_id: repId
      }).eq('id', doctorId)
    }

    // Upsert doctor-rep connection
    await supabase.from('doctor_rep_connections').upsert({
      doctor_id: doctorId,
      rep_id: repId,
      status: 'active',
      connected_at: new Date().toISOString()
    }, { onConflict: 'doctor_id,rep_id' })

    // Generate password setup link
    const { data: linkData } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: doctorEmail,
      options: { redirectTo: 'https://rovi-app.netlify.app/reset-password' }
    })
    const setupLink = linkData?.properties?.action_link || 'https://rovi-app.netlify.app/login'

    // Send invite email
    const emailHtml = `
      <div style="font-family: DM Sans, Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #FAFAF8; padding: 32px 24px;">
        <div style="margin-bottom: 28px;">
          <span style="font-size: 24px; font-weight: 700; color: #1C1C1A; letter-spacing: -0.5px;">Rovi</span>
        </div>
        <h2 style="font-size: 22px; font-weight: 600; color: #1C1C1A; margin: 0 0 10px;">
          ${repName} has added you to Rovi
        </h2>
        <p style="font-size: 14px; color: #5F5E5A; line-height: 1.7; margin: 0 0 24px;">
          ${repName}${repCompany ? ` from ${repCompany}` : ''} has set up a free Rovi account for you. Rovi is the platform compounding reps and their doctors use to manage orders, track status, and stay in sync.
        </p>
        <div style="background: white; border: 1px solid #E2E0D8; border-radius: 10px; padding: 20px 22px; margin-bottom: 24px;">
          <div style="font-size: 13px; font-weight: 600; color: #1C1C1A; margin-bottom: 12px;">What you get — free forever</div>
          <div style="font-size: 13px; color: #5F5E5A; line-height: 2;">
            ⚡ 60-second quick reorder on your usual compounds<br/>
            📋 Full order history and status tracking<br/>
            🏭 Direct access to your supplier's catalog<br/>
            💬 Message your rep directly from the platform
          </div>
        </div>
        <a href="${setupLink}" style="display: inline-block; background: #0F6E56; color: white; font-size: 14px; font-weight: 600; padding: 14px 28px; border-radius: 8px; text-decoration: none; margin-bottom: 28px;">
          Set up your free account →
        </a>
        <p style="font-size: 12px; color: #A8A8A2; line-height: 1.6; margin: 0; border-top: 1px solid #E2E0D8; padding-top: 20px;">
          You received this because ${repName} added you to their Rovi network. Rovi · Early access · Texas · rovihq.com
        </p>
      </div>
    `

    await resend.emails.send({
      from: 'Rovi <info@rovihq.com>',
      to: doctorEmail,
      subject: `${repName} has added you to Rovi`,
      html: emailHtml
    })

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: isNew ? `Invite sent to ${doctorEmail}` : `${doctorName} already has an account — connection created`,
        isNew
      })
    }
  } catch (err) {
    console.error('invite-doctor error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
