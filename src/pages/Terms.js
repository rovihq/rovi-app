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

export default function Terms() {
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
          <h1 style={{ fontSize: '28px', fontWeight: '600', color: COLORS.dark, marginBottom: '8px' }}>Terms of Service</h1>
          <p style={{ fontSize: '13px', color: COLORS.text3 }}>Last updated: {lastUpdated}</p>
        </div>

        <div style={{ background: '#FFF8E6', border: `0.5px solid #FAC775`, borderRadius: '8px', padding: '14px 16px', marginBottom: '32px', fontSize: '13px', color: '#633806', lineHeight: '1.6' }}>
          <strong>Please read these Terms carefully.</strong> By creating an account or using Rovi, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform.
        </div>

        <Section title="1. About Rovi">
          <P>Rovi ("we," "us," or "our") is a business-to-business (B2B) software platform that connects FDA-registered 503B outsourcing facilities ("Suppliers"), independent compounding sales representatives ("Reps"), and licensed healthcare providers ("Doctors" or "Clinics"). Rovi is operated by Rovi HQ, based in Texas.</P>
          <P>Rovi is a software platform only. We do not compound, dispense, distribute, or sell pharmaceutical products. We do not provide medical advice. All transactions for pharmaceutical products occur directly between Suppliers and healthcare providers outside of the Rovi platform.</P>
        </Section>

        <Section title="2. Eligibility">
          <P>By using Rovi you represent and warrant that:</P>
          <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
            <Li>You are at least 18 years of age</Li>
            <Li>You are a licensed healthcare provider, a registered business entity, or an authorized representative of one</Li>
            <Li>Your use of Rovi complies with all applicable federal, state, and local laws and regulations</Li>
            <Li>You have the authority to enter into these Terms on behalf of yourself or the entity you represent</Li>
          </ul>
          <P>Suppliers must be FDA-registered 503B outsourcing facilities or licensed compounding pharmacies. Reps must be authorized sales representatives. Rovi reserves the right to verify eligibility and terminate accounts that do not meet these requirements.</P>
        </Section>

        <Section title="3. Accounts and registration">
          <P>Supplier and Rep accounts are created upon successful payment through our third-party payment processor, Stripe. Doctor accounts are created by invitation from an authorized Rep. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.</P>
          <P>You agree to provide accurate, current, and complete information during registration and to update such information as necessary. Rovi reserves the right to suspend or terminate accounts that contain false or misleading information.</P>
        </Section>

        <Section title="4. Subscriptions and payments">
          <P>Rovi offers the following subscription plans:</P>
          <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
            <Li><strong>Rep Seat:</strong> $75/month — full rep portal access</Li>
            <Li><strong>Supplier:</strong> $299/month — includes 3 rep seats; additional seats at $25/rep/month</Li>
            <Li><strong>Enterprise:</strong> $999/month — unlimited rep seats, commission payroll, exports</Li>
            <Li><strong>Doctor:</strong> Free — always free for licensed healthcare providers</Li>
          </ul>
          <P>All payments are processed by Stripe. Subscriptions automatically renew each month unless cancelled. You may cancel at any time through your account settings or by contacting us at info@rovihq.com. Cancellation takes effect at the end of the current billing period. We do not provide refunds for partial months.</P>
        </Section>

        <Section title="5. Acceptable use">
          <P>You agree not to use Rovi to:</P>
          <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
            <Li>Violate any applicable law, regulation, or professional licensing requirement</Li>
            <Li>Facilitate the unlicensed sale, distribution, or dispensing of pharmaceutical products</Li>
            <Li>Upload or transmit false, misleading, or fraudulent information</Li>
            <Li>Interfere with or disrupt the platform or servers connected to the platform</Li>
            <Li>Attempt to gain unauthorized access to any portion of the platform</Li>
            <Li>Use the platform to transmit unsolicited commercial communications</Li>
            <Li>Reverse engineer, decompile, or disassemble any part of the platform</Li>
          </ul>
        </Section>

        <Section title="6. Healthcare and regulatory compliance">
          <P>Rovi is a software tool only and does not provide medical, legal, or regulatory advice. Users are solely responsible for ensuring their use of Rovi complies with all applicable healthcare laws and regulations, including but not limited to:</P>
          <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
            <Li>The Health Insurance Portability and Accountability Act (HIPAA)</Li>
            <Li>The Drug Supply Chain Security Act (DSCSA)</Li>
            <Li>FDA regulations governing 503B outsourcing facilities</Li>
            <Li>State pharmacy and medical practice laws</Li>
          </ul>
          <P>Rovi does not transmit, store, or process Protected Health Information (PHI) as defined by HIPAA. Users are responsible for ensuring they do not submit PHI through the platform. If you believe you have submitted PHI, contact us immediately at info@rovihq.com.</P>
        </Section>

        <Section title="7. Intellectual property">
          <P>The Rovi platform, including its name, logo, design, software, and content, is owned by Rovi HQ and is protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of our platform without our prior written consent.</P>
          <P>You retain ownership of any content you upload to Rovi (such as product catalogs and order data). By uploading content, you grant Rovi a limited, non-exclusive license to use that content solely to provide the platform services to you.</P>
        </Section>

        <Section title="8. Limitation of liability">
          <P>TO THE MAXIMUM EXTENT PERMITTED BY LAW, ROVI AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR BUSINESS, ARISING OUT OF OR RELATED TO YOUR USE OF THE PLATFORM.</P>
          <P>ROVI'S TOTAL LIABILITY TO YOU FOR ANY CLAIMS ARISING FROM THESE TERMS OR YOUR USE OF THE PLATFORM SHALL NOT EXCEED THE AMOUNT YOU PAID TO ROVI IN THE THREE (3) MONTHS PRECEDING THE CLAIM.</P>
          <P>Rovi is not responsible for any errors in product catalog data, pricing, or stock quantities entered by Suppliers. Rovi is not a party to any transaction between Suppliers and healthcare providers and is not liable for the quality, safety, or legality of any pharmaceutical products.</P>
        </Section>

        <Section title="9. Disclaimer of warranties">
          <P>THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. ROVI DOES NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.</P>
        </Section>

        <Section title="10. Indemnification">
          <P>You agree to indemnify, defend, and hold harmless Rovi and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorneys' fees) arising out of or in any way connected with your access to or use of the platform, your violation of these Terms, or your violation of any third-party rights.</P>
        </Section>

        <Section title="11. Termination">
          <P>Rovi may terminate or suspend your account at any time, with or without notice, for any reason, including if we reasonably believe you have violated these Terms. Upon termination, your right to use the platform will immediately cease. You may export your data prior to termination by contacting us at info@rovihq.com.</P>
        </Section>

        <Section title="12. Governing law">
          <P>These Terms are governed by the laws of the State of Texas, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be resolved in the state or federal courts located in Houston, Texas, and you consent to the personal jurisdiction of such courts.</P>
        </Section>

        <Section title="13. Changes to these terms">
          <P>We may update these Terms from time to time. We will notify you of material changes by email or by posting a notice on the platform. Your continued use of Rovi after changes take effect constitutes your acceptance of the revised Terms.</P>
        </Section>

        <Section title="14. Contact us">
          <P>If you have questions about these Terms, please contact us at:</P>
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
