"use client";

import { Input as NextUIInput } from "@heroui/react";
import * as React from "react";
import { cn } from "@/lib/utils";

type InputProps = Omit<React.ComponentProps<typeof NextUIInput>, 'classNames'> & {
  onError?: boolean;
  error?: string;
  errorText?: string;
  descriptionText?: string;
  classNames?: {
    wrapper?: string;
    input?: string;
    label?: string;
    errorText?: string;
    descriptionText?: string;
  };
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      startContent,
      endContent,
      className,
      type,
      label,
      name,
      classNames,
      onError,
      error,
      maxLength,
      max,
      isInvalid,
      min,
      isDisabled,
      descriptionText,
      errorText = "",
      isRequired,
      ...props
    },
    ref
  ) => {
    return (
      <NextUIInput
        ref={ref}
        type={type}
        label={label}
        name={name}
        isDisabled={isDisabled}
        isInvalid={isInvalid || onError}
        isRequired={isRequired}
        errorMessage={errorText}
        description={descriptionText}
        startContent={startContent}
        endContent={endContent}
        variant="bordered"
        size="lg"
        maxLength={maxLength}
        className={cn(className, classNames?.wrapper)}
        classNames={{
          input: cn(classNames?.input),
          label: cn(classNames?.label),
          errorMessage: cn(classNames?.errorText),
          description: cn(classNames?.descriptionText),
        }}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };
