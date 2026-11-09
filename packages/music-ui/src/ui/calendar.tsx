"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";

import { cn } from "./utils";
import { buttonVariants } from "./button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaults = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        root: cn(defaults.root, "w-fit"),
        months: cn(defaults.months, "flex flex-col sm:flex-row gap-2"),
        month: cn(defaults.month, "flex flex-col gap-4"),
        month_caption: cn(
          defaults.month_caption,
          "flex justify-center pt-1 relative items-center w-full",
        ),
        caption_label: cn(defaults.caption_label, "text-sm font-medium"),
        nav: cn(defaults.nav, "flex items-center gap-1"),
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1",
        ),
        month_grid: cn(defaults.month_grid, "w-full border-collapse space-x-1"),
        weekdays: cn(defaults.weekdays, "flex"),
        weekday: cn(
          defaults.weekday,
          "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
        ),
        week: cn(defaults.week, "flex w-full mt-2"),
        day: cn(
          defaults.day,
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-8 p-0 font-normal aria-selected:opacity-100",
        ),
        range_start: cn(defaults.range_start, "day-range-start rounded-l-md"),
        range_end: cn(defaults.range_end, "day-range-end rounded-r-md"),
        range_middle: cn(defaults.range_middle, "rounded-none"),
        selected: cn(
          defaults.selected,
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        ),
        today: cn(defaults.today, "bg-accent text-accent-foreground"),
        outside: cn(
          defaults.outside,
          "day-outside text-muted-foreground aria-selected:text-muted-foreground",
        ),
        disabled: cn(defaults.disabled, "text-muted-foreground opacity-50"),
        hidden: cn(defaults.hidden, "invisible"),
        ...classNames,
      }}
      components={{
        Chevron: ({ className, orientation, ...chevronProps }) => {
          const Icon = orientation === "right" ? ChevronRight : ChevronLeft;
          return <Icon className={cn("size-4", className)} {...chevronProps} />;
        },
      }}
      {...props}
    />
  );
}

export { Calendar };
