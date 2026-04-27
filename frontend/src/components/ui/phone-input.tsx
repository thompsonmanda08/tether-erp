"use client";

import { Input } from "@heroui/react";
import * as React from "react";
import { cn } from "@/lib/utils";

type PhoneInputProps = Omit<React.ComponentProps<typeof Input>, "classNames"> & {
  id?: string;
  label?: string;
  name?: string;
  placeholder?: string;
  onError?: boolean;
  error?: string;
  errorText?: string;
  descriptionText?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  onValueChange?: (value: string, meta?: any) => void;
  classNames?: {
    wrapper?: string;
    input?: string;
    label?: string;
    errorText?: string;
    descriptionText?: string;
  };
};

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      id,
      label,
      name,
      placeholder,
      className,
      classNames,
      onError,
      error,
      isInvalid,
      isDisabled,
      descriptionText,
      onValueChange,
      errorText = "",
      isRequired,
      ...props
    },
    ref
  ) => {
    return (
      <Input
        ref={ref}
        id={id}
        label={label}
        name={name}
        placeholder={placeholder}
        type="tel"
        isDisabled={isDisabled}
        isInvalid={isInvalid || onError}
        isRequired={isRequired}
        errorMessage={errorText}
        description={descriptionText}
        variant="bordered"
        size="lg"
        onValueChange={onValueChange}
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

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
