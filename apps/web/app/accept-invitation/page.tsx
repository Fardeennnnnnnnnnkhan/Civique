'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '../../lib/api/client';
import { CiviqueLogo } from '../../components/CiviqueLogo';
import { Button, Input, Card } from '../../components/ui';
import { FiAlertCircle, FiCheck, FiArrowRight, FiEye, FiEyeOff } from 'react-icons/fi';

function AcceptInvitationForm() {
  const token = useSearchParams().get('token') || '';
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const passwordRequirements = [
    { label: '8–128 characters', valid: password.length >= 8 && password.length <= 128 },
    { label: 'one lowercase letter', valid: /[a-z]/.test(password) },
    { label: 'one uppercase letter', valid: /[A-Z]/.test(password) },
    { label: 'one number', valid: /[0-9]/.test(password) },
  ];

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    const failedRequirement = passwordRequirements.find((requirement) => !requirement.valid);
    if (failedRequirement)
      return setError(
        `Password must be 8–128 characters and include at least one lowercase letter, one uppercase letter, and one number. Missing: ${failedRequirement.label}.`
      );
    if (password !== confirmation)
      return setError('Passwords do not match. Please enter the same password in both fields.');
    setPending(true);
    try {
      const result = await apiFetch<{ message: string }>(
        `/auth/invitations/${encodeURIComponent(token)}/accept`,
        { method: 'POST', body: JSON.stringify({ password }) }
      );
      setMessage(result.message);
      setPassword('');
      setConfirmation('');
      window.setTimeout(() => router.replace('/signin?activated=1'), 900);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to activate account.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-12 text-slate-900 select-none font-sans">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <CiviqueLogo size={40} />
        </div>

        <Card className="p-6 md:p-8 border-slate-200 bg-white shadow-md rounded-3xl">
          <div className="space-y-1.5 text-left mb-6">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#143527] bg-[#143527]/10 border border-[#143527]/20 px-2.5 py-0.5 rounded-full">
              Municipal Staff Onboarding
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
              Activate your account
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Create your official password to activate the municipal department and ward scope assigned by your administrator.
            </p>
          </div>

          <form className="space-y-4 text-left" onSubmit={submit}>
            {error && (
              <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                <FiAlertCircle className="size-4 shrink-0 text-rose-500" />
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
              <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                <FiAlertCircle className="size-4 shrink-0 text-rose-500" />
                <span>The invitation token is missing or invalid.</span>
              </div>
            )}

            <Input
              label="New Official Password"
              id="invite-password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              placeholder="Min 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              endAdornment={
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                >
                  <span aria-hidden="true">{showPassword ? <FiEyeOff className="size-4" /> : <FiEye className="size-4" />}</span>
                </button>
              }
            />
            <p className="-mt-2 text-[11px] font-semibold leading-relaxed text-slate-500" aria-live="polite">
              Password requirements:{' '}
              {passwordRequirements.map((requirement) => (
                <span
                  key={requirement.label}
                  className={`mr-1 ${password && requirement.valid ? 'text-[#143527] font-bold' : ''}`}
                >
                  {requirement.valid ? '✓' : '•'} {requirement.label}
                </span>
              ))}
            </p>

            <Input
              label="Confirm Password"
              id="invite-confirm"
              type={showConfirmation ? 'text' : 'password'}
              required
              minLength={8}
              placeholder="Re-enter password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              endAdornment={
                <button
                  type="button"
                  aria-label={showConfirmation ? 'Hide confirmation password' : 'Show confirmation password'}
                  onClick={() => setShowConfirmation((visible) => !visible)}
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                >
                  <span aria-hidden="true">{showConfirmation ? <FiEyeOff className="size-4" /> : <FiEye className="size-4" />}</span>
                </button>
              }
            />

            <Button
              type="submit"
              size="lg"
              disabled={pending || !token}
              isLoading={pending}
              className="w-full bg-[#143527] hover:bg-[#0e271c] text-white font-black cursor-pointer"
            >
              Activate Account <FiArrowRight />
            </Button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
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

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-white text-xs font-bold text-slate-400">
          Loading invitation...
        </main>
      }
    >
      <AcceptInvitationForm />
    </Suspense>
  );
}
