"use client";

import Link from "next/link";

export default function SignupDisabled() {
  return (
    <div className="w-full max-w-md text-center">
      <div className="text-6xl mb-8">🔒</div>
      <h1 className="text-4xl font-light text-black mb-4">
        Signups <span className="font-bold">Temporarily Closed</span>
      </h1>
      <p className="text-gray-600 leading-relaxed mb-8">
        We're currently at capacity and not accepting new creators. Join our
        wait-list to be notified when we open up again.
      </p>
      <Link
        href="/"
        className="inline-block bg-black text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-900 transition-colors"
      >
        Join Wait-list
      </Link>
    </div>
  );
}
