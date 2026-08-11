import type { AuthError } from "@supabase/supabase-js";

export function friendlyAuthError(error?: AuthError | Error | null) {
  if (!error) return "Sign in could not be completed. Please try again.";
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  const status = "status" in error && typeof error.status === "number" ? error.status : 0;
  const message = error.message.toLowerCase();

  if (code === "invalid_credentials" || message.includes("invalid login credentials"))
    return "Email or password is incorrect. Please check both and try again.";
  if (code === "email_not_confirmed" || message.includes("email not confirmed"))
    return "This account is not confirmed yet. Contact an administrator for help.";
  if (code === "user_banned" || message.includes("banned"))
    return "This account is currently disabled. Contact an administrator.";
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit" || status === 429 || message.includes("rate limit"))
    return "Too many attempts were made. Please wait a few minutes and try again.";
  if (code === "captcha_failed") return "The security check failed. Refresh the page and try again.";
  if (code === "validation_failed" || code === "email_address_invalid")
    return "Enter a valid email address.";
  if (code === "weak_password") return "Choose a stronger password with at least 8 characters.";
  if (code === "same_password") return "Your new password must be different from your current password.";
  if (code === "session_not_found" || code === "refresh_token_not_found" || message.includes("refresh token"))
    return "Your session has expired. Sign in again to continue.";
  if (message.includes("failed to fetch") || message.includes("network") || message.includes("load failed"))
    return "The portal cannot reach the server. Check your connection and try again.";

  return "Sign in could not be completed. Please try again or reset your password.";
}