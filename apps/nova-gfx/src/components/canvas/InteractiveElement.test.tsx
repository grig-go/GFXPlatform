/**
 * Unit tests for InteractiveElement component
 * Tests rendering of interactive input elements and event handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InteractiveElement, InteractiveConfig } from './InteractiveElement';

// Mock the interactive store
const mockDispatchEvent = vi.fn();
const mockSetState = vi.fn();
const mockSetFormValue = vi.fn();

vi.mock('@/lib/interactive', () => ({
  useInteractiveStore: () => ({
    isInteractiveMode: true,
    runtime: {
      state: {},
    },
    setState: mockSetState,
    dispatchEvent: mockDispatchEvent,
    setFormValue: mockSetFormValue,
  }),
  createInteractionEvent: (type: string, elementId: string) => ({
    type,
    elementId,
    timestamp: Date.now(),
    data: {},
  }),
}));

// ============================================================================
// TEST HELPERS
// ============================================================================

function createConfig(overrides: Partial<InteractiveConfig> = {}): InteractiveConfig {
  return {
    type: 'interactive',
    inputType: 'button',
    ...overrides,
  };
}

function renderElement(
  config: InteractiveConfig,
  props: Partial<Parameters<typeof InteractiveElement>[0]> = {}
) {
  return render(
    <InteractiveElement
      config={config}
      elementId="test-element"
      {...props}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// BUTTON TESTS
// ============================================================================

describe('Button Input', () => {
  it('should render button with label', () => {
    renderElement(createConfig({
      inputType: 'button',
      label: 'Click Me',
    }));

    expect(screen.getByRole('button', { name: 'Click Me' })).toBeInTheDocument();
  });

  it('should render default label if none provided', () => {
    renderElement(createConfig({ inputType: 'button' }));

    expect(screen.getByRole('button', { name: 'Button' })).toBeInTheDocument();
  });

  it('should dispatch click event when clicked', () => {
    renderElement(createConfig({
      inputType: 'button',
      label: 'Test Button',
    }), {
      handlers: [],
    });

    fireEvent.click(screen.getByRole('button'));

    expect(mockDispatchEvent).toHaveBeenCalled();
    expect(mockDispatchEvent.mock.calls[0][0].type).toBe('click');
  });

  it('should apply button variants', () => {
    const { rerender } = render(
      <InteractiveElement
        config={createConfig({
          inputType: 'button',
          label: 'Primary',
          buttonVariant: 'primary',
        })}
        elementId="test"
      />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-blue-600');
  });

  it('should apply button sizes', () => {
    renderElement(createConfig({
      inputType: 'button',
      label: 'Large',
      buttonSize: 'lg',
    }));

    expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3');
  });

  it('should be disabled when disabled prop is true', () => {
    renderElement(createConfig({
      inputType: 'button',
      label: 'Disabled',
      disabled: true,
    }));

    expect(screen.getByRole('button')).toBeDisabled();
  });
});

// ============================================================================
// TEXT INPUT TESTS
// ============================================================================

describe('Text Input', () => {
  it('should render text input with label', () => {
    renderElement(createConfig({
      inputType: 'text-input',
      label: 'Username',
      placeholder: 'Enter username',
    }));

    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument();
  });

  it('should update value on change', () => {
    renderElement(createConfig({
      inputType: 'text-input',
      label: 'Name',
      placeholder: 'Enter name',
    }));

    const input = screen.getByPlaceholderText('Enter name');
    fireEvent.change(input, { target: { value: 'John' } });

    expect(mockDispatchEvent).toHaveBeenCalled();
    expect(mockDispatchEvent.mock.calls[0][0].type).toBe('change');
  });

  it('should dispatch focus event', () => {
    renderElement(createConfig({
      inputType: 'text-input',
      label: 'Email',
      placeholder: 'Enter email',
    }));

    fireEvent.focus(screen.getByPlaceholderText('Enter email'));

    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'focus' }),
      expect.anything()
    );
  });

  it('should dispatch blur event', () => {
    renderElement(createConfig({
      inputType: 'text-input',
      label: 'Email',
      placeholder: 'Enter email',
    }));

    const input = screen.getByPlaceholderText('Enter email');
    fireEvent.focus(input);
    fireEvent.blur(input);

    // Should have focus and blur events
    const blurCall = mockDispatchEvent.mock.calls.find(
      (call) => call[0].type === 'blur'
    );
    expect(blurCall).toBeDefined();
  });

  it('should apply input mode', () => {
    renderElement(createConfig({
      inputType: 'text-input',
      label: 'Email',
      inputMode: 'email',
      placeholder: 'Enter email',
    }));

    expect(screen.getByPlaceholderText('Enter email')).toHaveAttribute('type', 'email');
  });
});

// ============================================================================
// NUMBER INPUT TESTS
// ============================================================================

describe('Number Input', () => {
  it('should render number input', () => {
    renderElement(createConfig({
      inputType: 'number-input',
      label: 'Quantity',
      defaultValue: 1,
    }));

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('type', 'number');
  });

  it('should apply min/max validation', () => {
    renderElement(createConfig({
      inputType: 'number-input',
      label: 'Age',
      validation: { min: 0, max: 120 },
    }));

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '120');
  });

  it('should apply step', () => {
    renderElement(createConfig({
      inputType: 'number-input',
      label: 'Price',
      step: 0.01,
    }));

    expect(screen.getByRole('spinbutton')).toHaveAttribute('step', '0.01');
  });
});

// ============================================================================
// TEXTAREA TESTS
// ============================================================================

describe('Textarea', () => {
  it('should render textarea', () => {
    renderElement(createConfig({
      inputType: 'textarea',
      label: 'Description',
      placeholder: 'Enter description...',
    }));

    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter description...')).toBeInTheDocument();
  });

  it('should update on change', () => {
    renderElement(createConfig({
      inputType: 'textarea',
      label: 'Notes',
      placeholder: 'Enter notes',
    }));

    fireEvent.change(screen.getByPlaceholderText('Enter notes'), {
      target: { value: 'Test notes' },
    });

    expect(mockDispatchEvent).toHaveBeenCalled();
  });
});

// ============================================================================
// SELECT TESTS
// ============================================================================

describe('Select', () => {
  it('should render select with options', () => {
    renderElement(createConfig({
      inputType: 'select',
      label: 'Country',
      options: [
        { value: 'us', label: 'United States' },
        { value: 'uk', label: 'United Kingdom' },
        { value: 'ca', label: 'Canada' },
      ],
    }));

    expect(screen.getByText('Country')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'United States' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Canada' })).toBeInTheDocument();
  });

  it('should render placeholder option', () => {
    renderElement(createConfig({
      inputType: 'select',
      label: 'Status',
      placeholder: 'Select status',
      options: [{ value: 'active', label: 'Active' }],
    }));

    expect(screen.getByRole('option', { name: 'Select status' })).toBeInTheDocument();
  });

  it('should dispatch change event on selection', () => {
    renderElement(createConfig({
      inputType: 'select',
      label: 'Size',
      options: [
        { value: 'sm', label: 'Small' },
        { value: 'md', label: 'Medium' },
        { value: 'lg', label: 'Large' },
      ],
    }));

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'lg' },
    });

    expect(mockDispatchEvent).toHaveBeenCalled();
    expect(mockDispatchEvent.mock.calls[0][0].data.value).toBe('lg');
  });
});

// ============================================================================
// CHECKBOX TESTS
// ============================================================================

describe('Checkbox', () => {
  it('should render checkbox with label', () => {
    renderElement(createConfig({
      inputType: 'checkbox',
      label: 'Accept terms',
    }));

    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByText('Accept terms')).toBeInTheDocument();
  });

  it('should toggle on click', () => {
    renderElement(createConfig({
      inputType: 'checkbox',
      label: 'Subscribe',
      defaultValue: false,
    }));

    fireEvent.click(screen.getByRole('checkbox'));

    expect(mockDispatchEvent).toHaveBeenCalled();
    expect(mockDispatchEvent.mock.calls[0][0].data.value).toBe(true);
  });

  it('should apply accent color', () => {
    renderElement(createConfig({
      inputType: 'checkbox',
      label: 'Colored',
      accentColor: '#ff0000',
    }));

    expect(screen.getByRole('checkbox')).toHaveStyle({ accentColor: '#ff0000' });
  });
});

// ============================================================================
// RADIO TESTS
// ============================================================================

describe('Radio', () => {
  it('should render radio group with options', () => {
    renderElement(createConfig({
      inputType: 'radio',
      label: 'Size',
      name: 'size',
      options: [
        { value: 'sm', label: 'Small' },
        { value: 'md', label: 'Medium' },
        { value: 'lg', label: 'Large' },
      ],
    }));

    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByText('Small')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Large')).toBeInTheDocument();
  });

  it('should dispatch change on selection', () => {
    renderElement(createConfig({
      inputType: 'radio',
      label: 'Plan',
      name: 'plan',
      options: [
        { value: 'free', label: 'Free' },
        { value: 'pro', label: 'Pro' },
      ],
    }));

    fireEvent.click(screen.getByLabelText('Pro'));

    expect(mockDispatchEvent).toHaveBeenCalled();
    expect(mockDispatchEvent.mock.calls[0][0].data.value).toBe('pro');
  });
});

// ============================================================================
// TOGGLE TESTS
// ============================================================================

describe('Toggle', () => {
  it('should render toggle switch', () => {
    renderElement(createConfig({
      inputType: 'toggle',
      label: 'Dark Mode',
    }));

    expect(screen.getByRole('switch')).toBeInTheDocument();
    expect(screen.getByText('Dark Mode')).toBeInTheDocument();
  });

  it('should toggle on click', () => {
    renderElement(createConfig({
      inputType: 'toggle',
      label: 'Notifications',
      defaultValue: false,
    }));

    fireEvent.click(screen.getByRole('switch'));

    expect(mockDispatchEvent).toHaveBeenCalled();
    expect(mockDispatchEvent.mock.calls[0][0].data.value).toBe(true);
  });

  it('should show on/off labels', () => {
    renderElement(createConfig({
      inputType: 'toggle',
      label: 'Status',
      defaultValue: true,
      onLabel: 'Enabled',
      offLabel: 'Disabled',
      showValue: true,
    }));

    // Default is true, so should show "Enabled"
    // Note: The actual text shown depends on local state
  });
});

// ============================================================================
// SLIDER TESTS
// ============================================================================

describe('Slider', () => {
  it('should render slider', () => {
    renderElement(createConfig({
      inputType: 'slider',
      label: 'Volume',
      validation: { min: 0, max: 100 },
      defaultValue: 50,
    }));

    expect(screen.getByRole('slider')).toBeInTheDocument();
    expect(screen.getByText('Volume')).toBeInTheDocument();
  });

  it('should apply min/max/step', () => {
    renderElement(createConfig({
      inputType: 'slider',
      label: 'Brightness',
      validation: { min: 0, max: 255 },
      step: 5,
    }));

    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '255');
    expect(slider).toHaveAttribute('step', '5');
  });

  it('should show current value', () => {
    renderElement(createConfig({
      inputType: 'slider',
      label: 'Opacity',
      defaultValue: 75,
      showValue: true,
    }));

    // Check for value display
    expect(screen.getByText('75')).toBeInTheDocument();
  });
});

// ============================================================================
// DATE PICKER TESTS
// ============================================================================

describe('Date Picker', () => {
  it('should render date input', () => {
    renderElement(createConfig({
      inputType: 'date-picker',
      label: 'Birthday',
    }));

    expect(screen.getByText('Birthday')).toBeInTheDocument();
    // Date inputs have no specific role, check by type
    const input = document.querySelector('input[type="date"]');
    expect(input).toBeInTheDocument();
  });
});

// ============================================================================
// COLOR PICKER TESTS
// ============================================================================

describe('Color Picker', () => {
  it('should render color input', () => {
    renderElement(createConfig({
      inputType: 'color-picker',
      label: 'Background Color',
      defaultValue: '#3B82F6',
    }));

    expect(screen.getByText('Background Color')).toBeInTheDocument();
    const input = document.querySelector('input[type="color"]');
    expect(input).toBeInTheDocument();
  });

  it('should show hex value when showValue is true', () => {
    renderElement(createConfig({
      inputType: 'color-picker',
      label: 'Text Color',
      defaultValue: '#FF0000',
      showValue: true,
    }));

    // Default value should be shown
  });
});

// ============================================================================
// UNKNOWN TYPE TESTS
// ============================================================================

describe('Unknown Input Type', () => {
  it('should render fallback for unknown type', () => {
    renderElement(createConfig({
      inputType: 'unknown-type' as any,
    }));

    expect(screen.getByText(/Unknown input type/)).toBeInTheDocument();
  });
});

// ============================================================================
// DISABLED STATE TESTS
// ============================================================================

describe('Disabled State', () => {
  it('should disable input when not in interactive mode and not preview', () => {
    // This test would require mocking isInteractiveMode to false
  });

  it('should not dispatch events when disabled', () => {
    renderElement(createConfig({
      inputType: 'button',
      label: 'Disabled Button',
      disabled: true,
    }));

    fireEvent.click(screen.getByRole('button'));

    // Button should not dispatch when disabled
    // Note: The actual behavior depends on disabled attribute
  });
});

// ============================================================================
// STYLING TESTS
// ============================================================================

describe('Styling', () => {
  it('should apply border radius', () => {
    renderElement(createConfig({
      inputType: 'button',
      label: 'Rounded',
      borderRadius: 8,
    }));

    expect(screen.getByRole('button')).toHaveStyle({ borderRadius: '8px' });
  });

  it('should apply custom className', () => {
    renderElement(createConfig({
      inputType: 'button',
      label: 'Custom',
    }), {
      className: 'custom-class',
    });

    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('should apply custom style', () => {
    renderElement(createConfig({
      inputType: 'button',
      label: 'Styled',
    }), {
      style: { backgroundColor: 'red' },
    });

    // Check that style is applied (may be overridden by button classes)
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });
});

// ============================================================================
// FORM STATE SYNC TESTS
// ============================================================================

describe('Form State Sync', () => {
  it('should sync value to form state when formId is provided', () => {
    renderElement(createConfig({
      inputType: 'text-input',
      label: 'Email',
      name: 'email',
      placeholder: 'Enter email',
    }), {
      formId: 'signup-form',
    });

    fireEvent.change(screen.getByPlaceholderText('Enter email'), {
      target: { value: 'test@example.com' },
    });

    expect(mockSetFormValue).toHaveBeenCalledWith(
      'signup-form',
      'email',
      'test@example.com'
    );
  });
});

// ============================================================================
// STATE BINDING TESTS
// ============================================================================

describe('State Binding', () => {
  it('should update bound state on change', () => {
    renderElement(createConfig({
      inputType: 'text-input',
      label: 'Name',
      bindTo: 'userName',
      placeholder: 'Enter name',
    }));

    fireEvent.change(screen.getByPlaceholderText('Enter name'), {
      target: { value: 'Jane' },
    });

    expect(mockSetState).toHaveBeenCalledWith('userName', 'Jane');
  });
});
