"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLoginMutation } from "@/hooks/use-auth-mutations";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { login, isPending } = useLoginMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const result = await login({ email, password });
      if (!result.success) {
        setError(result.message || "Login failed");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <Input
        id="email"
        type="email"
        label="Email"
        labelPlacement="outside"
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={isPending}
        required
      />

      <Input
        id="password"
        type={showPassword ? "text" : "password"}
        label="Password"
        labelPlacement="outside"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={isPending}
        required
        endContent={
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="text-slate-400 hover:text-slate-600 focus:outline-none"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        }
      />

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isPending}
            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
          />
          <span className="text-sm text-slate-600">Remember Me</span>
        </label>
        <Link
          href="/forgot-password"
          className={`text-sm font-medium transition-colors ${
            isPending
              ? "text-muted-foreground cursor-not-allowed pointer-events-none"
              : "text-primary hover:text-primary/80"
          }`}
        >
          Forgot Your Password?
        </Link>
      </div>

      <Button
        type="submit"
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 rounded-lg font-semibold"
        disabled={isPending}
        isLoading={isPending}
        loadingText="Logging in..."
      >
        Log In
      </Button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3 bg-white text-slate-400">Or Login With</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled
          className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>Google</span>
        </button>

        <button
          type="button"
          disabled
          className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.38-1.09-.5-2.08-.52-3.24 0-1.44.62-2.2.44-3.06-.38C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
          <span>Apple</span>
        </button>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-slate-500">
          Don't Have An Account?{" "}
          <Link
            href="/register"
            className={`font-semibold transition-colors ${
              isPending
                ? "text-muted-foreground cursor-not-allowed pointer-events-none"
                : "text-primary hover:text-primary/80"
            }`}
          >
            Register Now.
          </Link>
        </p>
      </div>
    </form>
  );
}
