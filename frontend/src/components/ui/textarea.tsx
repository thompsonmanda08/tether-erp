"use client";

import { Textarea as NextUITextarea } from "@heroui/react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type TextareaProps = Omit<React.ComponentProps<typeof NextUITextarea>, "classNames"> & {
  label?: string;
  name?: string;
  onError?: boolean;
  error?: string;
  errorText?: string;
  descriptionText?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  showLimit?: boolean;
  classNames?: {
    wrapper?: string;
    input?: string;
    label?: string;
    errorText?: string;
    descriptionText?: string;
  };
};

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      name,
      className,
      onError,
      errorText,
      classNames,
      descriptionText,
      isDisabled,
      isInvalid,
      showLimit = false,
      isRequired,
      minRows = 3,
      ...props
    },
    ref
  ) => {
    return (
      <NextUITextarea
        ref={ref}
        label={label}
        name={name}
        id={name}
        isDisabled={isDisabled}
        isInvalid={isInvalid || onError}
        isRequired={isRequired}
        errorMessage={errorText}
        description={descriptionText}
        variant="bordered"
        size="lg"
        minRows={minRows}
        className={cn(className, classNames?.wrapper)}
        classNames={{
          input: cn("resize-y", classNames?.input),
          label: cn(classNames?.label),
          errorMessage: cn(classNames?.errorText),
          description: cn(classNames?.descriptionText),
        }}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };
