const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  try {
    const { doctorEmail, doctorName, practiceNamed, repId, repName, repCompany } = JSON.parse(event.body)

    if (!doctorEmail || !doctorName || !repId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) }
    }

    // Check if doctor already exists
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) {
      console.error('List users error:', listError)
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to check existing users: ' + listError.message }) }
    }

    let doctorUserId = null
    const existingUser = users?.find(u => u.email === doctorEmail)

    if (existingUser) {
      doctorUserId = existingUser.id
      await supabase.from('profiles').update({ assigned_rep_id: repId }).eq('id', existingUser.id)
    } else {
      // Create new doctor account
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: doctorEmail,
        email_confirm: true,
        user_metadata: {
          full_name: doctorName,
          company_name: practiceNamed || '',
          role: 'doctor'
        }
      })

      if (createError) {
        console.error('Create user error:', createError)
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create account: ' + createError.message }) }
      }

      doctorUserId = newUser.user.id

      await supabase.from('profiles').update({
        full_name: doctorName,
        company_name: practiceNamed || '',
        role: 'doctor',
        assigned_rep_id: repId
      }).eq('id', doctorUserId)
    }

    // Create doctor_rep_connections record
    await supabase.from('doctor_rep_connections').upsert({
      doctor_id: doctorUserId,
      rep_id: repId,
      status: 'active',
      connected_at: new Date().toISOString()
    }, { onConflict: 'doctor_id,rep_id' })

    // Generate password setup link
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: doctorEmail,
      options: { redirectTo: 'https://rovi-app.netlify.app/reset-password' }
    })

    if (linkError) {
      console.error('Generate link error:', linkError)
    }

    const setupLink = linkData?.properties?.action_link || 'https://rovi-app.netlify.app/login'

    // Send email via Resend
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      console.error('RESEND_API_KEY not set')
      // Still return success — account was created, just email failed
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: `Account created for ${doctorEmail} but email could not be sent — RESEND_API_KEY missing`,
          isNew: !existingUser,
          setupLink
        })
      }
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Rovi <info@rovihq.com>',
        to: doctorEmail,
        subject: `${repName} has added you to Rovi`,
        html: `
          <div style="max-width:560px;margin:40px auto;font-family:Arial,sans-serif;">
            <div style="background:#1C1C1A;padding:24px;border-radius:12px 12px 0 0;">
              <div style="font-size:22px;font-weight:700;color:#F0EDE6;">Rovi<span style="color:#5DCAA5;">.</span></div>
            </div>
            <div style="background:white;padding:32px;border:1px solid #E2E0D8;">
              <h2 style="color:#1C1C1A;margin-top:0;">Hi ${doctorName.split(' ')[0]}, you've been added to Rovi</h2>
              <p style="color:#5F5E5A;line-height:1.7;">
                <strong style="color:#1C1C1A;">${repName}</strong>${repCompany ? ` from ${repCompany}` : ''} has added you to their Rovi network. Rovi is a free platform that lets you browse your rep's compound catalog and reorder in 60 seconds.
              </p>
              <div style="background:#F7F5F0;border-radius:8px;padding:16px;margin:20px 0;">
                <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#A8A8A2;text-transform:uppercase;">What you get — free forever</p>
                <p style="margin:4px 0;color:#1C1C1A;">⚡ 60-second quick reorder</p>
                <p style="margin:4px 0;color:#1C1C1A;">📋 Full order history and tracking</p>
                <p style="margin:4px 0;color:#1C1C1A;">🏭 Direct access to your supplier's catalog</p>
                <p style="margin:4px 0;color:#1C1C1A;">💬 Message your rep directly</p>
              </div>
              <a href="${setupLink}" style="display:block;text-align:center;padding:14px;background:#0F6E56;color:white;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;margin-top:24px;">
                Set up your free account →
              </a>
              <p style="font-size:12px;color:#A8A8A2;text-align:center;margin-top:16px;">
                This link expires in 24 hours. Questions? Email <a href="mailto:info@rovihq.com" style="color:#0F6E56;">info@rovihq.com</a>
              </p>
            </div>
            <div style="background:#F7F5F0;padding:16px;text-align:center;border-radius:0 0 12px 12px;border:1px solid #E2E0D8;border-top:none;">
              <p style="font-size:11px;color:#A8A8A2;margin:0;">Rovi · Early access · Texas · rovihq.com</p>
            </div>
          </div>
        `
      })
    })

    if (!emailRes.ok) {
      const emailError = await emailRes.text()
      console.error('Resend error:', emailError)
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: `Account created but email failed: ${emailError}`,
          isNew: !existingUser
        })
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Invite sent to ${doctorEmail}`,
        isNew: !existingUser
      })
    }

  } catch (error) {
    console.error('Invite doctor error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Something went wrong' })
    }
  }
}
