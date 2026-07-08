'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Input, Label, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState('/dashboard');

  useEffect(() => {
    const url = searchParams.get('callbackUrl');
    if (url) setCallbackUrl(url);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border border-slate-700/60 shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle>Auditor Authentication</CardTitle>
        <CardDescription>Enter internal staff credentials to access the assessment dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 rounded bg-rose-950/40 border border-rose-500/30 text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@cts.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            className="w-full mt-2"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Access Dashboard'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0b1329] px-4 relative overflow-hidden">
      {/* Decorative Gold Glow Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#d4af37]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#d4af37]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-100">
            Know Your Book<span className="text-[#d4af37]">™</span>
          </h1>
          <p className="text-xs text-[#d4af37] font-semibold mt-2 uppercase tracking-wider">
            Internal Assessment Platform
          </p>
          <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">
            Powered by Continuity Transition Services
          </p>
        </div>

        <Suspense fallback={
          <Card className="border border-slate-700/60 shadow-2xl bg-[#1c2541] h-[340px] flex items-center justify-center">
            <div className="text-slate-400 text-sm">Initializing security protocols...</div>
          </Card>
        }>
          <LoginFormContent />
        </Suspense>

        {/* Small security warning footer */}
        <p className="text-[10px] text-slate-500 text-center mt-6 uppercase tracking-widest leading-relaxed">
          Authorized Internal Use Only.<br />All activities are monitored and logged.
        </p>
      </div>
    </main>
  );
}
