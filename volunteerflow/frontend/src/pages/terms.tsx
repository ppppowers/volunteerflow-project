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
`;

export default function TermsPage() {
  return (
    <div className="legal-page">
      <Head>
        <title>Terms of Service — VolunteerFlow</title>
        <meta name="description" content="VolunteerFlow Terms of Service — the rules and guidelines for using our platform." />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: pageStyles }} />
      <PublicNav />

      <div className="legal-section">
        <h1>Terms of Service</h1>
        <p className="updated">Last updated: March 25, 2026</p>

        <p>
          These Terms of Service ("Terms") govern your access to and use of VolunteerFlow ("Service"), operated by VolunteerFlow, Inc. ("we," "us," or "our"). By creating an account or using the Service, you agree to be bound by these Terms.
        </p>

        <hr className="legal-divider" />

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using VolunteerFlow, you confirm that you are at least 18 years old, have read and understood these Terms, and agree to be bound by them. If you are using the Service on behalf of an organization, you represent that you have the authority to bind that organization to these Terms.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          VolunteerFlow is a volunteer management platform that allows organizations to recruit, schedule, communicate with, and track volunteers. Features available to you depend on your subscription plan.
        </p>

        <h2>3. Accounts and Registration</h2>
        <p>You are responsible for:</p>
        <ul>
          <li>Providing accurate and complete registration information</li>
          <li>Maintaining the security of your account credentials</li>
          <li>All activity that occurs under your account</li>
          <li>Promptly notifying us of any unauthorized use of your account</li>
        </ul>
        <p>
          We reserve the right to suspend or terminate accounts that violate these Terms or that we reasonably believe are being used fraudulently.
        </p>

        <h2>4. Subscriptions and Billing</h2>
        <p>
          VolunteerFlow offers paid subscription plans ("Grow" and "Enterprise") in addition to a free "Discover" plan. By subscribing to a paid plan:
        </p>
        <ul>
          <li>You authorize us to charge your payment method on a recurring basis</li>
          <li>Subscription fees are billed in advance and are non-refundable except as required by law</li>
          <li>You may cancel your subscription at any time; access continues until the end of the current billing period</li>
          <li>We reserve the right to change pricing with 30 days' notice</li>
        </ul>

        <h2>5. Acceptable Use</h2>
        <p>You agree not to use the Service to:</p>
        <ul>
          <li>Violate any applicable laws or regulations</li>
          <li>Upload or transmit harmful, offensive, or illegal content</li>
          <li>Attempt to gain unauthorized access to any part of the Service or its infrastructure</li>
          <li>Interfere with or disrupt the integrity or performance of the Service</li>
          <li>Harvest or collect information about other users without their consent</li>
          <li>Use the Service to send unsolicited communications (spam)</li>
        </ul>

        <h2>6. Your Data</h2>
        <p>
          You retain ownership of all data you upload to VolunteerFlow ("Your Data"). By using the Service, you grant us a limited license to store, process, and display Your Data solely to provide the Service to you. We will not sell Your Data to third parties.
        </p>
        <p>
          You are responsible for ensuring that your collection and use of volunteer data complies with applicable privacy laws, including obtaining any required consents from your volunteers.
        </p>

        <h2>7. Intellectual Property</h2>
        <p>
          The Service, including its design, software, features, and content (excluding Your Data), is owned by VolunteerFlow, Inc. and is protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works based on the Service without our express written permission.
        </p>

        <h2>8. Confidentiality</h2>
        <p>
          We treat your organizational data as confidential. Our employees and contractors are bound by confidentiality obligations. We will not access your data except as needed to provide the Service, resolve technical issues, or as required by law.
        </p>

        <h2>9. Service Availability</h2>
        <p>
          We strive to maintain high availability but do not guarantee uninterrupted access to the Service. We may perform maintenance, updates, or experience downtime due to circumstances beyond our control. We are not liable for any loss resulting from service unavailability.
        </p>

        <h2>10. Disclaimer of Warranties</h2>
        <p>
          THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </p>

        <h2>11. Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, VOLUNTEERFLOW AND ITS AFFILIATES, OFFICERS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF OR INABILITY TO USE THE SERVICE. IN NO EVENT WILL OUR TOTAL LIABILITY TO YOU EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US IN THE TWELVE MONTHS PRIOR TO THE CLAIM, OR (B) ONE HUNDRED U.S. DOLLARS ($100).
        </p>

        <h2>12. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless VolunteerFlow, Inc. and its affiliates, officers, employees, and agents from any claims, damages, liabilities, and expenses (including reasonable attorneys' fees) arising from your use of the Service, your violation of these Terms, or your violation of any third-party rights.
        </p>

        <h2>13. Termination</h2>
        <p>
          Either party may terminate these Terms at any time. Upon termination, your right to access the Service ceases. You may export your data at any time while your account is active. After account closure, we will retain your data for 30 days before permanent deletion, except where we are required by law to retain it longer.
        </p>

        <h2>14. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles. Any disputes shall be resolved exclusively in the state or federal courts located in Delaware.
        </p>

        <h2>15. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. We will notify you of material changes by email or by posting a notice in the Service at least 14 days before the changes take effect. Continued use of the Service after the effective date constitutes acceptance of the revised Terms.
        </p>

        <h2>16. Contact</h2>
        <p>
          If you have questions about these Terms, please contact us at <a href="/contact" style={{ color: '#34d399', textDecoration: 'none' }}>our contact page</a> or email us at legal@volunteerflow.com.
        </p>
      </div>

      <PublicFooter />
    </div>
  );
}
