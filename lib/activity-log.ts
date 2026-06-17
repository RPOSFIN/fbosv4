/** Server-side only. Use API routes for activity logging from the client. */
export async function logActivity() {
  throw new Error(
    "logActivity is server-only. All writes go through /api routes."
  );
}
