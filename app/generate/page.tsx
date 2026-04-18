import { Suspense } from "react";
import GenerateClient from "./generate-client";

export default function GeneratePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-8 text-sm text-neutral-500">Loading…</div>}>
      <GenerateClient />
    </Suspense>
  );
}
