import Link from "next/link";

import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <h1 className="text-4xl font-semibold tracking-tight">Know your max bid before you bid.</h1>
      <Button asChild size="lg">
        <Link href="/app">Analyze a lot</Link>
      </Button>
    </div>
  );
}
