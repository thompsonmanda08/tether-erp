"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSignupMutation } from "@/hooks/use-auth-mutations";
import { EyeIcon, EyeOffIcon, AlertCircle } from "lucide-react";
import Link from "next/link";
import Logo from "@/components/base/logo";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [position, setPosition] = useState("");
  const [manNumber, setManNumber] = useState("");
  const [nrcNumber, setNrcNumber] = useState("");
  const [contact, setContact] = useState("");
  const [showPassword, setShowPassword] = useState({
    password: false,
    confirmPassword: false,
  });
  const [error, setError] = useState("");
  const { signup, isPending } = useSignupMutation();

  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push("At least 8 characters");
    if (!/[A-Z]/.test(pwd)) errors.push("At least 1 uppercase letter");
    if (!/[a-z]/.test(pwd)) errors.push("At least 1 lowercase letter");
    if (!/[0-9]/.test(pwd)) errors.push("At least 1 digit");
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !name || !password || !confirmPassword) {
      setError("Please fill in all required fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please try again.");
      return;
    }

    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      setError(`Password requirements: ${passwordErrors.join(", ")}`);
      return;
    }

    try {
      const result = await signup({
        email,
        name,
        password,
        role: "admin",
        position,
        manNumber,
        nrcNumber,
        contact,
      });

      if (!result.success) {
        setError(result.message || "Registration failed");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="text-left mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Create your account
        </h1>
        <p className="text-slate-600">
          Set up your Tether-ERP account to get started.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <Input
          id="name"
          type="text"
          label="Full Name"
          placeholder="Bob Mwale"
          className="bg-muted"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
          required
        />

        <Input
          id="email"
          type="email"
          label="Email"
          placeholder="bob.mwale@mail.com"
          className="bg-muted"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isPending}
          required
        />

        <Input
          id="position"
          type="text"
          label="Position"
          placeholder="e.g., Procurement Officer"
          className="bg-muted"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          disabled={isPending}
        />

        <Input
          id="manNumber"
          type="text"
          label="Man Number"
          placeholder="e.g., MAN12345"
          className="bg-muted"
          value={manNumber}
          onChange={(e) => setManNumber(e.target.value)}
          disabled={isPending}
        />

        <Input
          id="nrcNumber"
          type="text"
          label="NRC Number"
          placeholder="e.g., 123456/78/9"
          className="bg-muted"
          value={nrcNumber}
          onChange={(e) => setNrcNumber(e.target.value)}
          disabled={isPending}
        />

        <Input
          id="contact"
          type="tel"
          label="Contact"
          placeholder="e.g., +260 XXX XXX XXX"
          className="bg-muted"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          disabled={isPending}
        />

        <div className="relative">
          <Input
            id="password"
            type={showPassword.password ? "text" : "password"}
            label="Password"
            placeholder="••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isPending}
            required
            autoComplete="new-password"
            className="bg-muted"
            descriptionText="Must have: 8+ characters, 1 uppercase, 1 lowercase, 1 digit"
          />
          {password.length > 0 && (
            <button
              type="button"
              className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
              onClick={() =>
                setShowPassword((prev) => ({
                  ...prev,
                  password: !prev.password,
                }))
              }
              disabled={isPending}
            >
              {showPassword.password ? (
                <EyeOffIcon className="w-5 h-5" />
              ) : (
                <EyeIcon className="w-5 h-5" />
              )}
            </button>
          )}
        </div>

        <div className="relative">
          <Input
            id="confirmPassword"
            type={showPassword.confirmPassword ? "text" : "password"}
            label="Confirm password"
            placeholder="••••••••••"
            className="bg-muted"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isPending}
            required
            autoComplete="new-password"
          />
          {confirmPassword.length > 0 && (
            <button
              type="button"
              className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
              onClick={() =>
                setShowPassword((prev) => ({
                  ...prev,
                  confirmPassword: !prev.confirmPassword,
                }))
              }
              disabled={isPending}
            >
              {showPassword.confirmPassword ? (
                <EyeOffIcon className="w-5 h-5" />
              ) : (
                <EyeIcon className="w-5 h-5" />
              )}
            </button>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mt-2"
          isLoading={isPending}
          loadingText="Creating account..."
        >
          Create account
        </Button>

        <div className="mt-6 text-center">
          <p className="text-slate-600">
            Already have an account?{" "}
            <Link
              href="/login"
              className={`font-medium transition-colors ${
                isPending
                  ? "text-muted-foreground cursor-not-allowed pointer-events-none"
                  : "text-primary hover:text-primary/80"
              }`}
            >
              Log in
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
