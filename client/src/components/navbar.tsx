import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  Menu,
  Bell,
  User,
  LogOut,
  MessageSquare,
  CreditCard,
  Sparkles,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

export default function Navbar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { subscription } = useSubscription();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Define navigation items
  const navItems = [
    { name: "Dashboard", href: "/" },
    { name: "Forms", href: "/forms" },
    { name: "Active Forms", href: "/published-forms" },
  ];

  const isLinkActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/">
                <span className="text-primary text-xl font-bold cursor-pointer">
                  FormPulse
                </span>
              </Link>
            </div>

            {/* Desktop navigation */}
            <nav className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isLinkActive(item.href)
                      ? "border-primary text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* User menu (desktop) */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {/* Upgrade button (only for free plan) */}
            {subscription && subscription.plan === "free" && (
              <Button
                variant="outline"
                size="sm"
                className="mr-3 text-xs"
                asChild
              >
                <Link
                  href="/subscription/upgrade"
                  className="flex items-center"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  Upgrade
                </Link>
              </Button>
            )}

            {/* Plan badge */}
            {subscription && (
              <Badge
                variant={subscription.plan === "paid" ? "default" : "outline"}
                className="mr-3"
              >
                {subscription.plan === "paid" ? "Pro Plan" : "Free Plan"}
              </Badge>
            )}

            <Button variant="ghost" size="icon" className="mr-2">
              <Bell className="h-5 w-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90"
                >
                  {user ? getInitials(user.username) : "U"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center w-full">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/subscription/upgrade"
                    className="flex items-center w-full"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    <span>Subscription</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/contact" className="flex items-center w-full">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    <span>Contact Us</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <div className="py-4">
                  <div className="mb-8">
                    <span className="text-primary text-xl font-bold">
                      FormPulse
                    </span>
                  </div>

                  <nav className="flex flex-col space-y-4">
                    {navItems.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`px-3 py-2 rounded-md text-base font-medium ${
                          isLinkActive(item.href)
                            ? "bg-primary/10 text-primary"
                            : "text-gray-700 hover:bg-primary/90"
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {item.name}
                      </Link>
                    ))}

                    <div className="pt-4 border-t border-gray-200">
                      {/* Mobile subscription status and upgrade button */}
                      <div className="px-3 py-2 flex items-center justify-between">
                        <div className="flex items-center">
                          <CreditCard className="h-4 w-4 mr-2" />
                          <span className="text-sm">
                            {subscription?.plan === "paid"
                              ? "Pro Plan"
                              : "Free Plan"}
                          </span>
                        </div>

                        {subscription?.plan === "free" && (
                          <Link
                            href="/subscription/upgrade"
                            className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md font-medium"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            Upgrade
                          </Link>
                        )}
                      </div>

                      <Link
                        href="/profile"
                        className="px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 block mt-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Profile
                      </Link>
                      
                      <Link
                        href="/subscription/upgrade"
                        className="px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 block mt-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Manage Subscription
                      </Link>
                      
                      <Link
                        href="/contact"
                        className="px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 block mt-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Contact Us
                      </Link>

                      <button
                        className="mt-4 w-full px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 text-left"
                        onClick={() => {
                          handleLogout();
                          setMobileMenuOpen(false);
                        }}
                      >
                        Log out
                      </button>
                    </div>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
