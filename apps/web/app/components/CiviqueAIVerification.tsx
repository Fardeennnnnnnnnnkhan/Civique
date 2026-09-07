import React from 'react';
import { FiCheck, FiAlertTriangle, FiXCircle } from 'react-icons/fi';

export type AIVerificationStatus = 'idle' | 'analyzing' | 'verified' | 'warning' | 'review_required' | 'failed';

export interface CiviqueAIVerificationProps {
  status: AIVerificationStatus;
  category: string;
  confidence: number | null;
  relevance: string;
  errorMsg?: string;
}

export default function CiviqueAIVerification({
  status,
  category,
  confidence,
  relevance,
  errorMsg = 'Failed to connect to AI engine.'
}: CiviqueAIVerificationProps) {
  
  if (status === 'idle') {
    return (
      <div className="bg-[#faf9f6]/40 border border-dashed border-[#D8CCC0] rounded-2xl p-6 text-center space-y-3 animate-fade-in flex flex-col items-center justify-center min-h-60">
        <div className="w-10 h-10 rounded-full bg-white border border-[#E9E1D8] text-[#9B9088] flex items-center justify-center shadow-2xs">
          ✨
        </div>
        <div>
          <h4 className="text-xs font-bold text-[#5E1801] uppercase tracking-wider">Civique AI Verification</h4>
          <p className="text-[11px] text-[#6F625C] font-light leading-relaxed mt-1 max-w-xs mx-auto">
            Upload an image and we'll help identify the issue and check whether your evidence supports the report.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'analyzing') {
    return (
      <div className="bg-white border border-[#D8CCC0] rounded-2xl p-6 space-y-4 shadow-sm animate-pulse min-h-60 flex flex-col justify-between text-left">
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-[#5E1801] uppercase tracking-wider flex items-center gap-1.5">
            <span className="h-2 w-2 bg-[#5E1801] rounded-full animate-bounce"></span>
            Civique AI Verification
          </h4>
          <p className="text-[10px] text-[#6F625C] font-light">Analyzing your image evidence in real-time...</p>
        </div>
        
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-medium text-[#5E1801]">
            <span className="text-green-600 font-bold">✓</span>
            <span>Image received</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#9B9088]">
            <div className="w-4 h-4 rounded-full border border-dashed border-[#D8CCC0] animate-spin"></div>
            <span>Identifying civic issue</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#9B9088]">
            <span className="font-light">○</span>
            <span>Checking evidence relevance</span>
          </div>
        </div>

        <div className="text-[10px] text-[#9B9088] font-light italic">
          Please wait, this usually takes under 2 seconds.
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="bg-white border border-[#D8CCC0] rounded-2xl p-6 space-y-4 shadow-sm animate-fade-in min-h-60 flex flex-col justify-between text-left">
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-[#5E1801] uppercase tracking-wider flex items-center gap-1.5 text-red-600">
            <FiXCircle />
            Civique AI Offline
          </h4>
          <p className="text-[10px] text-red-700 font-semibold bg-red-50 border border-red-200 px-2 py-0.5 rounded-sm inline-block">
            ⚠ Verification Skipped
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 p-3.5 rounded-xl text-[11px] text-red-800 font-medium space-y-1">
          <p className="font-bold">Heuristic Fallback Enabled</p>
          <p className="font-normal leading-relaxed text-red-700">{errorMsg}</p>
        </div>

        <div className="text-[10px] text-[#6F625C] font-light leading-relaxed">
          Civique AI is temporarily offline. Your report will be filed in <strong>PENDING</strong> status and classified asynchronously once online.
        </div>
      </div>
    );
  }

  if (status === 'review_required') {
    return (
      <div className="bg-white border border-[#D8CCC0] rounded-2xl p-6 space-y-4 shadow-sm animate-fade-in min-h-60 flex flex-col justify-between text-left">
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-[#5E1801] uppercase tracking-wider flex items-center gap-1.5 text-blue-600">
            <FiAlertTriangle />
            Manual Review Scheduled
          </h4>
          <p className="text-[10px] text-blue-700 font-semibold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-sm inline-block">
            ○ Inconclusive Evidence
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl text-[11px] text-blue-800 font-medium space-y-1">
          <p className="font-bold">Pending Inspector Check</p>
          <p className="font-normal leading-relaxed text-blue-700">
            The evidence quality or category alignment was partially matches. A municipal officer will verify details manually.
          </p>
        </div>

        <div className="text-[10px] text-[#6F625C] font-light">
          You may continue submission. This does not block your case filing.
        </div>
      </div>
    );
  }

  const isWarning = status === 'warning';
  
  return (
    <div className="bg-white border border-[#D8CCC0] rounded-2xl p-6 space-y-4.5 shadow-sm animate-fade-in min-h-60 flex flex-col justify-between text-left">
      <div className="space-y-1">
        <h4 className="text-xs font-bold text-[#5E1801] uppercase tracking-wider flex items-center gap-1">
          ✨ Civique AI Verification
        </h4>
        <p className={`text-[10px] font-semibold border px-2 py-0.5 rounded-sm inline-block ${
          isWarning 
            ? 'text-amber-700 bg-amber-50 border-amber-200' 
            : 'text-green-700 bg-green-50 border-green-200'
        }`}>
          {isWarning ? '⚠ Review Suggested' : '✓ Image Analyzed'}
        </p>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-medium text-[#2B2523]">
          <span className={isWarning ? 'text-amber-600' : 'text-green-600'}>
            {isWarning ? '⚠' : '✓'}
          </span>
          <span>Issue detected: <strong className="text-[#5E1801]">{category}</strong></span>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-[#2B2523]">
          <span className={isWarning ? 'text-amber-600' : 'text-green-600'}>
            {isWarning ? '⚠' : '✓'}
          </span>
          <span>AI Confidence: <strong className={isWarning ? 'text-amber-700' : 'text-green-700'}>
            {confidence ? `${confidence}%` : 'High'}
          </strong></span>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-[#2B2523]">
          <span className={isWarning ? 'text-amber-600' : 'text-green-600'}>
            {isWarning ? '⚠' : '✓'}
          </span>
          <span>Evidence Relevance: <strong className={isWarning ? 'text-amber-700' : 'text-green-700'}>
            {relevance}
          </strong></span>
        </div>
      </div>

      {isWarning ? (
        <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-[11px] text-amber-800 font-medium space-y-1">
          <p className="font-bold flex items-center gap-1">⚠ Discrepancy Detected</p>
          <p className="font-normal leading-relaxed text-amber-700">
            The uploaded image does not fully match standard categories. If incorrect, please select a custom tag.
          </p>
        </div>
      ) : (
        <div className="text-[10px] text-green-700 font-semibold leading-relaxed bg-green-50/50 border border-green-100 p-2.5 rounded-xl">
          ✨ Evidence supports this category. You may proceed to submit your report.
        </div>
      )}
    </div>
  );
}
