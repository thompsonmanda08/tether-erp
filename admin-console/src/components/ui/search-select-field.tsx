import { cn } from "@/lib/utils";
import * as React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { Spinner } from "./spinner";

type OptionItem = {
  id: string;
  name?: string;
  value?: string;
  label?: string;
  title?: string;
  [x: string]: any;
};

type SelectInputProps = React.InputHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  onError?: boolean;
  error?: string;
  errorText?: string;
  descriptionText?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  isInvalid?: boolean;
  onModal?: boolean;
  value?: string;
  className?: string;
  listItemName?: string;
  listItemValue?: string;
  options: OptionItem[];
  onValueChange?: (value: string) => void;
  /** Custom renderer for each dropdown item. Receives the option and whether it is selected. */
  renderOption?: (item: OptionItem, isSelected: boolean) => React.ReactNode;
  /** Custom renderer for the trigger button when a value is selected. Receives the selected option. */
  renderSelected?: (item: OptionItem) => React.ReactNode;
  classNames?: {
    wrapper?: string;
    input?: string;
    label?: string;
    errorText?: string;
    descriptionText?: string;
  };
};

const SearchSelectField = React.forwardRef<HTMLSelectElement, SelectInputProps>(
  (
    {
      className,
      type,
      label,
      name,
      value,
      classNames,
      onError,
      error,
      defaultValue = "",
      placeholder,
      onValueChange,
      listItemName,
      listItemValue,
      isInvalid,
      options,
      isDisabled,
      isLoading,
      descriptionText,
      errorText = "",
      onModal = false,
      renderOption,
      renderSelected,
      ...props
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const [selected, setSelected] = React.useState("");
    const [searchValue, setSearchValue] = React.useState("");

    // Sync external value prop with internal state
    React.useEffect(() => {
      if (value !== undefined && value !== selected) {
        setSelected(value);
      }
    }, [value]);

    // Filter options based on search value
    const filteredOptions = React.useMemo(() => {
      if (!searchValue.trim()) return options;

      const lowerSearchValue = searchValue.toLowerCase();
      return options.filter((item) => {
        const label =
          item?.[String(listItemName)] ||
          item.name ||
          item?.title ||
          item?.label ||
          item.id ||
          item.value;

        return String(label).toLowerCase().includes(lowerSearchValue);
      });
    }, [options, searchValue, listItemName]);

    return (
      <div
        className={cn(
          "flex w-full max-w-lg flex-col",

          classNames?.wrapper,
          {
            "cursor-not-allowed opacity-50": isDisabled,
          },
        )}
      >
        {label && (
          <label
            className={cn(
              "pl-1 text-sm font-medium text-nowrap text-slate-700 dark:text-slate-300 mb-0.5",
              {
                "text-red-500": onError || isInvalid,
                "opacity-50": isDisabled || props?.disabled,
              },
            )}
            htmlFor={name}
          >
            {label}{" "}
            {props?.required && (
              <span className="font-bold text-red-500"> *</span>
            )}
          </label>
        )}

        <Popover modal={onModal} open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={isDisabled}
              className={cn(
                "justify-between",
                {
                  "cursor-not-allowed": isDisabled,
                  "border! border-red-500!": onError || isInvalid,
                  "text-foreground/70": !selected,
                },
                classNames?.input,
              )}
            >
              {/* ADD LOADING STATE */}
              {isLoading ? (
                <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                  <Spinner className="h-5 w-5" />
                  Loading...
                </div>
              ) : (
                <>
                  <span className="flex-1 truncate text-left">
                    {selected
                      ? (() => {
                          const selectedItem = options.find(
                            (item) =>
                              String(item.id || item.value) === selected,
                          );
                          if (!selectedItem)
                            return placeholder || "Select an item...";

                          if (renderSelected) return renderSelected(selectedItem);

                          const label = listItemName
                            ? selectedItem[listItemName]
                            : selectedItem?.name ||
                              selectedItem?.title ||
                              selectedItem?.label ||
                              selectedItem?.value;

                          return label || selectedItem;
                        })()
                      : placeholder || "Select an item..."}
                  </span>
                </>
              )}
              <ChevronsUpDown className="ml-2 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="flex w-[var(--radix-popover-trigger-width)] p-0">
            <Command>
              <CommandInput
                placeholder="Type here to search..."
                className="h-9"
                value={searchValue}
                onValueChange={setSearchValue}
              />
              <CommandList>
                <CommandEmpty>No items found.</CommandEmpty>
                <CommandGroup>
                  {filteredOptions.map((item, index) => {
                    const itemValue = String(
                      item.id || item.value || index.toString(),
                    );
                    const itemLabel =
                      item?.[String(listItemName)] ||
                      item.name ||
                      item?.title ||
                      item?.label ||
                      itemValue;

                    return (
                      <CommandItem
                        key={itemValue}
                        value={itemValue}
                        onSelect={(currentValue) => {
                          const selectedItem =
                            currentValue === value ? "" : currentValue;

                          setSelected(selectedItem);
                          onValueChange?.(selectedItem);
                          setOpen(false);
                        }}
                      >
                        {renderOption
                          ? renderOption(item, selected === itemValue)
                          : itemLabel}
                        {!renderOption && (
                          <Check
                            className={cn(
                              "ml-auto",
                              selected === itemValue
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {((errorText && (isInvalid || onError)) || descriptionText) && (
          <motion.span
            className={cn(
              "ml-1 text-xs text-slate-500 dark:text-slate-400",
              {
                "text-red-600 dark:text-red-400": onError || isInvalid,
              },
              classNames?.descriptionText,
              classNames?.errorText,
            )}
            whileInView={{
              scale: [0, 1],
              opacity: [0, 1],
              transition: { duration: 0.3 },
            }}
          >
            {errorText ? errorText : descriptionText}
          </motion.span>
        )}
      </div>
    );
  },
);

SearchSelectField.displayName = "SearchSelectField";

export { SearchSelectField };
