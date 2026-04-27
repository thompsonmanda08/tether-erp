"use client";
import { cn } from "@/lib/utils";
import { Input as HeroInput, InputProps } from "@heroui/react";
import React from "react";

export default function Input({
  color = "primary",
  variant = "bordered",
  ...props
}: InputProps & {
  descriptionText?: string;
}) {
  const validateEmail = (value: string) =>
    value?.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+.[A-Z]{2,4}$/i);

  const isInvalidEmail = React.useMemo(() => {
    if (props?.type != "email" || props?.value === "") return false;
    return validateEmail(String(props?.value)) ? false : true;
  }, [props?.value, props?.type]);

  return (
    <HeroInput
      variant={variant}
      isInvalid={props?.isInvalid || Boolean(props?.onError) || isInvalidEmail}
      color={color}
      radius="md"
      size={props?.size || "lg"}
      className={cn("w-full", props?.className)}
      classNames={{
        label:
          "text-foreground/60 font-medium group-focus-within:text-primary tracking-wide leading-6",
        inputWrapper: "border-neutral-300 dark:border-neutral-600",
        ...props?.classNames,
      }}
      {...props}
      description={props?.descriptionText}
    />
  );
}

export { Input };
