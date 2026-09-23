'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { apiFetch } from '../../lib/api/client';
import { CiviqueLogo } from '../../components/CiviqueLogo';
import { Button, Input, Card } from '../../components/ui';
import { FiAlertCircle, FiCheck, FiArrowLeft } from 'react-icons/fi';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [developmentToken, setDevelopmentToken] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const result = await apiFetch<{ message: string; developmentToken?: string }>('/auth/password-recovery/request', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setMessage(result.message);
      setDevelopmentToken(result.developmentToken || '');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to request password recovery.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-12 text-[#192b21] select-none">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <CiviqueLogo size={40} />
        </div>

        <Card className="p-6 md:p-8 border-[#eef1ea] shadow-sm">
          <div className="space-y-1.5 text-left mb-6">
            <h1 className="text-2xl font-extrabold text-[#192b21] tracking-tight">
              Reset your password
            </h1>
            <p className="text-xs text-[#667a6e] leading-relaxed">
              Enter your verified email. We will generate an authorized, single-use password recovery credential.
            </p>
          </div>

          <form className="space-y-4 text-left" onSubmit={submit}>
            {error && (
              <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                <FiAlertCircle className="size-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="flex items-center gap-2.5 rounded-xl border border-[#d6e5da] bg-[#f2f7f4] p-3 text-xs font-semibold text-[#143527]">
                <FiCheck className="size-4 shrink-0 text-[#143527]" />
                <span>{message}</span>
              </div>
            )}

            <Input
              label="Email Address"
              id="email"
              type="email"
              required
              placeholder="you@civique.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Button type="submit" size="lg" isLoading={pending} className="w-full">
              Send Reset Instructions
            </Button>
          </form>

          {developmentToken && (
            <div className="mt-4 rounded-xl border border-[#eef1ea] bg-[#f8fafc] p-3 text-xs text-left">
              <p className="font-bold text-[#192b21] mb-1">Local Development Token:</p>
              <Link
                className="font-mono text-xs text-[#143527] font-bold underline underline-offset-4"
                href={`/reset-password?token=${encodeURIComponent(developmentToken)}`}
              >
                Click here to complete password reset →
              </Link>
            </div>
          )}

          <div className="mt-6 border-t border-[#e2e8f0] pt-4 text-center">
            <Link
              href="/signin"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748b] hover:text-[#0f172a] transition-colors"
            >
              <FiArrowLeft /> Back to sign in
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
