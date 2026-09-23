'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '../../lib/api/client';
import { CiviqueLogo } from '../../components/CiviqueLogo';
import { Button, Input, Card } from '../../components/ui';
import { FiAlertCircle, FiCheck, FiArrowRight } from 'react-icons/fi';

function ResetPasswordForm() {
  const token = useSearchParams().get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (password !== confirmation) return setError('Passwords do not match.');
    setPending(true);
    try {
      const result = await apiFetch<{ message: string }>('/auth/password-recovery/reset', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setMessage(result.message);
      setPassword('');
      setConfirmation('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to reset the password.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-12 text-[#1c221f] select-none">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <CiviqueLogo size={36} />
        </div>

        <Card className="p-6 md:p-8 border border-[#eef1ea] shadow-sm rounded-2xl bg-white">
          <div className="space-y-1.5 text-left mb-6">
            <h1 className="text-2xl font-black text-[#143527] tracking-tight">
              Choose a new password
            </h1>
            <p className="text-xs text-[#707c75] leading-relaxed">
              Use at least 8 characters with numbers and letters. Completing this reset revokes all prior active sessions.
            </p>
          </div>

          <form className="space-y-4 text-left" onSubmit={submit}>
            {error && (
              <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50/60 p-3 text-xs font-semibold text-red-700">
                <FiAlertCircle className="size-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="flex items-center gap-2.5 rounded-xl border border-[#143527]/20 bg-[#143527]/5 p-3 text-xs font-semibold text-[#143527]">
                <FiCheck className="size-4 shrink-0 text-[#143527]" />
                <span>{message}</span>
              </div>
            )}

            {!token && (
              <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50/60 p-3 text-xs font-semibold text-red-700">
                <FiAlertCircle className="size-4 shrink-0 text-red-600" />
                <span>The password reset token is missing or expired.</span>
              </div>
            )}

            <Input
              label="New Password"
              id="password"
              type="password"
              required
              minLength={8}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Input
              label="Confirm New Password"
              id="confirmation"
              type="password"
              required
              minLength={8}
              placeholder="••••••••••••"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />

            <Button
              type="submit"
              size="lg"
              disabled={pending || !token}
              isLoading={pending}
              className="w-full bg-[#143527] hover:bg-[#0e271c] text-white rounded-xl py-3 font-bold"
            >
              Update Password <FiArrowRight className="ml-1" />
            </Button>
          </form>

          <div className="mt-6 border-t border-[#eef1ea] pt-4 text-center">
            <Link
              href="/signin"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#143527] hover:underline"
            >
              Return to sign in →
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-white text-xs font-bold text-[#707c75]">
          Loading secure reset form...
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
