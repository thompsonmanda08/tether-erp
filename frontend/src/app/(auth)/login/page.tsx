import { redirect } from "next/navigation";
import { LoginForm } from "./_components/login-form";
import { verifySession } from "@/lib/auth";

export const metadata = {
  title: "Login - Tether-ERP",
  description: "Sign in to your account",
};

export default async function LoginPage() {
  const { session } = await verifySession();

  if (session && session.user) {
    redirect("/welcome");
  }

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
          Welcome Back
        </h1>
        <p className="mt-2 text-slate-500">
          Enter your email and password to access your account.
        </p>
      </div>

      <LoginForm />
    </div>
  );
}
