import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'

const COLORS = {
  green: '#0F6E56', dark: '#1C1C1A', border: '#E2E0D8',
  text2: '#5F5E5A', text3: '#A8A8A2', bg2: '#F7F5F2'
}

const Section = ({ title, children }) => (
  <div style={{ marginBottom: '32px' }}>
    <h2 style={{ fontSize: '16px', fontWeight: '500', color: COLORS.dark, marginBottom: '12px', paddingBottom: '8px', borderBottom: `0.5px solid ${COLORS.border}` }}>{title}</h2>
    <div style={{ fontSize: '14px', color: COLORS.text2, lineHeight: '1.8' }}>{children}</div>
  </div>
)

const P = ({ children }) => <p style={{ marginBottom: '12px' }}>{children}</p>
const Li = ({ children }) => <li style={{ marginBottom: '6px', paddingLeft: '8px' }}>{children}</li>

export default function Privacy() {
  const navigate = useNavigate()
  const lastUpdated = 'July 23, 2026'

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg2, fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ background: 'white', borderBottom: `0.5px solid ${COLORS.border}`, padding: '16px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo variant="light" height={32} />
        <button onClick={() => navigate(-1)}
          style={{ padding: '8px 16px', background: 'transparent', border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', color: COLORS.text2, fontSize: '13px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
          ← Back
        </button>
      </div>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 40px' }}>
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '600', color: COLORS.dark, marginBottom: '8px' }}>Privacy Policy</h1>
          <p style={{ fontSize: '13px', color: COLORS.text3 }}>Last updated: {lastUpdated}</p>
        </div>

        <div style={{ background: '#E8F7F1', border: `0.5px solid #9FE1CB`, borderRadius: '8px', padding: '14px 16px', marginBottom: '32px', fontSize: '13px', color: '#085041', lineHeight: '1.6' }}>
          Rovi takes your privacy seriously. This policy explains what information we collect, how we use it, and your rights regarding your data.
        </div>

        <Section title="1. Information we collect">
          <P><strong style={{ color: COLORS.dark }}>Account information:</strong> When you register, we collect your name, email address, company name, phone number, and role (Supplier, Rep, or Doctor).</P>
          <P><strong style={{ color: COLORS.dark }}>Payment information:</strong> Payments are processed by Stripe. Rovi does not store your credit card number or bank account details. We receive confirmation of payment and a customer ID from Stripe.</P>
          <P><strong style={{ color: COLORS.dark }}>Platform data:</strong> We collect data you input into the platform, including product catalog information, order data, commission records, and messaging content between users.</P>
          <P><strong style={{ color: COLORS.dark }}>Usage data:</strong> We may collect information about how you use the platform, including pages visited, features used, and time spent on the platform.</P>
          <P><strong style={{ color: COLORS.dark }}>What we do NOT collect:</strong> Rovi is not designed to collect Protected Health Information (PHI) as defined by HIPAA. Do not submit patient names, dates of birth, diagnosis information, or other PHI through the platform.</P>
        </Section>

        <Section title="2. How we use your information">
          <P>We use the information we collect to:</P>
          <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
            <Li>Create and manage your account</Li>
            <Li>Process payments and manage subscriptions</Li>
            <Li>Provide and improve the Rovi platform</Li>
            <Li>Send transactional emails (account invites, password resets, payment confirmations)</Li>
            <Li>Respond to support requests and inquiries</Li>
            <Li>Monitor platform usage to detect and prevent fraud or abuse</Li>
            <Li>Comply with legal obligations</Li>
          </ul>
          <P>We do not sell your personal information to third parties. We do not use your data for advertising purposes.</P>
        </Section>

        <Section title="3. Information sharing">
          <P>We share your information only in the following circumstances:</P>
          <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
            <Li><strong>Within the platform:</strong> Your name, company, and role are visible to connected users (e.g., a rep can see the doctors in their territory; a supplier can see their connected reps)</Li>
            <Li><strong>Service providers:</strong> We use Supabase (database), Stripe (payments), Resend (email), and Netlify (hosting). These providers only access your data as necessary to provide their services</Li>
            <Li><strong>Legal requirements:</strong> We may disclose your information if required by law, court order, or government authority</Li>
            <Li><strong>Business transfers:</strong> If Rovi is acquired or merges with another company, your information may be transferred as part of that transaction</Li>
          </ul>
        </Section>

        <Section title="4. Data security">
          <P>We take reasonable measures to protect your information, including:</P>
          <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
            <Li>Encryption of data in transit using TLS/SSL</Li>
            <Li>Row-level security on our database to ensure users only access their own data</Li>
            <Li>Secure authentication via Supabase Auth</Li>
            <Li>Regular security reviews of our platform and dependencies</Li>
          </ul>
          <P>However, no method of transmission over the internet is 100% secure. We cannot guarantee the absolute security of your information.</P>
        </Section>

        <Section title="5. Data retention">
          <P>We retain your account information for as long as your account is active. If you cancel your account, we will retain your data for 90 days before deletion, during which time you may request an export. Order history and commission records may be retained longer to comply with legal and regulatory requirements.</P>
          <P>To request deletion of your data, contact us at info@rovihq.com.</P>
        </Section>

        <Section title="6. Your rights">
          <P>Depending on your location, you may have the following rights regarding your personal data:</P>
          <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
            <Li><strong>Access:</strong> Request a copy of the personal data we hold about you</Li>
            <Li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</Li>
            <Li><strong>Deletion:</strong> Request deletion of your personal data</Li>
            <Li><strong>Portability:</strong> Request your data in a machine-readable format</Li>
            <Li><strong>Objection:</strong> Object to certain processing of your data</Li>
          </ul>
          <P>To exercise any of these rights, contact us at info@rovihq.com. We will respond within 30 days.</P>
        </Section>

        <Section title="7. Cookies">
          <P>Rovi uses essential cookies necessary for the platform to function, including authentication session cookies. We do not use advertising or tracking cookies. You may disable cookies in your browser settings, but this may prevent some features from working correctly.</P>
        </Section>

        <Section title="8. Children's privacy">
          <P>Rovi is intended for use by healthcare professionals and business entities. We do not knowingly collect personal information from individuals under 18 years of age. If you believe we have inadvertently collected such information, please contact us immediately.</P>
        </Section>

        <Section title="9. Changes to this policy">
          <P>We may update this Privacy Policy from time to time. We will notify you of material changes by email or by posting a notice on the platform. Your continued use of Rovi after changes take effect constitutes your acceptance of the revised policy.</P>
        </Section>

        <Section title="10. Contact us">
          <P>If you have questions about this Privacy Policy or our data practices, please contact us at:</P>
          <div style={{ background: COLORS.bg2, borderRadius: '8px', padding: '16px', marginTop: '8px' }}>
            <div style={{ fontSize: '14px', color: COLORS.dark, fontWeight: '500', marginBottom: '4px' }}>Rovi HQ</div>
            <div style={{ fontSize: '13px', color: COLORS.text2 }}>Houston, Texas</div>
            <div style={{ fontSize: '13px', color: COLORS.green, marginTop: '4px' }}>
              <a href="mailto:info@rovihq.com" style={{ color: COLORS.green }}>info@rovihq.com</a>
            </div>
          </div>
        </Section>
      </div>

      <div style={{ background: 'white', borderTop: `0.5px solid ${COLORS.border}`, padding: '20px 40px', textAlign: 'center', fontSize: '12px', color: COLORS.text3 }}>
        © {new Date().getFullYear()} Rovi HQ · <a href="/privacy" style={{ color: COLORS.green }}>Privacy Policy</a> · <a href="/terms" style={{ color: COLORS.green }}>Terms of Service</a> · info@rovihq.com
      </div>
    </div>
  )
}
