"use client";

import Link from "next/link";
import { Button } from "@heroui/react";
import {
  ShoppingCart,
  Package,
  TrendingUp,
  Users,
  FileText,
  BarChart3,
  Shield,
  Zap,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

export default function LandingPage() {
  const features = [
    {
      icon: ShoppingCart,
      title: "Purchase Orders",
      description:
        "Create, track, and manage purchase orders with automated workflows and approval chains.",
    },
    {
      icon: Package,
      title: "Inventory Management",
      description:
        "Real-time inventory tracking, stock alerts, and automated reordering for optimal stock levels.",
    },
    {
      icon: Users,
      title: "Vendor Management",
      description:
        "Centralized vendor database with performance tracking, ratings, and contract management.",
    },
    {
      icon: FileText,
      title: "Requisition System",
      description:
        "Streamlined requisition process with multi-level approvals and budget controls.",
    },
    {
      icon: BarChart3,
      title: "Analytics & Reports",
      description:
        "Comprehensive reporting and analytics for spend analysis, vendor performance, and cost savings.",
    },
    {
      icon: Shield,
      title: "Compliance & Audit",
      description:
        "Built-in compliance tracking, audit trails, and regulatory reporting capabilities.",
    },
  ];

  const benefits = [
    "Reduce procurement costs by up to 30%",
    "Automate 80% of manual procurement tasks",
    "Real-time visibility into spending",
    "Improve vendor relationships",
    "Ensure compliance and reduce risk",
    "Make data-driven decisions",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-purple-400/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Logo/Brand */}
            <div className="mb-8 flex justify-center">
              <div className="flex items-center gap-3 rounded-2xl bg-white/80 px-6 py-3 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700">
                  <ShoppingCart className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Tether-ERP
                  </h1>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Procurement Module
                  </p>
                </div>
              </div>
            </div>

            {/* Hero Headline */}
            <h2 className="mb-6 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
              Transform Your{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Procurement Process
              </span>
            </h2>

            <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-600 dark:text-gray-300 sm:text-xl">
              Streamline purchasing, manage vendors, and gain complete
              visibility into your procurement operations with our comprehensive
              ERP solution.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                as={Link}
                href="/login"
                size="lg"
                color="primary"
                className="min-w-[200px] bg-gradient-to-r from-blue-600 to-blue-700 font-semibold text-white shadow-lg hover:shadow-xl"
                endContent={<ArrowRight className="h-5 w-5" />}
              >
                Get Started
              </Button>
              <Button
                as={Link}
                href="#features"
                size="lg"
                variant="bordered"
                className="min-w-[200px] border-2 border-blue-600 font-semibold text-blue-600 dark:border-blue-400 dark:text-blue-400"
              >
                Learn More
              </Button>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/60 p-6 backdrop-blur-sm dark:bg-gray-800/60">
                <div className="mb-2 text-4xl font-bold text-blue-600">
                  30%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Cost Reduction
                </div>
              </div>
              <div className="rounded-2xl bg-white/60 p-6 backdrop-blur-sm dark:bg-gray-800/60">
                <div className="mb-2 text-4xl font-bold text-blue-600">
                  80%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Process Automation
                </div>
              </div>
              <div className="rounded-2xl bg-white/60 p-6 backdrop-blur-sm dark:bg-gray-800/60">
                <div className="mb-2 text-4xl font-bold text-blue-600">
                  100%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Visibility
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              Powerful Features for Modern Procurement
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
              Everything you need to manage your procurement operations
              efficiently and effectively.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group rounded-2xl bg-white p-8 shadow-lg transition-all hover:shadow-xl dark:bg-gray-800"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white transition-transform group-hover:scale-110">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-700 py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
              Why Choose Tether-ERP?
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-blue-100">
              Join hundreds of organizations that have transformed their
              procurement operations.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-xl bg-white/10 p-6 backdrop-blur-sm"
              >
                <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-green-300" />
                <span className="text-lg">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-purple-600 p-12 shadow-2xl">
            <Zap className="mx-auto mb-6 h-16 w-16 text-white" />
            <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
              Ready to Get Started?
            </h2>
            <p className="mb-8 text-lg text-blue-100">
              Transform your procurement process today with Tether-ERP.
            </p>
            <Button
              as={Link}
              href="/login"
              size="lg"
              className="min-w-[200px] bg-white font-semibold text-blue-600 shadow-lg hover:shadow-xl"
              endContent={<ArrowRight className="h-5 w-5" />}
            >
              Access Portal
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-12 dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-4 flex items-center justify-center gap-2">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                Tether-ERP
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © 2026 Tether-ERP. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
