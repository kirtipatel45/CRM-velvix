/**
 * Global Validation Utilities for CRM Velvix (Frontend)
 * - Email formatting validation
 * - Phone number validation (10-digit national number with multi-country code support)
 */

export const PHONE_ERROR_MSG =
  'Phone number must be 10 digits (or include a valid international country code, e.g. +1 (555) 234-5671 or +91 9876543210)';

export const EMAIL_ERROR_MSG =
  'Please provide a valid email address (e.g. name@company.com)';

/**
 * Validates email formatting across the software.
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length > 254) return false;
  // Reject consecutive dots
  if (/\.{2,}/.test(trimmed)) return false;
  const emailRegex = /^[a-zA-Z0-9_%+-]+(?:\.[a-zA-Z0-9_%+-]+)*@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
  return emailRegex.test(trimmed);
}

/**
 * Validates phone numbers supporting standard 10-digit domestic formats and all international country code formats.
 * @param {string} phone
 * @returns {boolean}
 */
export function isValidPhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const trimmed = phone.trim();
  if (!trimmed) return false;

  // Allowed characters: +, digits, spaces, -, (, ), .
  if (!/^\+?[0-9\s\-().]{7,25}$/.test(trimmed)) {
    return false;
  }

  const digits = trimmed.replace(/\D/g, '');

  // 1. Exact 10-digit number (standard 10-digit domestic phone number)
  if (digits.length === 10) {
    return true;
  }

  // 2. International format with explicit '+' or '00' international access prefix
  // Supports all country codes worldwide (1 to 4 digit country code + 9-10 digit national number: 10 to 15 digits)
  if (trimmed.startsWith('+') || trimmed.startsWith('00')) {
    const raw = trimmed.startsWith('00') ? digits.slice(2) : digits;
    if (raw.length >= 10 && raw.length <= 15) {
      return true;
    }
  }

  // 3. Multi-country phone number without '+' (11 to 14 digits: 1 to 4 digit country code + 10 digit subscriber number)
  if (digits.length >= 11 && digits.length <= 14) {
    return true;
  }

  return false;
}
