"use client";
import { cn } from "@/lib/utils";
import { Input as HeroInput, InputProps } from "@heroui/react";
import React from "react";

type ExtendedInputProps = Omit<InputProps, "size"> & {
  /** Optional helper description shown under the input. */
  descriptionText?: string;
  /** shadcn-compat: error text alias for HeroUI errorMessage. */
  errorText?: string;
  /** shadcn-compat: disabled alias for HeroUI isDisabled. */
  disabled?: boolean;
  /** shadcn-compat: required alias for HeroUI isRequired. */
  required?: boolean;
  /** Standard HTML id passthrough. */
  id?: string;
  /** HeroUI size + shadcn-compat 'default'. */
  size?: InputProps["size"] | "default";
};

export default function Input({
  color = "primary",
  variant = "bordered",
  errorText,
  disabled,
  required,
  size,
  ...props
}: ExtendedInputProps) {
  const validateEmail = (value: string) =>
    value?.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+.[A-Z]{2,4}$/i);

  const isInvalidEmail = React.useMemo(() => {
    if (props?.type != "email" || props?.value === "") return false;
    return validateEmail(String(props?.value)) ? false : true;
  }, [props?.value, props?.type]);

  const resolvedSize: InputProps["size"] =
    size === "default" ? "lg" : ((size as InputProps["size"]) ?? "lg");

  return (
    <HeroInput
      variant={variant}
      isInvalid={props?.isInvalid || Boolean(props?.onError) || isInvalidEmail}
      isDisabled={props?.isDisabled ?? disabled}
      isRequired={props?.isRequired ?? required}
      errorMessage={props?.errorMessage ?? errorText}
      color={color}
      radius="md"
      size={resolvedSize}
      className={cn("w-full", props?.className)}
      classNames={{
        label:
          "text-foreground/60 font-medium group-focus-within:text-primary tracking-wide leading-6",
        inputWrapper: "border-neutral-300 dark:border-neutral-600",
        ...props?.classNames,
      }}
      {...(props as any)}
      description={props?.descriptionText}
    />
  );
}

export { Input };
