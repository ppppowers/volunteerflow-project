import React, { useState } from 'react';
import { useRouter } from 'next/router';

export default function StaffLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const raw = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const res = await raw.json();
      if (!raw.ok) throw new Error(res?.error ?? 'Login failed');
      const { token, user } = res.data ?? res;
      sessionStorage.setItem('vf_staff_token', token);
      sessionStorage.setItem('vf_staff_user', JSON.stringify(user));
      router.replace('/staff');
    } catch (err: any) {
      setError(err.message ?? 'Login failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm bg-gray-900 rounded-xl p-8 shadow-2xl">
        <div className="flex items-center gap-2.5 mb-4">
          <img src="/vf-logo.png" className="w-14 h-14" alt="" aria-hidden="true" />
          <span className="text-white font-bold text-lg">VolunteerFlow</span>
        </div>
        <h1 className="text-white text-xl font-bold mb-1">Staff Portal</h1>
        <p className="text-gray-400 text-sm mb-6">Internal access only</p>
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            id="email" name="email"
            type="email" placeholder="Staff email" value={email}
            onChange={e => setEmail(e.target.value)} required
            className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500"
          />
          <input
            id="password" name="password"
            type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)} required
            className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="submit" disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-lg text-sm transition disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
