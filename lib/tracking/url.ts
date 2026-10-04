import { z } from "zod";

/**
 * A campaign link is a web address, so only http and https are ever valid
 * destinations.
 *
 * Zod's `z.string().url()` is not enough on its own: it accepts anything
 * `new URL()` parses, which includes `javascript:`, `data:`, `file:` and
 * `vbscript:`. Those are never intentional link targets, and because a tracked
 * link is served from a public `/r/<slug>` URL that redirects, storing one
 * puts a non-web scheme straight into a `Location` response header. Rejecting
 * them at the edge keeps them out of the database rather than trusting every
 * future reader of `destinationUrl` to re-check.
 */
export function isWebUrl(value: string) {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * A destination URL that a campaign can be saved with: a web URL, or an empty
 * string meaning "no tracked link" (which clears the link).
 */
export const destinationUrlSchema = z
  .string()
  .refine(isWebUrl, "Must be an http or https URL");

export const optionalDestinationUrlSchema = z
  .union([destinationUrlSchema, z.literal("")])
  .optional()
  .nullable();