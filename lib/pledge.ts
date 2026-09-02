export interface PledgeInput {
  amountChf: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export type ValidationResult =
  | { ok: true; value: PledgeInput }
  | { ok: false; errors: Record<string, string> };

export const MIN_PLEDGE_CHF = 1;
export const MAX_PLEDGE_CHF = 1_000_000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\-\s0-9]{5,30}$/;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Validate and normalize an untrusted pledge payload. Returns trimmed, typed
 * values on success or a map of field -> message on failure.
 */
export function validatePledge(raw: unknown): ValidationResult {
  const errors: Record<string, string> = {};
  const input = (raw ?? {}) as Record<string, unknown>;

  const amountRaw =
    typeof input.amountChf === "number"
      ? input.amountChf
      : Number(asString(input.amountChf));
  const amountChf = Math.round((Number.isFinite(amountRaw) ? amountRaw : NaN) * 100) / 100;
  if (!Number.isFinite(amountChf)) {
    errors.amountChf = "Enter a valid amount.";
  } else if (amountChf < MIN_PLEDGE_CHF) {
    errors.amountChf = `Minimum pledge is CHF ${MIN_PLEDGE_CHF}.`;
  } else if (amountChf > MAX_PLEDGE_CHF) {
    errors.amountChf = `Maximum pledge is CHF ${MAX_PLEDGE_CHF.toLocaleString("en-US")}.`;
  }

  const firstName = asString(input.firstName);
  if (firstName.length < 1) errors.firstName = "First name is required.";
  else if (firstName.length > 100) errors.firstName = "First name is too long.";

  const lastName = asString(input.lastName);
  if (lastName.length < 1) errors.lastName = "Last name is required.";
  else if (lastName.length > 100) errors.lastName = "Last name is too long.";

  const email = asString(input.email).toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 200) {
    errors.email = "Enter a valid email address.";
  }

  const phone = asString(input.phone);
  if (!PHONE_RE.test(phone)) {
    errors.phone = "Enter a valid phone number.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: { amountChf, firstName, lastName, email, phone },
  };
}
