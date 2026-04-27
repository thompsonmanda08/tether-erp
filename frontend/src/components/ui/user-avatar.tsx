"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getTransformedImageUrl } from "@/lib/imagekit";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  avatarUrl?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  fallbackClassName?: string;
}

const sizeClasses = {
  xs: "h-6 w-6 text-xs",
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-12 w-12 text-lg",
  xl: "h-16 w-16 text-xl",
};

const imageSizes = {
  xs: 48,
  sm: 64,
  md: 80,
  lg: 96,
  xl: 128,
};

export function UserAvatar({
  name,
  avatarUrl,
  size = "md",
  className,
  fallbackClassName,
}: UserAvatarProps) {
  const getInitials = (userName: string) => {
    return userName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Optimize image URL with ImageKit transformations
  const optimizedUrl = avatarUrl
    ? getTransformedImageUrl(avatarUrl, {
        width: imageSizes[size],
        height: imageSizes[size],
        quality: 80,
        format: "auto",
        crop: "maintain_ratio",
      })
    : undefined;

  return (
    <Avatar className={cn("rounded-full", sizeClasses[size], className)}>
      {optimizedUrl && <AvatarImage src={optimizedUrl} alt={name} />}
      <AvatarFallback
        className={cn(
          "rounded-full bg-primary text-primary-foreground",
          fallbackClassName,
        )}
      >
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
