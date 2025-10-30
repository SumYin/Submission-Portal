"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SiteHeader() {
  return (
  <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-base font-semibold hover:opacity-90">
            Submission Portal
          </Link>
          <nav className="hidden items-center gap-4 text-sm md:flex">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              Home
            </Link>
            <Link href="/profile" className="text-muted-foreground hover:text-foreground transition-colors">
              Profile
            </Link>
            <Link href="/submissions" className="text-muted-foreground hover:text-foreground transition-colors">
              My Submissions
            </Link>
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up">Sign up</Link>
          </Button>
        </div>
      </div>
      {/* Mobile nav */}
      <div className="md:hidden border-t">
        <nav className="container mx-auto flex items-center gap-4 overflow-x-auto px-4 py-2 text-sm">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
            Home
          </Link>
          <Link href="/profile" className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
            Profile
          </Link>
          <Link href="/submissions" className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
            My Submissions
          </Link>
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
            Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
