import { serve } from "inngest/next";

import { inngest, inngestFunctions } from "@/lib/pipeline/inngest";

export const runtime = "nodejs";
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({ client: inngest, functions: inngestFunctions });
