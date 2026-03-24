import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { staffApi } from '../../lib/staffApi';

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
      const res = await staffApi.post('/auth/login', { email, password }) as any;
      localStorage.setItem('vf_staff_token', res.token);
      localStorage.setItem('vf_staff_user', JSON.stringify(res.user));
      router.replace('/staff');
    } catch (err: any) {
      setError(err.message ?? 'Login failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm bg-gray-900 rounded-xl p-8 shadow-2xl">
        <h1 className="text-white text-xl font-bold mb-1">VolunteerFlow Staff</h1>
        <p className="text-gray-400 text-sm mb-6">Internal access only</p>
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email" placeholder="Staff email" value={email}
            onChange={e => setEmail(e.target.value)} required
            className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500"
          />
          <input
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
