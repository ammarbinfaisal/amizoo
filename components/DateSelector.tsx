"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, addDays, subDays, isToday } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import * as React from "react";

interface DateSelectorProps {
  date: Date;
  onChange: (date: Date) => void;
}

export function DateSelector({ date, onChange }: DateSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center bg-muted rounded-lg p-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-md"
          onClick={() => onChange(subDays(date, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 justify-start text-left font-bold uppercase text-[10px] tracking-widest px-3 min-w-[120px]",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-3 w-3" />
              {isToday(date) ? "Today" : format(date, "EEE, MMM d")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && onChange(d)}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-md"
          onClick={() => onChange(addDays(date, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {!isToday(date) && (
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-lg shrink-0 sm:hidden"
          onClick={() => onChange(new Date())}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      )}

      {!isToday(date) && (
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:flex h-10 rounded-lg font-bold uppercase text-[10px] tracking-widest px-4 shrink-0"
          onClick={() => onChange(new Date())}
        >
          <RotateCcw className="mr-2 h-3 w-3" />
          Back to Today
        </Button>
      )}
    </div>
  );
}
