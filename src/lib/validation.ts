import type { UserInput } from "@/types";

/* -------------------------------------------------------------------------- */
/* Mobile validation                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Sanitize mobile input while the user types.
 *
 * Accepted characters:
 * - digits
 * - spaces
 * - + at the beginning
 *
 * Limits:
 * - Without + : maximum 10 local digits (India default)
 * - With +    : maximum 15 E.164 digits
 *
 * Examples:
 *   9876543210
 *   98765 43210
 *   +919876543210
 *   +91 98765 43210
 */
export const sanitizeMobileInput = (
  value: string,
): string => {
  let cleaned = String(
    value ?? "",
  ).replace(/[^\d+ ]/g, "");

  /* Keep + only at the beginning. */
  if (cleaned.includes("+")) {
    cleaned =
      "+" +
      cleaned.replace(
        /\+/g,
        "",
      );
  }

  /* Remove spaces before + / number. */
  cleaned = cleaned.replace(
    /^\s+/,
    "",
  );

  const hasCountryCode =
    cleaned.startsWith("+");

  const maxDigits =
    hasCountryCode
      ? 15
      : 10;

  let digitCount = 0;

  return cleaned.replace(
    /\d/g,
    (digit) => {
      if (
        digitCount >=
        maxDigits
      ) {
        return "";
      }

      digitCount += 1;

      return digit;
    },
  );
};

/**
 * Validate a mobile number.
 *
 * Accepted:
 *   9876543210
 *   98765 43210
 *   +919876543210
 *   +1 202 555 0123
 *
 * Rejected:
 *   987654321
 *   98765432101
 *   +123
 *   +1234567890123456
 *   91 9876543210
 */
export const validateMobileInput = (
  value: string,
): string | null => {
  const raw = String(
    value ?? "",
  ).trim();

  if (!raw) {
    return "Mobile number is required.";
  }

  /*
   * Only digits, spaces and optional +
   * at the beginning.
   */
  if (
    !/^\+?[0-9]+(?:\s+[0-9]+)*$/.test(
      raw,
    )
  ) {
    return (
      "Use only numbers, spaces, and an optional + at the beginning."
    );
  }

  const hasCountryCode =
    raw.startsWith("+");

  const digits =
    raw.replace(/\D/g, "");

  if (hasCountryCode) {
    if (digits.length < 8 || digits.length > 15) {
      return "Enter a valid international number with 8 to 15 digits after +.";
    }
  } else if (digits.length !== 10) {
    return (
      "Enter a valid 10-digit mobile number."
    );
  }

  return null;
};

export const isValidMobile = (
  value: string,
): boolean =>
  validateMobileInput(value) === null;

/**
 * Normalize mobile number before sending it to API/database.
 *
 * Example:
 *   "+91 98765 43210"
 *   -> "919876543210"
 */
export const normalizeMobile = (
  value: string,
): string =>
  String(value ?? "").replace(
    /\D/g,
    "",
  );

/* -------------------------------------------------------------------------- */
/* User validation                                                            */
/* -------------------------------------------------------------------------- */

export const validateUserFields = (
  fields: UserInput,
  options: {
    requirePassword: boolean;
    allowAdminRole?: boolean;
  },
): string | null => {
  if (!fields.name.trim()) {
    return "Name is required.";
  }

  const mobileError =
    validateMobileInput(
      fields.mobileNo,
    );

  if (mobileError) {
    return mobileError;
  }

  const username =
    fields.username.trim();

  if (!username) {
    return "Username is required.";
  }

  if (username.length < 3) {
    return (
      "Username must be at least 3 characters."
    );
  }

  if (/\s/.test(username)) {
    return (
      "Username cannot contain spaces."
    );
  }

  if (
    options.requirePassword &&
    !fields.password
  ) {
    return "Password is required.";
  }

  if (
    fields.password &&
    fields.password.length < 6
  ) {
    return (
      "Password must be at least 6 characters."
    );
  }

  if (
    fields.role !== "support" &&
    fields.role !== "caller" &&
    !(options.allowAdminRole && fields.role === "admin")
  ) {
    return "Select a role.";
  }

  return null;
};
