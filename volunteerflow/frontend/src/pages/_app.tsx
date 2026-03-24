import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { ThemeProvider } from '@/context/ThemeContext';
import { StaffAuthProvider } from '../context/StaffAuthContext';
import { SupportViewProvider } from '../context/SupportViewContext';
import { SupportBanner } from '../components/staff/SupportBanner';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <StaffAuthProvider>
      <SupportViewProvider>
        <SupportBanner />
        <ThemeProvider>
          <Component {...pageProps} />
        </ThemeProvider>
      </SupportViewProvider>
    </StaffAuthProvider>
  );
}