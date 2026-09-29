import type { CustomMessageTriggerEvent } from "aws-lambda";
import { resolveCognitoCustomMessage } from "../../lib/cognito-email-templates";

export const handler = async (
  event: CustomMessageTriggerEvent,
): Promise<CustomMessageTriggerEvent> => {
  const attrs = event.request.userAttributes ?? {};
  const content = resolveCognitoCustomMessage({
    triggerSource: event.triggerSource,
    codeParameter: event.request.codeParameter,
    usernameParameter: event.request.usernameParameter,
    givenName: attrs.given_name ?? attrs.name ?? null,
  });

  if (content) {
    event.response.emailSubject = content.emailSubject;
    event.response.emailMessage = content.emailMessage;
    event.response.smsMessage = content.smsMessage;
  }

  return event;
};
