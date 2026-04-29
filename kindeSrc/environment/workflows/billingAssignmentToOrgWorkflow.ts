import {
  createKindeAPI,
  WorkflowSettings,
  WorkflowTrigger,
} from "@kinde/infrastructure";

export const workflowSettings: WorkflowSettings = {
  id: "assignFreePlanOnTokenGeneration",
  name: "Assign Free Plan To New Org",
  trigger: WorkflowTrigger.UserTokenGeneration,
  failurePolicy: {
    action: "stop",
  },
  bindings: {
    "kinde.fetch": {},
    "kinde.env": {},
    url: {},
  },
};

interface WorkflowEvent {
  context: {
    user?: {
      id?: string;
    };
    organization?: {
      code?: string;
    };
  };
}

interface BillingAgreement {
  id?: string;
  plan_code?: string;
  status?: string;
  [key: string]: unknown;
}

interface BillingAgreementsResponse {
  agreements?: BillingAgreement[];
  [key: string]: unknown;
}

const FREE_PLAN_CODE = "quodsi_free";

const ensureArray = <T,>(value: unknown): T[] =>
  Array.isArray(value) ? (value as T[]) : [];

export default async function Workflow(event: WorkflowEvent) {
  try {
    console.log("Assign Free Plan workflow executed");

    const userId = event.context?.user?.id;
    const orgCode = event.context?.organization?.code;

    if (!userId) {
      console.warn("No user ID found. Skipping workflow.");
      return;
    }

    if (!orgCode) {
      console.warn("No organization code found. Skipping workflow.");
      return;
    }

    const kindeAPI = await createKindeAPI(event);

    /**
     * Step 1:
     * Check whether the org already has a billing agreement.
     *
     * IMPORTANT:
     * Confirm this endpoint internally. This is the likely shape,
     * but the exact public endpoint may differ.
     */
    const { data: agreementsResponse } =
      await kindeAPI.get<BillingAgreementsResponse>({
        endpoint: `billing/agreements?organization_code=${orgCode}`,
      });

    const agreements = ensureArray<BillingAgreement>(
      agreementsResponse?.agreements
    );

    if (agreements.length > 0) {
      console.log(
        `Organization ${orgCode} already has a billing agreement. Skipping.`
      );
      return;
    }

    /**
     * Step 2:
     * Attach the Free plan to the org.
     *
     * IMPORTANT:
     * Replace this endpoint/body with the confirmed Management API endpoint.
     * Do not use internal admin URLs like:
     * /organization_plan_manual_assignment/index
     */
    await kindeAPI.post({
      endpoint: "billing/agreements",
      data: {
        organization_code: orgCode,
        billing_plan_code: FREE_PLAN_CODE,
      },
    });

    console.log(
      `Free plan ${FREE_PLAN_CODE} assigned to organization ${orgCode} for user ${userId}`
    );
  } catch (err) {
    console.error("Workflow error:", (err as Error).message ?? err);
    throw err;
  }
}