import { Link, useLocation } from "@tanstack/react-router";
import type { MouseEvent, SVGProps } from "react";
import { Bell, Search, type LucideIcon } from "lucide-react";

/** Solid house with a light door, as in the supplied bar design. */
function HomeSolid(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props} fill="none">
      <path d="M3.2 10.4 12 3.2l8.8 7.2V20a1.2 1.2 0 0 1-1.2 1.2H4.4A1.2 1.2 0 0 1 3.2 20Z" fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="9.6" y="13.2" width="4.8" height="8" rx="0.9" className="bottom-navigation-door" />
    </svg>
  );
}

/** Rounded pill bar with the three main sections: home, notifications, search. */
const items: ReadonlyArray<{ to: string; label: string; icon: LucideIcon | typeof HomeSolid; tone: string }> = [
  { to: "/", label: "الرئيسية", icon: HomeSolid, tone: "home" },
  { to: "/notifications", label: "الإشعارات", icon: Bell, tone: "bell" },
  { to: "/search", label: "البحث", icon: Search, tone: "search" },
];

/** Replays the tapped icon's own short animation (bell rings, …) without re-rendering. */
function playTapAnimation(event: MouseEvent<HTMLAnchorElement>) {
  const icon = event.currentTarget.querySelector<HTMLElement>(".bottom-navigation-icon");
  if (!icon) return;
  icon.classList.remove("bottom-navigation-icon--tapped");
  void icon.offsetWidth; // restart the animation
  icon.classList.add("bottom-navigation-icon--tapped");
  icon.addEventListener("animationend", () => icon.classList.remove("bottom-navigation-icon--tapped"), { once: true });
}

export function BottomNavigation() {
  const pathname = useLocation({ select: (location) => location.pathname });
  return (
    <nav className="bottom-navigation" aria-label="التنقل السفلي" dir="rtl">
      <div className="bottom-navigation-pill">
        {items.map(({ to, label, icon: Icon, tone }) => {
          const active = to === "/" ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? "page" : undefined}
              aria-label={label}
              preload="intent"
              className={`bottom-navigation-item bottom-navigation-item--${tone} ${active ? "bottom-navigation-item--active" : ""}`}
              style={{ animationDelay: `${80 + items.findIndex((i) => i.to === to) * 70}ms` }}
              onClick={playTapAnimation}
            >
              <span className="bottom-navigation-icon" aria-hidden="true">
                <Icon aria-hidden="true" fill="none" />
              </span>
              <span className="bottom-navigation-label">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
