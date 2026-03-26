import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/context/ThemeContext';
import { PlanProvider } from '@/context/usePlan';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { StaffAuthProvider } from '@/context/StaffAuthContext';
import { SupportViewProvider } from '@/context/SupportViewContext';
import { SupportBanner } from '@/components/staff/SupportBanner';
import { api } from '@/lib/api';
import { PlanId } from '@/lib/pricing.config';
import { usePlan } from '@/context/usePlan';

// Self-hosted via Next.js — no external CDN call, no privacy leak
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// RGB channel palettes — must match ACCENT_PALETTES in settings.tsx
const ACCENT_PALETTES: Record<string, Record<string, string>> = {
  // Classic solid colors
  blue:     { '50':'239 246 255','100':'219 234 254','200':'191 219 254','300':'147 197 253','400':'96 165 250', '500':'59 130 246', '600':'37 99 235',  '700':'29 78 216',  '800':'30 64 175',  '900':'30 58 138'  },
  purple:   { '50':'245 243 255','100':'237 233 254','200':'221 214 254','300':'196 181 253','400':'167 139 250','500':'139 92 246', '600':'124 58 237', '700':'109 40 217', '800':'91 33 182',  '900':'76 29 149'  },
  green:    { '50':'240 253 244','100':'220 252 231','200':'187 247 208','300':'134 239 172','400':'74 222 128', '500':'34 197 94',  '600':'22 163 74',  '700':'21 128 61',  '800':'22 101 52',  '900':'20 83 45'   },
  orange:   { '50':'255 247 237','100':'255 237 213','200':'254 215 170','300':'253 186 116','400':'251 146 60', '500':'249 115 22', '600':'234 88 12',  '700':'194 65 12',  '800':'154 52 18',  '900':'124 45 18'  },
  red:      { '50':'254 242 242','100':'254 226 226','200':'254 202 202','300':'252 165 165','400':'248 113 113','500':'239 68 68',  '600':'220 38 38',  '700':'185 28 28',  '800':'153 27 27',  '900':'127 29 29'  },
  teal:     { '50':'240 253 250','100':'204 251 241','200':'153 246 228','300':'94 234 212', '400':'45 212 191', '500':'20 184 166', '600':'13 148 136', '700':'15 118 110', '800':'17 94 89',   '900':'19 78 74'   },
  // Signature themes
  sunset:   { '50':'255 247 237','100':'255 237 208','200':'255 212 160','300':'255 175 108','400':'255 137 55','500':'245 90 40',  '600':'218 58 35',  '700':'182 36 58',  '800':'148 22 66',  '900':'112 14 54'  },
  ocean:    { '50':'240 249 255','100':'214 240 253','200':'170 222 250','300':'108 196 240','400':'52 164 224','500':'8 136 204',  '600':'4 108 172',  '700':'3 86 140',   '800':'4 66 108',   '900':'5 50 80'    },
  aurora:   { '50':'237 255 252','100':'207 252 244','200':'162 244 232','300':'110 226 210','400':'90 178 236','500':'99 102 241', '600':'79 70 229',  '700':'67 56 202',  '800':'58 46 172',  '900':'49 38 148'  },
  ember:    { '50':'255 252 232','100':'255 243 198','200':'255 228 152','300':'252 204 82', '400':'240 170 28','500':'215 133 8',  '600':'182 102 4',  '700':'146 74 4',   '800':'114 54 4',   '900':'86 38 4'    },
  rose:     { '50':'255 241 244','100':'255 215 223','200':'255 182 200','300':'252 145 172','400':'244 106 146','500':'230 68 114','600':'208 45 91',  '700':'176 31 72',  '800':'145 24 57',  '900':'116 18 44'  },
  midnight: { '50':'245 244 255','100':'230 228 252','200':'206 203 245','300':'172 168 236','400':'134 128 218','500':'100 96 198','600':'80 74 178',  '700':'63 56 152',  '800':'48 40 126',  '900':'36 28 100'  },
};

function PlanLoader() {
  const { setPlan } = usePlan();
  useEffect(() => {
    // Guard required: api client redirects to login on 401, which would
    // create an infinite loop on public pages (landing, pricing, signup).
    const token = localStorage.getItem('vf_token');
    if (!token) return;
    api.get<{ plan: string }>('/billing/plan')
      .then(res => {
        const plan = res?.plan;
        if (plan === 'discover' || plan === 'grow' || plan === 'enterprise') {
          setPlan(plan as PlanId);
        }
      })
      .catch(() => { /* expired token or network error — stay on discover */ });
  }, [setPlan]);
  return null;
}

function AppearanceInit() {
  useEffect(() => {
    try {
      const stored = localStorage.getItem('vf_appearance');
      if (!stored) return;
      const p = JSON.parse(stored);
      const root = document.documentElement;
      // Apply accent color
      const palette = p.accentColor && ACCENT_PALETTES[p.accentColor];
      if (palette) {
        Object.entries(palette).forEach(([shade, channels]) => {
          root.style.setProperty(`--primary-${shade}`, channels as string);
        });
      }
      // Apply density
      if (p.density) root.setAttribute('data-density', p.density);
    } catch { /* ignore */ }
  }, []);
  return null;
}


export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${inter.variable} font-sans`} style={{ display: 'contents' }}>
      <StaffAuthProvider>
        <SupportViewProvider>
          <ThemeProvider>
            <PlanProvider initialPlan="discover">
              <PlanLoader />
              <ErrorBoundary>
                <SupportBanner />
                <AppearanceInit />
                <Component {...pageProps} />
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#fff',
                      color: '#171717',
                      border: '1px solid #e5e5e5',
                      borderRadius: '8px',
                      fontSize: '14px',
                    },
                  }}
                />
              </ErrorBoundary>
            </PlanProvider>
          </ThemeProvider>
        </SupportViewProvider>
      </StaffAuthProvider>
    </div>
  );
}
