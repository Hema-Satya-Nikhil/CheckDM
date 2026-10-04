/**
 * User-facing messages for provider errors.
 *
 * `MetaApiError.message` is built for operators, not end users: it appends the
 * Graph endpoint path and a `[code=… sub=… type=… trace=…]` block. Returning it
 * verbatim hands the browser provider internals, a request path and a Meta trace
 * id that has no value to the person reading the screen.
 *
 * What is worth keeping is Meta's own sentence, because it is genuinely
 * actionable ("Message text is outside the allowed window" tells the user why
 * nothing was delivered). So this strips the diagnostic tail rather than
 * replacing the message with a useless "something went wrong".
 *
 * The full error is still logged server-side by the caller, so the operator
 * keeps the code, subcode, path and trace id.
 */

const DIAGNOSTIC_TAIL = /\s*\(\s*\/[^)]*\)\s*\[code=.*\]\s*$/;
const LONE_TAIL = /\s*\[code=.*\]\s*$/;
const PATH_ONLY = /\s*\(\s*\/[^)]*\)\s*$/;

/** Strip operator-only detail from a provider error message. */
export function toUserFacingProviderMessage(message: string): string {
  const trimmed = message
    .replace(DIAGNOSTIC_TAIL, "")
    .replace(LONE_TAIL, "")
    .replace(PATH_ONLY, "")
    .trim();
  return trimmed.length > 0 ? trimmed : "The request was rejected by Instagram.";
}
