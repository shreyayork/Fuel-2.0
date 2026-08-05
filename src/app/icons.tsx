/**
 * Single icon system for Fuel — Lucide only.
 * Import FuelIcon / fuelIcons everywhere; do not mix emoji or ad-hoc SVG sets.
 */
import type { LucideIcon, LucideProps } from "lucide-react";
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  CircleUser,
  Code2,
  FolderKanban,
  Gauge,
  GitBranch,
  Landmark,
  LayoutList,
  LogOut,
  Megaphone,
  Moon,
  Plug,
  Rocket,
  Settings,
  Sun,
  Users,
} from "lucide-react";

export const fuelIcons = {
  watchlists: LayoutList,
  pipeline: GitBranch,
  portfolios: FolderKanban,
  initiatives: Rocket,
  benchmarks: BarChart3,
  playbooks: BookOpen,
  connectors: Plug,
  advisors: Users,
  serviceProviders: Briefcase,
  investors: ArrowUpRight,
  company: Building2,
  founder: CircleUser,
  development: Code2,
  gtm: Megaphone,
  finance: Landmark,
  account: Settings,
  appearanceLight: Sun,
  appearanceDark: Moon,
  logout: LogOut,
  gauge: Gauge,
} as const;

export type FuelIconName = keyof typeof fuelIcons;

type FuelIconProps = {
  name: FuelIconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
} & Omit<LucideProps, "ref" | "size" | "strokeWidth" | "className">;

export function FuelIcon({
  name,
  size = 16,
  className,
  strokeWidth = 1.75,
  ...rest
}: FuelIconProps) {
  const Icon: LucideIcon = fuelIcons[name];
  return (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden="true"
      {...rest}
    />
  );
}
