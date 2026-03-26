const footerStyles = `
  .pub-footer { background: #0f172a; font-family: 'DM Sans', sans-serif; }
  .pub-footer-link { font-size: 14px; color: rgba(255,255,255,0.45); text-decoration: none; transition: color 0.15s; display: block; margin-bottom: 10px; }
  .pub-footer-link:hover { color: rgba(255,255,255,0.8); }
  .pub-footer-col-title { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 16px; }
  .pub-container { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
  .pub-nav-logo { display: flex; align-items: center; text-decoration: none; }
  @media (max-width: 768px) {
    .pub-footer-grid { grid-template-columns: 1fr 1fr !important; }
  }
`;

export default function PublicFooter() {
  return (
    <footer className="pub-footer" style={{ padding: '24px 0' }}>
      <style dangerouslySetInnerHTML={{ __html: footerStyles }} />
      <div className="pub-container">
        <div className="pub-footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 48, marginBottom: 32 }}>
          <div>
            <a href="/landing" className="pub-nav-logo" style={{ marginBottom: -55, display: 'flex' }}>
              <img src="/vf-logo-full.png" style={{ width: 240, height: 'auto' }} alt="VolunteerFlow" />
            </a>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, maxWidth: 260 }}>
              The volunteer management platform built for organizations that want to make a bigger impact.
            </p>
          </div>
          <div>
            <div className="pub-footer-col-title">Product</div>
            <a href="/landing#features" className="pub-footer-link">Features</a>
            <a href="/pricing" className="pub-footer-link">Pricing</a>
          </div>
          <div>
            <div className="pub-footer-col-title">Company</div>
            <a href="/about" className="pub-footer-link">About</a>
            <a href="/careers" className="pub-footer-link">Careers</a>
            <a href="/contact" className="pub-footer-link">Contact</a>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>
            © {new Date().getFullYear()} VolunteerFlow. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: 20 }}>
            <a href="/privacy" style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>Privacy</a>
            <a href="/terms" style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>Terms</a>
            <a href="/status" style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>Status</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
