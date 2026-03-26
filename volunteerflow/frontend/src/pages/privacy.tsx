import Head from 'next/head';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

const pageStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');
  .legal-page { background: #0a0f1e; min-height: 100vh; font-family: 'DM Sans', sans-serif; color: white; }
  .legal-section { max-width: 760px; margin: 0 auto; padding: 100px 24px 80px; }
  .legal-section h1 { font-family: 'Playfair Display', serif; font-size: clamp(32px, 4vw, 48px); font-weight: 700; margin-bottom: 12px; }
  .legal-section .updated { font-size: 14px; color: rgba(255,255,255,0.35); margin-bottom: 48px; }
  .legal-section h2 { font-size: 18px; font-weight: 700; color: white; margin: 40px 0 12px; }
  .legal-section p { font-size: 15px; color: rgba(255,255,255,0.55); line-height: 1.8; margin-bottom: 16px; }
  .legal-section ul { padding-left: 20px; margin-bottom: 16px; }
  .legal-section ul li { font-size: 15px; color: rgba(255,255,255,0.55); line-height: 1.8; margin-bottom: 6px; }
  .legal-divider { border: none; border-top: 1px solid rgba(255,255,255,0.07); margin: 8px 0; }
  .privacy-highlight { background: rgba(16,185,129,0.07); border: 1px solid rgba(16,185,129,0.15); border-radius: 12px; padding: 20px 24px; margin-bottom: 32px; }
  .privacy-highlight p { color: rgba(255,255,255,0.7); margin-bottom: 0; }
`;

export default function PrivacyPage() {
  return (
    <div className="legal-page">
      <Head>
        <title>Privacy Policy — VolunteerFlow</title>
        <meta name="description" content="VolunteerFlow Privacy Policy — how we collect, use, and protect your information." />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: pageStyles }} />
      <PublicNav />

      <div className="legal-section">
        <h1>Privacy Policy</h1>
        <p className="updated">Last updated: March 25, 2026</p>

        <div className="privacy-highlight">
          <p>
            <strong style={{ color: '#34d399' }}>The short version:</strong> We collect only what we need to run VolunteerFlow. We don't sell your data. You can export or delete your data at any time.
          </p>
        </div>

        <p>
          This Privacy Policy explains how VolunteerFlow, Inc. ("VolunteerFlow," "we," "us," or "our") collects, uses, and shares information when you use our volunteer management platform ("Service"). By using the Service, you agree to this policy.
        </p>

        <hr className="legal-divider" />

        <h2>1. Information We Collect</h2>
        <p><strong style={{ color: 'rgba(255,255,255,0.8)' }}>Account information</strong></p>
        <p>When you create an account, we collect your name, email address, organization name, and password (stored as a salted hash — we never store plaintext passwords).</p>

        <p><strong style={{ color: 'rgba(255,255,255,0.8)' }}>Volunteer data</strong></p>
        <p>
          Organizations using VolunteerFlow may upload or collect information about their volunteers, including names, contact details, availability, skills, and hours logged. This data belongs to the organization, and we process it only on their behalf.
        </p>

        <p><strong style={{ color: 'rgba(255,255,255,0.8)' }}>Usage data</strong></p>
        <p>
          We automatically collect certain information about how you interact with the Service, including pages visited, features used, browser type, device type, IP address, and timestamps. We use this to improve the Service and diagnose issues.
        </p>

        <p><strong style={{ color: 'rgba(255,255,255,0.8)' }}>Payment information</strong></p>
        <p>
          Billing details (credit card numbers, billing address) are collected and stored by our payment processor, Stripe. We never store full card numbers on our servers. We receive a tokenized reference and the last four digits of your card.
        </p>

        <p><strong style={{ color: 'rgba(255,255,255,0.8)' }}>Communications</strong></p>
        <p>If you contact us for support or otherwise communicate with us, we retain those communications to help resolve issues and improve our service.</p>

        <h2>2. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide, operate, and improve the Service</li>
          <li>Process transactions and send billing-related communications</li>
          <li>Send product updates, security notices, and support responses</li>
          <li>Detect and prevent fraud, abuse, and security incidents</li>
          <li>Comply with legal obligations</li>
          <li>Generate aggregated, anonymized analytics to understand how the Service is used</li>
        </ul>
        <p>We do not use your data to train AI models or sell it to third parties for advertising purposes.</p>

        <h2>3. How We Share Your Information</h2>
        <p>We share your information only in the following circumstances:</p>
        <ul>
          <li><strong style={{ color: 'rgba(255,255,255,0.75)' }}>Service providers:</strong> We use trusted third-party vendors (hosting, payment processing, email delivery) who are contractually bound to protect your data and use it only to provide services to us.</li>
          <li><strong style={{ color: 'rgba(255,255,255,0.75)' }}>Legal requirements:</strong> We may disclose information if required by law, court order, or government authority, or if we believe disclosure is necessary to protect our rights or the safety of others.</li>
          <li><strong style={{ color: 'rgba(255,255,255,0.75)' }}>Business transfers:</strong> If VolunteerFlow is acquired or merges with another company, your information may be transferred as part of that transaction. We will notify you before your information is subject to a different privacy policy.</li>
        </ul>

        <h2>4. Cookies and Tracking</h2>
        <p>We use cookies and similar technologies to:</p>
        <ul>
          <li>Keep you signed in across sessions (authentication cookies)</li>
          <li>Remember your preferences (e.g., theme, density settings)</li>
          <li>Understand how the Service is used (analytics)</li>
        </ul>
        <p>
          You can control cookies through your browser settings. Disabling authentication cookies will prevent you from staying signed in. We do not use third-party advertising cookies.
        </p>

        <h2>5. Data Retention</h2>
        <p>
          We retain your account data for as long as your account is active. If you close your account, we delete your data within 30 days, except where we are required by law to retain it for longer (for example, billing records may be retained for up to 7 years for tax purposes).
        </p>
        <p>
          Volunteer data uploaded by your organization is deleted within 30 days of account closure. You may also delete individual records at any time from within the Service.
        </p>

        <h2>6. Data Security</h2>
        <p>
          We implement industry-standard security measures including encryption in transit (TLS 1.2+), encryption at rest for sensitive fields, regular security audits, and access controls that limit employee access to customer data. No system is perfectly secure, and we cannot guarantee absolute security, but we take our responsibility to protect your data seriously.
        </p>

        <h2>7. Your Rights</h2>
        <p>Depending on your location, you may have the following rights regarding your personal data:</p>
        <ul>
          <li><strong style={{ color: 'rgba(255,255,255,0.75)' }}>Access:</strong> Request a copy of the data we hold about you</li>
          <li><strong style={{ color: 'rgba(255,255,255,0.75)' }}>Correction:</strong> Request correction of inaccurate data</li>
          <li><strong style={{ color: 'rgba(255,255,255,0.75)' }}>Deletion:</strong> Request deletion of your personal data</li>
          <li><strong style={{ color: 'rgba(255,255,255,0.75)' }}>Portability:</strong> Export your data in a machine-readable format</li>
          <li><strong style={{ color: 'rgba(255,255,255,0.75)' }}>Objection:</strong> Object to certain processing of your data</li>
          <li><strong style={{ color: 'rgba(255,255,255,0.75)' }}>Restriction:</strong> Request restriction of processing in certain circumstances</li>
        </ul>
        <p>
          To exercise any of these rights, contact us at privacy@volunteerflow.com or use our <a href="/contact" style={{ color: '#34d399', textDecoration: 'none' }}>contact page</a>. We will respond within 30 days.
        </p>

        <h2>8. GDPR (European Users)</h2>
        <p>
          If you are located in the European Economic Area, VolunteerFlow acts as a data controller for account and usage data, and as a data processor for volunteer data your organization uploads. Our legal basis for processing is typically contract performance (to provide the Service), legitimate interests (security, analytics), and consent where required.
        </p>
        <p>
          You have the right to lodge a complaint with your local data protection authority. For cross-border data transfers, we use Standard Contractual Clauses approved by the European Commission.
        </p>

        <h2>9. CCPA (California Users)</h2>
        <p>
          California residents have the right to know what personal information we collect, to request deletion of their personal information, and to opt out of the sale of personal information. We do not sell personal information. To make a request, contact us at privacy@volunteerflow.com.
        </p>

        <h2>10. Children's Privacy</h2>
        <p>
          VolunteerFlow is not directed at children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with their information, please contact us and we will delete it promptly.
        </p>

        <h2>11. Third-Party Services</h2>
        <p>
          The Service may contain links to third-party websites or integrate with third-party services. This Privacy Policy does not apply to those services. We encourage you to review the privacy policies of any third-party services you use.
        </p>

        <h2>12. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of material changes by email or by posting a notice within the Service at least 14 days before the changes take effect. Your continued use of the Service after the effective date constitutes acceptance of the updated policy.
        </p>

        <h2>13. Contact Us</h2>
        <p>
          If you have questions or concerns about this Privacy Policy, please contact us at <a href="/contact" style={{ color: '#34d399', textDecoration: 'none' }}>our contact page</a> or email privacy@volunteerflow.com.
        </p>
        <p>
          VolunteerFlow, Inc.<br />
          privacy@volunteerflow.com
        </p>
      </div>

      <PublicFooter />
    </div>
  );
}
