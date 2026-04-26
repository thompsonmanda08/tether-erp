"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Card, CardBody, CardHeader } from "@heroui/react";
import { Eye, EyeOff, Loader2, Shield } from "lucide-react";
import { loginAdmin } from "@/app/_actions/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/admin/dashboard";

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await loginAdmin(formData);

      if (result.success) {
        router.push(redirectUrl);
      } else {
        setError(result.message || "Login failed. Please try again.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(""); // Clear error when user starts typing
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-purple-400/20 blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-2xl">
        <CardHeader className="flex flex-col items-center gap-4 pb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Tether-ERP
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Procurement Management Portal
            </p>
          </div>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-800 dark:text-red-200">
                  {error}
                </p>
              </div>
            )}

            <Input
              label="Email Address"
              id="email"
              name="email"
              type="email"
              placeholder="admin@example.com"
              value={formData.email}
              onChange={handleInputChange}
              required
              disabled={isLoading}
              autoComplete="email"
              variant="bordered"
              size="lg"
              classNames={{
                input: "text-base",
                label: "text-sm font-medium",
              }}
            />

            <Input
              label="Password"
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleInputChange}
              required
              disabled={isLoading}
              autoComplete="current-password"
              variant="bordered"
              size="lg"
              classNames={{
                input: "text-base",
                label: "text-sm font-medium",
              }}
              endContent={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              }
            />

            <Button
              type="submit"
              color="primary"
              size="lg"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 font-semibold text-white shadow-lg"
              disabled={!formData.email || !formData.password || isLoading}
              isLoading={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push("/forgot-password")}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              Forgot your password?
            </button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
