"use client";

import { useState } from "react";
import { X } from "lucide-react";

const STEPS = [
  {
    number: 1,
    title: "Pick a Match",
    description:
      "Choose a match and bet on Red or Blue alliance. Odds are based on how much money is on each side — the less popular pick pays more.",
    visual: (
      <div className="bg-white rounded-xl p-4 w-[220px] mx-auto shadow-lg">
        <p className="text-black text-[13px] font-semibold text-center mb-3">
          Who wins Qual 12?
        </p>
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="h-12 w-12 rounded-full border-4 border-[#22c55e] flex items-center justify-center">
            <span className="text-black text-[14px] font-bold">50%</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex-1 rounded-lg bg-[#22c55e] py-2 text-white text-[13px] font-semibold">
            Red
          </button>
          <button className="flex-1 rounded-lg bg-[#ef4444] py-2 text-white text-[13px] font-semibold">
            Blue
          </button>
        </div>
      </div>
    ),
    buttonText: "Next",
    buttonColor: "bg-[#22c55e] hover:bg-[#16a34a]",
  },
  {
    number: 2,
    title: "Place a Bet",
    description:
      "Pick your amount and place your bet. If you win, you split the entire pot with other winners. The earlier you bet, the better your odds.",
    visual: (
      <div className="flex justify-center gap-[-20px]">
        <div className="bg-white rounded-xl p-4 w-[180px] shadow-lg -rotate-6 z-10">
          <p className="text-black text-[24px] font-bold text-center">$100</p>
          <p className="text-[#484f58] text-[12px] text-center">
            To Win <span className="text-[#22c55e] font-semibold">$400</span>
          </p>
          <button className="w-full mt-2 rounded-lg bg-[#22c55e] py-1.5 text-white text-[12px] font-semibold">
            Buy Red
          </button>
        </div>
        <div className="bg-white rounded-xl p-4 w-[180px] shadow-lg rotate-6 -ml-6">
          <p className="text-black text-[24px] font-bold text-center">$100</p>
          <p className="text-[#484f58] text-[12px] text-center">
            To Win <span className="text-[#22c55e] font-semibold">$133</span>
          </p>
          <button className="w-full mt-2 rounded-lg bg-[#ef4444] py-1.5 text-white text-[12px] font-semibold">
            Buy Blue
          </button>
        </div>
      </div>
    ),
    buttonText: "Next",
    buttonColor: "bg-[#388bfd] hover:bg-[#2563eb]",
  },
  {
    number: 3,
    title: "Collect Winnings",
    description:
      "When the match ends, winners automatically get paid out. Check your portfolio to see your profit. Start with 1,000 AF4 — no real money involved.",
    visual: (
      <div className="bg-white rounded-xl p-4 w-[220px] mx-auto shadow-lg">
        <p className="text-black text-[13px] font-semibold text-center mb-1">
          Who wins Qual 12?
        </p>
        <div className="flex items-center justify-center my-2">
          <svg width="40" height="30" viewBox="0 0 40 30" className="text-[#22c55e]">
            <polyline
              points="0,25 10,20 20,15 30,8 40,5"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="space-y-1 text-[12px] mb-3">
          <div className="flex justify-between">
            <span className="text-[#484f58]">Odds</span>
            <span className="text-black font-medium">Red 75%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#484f58]">Amount</span>
            <span className="text-black font-medium">$100</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#484f58]">To Win</span>
            <span className="text-[#22c55e] font-bold text-[16px]">$250</span>
          </div>
        </div>
        <button className="w-full rounded-lg bg-[#388bfd] py-1.5 text-white text-[12px] font-semibold">
          Cash Out
        </button>
      </div>
    ),
    buttonText: "Get Started",
    buttonColor: "bg-[#388bfd] hover:bg-[#2563eb]",
  },
];

type Props = {
  onClose: () => void;
};

export function HowItWorksModal({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-[calc(100vw-2rem)] sm:w-[380px] max-w-[380px] rounded-2xl bg-[#161b22] border border-[#30363d] overflow-hidden shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 h-7 w-7 rounded-full bg-[#21262d] flex items-center justify-center text-[#7d8590] hover:text-[#e6edf3] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Visual */}
        <div className="pt-8 pb-4 px-6">
          {current.visual}
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          <h3 className="text-[18px] font-semibold text-[#e6edf3] mb-2">
            {current.number}. {current.title}
          </h3>
          <p className="text-[13px] text-[#7d8590] leading-relaxed mb-5">
            {current.description}
          </p>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mb-4">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-[#e6edf3]" : "w-1.5 bg-[#30363d]"
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className={`w-full rounded-xl py-3 text-[14px] font-semibold text-white transition-colors ${current.buttonColor}`}
          >
            {current.buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}

export function HowItWorksButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setOpen(true)}
          className="text-[12px] text-[#388bfd] hover:text-[#58a6ff] transition-colors font-medium"
        >
          Quick intro
        </button>
        <a
          href="/how-it-works"
          className="text-[12px] text-[#7d8590] hover:text-[#e6edf3] transition-colors font-medium"
        >
          Full guide →
        </a>
      </div>
      {open && <HowItWorksModal onClose={() => setOpen(false)} />}
    </>
  );
}
