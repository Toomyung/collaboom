import { forwardRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
}

const COUNTRY_CODES = [
  { code: "+1", country: "US", flag: "🇺🇸", label: "US +1" },
] as const;

function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

function parsePhoneNumber(value: string): { countryCode: string; number: string } {
  if (!value) return { countryCode: "+1", number: "" };
  
  const cleaned = value.replace(/\s/g, "");
  
  if (cleaned.startsWith("+1")) {
    return { countryCode: "+1", number: cleaned.slice(2) };
  }
  
  return { countryCode: "+1", number: cleaned.replace(/\D/g, "") };
}

function combinePhoneNumber(countryCode: string, number: string): string {
  const digits = number.replace(/\D/g, "");
  if (!digits) return "";
  return `${countryCode} ${formatPhoneNumber(digits)}`;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value = "", onChange, onBlur, disabled, className, "data-testid": testId }, ref) => {
    const parsed = parsePhoneNumber(value);
    const [countryCode, setCountryCode] = useState(parsed.countryCode);
    const [localNumber, setLocalNumber] = useState(formatPhoneNumber(parsed.number));

    useEffect(() => {
      const parsed = parsePhoneNumber(value);
      setCountryCode(parsed.countryCode);
      setLocalNumber(formatPhoneNumber(parsed.number));
    }, [value]);

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      const digits = input.replace(/\D/g, "").slice(0, 10);
      const formatted = formatPhoneNumber(digits);
      setLocalNumber(formatted);
      
      if (onChange) {
        onChange(combinePhoneNumber(countryCode, digits));
      }
    };

    const handleCountryChange = (newCode: string) => {
      setCountryCode(newCode);
      if (onChange) {
        onChange(combinePhoneNumber(newCode, localNumber));
      }
    };

    return (
      <div className={cn("flex gap-2", className)}>
        <Select
          value={countryCode}
          onValueChange={handleCountryChange}
          disabled={disabled}
        >
          <SelectTrigger 
            className="w-[100px] flex-shrink-0"
            data-testid={testId ? `${testId}-country` : undefined}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUNTRY_CODES.map((country) => (
              <SelectItem key={country.code} value={country.code}>
                <span className="flex items-center gap-1.5">
                  <span>{country.flag}</span>
                  <span>{country.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          ref={ref}
          type="tel"
          inputMode="numeric"
          value={localNumber}
          onChange={handleNumberChange}
          onBlur={onBlur}
          disabled={disabled}
          placeholder="(555) 000-0000"
          className="flex-1"
          data-testid={testId}
        />
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";
