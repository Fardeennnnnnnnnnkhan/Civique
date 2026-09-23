'use client';

import { useEffect, useMemo, useState } from 'react';
import { FiArrowLeft, FiArrowRight, FiCheck, FiChevronRight, FiHelpCircle, FiImage, FiX, FiZap } from 'react-icons/fi';
import { Button } from '../ui';

export type CivicFollowUpQuestion = {
  id: string;
  prompt: string;
  input: 'BOOLEAN' | 'CHOICE' | 'TEXT';
  options?: string[];
  required: boolean;
  reason: string;
};

type CivicFollowUpQuestionsModalProps = {
  open: boolean;
  imagePreview?: string | null;
  questions: CivicFollowUpQuestion[];
  onClose: () => void;
  onSubmit: (answers: Record<string, string>) => void;
};

export function CivicFollowUpQuestionsModal({
  open,
  imagePreview,
  questions,
  onClose,
  onSubmit,
}: CivicFollowUpQuestionsModalProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (open) {
      setAnswers({});
      setCurrentIndex(0);
    }
  }, [open, questions]);

  const visibleQuestions = useMemo(
    () => questions.filter((question) => question.options?.length === 3).slice(0, 5),
    [questions],
  );

  if (!open) return null;

  if (!visibleQuestions.length) return null;

  const currentQuestion = visibleQuestions[currentIndex];
  const selected = answers[currentQuestion.id];
  const isLastQuestion = currentIndex === visibleQuestions.length - 1;
  const canContinue = !currentQuestion.required || Boolean(selected);

  const handleContinue = () => {
    if (!canContinue) return;
    if (isLastQuestion) {
      onSubmit(answers);
      return;
    }
    setCurrentIndex((index) => index + 1);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 font-sans">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <section className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-[#eef1ea] bg-white shadow-2xl">
        <header className="relative flex items-start justify-between gap-4 overflow-hidden border-b border-[#eef1ea] bg-[#143527] px-5 py-5 text-white sm:px-7">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white border border-white/20">
              <FiHelpCircle className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Help Civique understand this issue</h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-white">
                  <FiZap /> Guided triage
                </span>
              </div>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-white/75">
                Answer a few quick questions to help refine AI insights and municipal routing.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close questions" className="rounded-xl p-1.5 text-white/70 hover:bg-white/10 hover:text-white">
            <FiX className="size-5" />
          </button>
        </header>

        <div className="relative flex-1 overflow-y-auto p-5 sm:p-7 bg-white">
          {imagePreview && (
            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-[#eef1ea] bg-[#fcfdfa] p-3 shadow-xs">
              <img src={imagePreview} alt="Uploaded civic evidence" className="size-16 rounded-xl object-cover border border-[#eef1ea]" />
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#143527]">
                  <FiImage /> Evidence reviewed
                </div>
                <p className="mt-1 text-xs font-semibold text-[#1c221f]">
                  Select the option that best matches the on-site situation.
                </p>
              </div>
            </div>
          )}

          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#143527]">
                Question {currentIndex + 1} <span className="text-[#707c75]">of {visibleQuestions.length}</span>
              </p>
              <div className="mt-2 flex gap-1.5">
                {visibleQuestions.map((question, index) => (
                  <span
                    key={question.id}
                    className={`h-1.5 rounded-full transition-all ${
                      index === currentIndex ? 'w-10 bg-[#143527]' : answers[question.id] ? 'w-5 bg-[#143527]/60' : 'w-5 bg-[#eef1ea]'
                    }`}
                  />
                ))}
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-[#707c75] shadow-xs border border-[#eef1ea]">
              <FiChevronRight className="text-[#143527]" /> Guided triage
            </span>
          </div>

          <fieldset key={currentQuestion.id} className="relative overflow-hidden rounded-[1.5rem] border border-[#eef1ea] bg-white p-5 shadow-sm sm:p-7">
            <legend className="sr-only">Question {currentIndex + 1}</legend>
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#143527] text-sm font-black text-white">
                {currentIndex + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold leading-relaxed text-[#143527] sm:text-lg">
                  {currentQuestion.prompt}
                  {currentQuestion.required && <span className="ml-1 text-rose-600">*</span>}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-[#707c75]">{currentQuestion.reason}</p>
              </div>
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {currentQuestion.options?.map((option, optionIndex) => {
                const active = selected === option;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setAnswers((current) => ({ ...current, [currentQuestion.id]: option }))}
                    className={`group min-h-24 rounded-2xl border p-3.5 text-left transition-all ${
                      active
                        ? 'border-[#143527] bg-[#143527]/5 text-[#143527] ring-2 ring-[#143527]/20 shadow-xs'
                        : 'border-[#eef1ea] bg-white text-[#1c221f] hover:border-[#143527]/30 hover:bg-[#143527]/5 hover:shadow-xs'
                    }`}
                  >
                    <span className="flex items-start gap-2.5">
                      <span
                        className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-black ${
                          active
                            ? 'border-[#143527] bg-[#143527] text-white'
                            : 'border-slate-300 text-slate-400 group-hover:border-[#143527]'
                        }`}
                      >
                        {active ? <FiCheck className="size-3" /> : String.fromCharCode(65 + optionIndex)}
                      </span>
                      <span className="text-xs font-semibold leading-relaxed">{option}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        <footer className="relative flex flex-col gap-3 border-t border-[#eef1ea] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <p className="text-[11px] text-[#707c75]">Your answers stay attached to this report draft.</p>
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
              className="gap-1.5 text-xs disabled:opacity-40 border-[#eef1ea]"
            >
              <FiArrowLeft /> Back
            </Button>
            <Button
              type="button"
              disabled={!canContinue}
              onClick={handleContinue}
              className="gap-2 bg-[#143527] hover:bg-[#0e271c] text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 rounded-xl"
            >
              {isLastQuestion ? 'Generate Detailed Insights' : 'Continue'} <FiArrowRight />
            </Button>
          </div>
        </footer>
      </section>
    </div>
  );
}
