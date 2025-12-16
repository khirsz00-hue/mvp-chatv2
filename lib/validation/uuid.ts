/**
 * UUID Validation Utilities
 * 
 * Provides validation for UUID format to prevent PostgreSQL errors
 */

/**
 * UUID v4 regex pattern
 * Matches format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Validates if a string is a valid UUID format
 * 
 * @param value - The string to validate
 * @returns true if valid UUID format, false otherwise
 */
export function isValidUUID(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') {
    return false
  }
  return UUID_REGEX.test(value)
}

/**
 * Validates UUID and returns error message if invalid
 * 
 * @param value - The string to validate
 * @param fieldName - The name of the field for error messages (default: 'userId')
 * @returns null if valid, error message string if invalid
 */
export function validateUUID(
  value: string | null | undefined,
  fieldName: string = 'userId'
): string | null {
  if (!value) {
    return `${fieldName} parameter is required`
  }
  
  if (!isValidUUID(value)) {
    return `Invalid ${fieldName} format - must be a valid UUID`
  }
  
  return null
}
