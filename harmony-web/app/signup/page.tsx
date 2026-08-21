import { Suspense } from "react";
import type { Metadata } from "next";
import { SignupFlow } from "@/components/auth/SignupFlow";

export const metadata: Metadata = {
  title: "Create your workspace · Harmony",
};

/**
 * The signup stepper reads its current step from `?step=`, so the flow is
 * linkable and the browser's back button walks it in reverse. `useSearchParams`
 * needs a Suspense boundary to prerender.
 */
export default function SignupPage() {
  return (
    <Suspense fallback={<div className="app-skin" style={{ minHeight: "100vh" }} />}>
      <SignupFlow />
    </Suspense>
  );
}
