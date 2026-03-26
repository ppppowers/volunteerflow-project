import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Menu, X, ArrowRight } from 'lucide-react';
import { SignInModal } from '@/components/SignInModal';

const navStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');

  .lp-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    padding: 0 24px;
    height: 80px;
    display: flex; align-items: center; justify-content: space-between;
    transition: background 0.3s, box-shadow 0.3s;
  }
  .lp-nav.scrolled {
    background: rgba(10,15,30,0.95);
    backdrop-filter: blur(12px);
    box-shadow: 0 1px 0 rgba(255,255,255,0.06);
  }
  .nav-logo {
    display: flex; align-items: center; gap: 10px;
    text-decoration: none;
  }
  .nav-links { display: flex; align-items: center; gap: 32px; }
  .nav-link {
    font-size: 14px; font-weight: 500;
    color: rgba(255,255,255,0.65);
    text-decoration: none;
    transition: color 0.15s;
  }
  .nav-link:hover { color: white; }
  .nav-cta { display: flex; align-items: center; gap: 10px; }
  .btn-nav-secondary {
    padding: 8px 18px;
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 8px;
    font-size: 13.5px; font-weight: 600;
    color: rgba(255,255,255,0.8);
    background: transparent;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.18s;
    text-decoration: none;
    display: inline-flex; align-items: center;
  }
  .btn-nav-secondary:hover { background: rgba(255,255,255,0.08); color: white; }
  .btn-nav-primary {
    padding: 8px 20px;
    border: none; border-radius: 8px;
    font-size: 13.5px; font-weight: 700;
    color: white;
    background: linear-gradient(135deg, #10b981, #059669);
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.18s;
    text-decoration: none;
    display: inline-flex; align-items: center; gap: 6px;
    box-shadow: 0 4px 12px rgba(16,185,129,0.35);
  }
  .btn-nav-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(16,185,129,0.45); }
  .nav-hamburger {
    display: none;
    background: none; border: none; cursor: pointer;
    color: rgba(255,255,255,0.7); padding: 4px;
  }
  .mobile-menu {
    position: fixed; top: 80px; left: 0; right: 0; z-index: 99;
    background: rgba(10,15,30,0.97);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255,255,255,0.08);
    padding: 16px 24px 24px;
    display: flex; flex-direction: column; gap: 4px;
  }
  .mobile-menu-link {
    font-size: 16px; font-weight: 500;
    color: rgba(255,255,255,0.75);
    text-decoration: none;
    padding: 12px 0;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    display: block;
  }
  .mobile-menu-link:last-of-type { border: none; }
  .mobile-menu-link:hover { color: white; }
  .mobile-menu-cta { display: flex; gap: 10px; margin-top: 16px; }
  .mobile-menu-cta a { flex: 1; justify-content: center; }
  @media (max-width: 768px) {
    .nav-links { display: none; }
    .nav-cta { display: none; }
    .nav-hamburger { display: flex; }
  }
`;

export default function PublicNav() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  const isLanding = router.pathname === '/landing';
  const featuresHref = isLanding ? '#features' : '/landing#features';
  const howItWorksHref = isLanding ? '#how-it-works' : '/landing#how-it-works';

  const openSignIn = useCallback(() => { setMobileMenu(false); setSignInOpen(true); }, []);

  useEffect(() => {
    if (router.isReady && router.query.mode === 'signin') {
      setSignInOpen(true);
      // Remove ?mode=signin so re-renders / back-navigation don't re-open the modal
      const { mode: _mode, ...rest } = router.query;
      router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true });
    }
  }, [router.isReady, router.query.mode]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: navStyles }} />
      <nav className={`lp-nav ${scrolled ? 'scrolled' : ''}`}>
        <a href="/landing" className="nav-logo">
          <img src="/vf-logo-full.png" style={{ width: 320, height: 'auto' }} alt="VolunteerFlow" />
        </a>
        <div className="nav-links">
          <a href={featuresHref} className="nav-link">Features</a>
          <a href={howItWorksHref} className="nav-link">How it works</a>
          <a href="/pricing" className="nav-link">Pricing</a>
        </div>
        <div className="nav-cta">
          <button type="button" className="btn-nav-secondary" onClick={openSignIn}>Sign in</button>
          <a href="/signup" className="btn-nav-primary">
            Start free <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
        <button className="nav-hamburger" onClick={() => setMobileMenu(v => !v)} aria-label="Toggle menu">
          {mobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {mobileMenu && (
        <div className="mobile-menu">
          <a href={featuresHref} className="mobile-menu-link" onClick={() => setMobileMenu(false)}>Features</a>
          <a href={howItWorksHref} className="mobile-menu-link" onClick={() => setMobileMenu(false)}>How it works</a>
          <a href="/pricing" className="mobile-menu-link" onClick={() => setMobileMenu(false)}>Pricing</a>
          <div className="mobile-menu-cta">
            <button type="button" className="btn-nav-secondary" onClick={openSignIn}>Sign in</button>
            <a href="/signup" className="btn-nav-primary">
              Start free <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
    </>
  );
}
