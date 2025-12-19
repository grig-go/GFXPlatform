/**
 * Interactive Element Component
 *
 * Renders interactive input elements (button, text-input, select, etc.)
 * Used for building interactive apps in Nova GFX.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { cn } from '@emergent-platform/ui';
import type { InteractiveInputType, ElementEventHandler } from '@emergent-platform/types';
import {
  useInteractiveStore,
  createInteractionEvent,
} from '@/lib/interactive';

export interface InteractiveConfig {
  type: 'interactive';
  inputType: InteractiveInputType;
  name?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string | number | boolean;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  bindTo?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    customMessage?: string;
  };
  buttonVariant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  buttonSize?: 'sm' | 'md' | 'lg';
  options?: Array<{ value: string; label: string; disabled?: boolean }>;
  step?: number;
  showValue?: boolean;
  onLabel?: string;
  offLabel?: string;
  inputMode?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'search';
  accentColor?: string;
  borderRadius?: number;
}

interface InteractiveElementProps {
  config: InteractiveConfig;
  elementId: string;
  className?: string;
  style?: React.CSSProperties;
  isPreview?: boolean;
  /** Event handlers configured for this element */
  handlers?: ElementEventHandler[];
  /** Form ID this element belongs to (for form state sync) */
  formId?: string;
}

export function InteractiveElement({
  config,
  elementId,
  className,
  style,
  isPreview = false,
  handlers = [],
  formId,
}: InteractiveElementProps) {
  const {
    inputType,
    name,
    label,
    placeholder,
    defaultValue,
    disabled,
    readOnly,
    bindTo,
    validation,
    buttonVariant = 'default',
    buttonSize = 'md',
    options = [],
    step = 1,
    showValue = true,
    onLabel = 'On',
    offLabel = 'Off',
    inputMode = 'text',
    accentColor,
    borderRadius = 4,
  } = config;

  // Local state for unbound inputs
  const [localValue, setLocalValue] = useState<string | number | boolean>(defaultValue ?? '');

  // Interactive store for bound inputs and form state
  const { isInteractiveMode, runtime, setState, dispatchEvent, setFormValue } = useInteractiveStore();

  // Debug logging on mount and prop changes
  useEffect(() => {
    console.log('[InteractiveElement] Mounted/Updated:', {
      elementId,
      inputType,
      isPreview,
      isInteractiveMode,
      disabled,
      buttonDisabled: disabled || (!isPreview && !isInteractiveMode),
      hasHandlers: handlers?.length > 0,
      handlers
    });
  }, [elementId, inputType, isPreview, isInteractiveMode, disabled, handlers]);

  // Get value from state if bound, otherwise use local state
  const value = useMemo(() => {
    if (bindTo && isInteractiveMode) {
      return runtime.state[bindTo] ?? defaultValue ?? '';
    }
    return localValue;
  }, [bindTo, isInteractiveMode, runtime.state, defaultValue, localValue]);

  // Handle value change
  const handleChange = useCallback((newValue: string | number | boolean) => {
    const previousValue = value;

    if (bindTo && isInteractiveMode) {
      setState(bindTo, newValue);
    } else {
      setLocalValue(newValue);
    }

    // Sync form state if this element belongs to a form
    if (formId && name && isInteractiveMode) {
      setFormValue(formId, name, newValue);
    }

    // Dispatch change event with value data
    if (isInteractiveMode) {
      const event = createInteractionEvent('change', elementId, undefined);
      // Add value data to the event
      event.data = {
        ...event.data,
        value: newValue,
        previousValue,
        field: name,
      };
      dispatchEvent(event, handlers);
    }
  }, [bindTo, isInteractiveMode, setState, elementId, dispatchEvent, handlers, value, formId, name, setFormValue]);

  // Handle click (for buttons)
  const handleClick = useCallback(() => {
    console.log('[InteractiveElement] handleClick called', { elementId, isInteractiveMode, isPreview });
    if (isInteractiveMode) {
      console.log('[InteractiveElement] Dispatching click event for element:', elementId);
      dispatchEvent(
        createInteractionEvent('click', elementId, undefined),
        handlers
      );
    } else {
      console.log('[InteractiveElement] Click ignored - isInteractiveMode is false');
    }
  }, [isInteractiveMode, isPreview, elementId, dispatchEvent, handlers]);

  // Handle focus event
  const handleFocus = useCallback(() => {
    if (isInteractiveMode) {
      dispatchEvent(
        createInteractionEvent('focus', elementId, undefined),
        handlers
      );
    }
  }, [isInteractiveMode, elementId, dispatchEvent, handlers]);

  // Handle blur event
  const handleBlur = useCallback(() => {
    if (isInteractiveMode) {
      const event = createInteractionEvent('blur', elementId, undefined);
      event.data = { ...event.data, value, field: name };
      dispatchEvent(event, handlers);
    }
  }, [isInteractiveMode, elementId, dispatchEvent, handlers, value, name]);

  // Sync initial value with form state on mount
  useEffect(() => {
    if (formId && name && isInteractiveMode && defaultValue !== undefined) {
      setFormValue(formId, name, value);
    }
  }, [formId, name, isInteractiveMode]); // Only run on mount/mode change

  // Common styles
  const commonStyles: React.CSSProperties = {
    ...style,
    borderRadius,
    ...(accentColor && { '--accent-color': accentColor } as React.CSSProperties),
  };

  // Render based on input type
  switch (inputType) {
    case 'button':
      return (
        <button
          className={cn(
            'font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
            buttonVariant === 'default' && 'bg-white text-gray-900 hover:bg-gray-100 border border-gray-300',
            buttonVariant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
            buttonVariant === 'secondary' && 'bg-gray-600 text-white hover:bg-gray-700',
            buttonVariant === 'outline' && 'border-2 border-current bg-transparent hover:bg-white/10',
            buttonVariant === 'ghost' && 'bg-transparent hover:bg-white/10',
            buttonVariant === 'destructive' && 'bg-red-600 text-white hover:bg-red-700',
            buttonSize === 'sm' && 'px-3 py-1.5 text-sm',
            buttonSize === 'md' && 'px-4 py-2 text-base',
            buttonSize === 'lg' && 'px-6 py-3 text-lg',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          style={commonStyles}
          disabled={disabled || (!isPreview && !isInteractiveMode)}
          onClick={handleClick}
        >
          {label || 'Button'}
        </button>
      );

    case 'text-input':
    case 'number-input':
      return (
        <div className={cn('flex flex-col gap-1', className)} style={commonStyles}>
          {label && (
            <label className="text-sm font-medium text-gray-700">{label}</label>
          )}
          <input
            type={inputType === 'number-input' ? 'number' : inputMode}
            name={name}
            value={String(value)}
            placeholder={placeholder}
            disabled={disabled || (!isPreview && !isInteractiveMode)}
            readOnly={readOnly}
            min={validation?.min}
            max={validation?.max}
            minLength={validation?.minLength}
            maxLength={validation?.maxLength}
            pattern={validation?.pattern}
            step={inputType === 'number-input' ? step : undefined}
            onChange={(e) => handleChange(inputType === 'number-input' ? Number(e.target.value) : e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={cn(
              'w-full px-3 py-2 border border-gray-300 rounded-md',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'disabled:bg-gray-100 disabled:cursor-not-allowed',
              'placeholder:text-gray-400'
            )}
            style={{ borderRadius }}
          />
        </div>
      );

    case 'textarea':
      return (
        <div className={cn('flex flex-col gap-1', className)} style={commonStyles}>
          {label && (
            <label className="text-sm font-medium text-gray-700">{label}</label>
          )}
          <textarea
            name={name}
            value={String(value)}
            placeholder={placeholder}
            disabled={disabled || (!isPreview && !isInteractiveMode)}
            readOnly={readOnly}
            minLength={validation?.minLength}
            maxLength={validation?.maxLength}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={cn(
              'w-full px-3 py-2 border border-gray-300 rounded-md resize-none',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'disabled:bg-gray-100 disabled:cursor-not-allowed',
              'placeholder:text-gray-400'
            )}
            style={{ borderRadius, minHeight: 80 }}
          />
        </div>
      );

    case 'select':
      return (
        <div className={cn('flex flex-col gap-1', className)} style={commonStyles}>
          {label && (
            <label className="text-sm font-medium text-gray-700">{label}</label>
          )}
          <select
            name={name}
            value={String(value)}
            disabled={disabled || (!isPreview && !isInteractiveMode)}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={cn(
              'w-full px-3 py-2 border border-gray-300 rounded-md',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'disabled:bg-gray-100 disabled:cursor-not-allowed',
              'appearance-none bg-white'
            )}
            style={{ borderRadius }}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );

    case 'checkbox':
      return (
        <label
          className={cn(
            'flex items-center gap-2 cursor-pointer',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          style={commonStyles}
        >
          <input
            type="checkbox"
            name={name}
            checked={Boolean(value)}
            disabled={disabled || (!isPreview && !isInteractiveMode)}
            onChange={(e) => handleChange(e.target.checked)}
            className={cn(
              'w-4 h-4 rounded border-gray-300',
              'focus:ring-2 focus:ring-blue-500'
            )}
            style={accentColor ? { accentColor } : undefined}
          />
          {label && <span className="text-sm">{label}</span>}
        </label>
      );

    case 'radio':
      return (
        <div className={cn('flex flex-col gap-2', className)} style={commonStyles}>
          {label && (
            <span className="text-sm font-medium text-gray-700">{label}</span>
          )}
          {options.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                'flex items-center gap-2 cursor-pointer',
                (disabled || opt.disabled) && 'opacity-50 cursor-not-allowed'
              )}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={String(value) === opt.value}
                disabled={disabled || opt.disabled || (!isPreview && !isInteractiveMode)}
                onChange={(e) => handleChange(e.target.value)}
                className={cn(
                  'w-4 h-4 border-gray-300',
                  'focus:ring-2 focus:ring-blue-500'
                )}
                style={accentColor ? { accentColor } : undefined}
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      );

    case 'toggle':
      const isOn = Boolean(value);
      return (
        <label
          className={cn(
            'flex items-center gap-3 cursor-pointer',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          style={commonStyles}
        >
          {label && <span className="text-sm">{label}</span>}
          <button
            type="button"
            role="switch"
            aria-checked={isOn}
            disabled={disabled || (!isPreview && !isInteractiveMode)}
            onClick={() => handleChange(!isOn)}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              isOn ? 'bg-blue-600' : 'bg-gray-300'
            )}
            style={isOn && accentColor ? { backgroundColor: accentColor } : undefined}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                isOn ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
          {showValue && (
            <span className="text-sm text-gray-600">{isOn ? onLabel : offLabel}</span>
          )}
        </label>
      );

    case 'slider':
      const numValue = Number(value) || 0;
      const min = validation?.min ?? 0;
      const max = validation?.max ?? 100;
      return (
        <div className={cn('flex flex-col gap-2', className)} style={commonStyles}>
          {label && (
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">{label}</label>
              {showValue && (
                <span className="text-sm text-gray-600">{numValue}</span>
              )}
            </div>
          )}
          <input
            type="range"
            name={name}
            value={numValue}
            min={min}
            max={max}
            step={step}
            disabled={disabled || (!isPreview && !isInteractiveMode)}
            onChange={(e) => handleChange(Number(e.target.value))}
            className={cn(
              'w-full h-2 rounded-full appearance-none cursor-pointer',
              'bg-gray-200 disabled:cursor-not-allowed'
            )}
            style={accentColor ? { accentColor } : undefined}
          />
        </div>
      );

    case 'date-picker':
      return (
        <div className={cn('flex flex-col gap-1', className)} style={commonStyles}>
          {label && (
            <label className="text-sm font-medium text-gray-700">{label}</label>
          )}
          <input
            type="date"
            name={name}
            value={String(value)}
            disabled={disabled || (!isPreview && !isInteractiveMode)}
            onChange={(e) => handleChange(e.target.value)}
            className={cn(
              'w-full px-3 py-2 border border-gray-300 rounded-md',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'disabled:bg-gray-100 disabled:cursor-not-allowed'
            )}
            style={{ borderRadius }}
          />
        </div>
      );

    case 'color-picker':
      return (
        <div className={cn('flex items-center gap-2', className)} style={commonStyles}>
          {label && (
            <label className="text-sm font-medium text-gray-700">{label}</label>
          )}
          <input
            type="color"
            name={name}
            value={String(value) || '#000000'}
            disabled={disabled || (!isPreview && !isInteractiveMode)}
            onChange={(e) => handleChange(e.target.value)}
            className={cn(
              'w-10 h-10 border border-gray-300 rounded cursor-pointer',
              'disabled:cursor-not-allowed'
            )}
            style={{ borderRadius }}
          />
          {showValue && (
            <span className="text-sm text-gray-600 font-mono">{String(value)}</span>
          )}
        </div>
      );

    default:
      return (
        <div className={cn('p-4 border-2 border-dashed border-gray-300 rounded text-center', className)}>
          <span className="text-sm text-gray-500">Unknown input type: {inputType}</span>
        </div>
      );
  }
}
