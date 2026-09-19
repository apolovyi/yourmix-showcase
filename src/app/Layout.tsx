import { Suspense, useEffect, useState, type ReactElement } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import {
  Package,
  MessageSquare,
  Bell,
  Search,
  BookOpen,
  User,
  DollarSign,
  ChevronRight,
  LogOut,
  Menu,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFailureSummary } from '@/hooks/queries';

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    setIsMobile(!mq.matches);

    const handler = (e: MediaQueryListEvent): void => {
      setIsMobile(!e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile;
}

function SidebarLogo({ collapsed }: { collapsed: boolean }): ReactElement {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={`flex items-center gap-3 mb-8 px-2 transition-all duration-300 ${collapsed ? 'justify-center' : ''}`}
    >
      <div className="relative shrink-0">
        {!imgError ? (
          <div className="w-10 h-10 flex items-center justify-center p-1 overflow-hidden">
            <img
              src="/logo.png"
              alt="Your Mix"
              className="w-full h-full object-contain"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
            <span className="text-white font-sans font-bold text-xl">YM</span>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="flex flex-col overflow-hidden whitespace-nowrap animate-fade-in">
          <h1 className="text-xl font-sans font-bold text-blue-500 leading-none tracking-wide">
            YOUR MIX
          </h1>
        </div>
      )}
    </div>
  );
}

interface SidebarItem {
  path: string;
  icon: React.ReactNode;
  label: string;
  highlight?: boolean;
}

interface SidebarGroup {
  title: string;
  items: SidebarItem[];
}

const sidebarGroups: SidebarGroup[] = [
  {
    title: '',
    items: [
      {
        path: '/ai',
        icon: <MessageSquare size={20} />,
        label: 'AI Assistant',
        highlight: true,
      },
    ],
  },
  {
    title: 'Inventory & Sales',
    items: [
      { path: '/inventory', icon: <Package size={20} />, label: 'Inventory' },
      { path: '/pricing', icon: <DollarSign size={20} />, label: 'Pricing' },
      { path: '/catalog', icon: <BookOpen size={20} />, label: 'Catalog' },
    ],
  },
];

function getPageTitle(pathname: string): string {
  const titles: Record<string, string> = {
    '/inventory': 'Inventory',
    '/pricing': 'Pricing',
    '/catalog': 'Product Catalog',
    '/ai': 'AI Assistant',
  };
  if (pathname.startsWith('/pricing/proposals/')) return 'Proposal Review';
  return titles[pathname] ?? 'Inventory';
}

export function Layout(): ReactElement {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const isMobile = useIsMobile();
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const { data: failureSummary } = useFailureSummary();
  const failedItemCount = failureSummary?.totalFailedItems ?? 0;

  const pageTitle = getPageTitle(location.pathname);
  const showLabels = isMobile || isSidebarOpen;

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden font-sans">
      {/* Mobile backdrop */}
      {isMobile && isDrawerOpen && (
        <div className="fixed inset-0 bg-black/50 z-20" onClick={() => setDrawerOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={
          isMobile
            ? `fixed inset-y-0 left-0 w-64 bg-slate-800 border-r border-slate-700 flex flex-col transition-transform duration-300 shadow-2xl z-30 ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`
            : `${isSidebarOpen ? 'w-64' : 'w-20'} bg-slate-800 border-r border-slate-700 flex flex-col transition-all duration-300 shadow-2xl z-20`
        }
      >
        <div className="p-4 flex flex-col h-full">
          {/* Header with Logo */}
          <div className="flex justify-between items-start mb-2">
            <div className="w-full">
              <SidebarLogo collapsed={!showLabels} />
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-6 scrollbar-none py-2">
            {sidebarGroups.map((group, idx) => (
              <div key={idx}>
                {group.title && showLabels && (
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-3">
                    {group.title}
                  </h3>
                )}
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => {
                        if (isMobile) setDrawerOpen(false);
                      }}
                      className={({ isActive }) =>
                        `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-900/30'
                            : item.highlight
                              ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/50'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <div
                            className={`relative ${isActive ? 'text-white' : item.highlight ? 'text-amber-500' : 'text-slate-400 group-hover:text-slate-200'}`}
                          >
                            {item.icon}
                            {!showLabels && item.path === '/pricing' && failedItemCount > 0 && (
                              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-[14px] h-[14px] rounded-full flex items-center justify-center leading-none">
                                {failedItemCount > 99 ? '99+' : failedItemCount}
                              </span>
                            )}
                          </div>

                          {showLabels && (
                            <span className="font-medium text-sm whitespace-nowrap">
                              {item.label}
                            </span>
                          )}

                          {showLabels && item.path === '/pricing' && failedItemCount > 0 && (
                            <span className="ml-auto bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center leading-none">
                              {failedItemCount > 99 ? '99+' : failedItemCount}
                            </span>
                          )}

                          {item.highlight && showLabels && !isActive && (
                            <span className="ml-auto w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                          )}

                          {/* Tooltip for collapsed state */}
                          {!showLabels && (
                            <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-slate-200 text-xs rounded border border-slate-700 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl">
                              {item.label}
                            </div>
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer Toggle */}
          <div className="pt-4 border-t border-slate-700 mt-auto">
            <button
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="w-full items-center justify-center p-2 rounded-lg hover:bg-slate-700 text-slate-400 transition-colors hidden md:flex"
            >
              {isSidebarOpen ? (
                <ChevronRight className="rotate-180" size={20} />
              ) : (
                <ChevronRight size={20} />
              )}
            </button>
            <div className={`flex items-center gap-3 mt-4 px-2 ${!showLabels && 'justify-center'}`}>
              <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center shrink-0 border border-slate-500">
                <User size={16} />
              </div>
              {showLabels && (
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {user?.displayName && user.displayName !== user?.email
                      ? user.displayName
                      : (user?.email
                          ?.split('@')[0]
                          ?.replace(/[.-]/g, ' ')
                          .replace(/\b\w/g, (c) => c.toUpperCase()) ?? 'Admin User')}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {user?.email ?? 'admin@yourmix.com'}
                  </p>
                </div>
              )}
              {showLabels && (
                <button onClick={logout} className="text-slate-400 hover:text-white">
                  <LogOut size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Topbar */}
        <header className="h-16 bg-slate-800/80 backdrop-blur-md border-b border-slate-700 flex items-center justify-between px-6 z-10">
          <h2 className="text-lg font-bold text-slate-200 capitalize flex items-center gap-2">
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-2 text-slate-400 hover:text-white transition-colors md:hidden"
            >
              <Menu size={20} />
            </button>
            {pageTitle}
          </h2>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Global Search..."
                disabled
                title="Coming soon"
                className="bg-slate-900/50 border border-slate-700 rounded-full pl-9 pr-4 py-1.5 text-sm text-slate-200 focus:ring-1 focus:ring-blue-500 focus:outline-none w-64 opacity-50 cursor-not-allowed"
              />
            </div>
            <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-slate-800"></span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          <div className="max-w-7xl mx-auto h-full">
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="text-slate-400">Loading...</div>
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
