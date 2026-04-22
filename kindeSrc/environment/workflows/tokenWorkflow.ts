import {
  onUserTokenGeneratedEvent,
  WorkflowSettings,
  WorkflowTrigger,
  accessTokenCustomClaims,
} from "@kinde/infrastructure";

export const workflowSettings: WorkflowSettings = {
  id: "debugUserTokenGeneration",
  name: "DebugUserTokenGeneration",
  trigger: WorkflowTrigger.UserTokenGeneration,
  failurePolicy: {
    action: "stop",
  },
  bindings: {
    "kinde.accessToken": {},
    "kinde.env": {},
    url: {},
  },
};

export default async function (event: onUserTokenGeneratedEvent) {
  console.log("==== FULL EVENT START ====");
  console.log(JSON.stringify(event, null, 2));
  console.log("==== FULL EVENT END ====");

  const origin = event?.context?.auth?.origin;
  const isExistingSession = event?.context?.auth?.isExistingSession;

  console.log("origin:", origin);
  console.log("isExistingSession:", isExistingSession);

  const accessToken = accessTokenCustomClaims<{
    custom_auth_time?: string;
    auth_debug_origin?: string;
    auth_debug_existing_session?: string;
  }>();

  accessToken.auth_debug_origin = String(origin ?? "");
  accessToken.auth_debug_existing_session = String(isExistingSession ?? "");

  if (origin === "authorization_request" && isExistingSession === false) {
    accessToken.custom_auth_time = new Date().toISOString();
    console.log("Set custom_auth_time:", accessToken.custom_auth_time);
  } else {
    console.log("Did not set custom_auth_time");
  }
}