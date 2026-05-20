Installation:
npx shadcn@latest add @scrollxui/calendar

Usage:
import { Calendar } from '@/components/ui/calendar';

const [date, setDate] = React.useState<Date | undefined>(new Date());
 
return (
  <Calendar
    mode='single'
    selected={date}
    onSelect={setDate}
    className='rounded-lg border'
  />
);

'use client';

import * as React from 'react';
import { type DateRange } from 'react-day-picker';

import { Calendar } from '@/components/ui/calendar';

export default function CalendarMultiMonRangeDemo() {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: new Date(2025, 5, 11),
    to: new Date(2025, 6, 15),
  });

  return (
    <Calendar
      mode='range'
      defaultMonth={dateRange?.from}
      selected={dateRange}
      onSelect={setDateRange}
      numberOfMonths={2}
      className='rounded-lg border shadow-xs'
    />
  );
}
