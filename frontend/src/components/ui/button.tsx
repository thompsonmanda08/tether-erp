"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { cn } from "@/lib/utils";
import { ButtonProps, Button as NextUIButton } from "@heroui/react";

// Map common shadcn/ui variants to HeroUI variants
const variantMap: Record<string, ButtonProps["variant"]> = {
  default: "solid",
  outline: "bordered",
  destructive: "solid",
  ghost: "light",
  link: "light",
  secondary: "flat",
};

const colorMap: Record<string, ButtonProps["color"]> = {
  destructive: "danger",
  default: "primary",
  outline: "default",
  ghost: "default",
  link: "primary",
  secondary: "default",
};

function resolveButtonSize(s: unknown): ButtonProps["size"] {
  if (s === "icon" || s === "default" || s == null) return "md";
  return s as ButtonProps["size"];
}

export function Button({
  children,
  loadingText,
  className,
  onClick,
  variant: customVariant,
  isIconOnly,
  ...props
}: Omit<ButtonProps, "variant" | "size"> & {
  loadingText?: string;
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  variant?:
    | ButtonProps["variant"]
    | "default"
    | "outline"
    | "destructive"
    | "link"
    | "secondary";
  size?: ButtonProps["size"] | "icon" | "default";
  isIconOnly?: boolean;
  /** Radix-compat: when true, render children as the trigger (no-op under HeroUI). */
  asChild?: boolean;
}) {
  // Map variant if it's a custom one
  const mappedVariant =
    customVariant &&
    typeof customVariant === "string" &&
    customVariant in variantMap
      ? variantMap[customVariant]
      : (customVariant as ButtonProps["variant"]) || "solid";

  const mappedColor =
    customVariant &&
    typeof customVariant === "string" &&
    customVariant in colorMap
      ? colorMap[customVariant]
      : props.color || "primary";

  return (
    <NextUIButton
      className={cn(
        "min-w-max font-semibold ",
        {
          "text-foreground":
            mappedVariant !== "solid" && mappedColor !== "primary",
        },
        className,
      )}
      radius="sm"
      onPress={props?.onPress || (onClick ? () => onClick(undefined as never) : undefined)}
      size={resolveButtonSize((props as any)?.size) as any}
      variant={mappedVariant}
      color={mappedColor}
      isIconOnly={isIconOnly}
      spinner={
        <svg
          className="h-5 w-5 animate-spin text-current"
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            fill="currentColor"
          />
        </svg>
      }
      {...props}
    >
      {props.isLoading ? loadingText || "" : children}
    </NextUIButton>
  );
}
