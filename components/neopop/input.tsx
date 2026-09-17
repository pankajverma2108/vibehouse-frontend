import React, { forwardRef } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TextInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  hideLabel?: boolean;
  helperText?: string;
  errorMessage?: string;
  status?: 'normal' | 'error' | 'success';
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  onEnter?: () => void;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  {
    label,
    hideLabel = false,
    helperText,
    errorMessage,
    status = 'normal',
    startIcon,
    endIcon,
    clearable = false,
    onClear,
    onEnter,
    id,
    disabled,
    className,
    value,
    onKeyDown,
    ...props
  },
  ref
) {
  const generatedId = id || `np-input-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  const isError = status === 'error' || Boolean(errorMessage);
  const isSuccess = status === 'success';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onEnter) {
      e.preventDefault();
      onEnter();
    }
    onKeyDown?.(e);
  };

  return (
    <div className="w-full flex flex-col gap-1.5 font-['Gilroy',sans-serif]">
      <label
        htmlFor={generatedId}
        className={cn(
          'text-xs font-bold uppercase tracking-[0.08em] text-[var(--np-white-300)]',
          hideLabel && 'sr-only'
        )}
      >
        {label}
      </label>

      <div className="relative flex items-center">
        {startIcon && (
          <span className="absolute left-3 text-[var(--np-white-100)] pointer-events-none flex items-center justify-center">
            {startIcon}
          </span>
        )}

        <input
          ref={ref}
          id={generatedId}
          disabled={disabled}
          value={value}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full h-11 bg-[var(--np-black-400)] text-[var(--np-white-500)] text-sm font-medium border-2 rounded-none transition-colors outline-none placeholder:text-[var(--np-white-100)]/40',
            startIcon ? 'pl-10' : 'pl-3.5',
            endIcon || clearable || isError || isSuccess ? 'pr-10' : 'pr-3.5',
            isError
              ? 'border-[var(--np-red)] focus:border-[var(--np-red)]'
              : isSuccess
              ? 'border-[var(--np-green)] focus:border-[var(--np-green)]'
              : 'border-[var(--np-black-200)] focus:border-[var(--np-green)]',
            disabled && 'opacity-40 cursor-not-allowed',
            className
          )}
          {...props}
        />

        <div className="absolute right-3 flex items-center gap-1.5">
          {clearable && value && !disabled && (
            <button
              type="button"
              onClick={onClear}
              className="text-[var(--np-white-100)] hover:text-white p-0.5"
              aria-label="Clear input"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {isError && <AlertCircle className="w-4 h-4 text-[var(--np-red)]" />}
          {isSuccess && <Check className="w-4 h-4 text-[var(--np-green)]" />}
          {!isError && !isSuccess && endIcon && (
            <span className="text-[var(--np-white-100)] pointer-events-none flex items-center justify-center">
              {endIcon}
            </span>
          )}
        </div>
      </div>

      {isError && errorMessage ? (
        <span className="text-xs font-semibold text-[var(--np-red)] tracking-wide">{errorMessage}</span>
      ) : helperText ? (
        <span className="text-xs text-[var(--np-white-secondary)]">{helperText}</span>
      ) : null}
    </div>
  );
});

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hideLabel?: boolean;
  helperText?: string;
  errorMessage?: string;
  status?: 'normal' | 'error' | 'success';
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, hideLabel = false, helperText, errorMessage, status = 'normal', id, disabled, className, ...props },
  ref
) {
  const generatedId = id || `np-textarea-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  const isError = status === 'error' || Boolean(errorMessage);

  return (
    <div className="w-full flex flex-col gap-1.5 font-['Gilroy',sans-serif]">
      <label
        htmlFor={generatedId}
        className={cn(
          'text-xs font-bold uppercase tracking-[0.08em] text-[var(--np-white-300)]',
          hideLabel && 'sr-only'
        )}
      >
        {label}
      </label>

      <textarea
        ref={ref}
        id={generatedId}
        disabled={disabled}
        className={cn(
          'w-full min-h-[100px] p-3.5 bg-[var(--np-black-400)] text-[var(--np-white-500)] text-sm font-medium border-2 rounded-none transition-colors outline-none placeholder:text-[var(--np-white-100)]/40 resize-y',
          isError
            ? 'border-[var(--np-red)] focus:border-[var(--np-red)]'
            : 'border-[var(--np-black-200)] focus:border-[var(--np-green)]',
          disabled && 'opacity-40 cursor-not-allowed',
          className
        )}
        {...props}
      />

      {isError && errorMessage ? (
        <span className="text-xs font-semibold text-[var(--np-red)] tracking-wide">{errorMessage}</span>
      ) : helperText ? (
        <span className="text-xs text-[var(--np-white-secondary)]">{helperText}</span>
      ) : null}
    </div>
  );
});

export interface OptionItem {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectorProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label: string;
  hideLabel?: boolean;
  options: OptionItem[];
  helperText?: string;
  errorMessage?: string;
}

export const Selector = forwardRef<HTMLSelectElement, SelectorProps>(function Selector(
  { label, hideLabel = false, options, helperText, errorMessage, id, disabled, className, ...props },
  ref
) {
  const generatedId = id || `np-select-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  const isError = Boolean(errorMessage);

  return (
    <div className="w-full flex flex-col gap-1.5 font-['Gilroy',sans-serif]">
      <label
        htmlFor={generatedId}
        className={cn(
          'text-xs font-bold uppercase tracking-[0.08em] text-[var(--np-white-300)]',
          hideLabel && 'sr-only'
        )}
      >
        {label}
      </label>

      <div className="relative">
        <select
          ref={ref}
          id={generatedId}
          disabled={disabled}
          className={cn(
            'w-full h-11 px-3.5 bg-[var(--np-black-400)] text-[var(--np-white-500)] text-sm font-semibold border-2 rounded-none appearance-none outline-none cursor-pointer transition-colors',
            isError ? 'border-[var(--np-red)]' : 'border-[var(--np-black-200)] focus:border-[var(--np-green)]',
            disabled && 'opacity-40 cursor-not-allowed',
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-[var(--np-black-400)] text-white">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--np-white-100)] text-xs font-bold">
          ▼
        </div>
      </div>

      {isError && errorMessage ? (
        <span className="text-xs font-semibold text-[var(--np-red)]">{errorMessage}</span>
      ) : helperText ? (
        <span className="text-xs text-[var(--np-white-secondary)]">{helperText}</span>
      ) : null}
    </div>
  );
});
