import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="w-full border-t bg-background">
      <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground md:h-16 md:flex-row">
        <p className="order-2 md:order-1">© {new Date().getFullYear()} Submission Portal</p>
        <nav className="order-1 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 md:order-2">
          <Link
            href="https://github.com/American-School-of-Barcelona/Submission-Portal-IA"
            target="_blank"
            rel="noreferrer noopener"
            className="hover:text-foreground transition-colors"
          >
            GitHub Repo
          </Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms of Service
          </Link>
          <Link href="/contact" className="hover:text-foreground transition-colors">
            Contact
          </Link>
        </nav>
      </div>
    </footer>
  );
}
