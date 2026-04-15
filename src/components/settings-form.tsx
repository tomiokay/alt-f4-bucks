"use client";

import { useState, useRef } from "react";
import { updateProfile, changePassword } from "@/app/actions/settings";
import type { Profile } from "@/lib/types";

type Props = {
  profile: Profile;
};

export function SettingsForm({ profile }: Props) {
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const profileRef = useRef(false);
  const pwRef = useRef(false);

  async function handleProfile(formData: FormData) {
    if (profileRef.current) return;
    profileRef.current = true;
    setProfileError(null);
    setProfileSuccess(false);
    setProfileLoading(true);

    const result = await updateProfile(formData);
    setProfileLoading(false);
    profileRef.current = false;

    if (result.error) {
      setProfileError(result.error);
    } else {
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    }
  }

  async function handlePassword(formData: FormData) {
    if (pwRef.current) return;
    pwRef.current = true;
    setPwError(null);
    setPwSuccess(false);
    setPwLoading(true);

    const result = await changePassword(formData);
    setPwLoading(false);
    pwRef.current = false;

    if (result.error) {
      setPwError(result.error);
    } else {
      setPwSuccess(true);
      const form = document.getElementById("pw-form") as HTMLFormElement;
      form?.reset();
      setTimeout(() => setPwSuccess(false), 3000);
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile section */}
      <div className="rounded-xl bg-[#161b22] border border-[#21262d] p-5">
        <h2 className="text-[15px] font-semibold text-[#e6edf3] mb-4">Profile</h2>
        <form action={handleProfile} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-[#7d8590]">Display Name</label>
            <input
              name="displayName"
              defaultValue={profile.display_name}
              required
              maxLength={50}
              className="w-full h-9 rounded-lg bg-[#0d1117] border border-[#21262d] px-3 text-[13px] text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#388bfd] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-[#7d8590]">Team Number</label>
            <input
              name="teamNumber"
              defaultValue={profile.team_number ?? ""}
              maxLength={10}
              placeholder="e.g. 7558"
              className="w-full h-9 rounded-lg bg-[#0d1117] border border-[#21262d] px-3 text-[13px] text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#388bfd] focus:outline-none"
            />
            <p className="text-[11px] text-[#484f58]">Your FRC team number</p>
          </div>

          {profileError && <p className="text-[12px] text-[#ef4444]">{profileError}</p>}
          {profileSuccess && <p className="text-[12px] text-[#22c55e]">Profile updated!</p>}

          <button
            type="submit"
            disabled={profileLoading}
            className="h-9 px-4 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-white text-[13px] font-semibold transition-colors"
          >
            {profileLoading ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>

      {/* Password section */}
      <div className="rounded-xl bg-[#161b22] border border-[#21262d] p-5">
        <h2 className="text-[15px] font-semibold text-[#e6edf3] mb-4">Change Password</h2>
        <form id="pw-form" action={handlePassword} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-[#7d8590]">New Password</label>
            <div className="relative">
              <input
                name="password"
                type={showPw ? "text" : "password"}
                required
                minLength={6}
                placeholder="At least 6 characters"
                className="w-full h-9 rounded-lg bg-[#0d1117] border border-[#21262d] px-3 pr-10 text-[13px] text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#388bfd] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#484f58] hover:text-[#7d8590]"
              >
                {showPw ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-[#7d8590]">Confirm Password</label>
            <input
              name="confirmPassword"
              type={showPw ? "text" : "password"}
              required
              minLength={6}
              placeholder="Confirm new password"
              className="w-full h-9 rounded-lg bg-[#0d1117] border border-[#21262d] px-3 text-[13px] text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#388bfd] focus:outline-none"
            />
          </div>

          {pwError && <p className="text-[12px] text-[#ef4444]">{pwError}</p>}
          {pwSuccess && <p className="text-[12px] text-[#22c55e]">Password changed!</p>}

          <button
            type="submit"
            disabled={pwLoading}
            className="h-9 px-4 rounded-lg bg-[#21262d] hover:bg-[#30363d] disabled:opacity-50 text-[#e6edf3] text-[13px] font-semibold transition-colors"
          >
            {pwLoading ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
