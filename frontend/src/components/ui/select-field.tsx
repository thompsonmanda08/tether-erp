"use client";

import {
  Select as RawNextUISelect,
  SelectItem as RawSelectItem,
} from "@heroui/react";

// Cast at boundary — HeroUI's CollectionChildren typing fights with arbitrary children.
const NextUISelect = RawNextUISelect as any;
const SelectItem = RawSelectItem as any;
import { cn } from "@/lib/utils";
import * as React from "react";
import { Spinner } from "@heroui/react";

type SelectInputProps = {
  label?: string;
  onError?: boolean;
  error?: string;
  errorText?: string;
  descriptionText?: string;
  isDisabled?: boolean;
  /** shadcn-compat alias for isDisabled. */
  disabled?: boolean;
  isInvalid?: boolean;
  isLoading?: boolean;
  isRequired?: boolean;
  /** shadcn-compat alias for isRequired. */
  required?: boolean;
  value?: string;
  defaultValue?: string;
  className?: string;
  placeholder?: string;
  listItemName?: string;
  name?: string;
  options: {
    id?: string;
    name?: string;
    value: string;
    label?: string;
    title?: string;
    [x: string]: any;
  }[];
  onValueChange?: (value: string) => void;
  classNames?: {
    wrapper?: string;
    input?: string;
    label?: string;
    errorText?: string;
    descriptionText?: string;
    options?: string;
    selectContent?: string;
  };
};

const SelectField = React.forwardRef<HTMLSelectElement, SelectInputProps>(
  (
    {
      className,
      label,
      name,
      value,
      classNames,
      onError,
      error,
      isLoading,
      defaultValue,
      placeholder,
      onValueChange,
      listItemName,
      isInvalid,
      isRequired,
      required,
      options,
      isDisabled,
      disabled,
      descriptionText,
      errorText = "",
    },
    ref
  ) => {
    return (
      <NextUISelect
        ref={ref as any}
        label={label}
        name={name}
        selectedKeys={value ? new Set([value]) : undefined}
        defaultSelectedKeys={defaultValue ? new Set([defaultValue]) : undefined}
        onSelectionChange={(keys: any) => {
          const selected = Array.from(keys)[0];
          if (selected) onValueChange?.(String(selected));
        }}
        isDisabled={isDisabled ?? disabled ?? isLoading}
        isInvalid={isInvalid || onError}
        isRequired={isRequired ?? required}
        errorMessage={errorText}
        description={descriptionText}
        placeholder={placeholder}
        variant="bordered"
        size="lg"
        className={cn(className, classNames?.wrapper)}
        classNames={{
          trigger: cn(classNames?.input),
          label: cn(classNames?.label),
          errorMessage: cn(classNames?.errorText),
          description: cn(classNames?.descriptionText),
        }}
        startContent={isLoading ? <Spinner size="sm" /> : undefined}
      >
        {(options ?? []).map((item: any, index: number) => {
          const itemValue = item?.value || item.id || String(index);
          const itemLabel =
            item?.[String(listItemName)] ||
            item.name ||
            item?.title ||
            item?.label ||
            itemValue;

          return (
            <SelectItem key={itemValue} value={itemValue}>
              {itemLabel}
            </SelectItem>
          );
        })}
      </NextUISelect>
    );
  }
);

SelectField.displayName = "SelectField";

export { SelectField };
