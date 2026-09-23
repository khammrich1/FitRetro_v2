/** Billing runs in Stripe test mode only for now. Secret keys (sk_) and restricted keys (rk_)
 * both encode their mode in the prefix, so a live key is rejected before any API call. */
export function isTestModeSecretKey(key: string): boolean {
  return key.startsWith("sk_test_") || key.startsWith("rk_test_");
}
