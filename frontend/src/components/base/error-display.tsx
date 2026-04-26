"use client";
import React, { PropsWithChildren } from "react";

import Link from "next/link";
import { ArrowLeftIcon, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";

function ErrorDisplay({
  status = 404,
  title = "Document Not Found",
  message = "Oops! This store doesn't exist or the URL is incorrect.",
  showBackButton = false,
  children,
}: PropsWithChildren & {
  status?: number;
  title?: string;
  message?: string;
  showBackButton?: boolean;
}) {
  return (
    <div className=" bg-linear-to-br rounded-2xl h-full grid place-content-center-safe lg:h-[77svh] from-gray-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950 place-items-center  relative overflow-hidden">
      <div className="relative z-10 text-center max-w-2xl mx-auto p-8 animate-fade-in">
        {/* Error Icon */}
        <div className="mb-4 flex justify-center">
          <AlertCircle className="w-24 h-24 text-muted-foreground" />
        </div>

        {/* Dramatic Typography */}
        <h1 className="text-7xl md:text-8xl font-light text-foreground mb-6 leading-tight">
          <span className="bg-linear-to-r from-gray-600 font-bold to-black dark:from-gray-400 dark:to-white bg-clip-text text-transparent">
            {status}
          </span>
        </h1>

        <h2 className="text-3xl md:text-4xl font-light text-foreground mb-6 tracking-wide">
          {title}
        </h2>

        <p className="text-xl text-muted-foreground mb-4 leading-relaxed max-w-lg mx-auto">
          {message}
        </p>

        {/* Action Buttons */}
        {children ? (
          children
        ) : (
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {!showBackButton ? (
              <Link
                href="/"
                className="inline-flex items-center gap-3 px-4 py-2 bg-primary text-white rounded-full hover:bg-primary/80 transition-all duration-200 transform hover:scale-105 shadow-xl hover:shadow-2xl font-medium text-lg group"
              >
                <ArrowLeftIcon className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                Go Home
              </Link>
            ) : (
              <Button
                className="inline-flex items-center gap-3 px-4 py-2 bg-primary text-white rounded-full hover:bg-primary/80 transition-all duration-200 transform hover:scale-105 shadow-xl hover:shadow-2xl font-medium text-lg group"
                onClick={() => window.history.back()}
              >
                Go Back
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ErrorDisplay;
