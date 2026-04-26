"use client";

import { Avatar as NextUIAvatar } from "@heroui/react";
import * as React from "react";
import { cn } from "@/lib/utils";

// ── Avatar root ────────────────────────────────────────────────────────────

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  name?: string;
  size?: "sm" | "md" | "lg";
}

// Context to pass src/alt/name down to sub-components
const AvatarContext = React.createContext<{ src?: string; alt?: string; name?: string }>({});

function Avatar({ className, children, src, alt, name, ...props }: AvatarProps) {
  // If children are provided (shadcn pattern), render them inside a wrapper
  if (children) {
    return (
      <AvatarContext.Provider value={{ src, alt, name }}>
        <div
          data-slot="avatar"
          className={cn("relative flex size-8 shrink-0 overflow-hidden rounded-full", className)}
          {...props}
        >
          {children}
        </div>
      </AvatarContext.Provider>
    );
  }

  // Direct NextUI Avatar usage
  return (
    <NextUIAvatar
      data-slot="avatar"
      src={src}
      alt={alt}
      name={name}
      showFallback
      className={cn(className)}
      {...(props as any)}
    />
  );
}

// ── AvatarImage ────────────────────────────────────────────────────────────

function AvatarImage({ className, src, alt, ...props }: React.ComponentProps<"img">) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-slot="avatar-image"
      src={src}
      alt={alt}
      className={cn("aspect-square size-full object-cover", className)}
      {...props}
    />
  );
}

// ── AvatarFallback ─────────────────────────────────────────────────────────

function AvatarFallback({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="avatar-fallback"
      className={cn(
        "gradient-primary font-semibold text-white flex size-full items-center justify-center rounded-full",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { Avatar, AvatarImage, AvatarFallback };
