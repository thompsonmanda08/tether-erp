import Image from "next/image";
import { Star } from "lucide-react";
import React, { PropsWithChildren, useMemo } from "react";
import { getRandomQuote } from "@/lib/philosophical-quotes";
import Logo from "@/components/base/logo";

function WelcomeLayout({ children }: PropsWithChildren) {
  // Get a random quote that stays consistent during the session
  const philosophicalQuote = useMemo(() => getRandomQuote(), []);

  return (
    <div className="min-h-screen w-screen">
      <div className="h-screen flex flex-row p-4">
        {/* Left Panel - Branding */}
        <div className="bg-primary-700 overflow-clip hidden rounded-[50px] lg:flex lg:w-1/2 text-white p-12 flex-col justify-between relative">
          {/* Abstract Background Shapes */}
          <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-primary-800 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-900 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

          <Image
            src="/images/pattern.svg"
            alt="tether-erp-pattern"
            width={800}
            height={800}
            className="w-full aspect-square object-cover opacity-40! absolute inset-0 h-full"
          />

          <div className="relative z-10">
            {/* Logo Section */}

            <Logo src="/images/logo/logo-full-suite.svg" />
          </div>

          <div className="relative z-10 max-w-lg">
            {/* Category Badge */}
            <div className="mb-6">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white/80 border border-white/20 capitalize">
                {philosophicalQuote.category}
              </span>
            </div>

            {/* Quote */}
            <blockquote className="text-2xl font-medium leading-tight mb-8 font-serif tracking-tight">
              "{philosophicalQuote.quote}"
            </blockquote>

            {/* Author */}
            <div>
              <div className="font-semibold text-lg">
                — {philosophicalQuote.author}
              </div>
              <div className="text-white/70 text-sm mt-1">
                Philosopher & Thinker
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Welcome Content */}
        <div className="w-full lg:w-1/2 p-8 pt-32 overflow-y-auto flex flex-col">
          <div className="flex flex-col justify-center items-center">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default WelcomeLayout;
