import { ReactNode, useEffect } from "react";
import { useLocation } from "@/quran/wouter-shim";
import { onPageChange, setBanner } from "@/quran/lib/ads";
import { showsBanner } from "@/quran/lib/credits";
import { BottomNavigation } from "./bottom-navigation";

/** Pages that carry the bottom navigation pill. */
const NAV_PAGES = new Set(["/", "/search", "/notifications"]);

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const isHome = location === "/";
  const showsNav = NAV_PAGES.has(location);

  useEffect(() => {
    void setBanner(showsBanner(location));
    void onPageChange(location);
  }, [location]);

  if (isHome) {
    return (
      <div className="w-full min-h-[100dvh] bg-background transition-colors duration-300 overflow-x-clip relative">
        <main className="w-full">
          {children}
        </main>
        <BottomNavigation />
      </div>
    );
  }

  // Extra bottom space so the bottom banner ad (and the nav pill) never covers content.
  return (
    <div className="min-h-[100dvh] flex flex-col w-full bg-background transition-colors duration-300">
      <main className="app-content flex-1 w-full px-4 py-2" style={showsNav ? { paddingBottom: "calc(24px + var(--ad-banner-height, 0px) + var(--bottom-navigation-space))" } : undefined}>
        {children}
      </main>
      {showsNav ? <BottomNavigation /> : null}
    </div>
  );
}
