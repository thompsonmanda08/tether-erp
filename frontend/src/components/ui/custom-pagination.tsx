import * as React from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Pagination } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  );
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<React.ComponentProps<typeof Button>, "size"> &
  React.ComponentProps<"a">;

function PaginationLink({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-9 w-9 p-0",
        isActive
          ? "border border-input bg-background shadow-sm"
          : "hover:bg-muted text-muted-foreground hover:text-foreground",
        className
      )}
      {...props}
    />
  );
}

function PaginationPrevious({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn("gap-1 px-2.5 sm:pl-2.5", className)}
      {...props}
    >
      <ChevronLeftIcon />
      <span className="hidden sm:block">Previous</span>
    </PaginationLink>
  );
}

function PaginationNext({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={cn("gap-1 px-2.5 sm:pr-2.5", className)}
      {...props}
    >
      <span className="hidden sm:block">Next</span>
      <ChevronRightIcon />
    </PaginationLink>
  );
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontalIcon className="size-4" />
      <span className="sr-only">More pages</span>
    </span>
  );
}

const CustomPagination = ({
  pagination,
  updatePagination,
  allowSetPageSize,
  showDetails,
  classNames,
  className,
}: {
  className?: string;
  classNames?: {
    wrapper: string;
    current: string;
    previous: string;
    next: string;
    pagesWrapper: string;
  };
  showDetails?: boolean;
  allowSetPageSize?: boolean;
  pagination: Pagination;
  updatePagination: (page: { page: number; page_size?: number }) => void;
}) => {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-4 px-4 py-3 sm:flex-row",
        {
          "items-center justify-between": showDetails || allowSetPageSize,
        },
        className,
        classNames?.wrapper
      )}
    >
      {allowSetPageSize && (
        <div className="flex max-w-max items-center space-x-1.5 font-medium text-nowrap">
          <span className="text-sm text-foreground/70">Show</span>
          <Select
            value={String(pagination?.page_size)}
            onValueChange={(value) =>
              updatePagination({
                page_size: Number(value),
                page: Number(pagination?.page),
              })
            }
          >
            <SelectTrigger size="sm" className="w-[65px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="min-w-0">
              {Array.from({ length: 5 }).map((_, index: number) => {
                const pageSize = (index + 1) * 10;
                return (
                  <SelectItem key={pageSize} value={String(pageSize)}>
                    {pageSize}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <span className="text-sm text-foreground/70">Per Page</span>
        </div>
      )}
      {showDetails && (
        <div className="text-foreground/80 order-2 text-sm font-medium sm:order-1">
          Showing page {pagination.page} of {pagination?.total_pages} (
          {pagination.totalCount} total results)
        </div>
      )}
      <div className="order-1 flex items-center space-x-1 sm:order-2 sm:space-x-2">
        <Button
          onClick={() => updatePagination({ page: pagination?.page - 1 })}
          disabled={!pagination.has_prev}
          size={"sm"}
          variant={"outline"}
          className={cn("", classNames?.previous)}
        >
          <span className="hidden sm:inline">Previous</span>
          <span className="sm:hidden">Prev</span>
        </Button>

        <div
          className={cn(
            "flex items-center space-x-1",
            classNames?.pagesWrapper
          )}
        >
          {Array.from(
            { length: Math.min(3, pagination?.total_pages ?? 1) },
            (_, i) => {
              const totalPages = pagination?.total_pages ?? 1;
              let pageNum;
              if (totalPages <= 3) {
                pageNum = i + 1;
              } else if (pagination.page <= 2) {
                pageNum = i + 1;
              } else if (pagination.page >= totalPages - 1) {
                pageNum = totalPages - 2 + i;
              } else {
                pageNum = pagination.page - 1 + i;
              }

              return (
                <Button
                  size={"sm"}
                  key={pageNum}
                  variant={pagination.page === pageNum ? "default" : "outline"}
                  onClick={() => updatePagination({ page: pageNum })}
                  className={cn(``, classNames?.current)}
                >
                  {pageNum}
                </Button>
              );
            }
          )}
        </div>

        <Button
          size={"sm"}
          variant={"outline"}
          onClick={() => updatePagination({ page: pagination.page + 1 })}
          disabled={!pagination.has_next}
          className={cn("", classNames?.next)}
        >
          <span className="hidden sm:inline">Next</span>
          <span className="sm:hidden">Next</span>
        </Button>
      </div>
    </div>
  );
};

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
  CustomPagination,
};
