"use client";

import { cn } from "@/lib/utils";

import { motion } from "framer-motion";
import { CircleHelpIcon } from "lucide-react";

export default function EmptyState({
  Icon = CircleHelpIcon,
  title,
  description,
  className,
  classNames,
}: {
  Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
  className?: string;
  classNames?: {
    icon?: string;
    container?: string;
    title?: string;
    description?: string;
  };
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 80 },
        show: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -80 },
      }}
      className={cn(
        `flex w-full flex-col items-center justify-center gap-1 max-w-2xl`,
        className,
        classNames?.container
      )}
    >
      {Icon && <Icon className={cn("w-16 h-16 ", classNames?.icon)} />}
      <h4
        className={cn(
          "text-center text-lg leading-6 text-foreground font-semibold",
          classNames?.title
        )}
      >
        {title}
      </h4>
      <p
        className={cn(
          "mb-2 text-center text-xs sm:text-sm text-gary-400",
          classNames?.description
        )}
      >
        {description}
      </p>
    </motion.div>
  );
}
