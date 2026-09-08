/**
 * Single icon system for Fuel — Lucide only.
 * Import FuelIcon / ConnectorIcon / fuelIcons everywhere; do not mix emoji or letter marks.
 */
import type { LucideIcon, LucideProps } from "lucide-react";
import {
  Activity,
  ArrowUp,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Boxes,
  Briefcase,
  Building2,
  Calculator,
  ChevronDown,
  CircleDollarSign,
  CircleDot,
  CircleUser,
  Cloud,
  Code2,
  Compass,
  ContactRound,
  CreditCard,
  FileText,
  FolderKanban,
  Gauge,
  GitBranch,
  Globe,
  HeartHandshake,
  Landmark,
  LayoutDashboard,
  LayoutGrid,
  LayoutList,
  LogOut,
  Mail,
  Megaphone,
  Moon,
  Network,
  NotebookPen,
  Palette,
  Plug,
  Presentation,
  RefreshCw,
  Rocket,
  Search,
  SearchCheck,
  Settings,
  Share2,
  Sparkles,
  SquareKanban,
  Sun,
  TrendingUp,
  Users,
  Video,
  WandSparkles,
  X,
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
  publicProfile: Globe,
  growth: TrendingUp,
  retention: RefreshCw,
  efficiency: Gauge,
  fundraising: CircleDollarSign,
  product: Code2,
  team: Users,
  marketing: Megaphone,
  revops: ContactRound,
  finops: Landmark,
  success: Rocket,
  strategic: Compass,
  customerSuccess: HeartHandshake,
  boardReporting: Presentation,
  vendorStack: Boxes,
  layoutGrid: LayoutGrid,
  sparkles: Sparkles,
  wand: WandSparkles,
  send: ArrowUp,
  close: X,
  file: FileText,
  search: Search,
  chevronDown: ChevronDown,
  dashboard: LayoutDashboard,
} as const;

export type FuelIconName = keyof typeof fuelIcons;

type IconBaseProps = {
  size?: number;
  className?: string;
  strokeWidth?: number;
} & Omit<LucideProps, "ref" | "size" | "strokeWidth" | "className">;

type FuelIconProps = {
  name: FuelIconName;
} & IconBaseProps;

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

/** Lucide marks for connector / integration ids (no letter abbreviations). */
export const connectorIcons = {
  jira: SquareKanban,
  linear: CircleDot,
  launchpad: Palette,
  pulse: Activity,
  ga4: BarChart3,
  "google-analytics": BarChart3,
  gads: Megaphone,
  "google-ads": Megaphone,
  semrush: Search,
  linkedin: Network,
  meta: Share2,
  hubspot: ContactRound,
  salesforce: Cloud,
  "salesforce-context": Cloud,
  quickbooks: Calculator,
  stripe: CreditCard,
  granola: NotebookPen,
  "google-meet": Video,
  zoom: Video,
  gmail: Mail,
  outlook: Mail,
  "search-console": SearchCheck,
  "gtm-dashboard": LayoutDashboard,
} as const;

export type ConnectorIconName = keyof typeof connectorIcons;

type ConnectorIconProps = {
  name: string;
} & IconBaseProps;

export function ConnectorIcon({
  name,
  size = 18,
  className,
  strokeWidth = 1.75,
  ...rest
}: ConnectorIconProps) {
  const Icon: LucideIcon = connectorIcons[name as ConnectorIconName] ?? Plug;
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
