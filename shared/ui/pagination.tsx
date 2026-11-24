import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/shared/lib/utils";

function Pagination({
  className,
  ...props
}: React.ComponentProps<"nav">) {
  return (
    <nav
      aria-label="Phân trang"
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
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  );
}

function PaginationItem(props: React.ComponentProps<"li">) {
  return <li {...props} />;
}

function PaginationLink({
  asChild,
  className,
  ...props
}: React.ComponentProps<"a"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "a";
  return (
    <Comp
      aria-current={props["aria-current"]}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-md border border-transparent text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:border-border aria-[current=page]:bg-background",
        className
      )}
      {...props}
    />
  );
}

function PaginationPrevious(props: React.ComponentProps<typeof PaginationLink>) {
  return <PaginationLink aria-label="Trang trước" {...props} />;
}

function PaginationNext(props: React.ComponentProps<typeof PaginationLink>) {
  return <PaginationLink aria-label="Trang sau" {...props} />;
}

export {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
};
