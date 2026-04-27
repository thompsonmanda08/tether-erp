"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { sendResetEmail } from "@/app/_actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/ui/spinner";
import RadioGroup from "@/components/base/radio_group";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [selectedOption, setSelectedOption] = useState({
    name: "email",
    index: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (!username && !email) {
      setMessage("Please provide your username or email.");
      return;
    }

    setIsSubmitting(true);

    const response = await sendResetEmail(email);

    if (response.success) {
      const token = response.data.token;
      // Redirect to reset password page with token
      router.push(`/?password_reset_link_sent=${true}`);
      toast.success("Password reset link sent successfully!");
    } else {
      toast.error(`${response?.data?.message || response?.message}`);
      setMessage(`Error: ${response?.data?.message || response?.message}`);
      setIsSubmitting(false);
    }

    setTimeout(() => {
      setIsSubmitting(false);
    }, 1000 * 60); // Simulate a delay of 1 minute
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-light text-black mb-2">
          Welcome <span className="font-bold">Back</span>
        </h1>
        <p className="text-gray-600">Forgot your Password?</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 w-full ">
        {/* <RadioGroup
          labelText="Email/Username"
          required
          options={["email ", "username"]?.map((item, index) => (
            <div
              key={index}
              className="flex flex-1 gap-2 capitalize text-black"
            >
              <span>{item}</span>
            </div>
          ))}
          value={selectedOption.index}
          onChange={(index) => {
            setSelectedOption({
              name: ["email ", "username"][index],
              index,
            });
          }}
        /> */}
        <Input
          type={selectedOption.name === "username" ? "text" : "email"}
          id={selectedOption.name}
          label={
            selectedOption.name === "username" ? "Username" : "Email Address"
          }
          value={selectedOption.name === "username" ? username : email}
          onChange={(e) =>
            selectedOption.name === "username"
              ? setUsername(e.target.value)
              : setEmail(e.target.value)
          }
          placeholder={`Enter your ${selectedOption.name}`}
          required
          descriptionText={
            selectedOption.name === "username"
              ? "Enter username without @ symbol"
              : "Enter your email address to receive a reset link."
          }
          disabled={isSubmitting}
        />
        <Button
          type="submit"
          disabled={isSubmitting}
          isLoading={isSubmitting}
          className="w-full"
        >
          Submit
        </Button>

        {message && (
          <div
            className={`mt-4 p-4 rounded-lg text-center ${
              message.includes("🎉") || message.includes("successfully")
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message}
          </div>
        )}
      </form>

      <div className="mt-8 text-center">
        <p className="text-gray-600">
          Don't have an account?{" "}
          <Link
            href="/apply"
            className="text-black font-medium hover:underline"
          >
            Apply to join
          </Link>
        </p>
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Oh! I remember my password
        </Link>
      </div>
    </div>
  );
}
