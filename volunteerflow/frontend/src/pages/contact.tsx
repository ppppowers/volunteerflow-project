import Head from 'next/head';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { Mail, MapPin, MessageSquare } from 'lucide-react';

const pageStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');
  .contact-page { background: #0a0f1e; min-height: 100vh; font-family: 'DM Sans', sans-serif; color: white; }
  .contact-section { max-width: 1040px; margin: 0 auto; padding: 100px 24px 80px; }
  .contact-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 28px; }
  .contact-input { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 12px 16px; font-size: 15px; color: white; font-family: 'DM Sans', sans-serif; outline: none; box-sizing: border-box; transition: border-color 0.15s; }
  .contact-input::placeholder { color: rgba(255,255,255,0.3); }
  .contact-input:focus { border-color: rgba(16,185,129,0.5); }
  .contact-label { display: block; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.6); margin-bottom: 8px; }
`;

export default function ContactPage() {
  return (
    <div className="contact-page">
      <Head>
        <title>Contact — VolunteerFlow</title>
        <meta name="description" content="Get in touch with the VolunteerFlow team. We'd love to hear from you." />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: pageStyles }} />
      <PublicNav />

      <div className="contact-section">
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 999, padding: '6px 16px', fontSize: 13, fontWeight: 600, color: '#34d399', marginBottom: 24 }}>
            Get in touch
          </div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 700, lineHeight: 1.2, marginBottom: 16 }}>
            We'd love to hear<br />
            <em style={{ fontStyle: 'italic', color: '#34d399' }}>from you</em>
          </h1>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.5)', lineHeight: 1.75, maxWidth: 480, margin: '0 auto' }}>
            Have a question, feedback, or just want to say hello? Send us a message and we'll get back to you.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 40, alignItems: 'start' }}>
          {/* Contact info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="contact-card">
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Mail style={{ width: 20, height: 20, color: '#34d399' }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Email</div>
              <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)' }}>hello@volunteerflow.com</div>
            </div>
            <div className="contact-card">
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <MessageSquare style={{ width: 20, height: 20, color: '#34d399' }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Support</div>
              <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)' }}>support@volunteerflow.com</div>
            </div>
            <div className="contact-card">
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <MapPin style={{ width: 20, height: 20, color: '#34d399' }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Location</div>
              <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)' }}>Remote-first team</div>
            </div>
          </div>

          {/* Contact form */}
          <div className="contact-card" style={{ padding: 40 }}>
            <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label className="contact-label">First name</label>
                  <input className="contact-input" type="text" placeholder="Jane" />
                </div>
                <div>
                  <label className="contact-label">Last name</label>
                  <input className="contact-input" type="text" placeholder="Smith" />
                </div>
              </div>
              <div>
                <label className="contact-label">Email</label>
                <input className="contact-input" type="email" placeholder="jane@example.org" />
              </div>
              <div>
                <label className="contact-label">Organization (optional)</label>
                <input className="contact-input" type="text" placeholder="Helping Hands Nonprofit" />
              </div>
              <div>
                <label className="contact-label">Message</label>
                <textarea
                  className="contact-input"
                  placeholder="Tell us how we can help..."
                  rows={5}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <button
                type="submit"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', fontWeight: 700, fontSize: 15, padding: '13px 28px', borderRadius: 10, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}
              >
                Send message
              </button>
            </form>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
