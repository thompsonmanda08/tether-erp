import Logo from "@/components/base/logo";
import Image from "next/image";
import Link from "next/link";
import { PropsWithChildren } from "react";

export const dynamic = "force-dynamic";

function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen w-full bg-white flex">
      {/* Left Panel - Auth Forms (white) */}
      <div className="flex flex-col w-full lg:w-[45%] xl:w-[42%] px-6 sm:px-10 lg:px-16 py-8">
        {/* Logo top-left */}
        <Link href="/" className="inline-flex items-center gap-2 w-fit">
          <Logo isFull />
        </Link>

        {/* Centered form content */}
        <div className="flex-1 flex flex-col justify-center items-center">
          <div className="w-full max-w-md">{children}</div>
        </div>

        {/* Footer */}
        <div className="text-center text-slate-400 text-xs">
          &copy; {new Date().getFullYear()} Tether-ERP. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Marketing (blue) */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[58%] bg-primary relative overflow-hidden p-10 xl:p-14">
        {/* Decorative background blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-16 w-[28rem] h-[28rem] bg-white/5 rounded-full blur-3xl" />
        <Image
          src="/images/pattern.svg"
          alt=""
          width={800}
          height={800}
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover opacity-10 pointer-events-none"
        />

        <div className="relative z-10 flex flex-col w-full max-w-2xl">
          <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight">
            Effortlessly manage your team and operations.
          </h2>
          <p className="mt-4 text-white/80 text-base xl:text-lg max-w-lg">
            Log in to access your ERP dashboard and manage your team.
          </p>

          {/* Dashboard mockup */}
          <div className="mt-10 relative">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="relative">
      {/* Main dashboard card */}
      <div className="bg-white rounded-2xl shadow-2xl p-5 w-full">
        {/* Top stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1 bg-primary/10 rounded-xl p-3">
            <p className="text-[10px] text-slate-500 font-medium">
              Total Sales
            </p>
            <p className="text-[9px] text-slate-400">
              Total earnings, from sales
            </p>
            <p className="text-lg font-bold text-slate-900 mt-2">$189,374</p>
            <span className="inline-block mt-1 text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              +12% From last month
            </span>
          </div>
          <div className="col-span-1 bg-slate-50 rounded-xl p-3">
            <p className="text-[10px] text-slate-500 font-medium">
              Chat Performance
            </p>
            <p className="text-lg font-bold text-slate-900 mt-2">00:01:30</p>
            {/* Tiny line chart */}
            <svg viewBox="0 0 100 30" className="w-full h-8 mt-1">
              <polyline
                fill="none"
                stroke="#f07d79"
                strokeWidth="1.5"
                points="0,22 15,18 30,20 45,10 60,14 75,6 100,12"
              />
            </svg>
          </div>
          <div className="col-span-1 bg-slate-50 rounded-xl p-3">
            <p className="text-[10px] text-slate-500 font-medium">
              Sales Overview
            </p>
            <p className="text-[9px] text-slate-400">Weekly</p>
            {/* Tiny bar chart */}
            <div className="flex items-end justify-between h-10 mt-2 gap-1">
              {[40, 65, 45, 80, 55, 70, 90].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-primary rounded-sm"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Second row */}
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="col-span-1 bg-slate-50 rounded-xl p-3">
            <p className="text-[10px] text-slate-500 font-medium">
              Total Profit
            </p>
            <p className="text-lg font-bold text-slate-900 mt-2">$25,684</p>
            <span className="inline-block mt-1 text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              +8% From last month
            </span>
          </div>
          <div className="col-span-2" />
        </div>

        {/* Product transaction table */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-900">
              Product Transaction
            </p>
            <p className="text-[9px] text-slate-400">Latest transactions</p>
          </div>
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-slate-400 text-left">
                <th className="font-normal py-1">Order ID</th>
                <th className="font-normal py-1">Product Name</th>
                <th className="font-normal py-1">Order Date</th>
                <th className="font-normal py-1">Total Price</th>
                <th className="font-normal py-1">Status</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {[
                {
                  id: "#SLR001",
                  name: "Apple iPad Gen 11",
                  date: "13 Feb, 2025",
                  price: "$449",
                  status: "Pending",
                  tone: "amber",
                },
                {
                  id: "#SLR002",
                  name: "Apple iPhone 15",
                  date: "13 Feb, 2025",
                  price: "$999",
                  status: "Paid",
                  tone: "emerald",
                },
                {
                  id: "#SLR003",
                  name: "Apple MacBook Air M2",
                  date: "13 Feb, 2025",
                  price: "$1,299",
                  status: "Paid",
                  tone: "emerald",
                },
                {
                  id: "#SLR004",
                  name: "Apple iMac",
                  date: "13 Feb, 2025",
                  price: "$1,599",
                  status: "Paid",
                  tone: "emerald",
                },
              ].map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="py-1.5">{r.id}</td>
                  <td className="py-1.5">{r.name}</td>
                  <td className="py-1.5">{r.date}</td>
                  <td className="py-1.5">{r.price}</td>
                  <td className="py-1.5">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] ${
                        r.tone === "emerald"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Sales Categories card */}
      <div className="absolute -right-4 top-20 w-44 bg-white rounded-2xl shadow-2xl p-3 hidden xl:block">
        <p className="text-[10px] font-semibold text-slate-900">
          Sales Categories
        </p>
        <p className="text-[9px] text-slate-400">
          Your sales product categories
        </p>
        {/* Donut */}
        <div className="relative mt-3 mx-auto w-24 h-24">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="3.5"
            />
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              stroke="#f07d79"
              strokeWidth="3.5"
              strokeDasharray="70 100"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[9px] text-slate-400">Total Sales</span>
            <span className="text-sm font-bold text-slate-900">6,248</span>
            <span className="text-[9px] text-slate-400">Units</span>
          </div>
        </div>
        <ul className="mt-2 space-y-1 text-[9px]">
          <li className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-slate-600">Smartphones</span>
          </li>
          <li className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
            <span className="text-slate-600">Laptops & PC</span>
          </li>
          <li className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            <span className="text-slate-600">Accessories</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default AuthLayout;
