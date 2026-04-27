"use client";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { Skeleton } from "../ui/skeleton";

type LogoProps = {
  href?: string;
  src?: string;
  alt?: string;
  name?: string;
  width?: number;
  height?: number;
  className?: string;
  isIcon?: boolean;
  isWhite?: boolean;
  isDark?: boolean;
  isFull?: boolean;
  classNames?: {
    link?: string;
    container?: string;
    image?: string;
  };
};

function Logo({
  href = "/",
  src,
  alt,
  isWhite = false,
  isDark = false,
  isFull = true,
  className = "",
  classNames,
  isIcon = false,
}: LogoProps) {
  const { theme } = useTheme();
  const [logoUrl, setLogoUrl] = useState("/images/logo/logo-full.svg");

  useEffect(() => {
    let logoType: string;

    if (isIcon) {
      logoType = `/images/logo/logo-icon.svg`;
    } else if (isFull) {
      logoType = "/images/logo/logo-full.svg";
    } else {
      logoType = `/images/logo/logo.svg`;
    }

    setLogoUrl(logoType);
  }, [theme, isIcon, isWhite, isDark, isFull]);

  // LOADING STATE
  if (!logoUrl) {
    return <Skeleton className="flex-1 h-9" />;
  }

  // RENDERER
  if (isIcon) {
    return (
      <Link href={href} className={classNames?.link}>
        <div
          className={cn(
            `aspect-square flex justify-center w-full max-h-12 items-center min-w-fit`,
            className,
            {
              "max-w-12 mx-auto max-h-12 min-h-12 ": isIcon,
            },
            classNames?.container,
          )}
        >
          <Image
            alt={alt || "logo"}
            className={cn("object-contain", classNames?.image)}
            height={50}
            src={logoUrl}
            width={50}
          />
        </div>
      </Link>
    );
  } else {
    return (
      <Link href={href} className={classNames?.link}>
        <div
          className={cn(
            `w-full min-w-fit items-center`,
            className,
            classNames?.container,
          )}
        >
          <Image
            alt={alt || "logo"}
            className={cn(
              "object-contain transition-all my-auto min-h-8 duration-300 ease-in-out",
              classNames?.image,
            )}
            height={60}
            src={src || logoUrl}
            width={160}
          />
        </div>
      </Link>
    );
  }
}

export default Logo;
