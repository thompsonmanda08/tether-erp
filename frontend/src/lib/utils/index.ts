import { Metadata } from "next";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast } from "sonner";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const notify = ({
  title,
  description,
  action,
  type = "default",
}: {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  type?: "default" | "success" | "warning" | "error";
}) => {
  const options = {
    description,
    action,
  };

  switch (type) {
    case "success":
      return toast.success(title ?? "", options);
    case "warning":
      return toast.warning(title ?? "", options);
    case "error":
      return toast.error(title ?? "", options);
    default:
      return toast(title ?? "", options);
  }
};

export function generateAvatarFallback(string: string) {
  const names = string.split(" ").filter((name: string) => name);
  const mapped = names.map((name: string) => name.charAt(0).toUpperCase());

  return mapped.join("");
}

export function getAvatarSrc(name: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name,
  )}&background=008ffb&color=ffffff&size=128`;
}

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function generateMeta({
  title,
  description,
  canonical,
}: {
  title: string;
  description: string;
  canonical: string;
}): Metadata {
  return {
    title: `${title} - INFRATEL IAMS`,
    description: description,
    metadataBase: new URL(`https://infratel.co.zm/`),
    alternates: {
      canonical: `/dashboard${canonical}`,
    },
    openGraph: {
      images: [`https://infratel.co.zm/wp-content/uploads/2024/04/logo.png`],
    },
  };
}

// a function to get the first letter of the first and last name of names
export const getInitials = (fullName: string) => {
  const nameParts = fullName.split(" ");
  const firstNameInitial = nameParts[0].charAt(0).toUpperCase();
  const lastNameInitial = nameParts[1].charAt(0).toUpperCase();
  return `${firstNameInitial}${lastNameInitial}`;
};

export function generateRandomString(length = 10) {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "!@#$%^&*()";
  const allCharacters = uppercase + lowercase + numbers + special;

  if (length < 4) {
    throw new Error(
      "Length must be at least 4 to include all required character types",
    );
  }

  // Ensure at least one of each required type
  let randomString = "";
  randomString += uppercase[Math.floor(Math.random() * uppercase.length)];
  randomString += lowercase[Math.floor(Math.random() * lowercase.length)];
  randomString += numbers[Math.floor(Math.random() * numbers.length)];
  randomString += special[Math.floor(Math.random() * special.length)];

  // Fill the rest with random characters
  for (let i = 4; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * allCharacters.length);
    randomString += allCharacters[randomIndex];
  }

  // Shuffle the string to avoid predictable pattern
  return randomString
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

/**
 * Format a number as currency with the specified currency code
 *
 * @param amount - The amount to format
 * @param currency - The currency code (e.g., "USD", "ZMW", "EUR")
 * @param locale - The locale to use for formatting (defaults to "en-ZM")
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1234.56, "USD") // "USD 1,234.56"
 * formatCurrency(1234.56, "ZMW") // "ZMW 1,234.56"
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency: string = "USD",
  locale: string = "en-ZM",
): string {
  if (amount === null || amount === undefined) {
    return `${currency} 0.00`;
  }

  const formatted = amount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${currency} ${formatted}`;
}
