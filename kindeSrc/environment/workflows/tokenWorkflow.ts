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
    // -------- FULL EVENT DEBUG --------
    try {
        console.log("==== FULL EVENT START ====");
        console.log(JSON.stringify(event, null, 2));
        console.log("==== FULL EVENT END ====");
    } catch (e) {
        console.log("Could not stringify full event");
    }

    // -------- IMPORTANT FIELDS --------
    console.log("==== AUTH CONTEXT ====");
    console.log("origin:", event?.context?.auth?.origin);
    console.log("method:", event?.context?.auth?.method);
    console.log("provider:", event?.context?.auth?.provider);
    console.log("session:", event?.context?.session);
    console.log("user:", event?.context?.user?.id);

    // -------- TOKEN CLAIMS --------
    const accessToken = accessTokenCustomClaims<{
        custom_auth_time?: string;
    }>();

    // TEMP: always set for testing
    accessToken.custom_auth_time = new Date().toISOString();

    console.log("Set custom_auth_time:", accessToken.custom_auth_time);

    // -------- OPTIONAL: CONDITIONAL LOGGING --------
    if (event?.context?.auth?.origin === "refresh_token_request") {
        console.log("⚠️ This is a REFRESH TOKEN request");
    }

    if (event?.context?.auth?.origin === "authorization_request") {
        console.log("✅ This is an AUTHORIZATION request (likely login)");
    }
}