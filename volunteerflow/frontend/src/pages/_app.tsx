import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/context/ThemeContext';
import { PlanProvider } from '@/context/usePlan';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Self-hosted via Next.js — no external CDN call, no privacy leak
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// RGB channel palettes — must match ACCENT_PALETTES in settings.tsx
const ACCENT_PALETTES: Record<string, Record<string, string>> = {
  blue:   { '50':'239 246 255','100':'219 234 254','200':'191 219 254','300':'147 197 253','400':'96 165 250', '500':'59 130 246', '600':'37 99 235',  '700':'29 78 216',  '800':'30 64 175',  '900':'30 58 138'  },
  purple: { '50':'245 243 255','100':'237 233 254','200':'221 214 254','300':'196 181 253','400':'167 139 250','500':'139 92 246', '600':'124 58 237', '700':'109 40 217', '800':'91 33 182',  '900':'76 29 149'  },
  green:  { '50':'240 253 244','100':'220 252 231','200':'187 247 208','300':'134 239 172','400':'74 222 128', '500':'34 197 94',  '600':'22 163 74',  '700':'21 128 61',  '800':'22 101 52',  '900':'20 83 45'   },
  orange: { '50':'255 247 237','100':'255 237 213','200':'254 215 170','300':'253 186 116','400':'251 146 60', '500':'249 115 22', '600':'234 88 12',  '700':'194 65 12',  '800':'154 52 18',  '900':'124 45 18'  },
  red:    { '50':'254 242 242','100':'254 226 226','200':'254 202 202','300':'252 165 165','400':'248 113 113','500':'239 68 68',  '600':'220 38 38',  '700':'185 28 28',  '800':'153 27 27',  '900':'127 29 29'  },
  teal:   { '50':'240 253 250','100':'204 251 241','200':'153 246 228','300':'94 234 212', '400':'45 212 191', '500':'20 184 166', '600':'13 148 136', '700':'15 118 110', '800':'17 94 89',   '900':'19 78 74'   },
};

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
    // Apply the font variable to the root so Tailwind's font-sans picks it up
    <div className={`${inter.variable} font-sans`} style={{ display: 'contents' }}>
      <ThemeProvider>
        <PlanProvider initialPlan="discover">
          <ErrorBoundary>
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
    </div>
  );
}
