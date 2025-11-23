"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/auth";
import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { applyTheme, setStoredTheme, getStoredTheme, type ThemeMode } from "@/lib/theme";
import { Sun, Moon, Laptop } from "lucide-react";

export default function SiteHeader() {
  const { user, signOut } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();

  const nextParam = useMemo(() => encodeURIComponent(pathname || "/"), [pathname]);
  const protect = (href: string) => (user ? href : `/sign-in?next=${encodeURIComponent(href)}`);

  const onSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out");
      router.push("/");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to sign out");
    }
  };
  const selectTheme = (m: ThemeMode) => {
    setStoredTheme(m);
    applyTheme(m);
  };
  const cycleTheme = () => {
    const current = getStoredTheme();
    const next: ThemeMode = current === "light" ? "dark" : current === "dark" ? "system" : "light";
    selectTheme(next);
  };
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
            <Link href={protect("/profile")} className="text-muted-foreground hover:text-foreground transition-colors">
              Profile
            </Link>
            <Link href={protect("/submissions")} className="text-muted-foreground hover:text-foreground transition-colors">
              My Submissions
            </Link>
            <Link href={protect("/dashboard")} className="text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <Link href="/debug" className="text-muted-foreground hover:text-foreground transition-colors">
              Debug
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className={navigationMenuTriggerStyle()}>
                  <span className="flex items-center gap-2">
                    <Sun className="h-4 w-4 hidden dark:inline" aria-hidden />
                    <Moon className="h-4 w-4 inline dark:hidden" aria-hidden />
                    <span className="hidden sm:inline">Theme</span>
                  </span>
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[180px] gap-1 p-1">
                    <li>
                      <button className="w-full text-left px-2 py-1.5 rounded hover:bg-muted/50 text-sm" onClick={() => selectTheme("light")}>
                        <span className="inline-flex items-center gap-2"><Sun className="h-4 w-4" /> Light</span>
                      </button>
                    </li>
                    <li>
                      <button className="w-full text-left px-2 py-1.5 rounded hover:bg-muted/50 text-sm" onClick={() => selectTheme("dark")}>
                        <span className="inline-flex items-center gap-2"><Moon className="h-4 w-4" /> Dark</span>
                      </button>
                    </li>
                    <li>
                      <button className="w-full text-left px-2 py-1.5 rounded hover:bg-muted/50 text-sm" onClick={() => selectTheme("system")}>
                        <span className="inline-flex items-center gap-2"><Laptop className="h-4 w-4" /> System</span>
                      </button>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              {user ? (
                <NavigationMenuItem>
                  <NavigationMenuTrigger className={navigationMenuTriggerStyle()}>
                    <span className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>{user.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:inline">{user.username}</span>
                    </span>
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[180px] gap-1 p-1">
                      <li>
                        <NavigationMenuLink asChild>
                          <Link className="block px-2 py-1.5 rounded hover:bg-muted/50 text-sm" href="/profile">Profile</Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <button className="w-full text-left px-2 py-1.5 rounded hover:bg-muted/50 text-sm text-red-600" onClick={onSignOut}>
                          Sign out
                        </button>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ) : (
                <NavigationMenuItem>
                  <div className="flex items-center gap-2">
                    <Button asChild variant="ghost">
                      <Link href={`/sign-in?next=${nextParam}`}>Sign in</Link>
                    </Button>
                    <Button asChild>
                      <Link href="/sign-up">Sign up</Link>
                    </Button>
                  </div>
                </NavigationMenuItem>
              )}
            </NavigationMenuList>
          </NavigationMenu>
        </div>
      </div>
      {/* Mobile nav */}
      <div className="md:hidden border-t">
        <nav className="container mx-auto flex items-center gap-4 overflow-x-auto px-4 py-2 text-sm">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
            Home
          </Link>
          <Link href={protect("/profile")} className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
            Profile
          </Link>
          <Link href={protect("/submissions")} className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
            My Submissions
          </Link>
          <Link href={protect("/dashboard")} className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
            Dashboard
          </Link>
          <div className="ml-auto">
            <Button variant="ghost" size="sm" onClick={cycleTheme} aria-label="Toggle theme">
              <Sun className="h-5 w-5 hidden dark:inline" />
              <Moon className="h-5 w-5 inline dark:hidden" />
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
