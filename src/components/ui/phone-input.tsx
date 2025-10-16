import React from 'react';
import { Input } from '@/components/ui/input';
import { Phone } from 'lucide-react';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  disabled,
  placeholder = "12345678"
}) => {
  // Extract only the 8 digits from the full number (+506XXXXXXXX)
  const displayValue = value.startsWith('+506') ? value.slice(4) : value;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    // Allow only numeric characters
    const numericOnly = input.replace(/\D/g, '');
    // Limit to 8 digits
    const limited = numericOnly.slice(0, 8);
    // Always save with +506 prefix
    onChange(limited ? `+506${limited}` : '');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].includes(e.keyCode)) {
      return;
    }
    // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    if ((e.ctrlKey || e.metaKey) && [65, 67, 86, 88].includes(e.keyCode)) {
      return;
    }
    // Prevent non-numeric characters
    if ((e.keyCode < 48 || e.keyCode > 57) && (e.keyCode < 96 || e.keyCode > 105)) {
      e.preventDefault();
    }
  };

  return (
    <div className="relative">
      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
      <div className="absolute left-10 top-3 text-base text-muted-foreground font-medium">
        +506
      </div>
      <Input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="pl-[4.5rem] h-12 text-base"
        disabled={disabled}
        maxLength={8}
      />
    </div>
  );
};
