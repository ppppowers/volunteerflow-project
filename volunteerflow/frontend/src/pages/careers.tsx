import Head from 'next/head';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { ArrowRight } from 'lucide-react';

const pageStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');
  .careers-page { background: #0a0f1e; min-height: 100vh; font-family: 'DM Sans', sans-serif; color: white; }
`;

export default function CareersPage() {
  return (
    <div className="careers-page">
      <Head>
        <title>Careers — VolunteerFlow</title>
        <meta name="description" content="Join the VolunteerFlow team and help build the future of volunteer management." />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: pageStyles }} />
      <PublicNav />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 160px)', textAlign: 'center', padding: '80px 24px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 999, padding: '6px 16px', fontSize: 13, fontWeight: 600, color: '#34d399', marginBottom: 32 }}>
          We're hiring
        </div>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 700, lineHeight: 1.15, marginBottom: 24, maxWidth: 700 }}>
          Come build something<br />
          <em style={{ fontStyle: 'italic', color: '#34d399' }}>that matters</em>
        </h1>
        <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', lineHeight: 1.75, maxWidth: 520, marginBottom: 48 }}>
          Our careers page is coming soon. We're growing the team and we'd love to hear from passionate people who want to make an impact.
        </p>
        <a
          href="/contact"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', fontWeight: 700, fontSize: 15, padding: '12px 28px', borderRadius: 10, textDecoration: 'none', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}
        >
          Get in touch <ArrowRight style={{ width: 16, height: 16 }} />
        </a>
      </div>

      <PublicFooter />
    </div>
  );
}
