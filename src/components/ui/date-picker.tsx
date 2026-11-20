"use client";

import * as React from "react";

import { CalendarIcon } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type SingleCalendarProps = Omit<
  React.ComponentProps<typeof Calendar>,
  "mode" | "selected" | "onSelect"
>;

function formatDate(date: Date | undefined) {
  if (!date) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function isValidDate(date: Date | undefined) {
  if (!date) {
    return false;
  }
  return !isNaN(date.getTime());
}

interface DatePickerProps extends SingleCalendarProps {
  id: string;
  label: string;
  initialDate: Date;
}

export function DatePicker({ id, label, initialDate, ...calendarProps }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date | undefined>(initialDate);
  const [month, setMonth] = React.useState<Date | undefined>(initialDate);
  const [value, setValue] = React.useState(formatDate(initialDate));

  return (
    <Field className="mx-auto w-48">
      <FieldLabel htmlFor={`${id}_input`}>{label}</FieldLabel>
      <InputGroup>
        <InputGroupInput
          id={`${id}_input`}
          value={value}
          placeholder={formatDate(initialDate)}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const newDate = new Date(e.target.value);
            setValue(e.target.value);
            if (isValidDate(newDate)) {
              setDate(newDate);
              setMonth(newDate);
            }
          }}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
            }
          }}
        />
        <InputGroupAddon align="inline-end">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
              render={
                <InputGroupButton
                  id={`${id}_date-picker`}
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Select date">
                  <CalendarIcon />
                  <span className="sr-only">Select date</span>
                </InputGroupButton>
              }
            />
            <PopoverContent
              className="w-auto overflow-hidden p-0"
              align="end"
              alignOffset={-8}
              sideOffset={10}>
              <Calendar
                {...calendarProps}
                mode="single"
                selected={date}
                month={month}
                onMonthChange={setMonth}
                onSelect={(newDate) => {
                  setDate(newDate);
                  setValue(formatDate(newDate));
                  setOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  );
}
