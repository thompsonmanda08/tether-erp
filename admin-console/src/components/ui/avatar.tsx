"use client";

import { Avatar as NextUIAvatar } from "@heroui/react";
import * as React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  name?: string;
}

const AvatarContext = React.createContext<{ src?: string; alt?: string; name?: string }>({});

function Avatar({ className, children, src, alt, name, ...props }: AvatarProps) {
  if (children) {
    return (
      <AvatarContext.Provider value={{ src, alt, name }}>
        <div data-slot="avatar" className={cn("relative flex size-8 shrink-0 overflow-hidden rounded-full", className)} {...props}>
          {children}
        </div>
      </AvatarContext.Provider>
    );
  }
  return <NextUIAvatar data-slot="avatar" src={src} alt={alt} name={name} showFallback className={cn(className)} {...(props as any)} />;
}

function AvatarImage({ className, src, alt, ...props }: React.ComponentProps<"img">) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img data-slot="avatar-image" src={src} alt={alt} className={cn("aspect-square size-full object-cover", className)} {...props} />;
}

function AvatarFallback({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="avatar-fallback" className={cn("gradient-primary font-semibold text-white flex size-full items-center justify-center rounded-full", className)} {...props}>
      {children}
    </div>
  );
}

export { Avatar, AvatarImage, AvatarFallback };
