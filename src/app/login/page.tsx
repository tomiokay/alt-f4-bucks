"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { login, signup } from "@/app/actions/auth";
import { cn } from "@/lib/utils";
import { HowItWorksButton } from "@/components/how-it-works";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";

function PasswordInput({ name, placeholder }: { name: string; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        name={name}
        type={show ? "text" : "password"}
        required
        minLength={6}
        placeholder={placeholder}
        className="w-full h-10 rounded-lg bg-[#0d1117] border border-[#30363d] px-3 pr-10 text-[14px] text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#388bfd] focus:outline-none"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#484f58] hover:text-[#7d8590] transition-colors"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function LoginPage() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"login" | "signup">("login");

  async function handleLogin(formData: FormData) {
    setError(null);
    setLoading(true);
    formData.set("redirect", redirectTo);
    const result = await login(formData);
    setLoading(false);
    if (result?.error) setError(result.error);
  }

  async function handleSignup(formData: FormData) {
    setError(null);
    setLoading(true);

    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setLoading(false);
      setError("Passwords don't match");
      return;
    }

    const result = await signup(formData);
    setLoading(false);
    if (result?.error) setError(result.error);
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Image src="/logo.avif" alt="Alt-F4 Bucks" width={48} height={48} className="mx-auto mb-3 rounded-lg" />
          <h1 className="text-[18px] font-semibold text-[#e6edf3]">
            Alt-F4 Bucks
          </h1>
          <p className="text-[13px] text-[#7d8590] mt-1">
            FRC prediction market
          </p>
          <div className="mt-2">
            <HowItWorksButton />
          </div>
        </div>

        <div className="rounded-xl bg-[#161b22] overflow-hidden">
          <div className="flex border-b border-[#21262d]">
            <button
              onClick={() => { setTab("login"); setError(null); }}
              className={cn(
                "flex-1 py-3 text-[13px] font-medium transition-colors border-b-2",
                tab === "login"
                  ? "text-[#e6edf3] border-[#e6edf3]"
                  : "text-[#7d8590] border-transparent"
              )}
            >
              Log In
            </button>
            <button
              onClick={() => { setTab("signup"); setError(null); }}
              className={cn(
                "flex-1 py-3 text-[13px] font-medium transition-colors border-b-2",
                tab === "signup"
                  ? "text-[#e6edf3] border-[#e6edf3]"
                  : "text-[#7d8590] border-transparent"
              )}
            >
              Sign Up
            </button>
          </div>

          <div className="p-5">
            {tab === "login" ? (
              <form action={handleLogin} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[12px] text-[#7d8590]">Email</label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="w-full h-10 rounded-lg bg-[#0d1117] border border-[#30363d] px-3 text-[14px] text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#388bfd] focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] text-[#7d8590]">Password</label>
                  <PasswordInput name="password" />
                </div>
                {error && <p className="text-[12px] text-[#ef4444]">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 rounded-lg bg-[#22c55e] text-white text-[14px] font-semibold hover:bg-[#16a34a] disabled:opacity-50 transition-colors"
                >
                  {loading ? "Signing in..." : "Log In"}
                </button>
              </form>
            ) : (
              <form action={handleSignup} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[12px] text-[#7d8590]">Display name</label>
                  <input
                    name="displayName"
                    required
                    placeholder="Your name"
                    className="w-full h-10 rounded-lg bg-[#0d1117] border border-[#30363d] px-3 text-[14px] text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#388bfd] focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] text-[#7d8590]">Email</label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="w-full h-10 rounded-lg bg-[#0d1117] border border-[#30363d] px-3 text-[14px] text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#388bfd] focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] text-[#7d8590]">Password</label>
                  <PasswordInput name="password" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] text-[#7d8590]">Confirm password</label>
                  <PasswordInput name="confirmPassword" />
                </div>
                {error && <p className="text-[12px] text-[#ef4444]">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 rounded-lg bg-[#22c55e] text-white text-[14px] font-semibold hover:bg-[#16a34a] disabled:opacity-50 transition-colors"
                >
                  {loading ? "Creating account..." : "Sign Up"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
