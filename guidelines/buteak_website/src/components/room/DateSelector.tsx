import React, { useState } from 'react';
import { Calendar, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';

interface DateSelectorProps {
  onDateChange: (fromDate: string, toDate: string) => void;
}

const DateSelector: React.FC<DateSelectorProps> = ({ onDateChange }) => {
  const [fromDate, setFromDate] = useState<Date>(new Date());
  const [toDate, setToDate] = useState<Date>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });
  const [isOpen, setIsOpen] = useState(false);
  const [selectingFrom, setSelectingFrom] = useState(true);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    if (selectingFrom) {
      setFromDate(date);
      setSelectingFrom(false);
      // If selected from date is after current to date, update to date
      if (date >= toDate) {
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        setToDate(nextDay);
      }
    } else {
      setToDate(date);
      setIsOpen(false);
      setSelectingFrom(true);
      
      // Call the callback with formatted dates
      const fromDateStr = fromDate.toISOString().split('T')[0];
      const toDateStr = date.toISOString().split('T')[0];
      console.log('📅 DateSelector: Sending dates to API:', { fromDateStr, toDateStr });
      onDateChange(fromDateStr, toDateStr);
    }
  };

  const resetSelection = () => {
    setSelectingFrom(true);
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 text-sm"
            onClick={() => {
              setIsOpen(true);
              resetSelection();
            }}
          >
            <CalendarDays size={16} />
            Select Dates
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-4">
            <div className="mb-4">
              <h4 className="font-medium mb-2">
                {selectingFrom ? 'Select Check-in Date' : 'Select Check-out Date'}
              </h4>
              <div className="text-sm text-gray-600">
                Check-in: {format(fromDate, 'MMM dd, yyyy')}
                {!selectingFrom && (
                  <>
                    <br />
                    Check-out: {format(toDate, 'MMM dd, yyyy')}
                  </>
                )}
              </div>
            </div>
            <CalendarComponent
              mode="single"
              selected={selectingFrom ? fromDate : toDate}
              onSelect={handleDateSelect}
              disabled={(date) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (selectingFrom) {
                  return date < today;
                } else {
                  return date <= fromDate;
                }
              }}
              initialFocus
            />
          </div>
        </PopoverContent>
      </Popover>
      <span className="text-sm text-gray-600">
        {format(fromDate, 'MMM dd')} - {format(toDate, 'MMM dd, yyyy')}
      </span>
    </div>
  );
};

export default DateSelector;