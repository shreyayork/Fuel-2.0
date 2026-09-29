import type { PostConfirmationTriggerEvent } from "aws-lambda";

/**
 * PostConfirmation trigger — intentionally a no-op.
 *
 * Fuel 2.0 owns user-to-account mapping in `account_members` (Postgres), not
 * in Cognito custom attributes. Invite acceptance happens in the OAuth
 * callback route (`/api/auth/callback`) where we have access to the `state`
 * param that carries the invite token — this trigger runs server-side inside
 * Cognito with no request context, so it can't consume the token from here.
 *
 * Keeping the Lambda attached to the pool (rather than removing the trigger
 * entirely) so we have a hook for future async post-signup work (analytics,
 * welcome-email enqueue, etc.) without re-deploying the auth stack.
 */
export const handler = async (
  event: PostConfirmationTriggerEvent,
): Promise<PostConfirmationTriggerEvent> => event;
