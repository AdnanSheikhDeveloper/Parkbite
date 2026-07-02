'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Loader2, AlertCircle } from 'lucide-react';
import { loginAdmin } from './actions';

export default function AdminLoginClient() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');

    if (!password) {
      setError('Password is required');
      return;
    }

    setIsLoading(true);
    try {
      const result = await loginAdmin(password);
      if (result.success) {
        router.push('/admin/orders');
      } else {
        setError(result.error || 'Invalid password');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Admin login error:', err);
      setError('An error occurred during login. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-warm flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl border border-brand-deep/10 shadow-md flex flex-col gap-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-brand-deep/5 text-brand-deep rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock size={24} />
          </div>
          <h1 className="text-xl font-bold text-brand-deep">ParkBite Admin Gate</h1>
          <p className="text-xs opacity-60 mt-1">Please enter the shared password to access administration panel</p>
        </div>

        {error && (
          <div className="bg-alert/15 border border-alert text-ink p-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="text-alert shrink-0 mt-0.5" size={18} />
            <span className="text-xs font-semibold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="admin-pass" className="block text-xs font-semibold text-brand-deep mb-1">
              Admin Password
            </label>
            <input
              id="admin-pass"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-brand-deep/10 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent focus:outline-hidden text-sm"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-brand-accent hover:bg-brand-accent/90 text-bg-warm font-bold rounded-lg shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Verifying...
              </>
            ) : (
              'Enter Admin Panel'
            )}
          </button>
        </form>

        <p className="text-[10px] text-ink/40 text-center italic mt-2">
          * Note: This password gate is temporary and will be replaced by user auth in a later phase.
        </p>
      </div>
    </div>
  );
}
