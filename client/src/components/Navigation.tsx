import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { BarChart2, Home } from "lucide-react";

export function Navigation() {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/audits", label: "Audit History", icon: BarChart2 },
    { href: "/rule-library", label: "Rule Library", icon: BarChart2 },
    { href: "/create-rule", label: "Create Rule", icon: BarChart2 },
  ];

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center space-x-4">
          <div className="font-semibold">Product Data Audit</div>
          <div className="flex space-x-4">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex items-center text-sm transition-colors hover:text-primary",
                  location === href
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="mr-2 h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
