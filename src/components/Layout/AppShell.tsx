import { useState, type ReactNode } from 'react';
import {
  Activity,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Database,
  Dna,
  GitFork,
  Home,
  LayoutDashboard,
  Menu,
  Microscope,
  Share2,
  X,
} from 'lucide-react';
import type { PageId } from '../../types/bio';

interface NavItem {
  id: PageId;
  label: string;
  icon: typeof Home;
  iconBg: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home, iconBg: 'bg-violet-500 text-white' },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, iconBg: 'bg-teal-500 text-white' },
  { id: 'diseases', label: 'Disease Explorer', icon: Microscope, iconBg: 'bg-pink-500 text-white' },
  { id: 'network', label: 'Network Graph', icon: Share2, iconBg: 'bg-indigo-500 text-white' },
  { id: 'gene-details', label: 'Gene Details', icon: Dna, iconBg: 'bg-cyan-500 text-white' },
  { id: 'analysis', label: 'Network Analysis', icon: Activity, iconBg: 'bg-purple-500 text-white' },
  { id: 'dataset', label: 'Dataset Explorer', icon: Database, iconBg: 'bg-amber-500 text-white' },
  { id: 'about', label: 'About', icon: BookOpen, iconBg: 'bg-sky-500 text-white' },
];

const PAGE_TITLES: Record<PageId, string> = {
  home: 'BioGene Explorer',
  dashboard: 'Research Dashboard',
  diseases: 'Disease Explorer',
  network: 'Network Visualization',
  'gene-details': 'Gene Details',
  analysis: 'Network Analysis',
  dataset: 'Dataset Explorer',
  about: 'Methodology & About',
};

interface AppShellProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
  children: ReactNode;
}

export function AppShell({
  activePage,
  onNavigate,
  onPrimaryAction,
  primaryActionLabel = 'Explore Network',
  children,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavClick = (page: PageId) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <div className="relative flex min-h-screen text-slate-900">
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/25 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Liquid Glass Collapsible Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/75 bg-white/55 backdrop-blur-2xl transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:h-screen ${
          collapsed ? 'lg:w-[78px]' : 'lg:w-64'
        } ${mobileOpen ? 'w-64 translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{
          boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.8), 8px 0 32px -12px rgba(15,23,42,0.1)',
        }}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-900/10 px-4">
          <button
            type="button"
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2.5 overflow-hidden text-left whitespace-nowrap shrink-0"
          >
            <div className="liquid-btn-violet flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
              <GitFork className="h-4 w-4" />
            </div>
            {!collapsed && (
              <span className="font-display text-base font-bold tracking-tight text-slate-900">
                BioGene Explorer
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-white/70 hover:text-slate-900 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                title={collapsed ? item.label : undefined}
                className={`flex w-full items-center gap-3 rounded-full border px-3 py-2 text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-white bg-white/90 text-slate-900 shadow-md shadow-indigo-500/10'
                    : 'border-transparent text-slate-700 hover:border-white/70 hover:bg-white/55 hover:text-slate-950'
                } ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-transform ${
                    isActive
                      ? `${item.iconBg} shadow-sm`
                      : 'bg-white/75 text-slate-600 shadow-xs'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="hidden border-t border-slate-900/10 p-3 lg:block">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-white/80 bg-white/65 py-2 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-white hover:text-slate-950 whitespace-nowrap"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Collapse Sidebar</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Frame */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Liquid Glass Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-8 border-b border-white/75 bg-white/45 px-4 backdrop-blur-2xl sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/85 bg-white/75 text-slate-800 shadow-sm hover:bg-white lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 truncate text-sm">
              <span className="hidden text-slate-500 sm:inline">BioGene Explorer</span>
              <span className="hidden text-slate-400 sm:inline">/</span>
              <span className="font-display font-bold text-slate-900 truncate">
                {PAGE_TITLES[activePage]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {onPrimaryAction && (
              <button
                type="button"
                onClick={onPrimaryAction}
                className="liquid-btn-violet rounded-full px-5 py-2 text-xs font-semibold whitespace-nowrap shrink-0"
              >
                {primaryActionLabel}
              </button>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1380px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
