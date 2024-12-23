import { Link } from "wouter";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Loader2 className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">
              Product Feed Auditor
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link href="/rules">
              <Button variant="ghost">Rule Library</Button>
            </Link>
            <Link href="/create-rule">
              <Button variant="ghost">Create Rule</Button>
            </Link>
          </nav>
        </div>
      </div>
    </nav>
  );
}
