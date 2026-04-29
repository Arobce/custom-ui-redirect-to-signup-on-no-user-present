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

interface BillingInfo {
  customer_id?: string | null;
}

interface OrganizationResponse {
  code?: string;
  billing?: BillingInfo;
  [key: string]: unknown;
}

interface UserResponse {
  id?: string;
  billing?: BillingInfo;
  [key: string]: unknown;
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

const FREE_PLAN_CODE = "standard-organization-plans";

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

    // 1. Prefer org billing customer for org-only billing
    const { data: org } = await kindeAPI.get<OrganizationResponse>({
      endpoint: `organization?code=${orgCode}&expand=billing`,
    });

    let customerId = org?.billing?.customer_id ?? null;

    // 2. Fallback to user billing customer only if org billing customer is missing
    if (!customerId) {
      console.warn(
        `No org billing customer found for ${orgCode}. Trying user billing customer.`
      );

      const { data: user } = await kindeAPI.get<UserResponse>({
        endpoint: `user?id=${userId}&expand=billing`,
      });

      customerId = user?.billing?.customer_id ?? null;
    }

    if (!customerId) {
      console.warn(
        `No billing customer found for org ${orgCode} or user ${userId}. Cannot assign Free plan.`
      );
      return;
    }

    // 3. Check if billing customer already has an agreement
    const { data: agreementsResponse } =
      await kindeAPI.get<BillingAgreementsResponse>({
        endpoint: `billing/agreements?customer_id=${customerId}`,
      });

    const agreements = ensureArray<BillingAgreement>(
      agreementsResponse?.agreements
    );

    if (agreements.length > 0) {
      console.log(
        `Billing customer ${customerId} already has an agreement. Skipping.`
      );
      return;
    }

    // 4. Create billing agreement with Free plan
    await kindeAPI.post({
      endpoint: "billing/agreements",
      data: {
        customer_id: customerId,
        plan_code: FREE_PLAN_CODE,
        is_invoice_now: false,
        is_prorate: false,
      },
    });

    console.log(
      `Free plan ${FREE_PLAN_CODE} assigned to customer ${customerId} for org ${orgCode}.`
    );
  } catch (err) {
    console.error("Workflow error:", (err as Error).message ?? err);
    throw err;
  }
}