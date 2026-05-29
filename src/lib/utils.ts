import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format an Int cents value as USD currency.
 * Used throughout the wardrobe surface where all prices are stored as Int cents
 * (per Dress schema: competitionPrice, seasonalPrice, securityDeposit, cleaningFee, purchasePrice).
 *
 * @example formatCurrencyFromCents(37500) // "$375.00"
 */
export function formatCurrencyFromCents(cents: number): string {
  return formatCurrency(cents / 100);
}

/**
 * Formats a name to proper case (capitalizes first letter of each word)
 * Examples: "john doe" -> "John Doe", "MARY SMITH" -> "Mary Smith"
 * Handles special cases like "McDonald", "O'Brien", "van der Berg"
 */
export function toProperCase(name: string): string {
  if (!name || typeof name !== "string") {
    return "";
  }

  // Trim and normalize whitespace
  const trimmed = name.trim().replace(/\s+/g, " ");

  // Special prefixes that should stay lowercase (unless at start)
  const lowercasePrefixes = ["van", "de", "der", "von", "del", "da", "di"];

  return trimmed
    .toLowerCase()
    .split(" ")
    .map((word, index) => {
      // Handle hyphenated names like "Mary-Ann"
      if (word.includes("-")) {
        return word
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join("-");
      }

      // Handle names with apostrophes like "O'Brien"
      if (word.includes("'")) {
        return word
          .split("'")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join("'");
      }

      // Keep lowercase prefixes lowercase (unless first word)
      if (index > 0 && lowercasePrefixes.includes(word)) {
        return word;
      }

      // Standard capitalization
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Formats phone numbers to a consistent format
 * Examples: "1234567890" -> "(123) 456-7890", "+1-123-456-7890" -> "(123) 456-7890"
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone || typeof phone !== "string") {
    return "";
  }

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // Handle 10-digit US phone numbers
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // Handle 11-digit numbers (with country code 1)
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  // Return original if format is unrecognized
  return phone.trim();
}

/**
 * Formats postal/zip codes to uppercase
 * Examples: "90210" -> "90210", "m5h 2n2" -> "M5H 2N2"
 */
export function formatPostalCode(postalCode: string): string {
  if (!postalCode || typeof postalCode !== "string") {
    return "";
  }

  // Trim and uppercase
  const formatted = postalCode.trim().toUpperCase();

  // For Canadian postal codes (A1A 1A1 format), ensure space in middle
  if (/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(formatted.replace(/\s/g, ""))) {
    const clean = formatted.replace(/\s/g, "");
    return `${clean.slice(0, 3)} ${clean.slice(3)}`;
  }

  return formatted;
}

/**
 * Formats street addresses to proper case
 * Examples: "123 main st" -> "123 Main St", "456 PARK AVE" -> "456 Park Ave"
 */
export function formatAddress(address: string): string {
  if (!address || typeof address !== "string") {
    return "";
  }

  // Common street abbreviations that should be capitalized
  const abbreviations = ["St", "Ave", "Rd", "Blvd", "Dr", "Ln", "Ct", "Pl", "Way", "Pkwy"];

  const words = address.trim().toLowerCase().split(" ");

  return words
    .map((word) => {
      // Keep numbers as-is
      if (/^\d+$/.test(word)) {
        return word;
      }

      // Check if it's a common abbreviation
      const upperWord = word.charAt(0).toUpperCase() + word.slice(1);
      if (abbreviations.includes(upperWord)) {
        return upperWord;
      }

      // Handle compass directions (N, S, E, W, NE, NW, SE, SW)
      if (/^[nsew]{1,2}$/i.test(word)) {
        return word.toUpperCase();
      }

      // Standard word capitalization
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Formats city names to proper case
 * Examples: "los angeles" -> "Los Angeles", "NEW YORK" -> "New York"
 */
export function formatCity(city: string): string {
  if (!city || typeof city !== "string") {
    return "";
  }

  return toProperCase(city);
}

/**
 * Formats email addresses to lowercase (standard practice)
 * Examples: "John.Doe@EXAMPLE.com" -> "john.doe@example.com"
 */
export function formatEmail(email: string): string {
  if (!email || typeof email !== "string") {
    return "";
  }

  return email.trim().toLowerCase();
}
