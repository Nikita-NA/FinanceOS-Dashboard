import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  History,
  LayoutDashboard,
  Lightbulb,
  ListOrdered,
  LogOut,
  Menu,
  PanelLeftClose,
  Target,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { RoleBadge } from '@/components/RoleBadge';
import { cn } from '@/utils/cn';
import { Separator } from '@/components/ui/separator';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white',
  );

export function MainLayout() {
  const { user, logout, isAdmin, canViewAnalytics } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-[var(--color-sidebar)] text-slate-100">
      <div className="flex h-14 items-center justify-between border-b border-slate-800 px-4">
        {!collapsed && (
          <Link to="/" className="text-lg font-semibold tracking-tight text-white">
            Finance<span className="text-indigo-400">OS</span>
          </Link>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hidden text-slate-300 hover:bg-slate-800 hover:text-white lg:flex"
          onClick={() => setCollapsed((c) => !c)}
          aria-label="Toggle sidebar"
        >
          <PanelLeftClose className={cn('h-5 w-5', collapsed && 'rotate-180')} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-slate-300 hover:bg-slate-800 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        <NavLink to="/" end className={navLinkClass} onClick={() => setMobileOpen(false)}>
          <LayoutDashboard className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Dashboard</span>}
        </NavLink>
        <NavLink to="/transactions" className={navLinkClass} onClick={() => setMobileOpen(false)}>
          <ListOrdered className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Transactions</span>}
        </NavLink>
        <NavLink to="/breakdown" className={navLinkClass} onClick={() => setMobileOpen(false)}>
          <BarChart3 className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Breakdown</span>}
        </NavLink>
        <NavLink to="/goals" className={navLinkClass} onClick={() => setMobileOpen(false)}>
          <Target className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Goals</span>}
        </NavLink>
        {canViewAnalytics && (
          <NavLink to="/insights" className={navLinkClass} onClick={() => setMobileOpen(false)}>
            <Lightbulb className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Insights</span>}
          </NavLink>
        )}
        {isAdmin && (
          <NavLink to="/users" className={navLinkClass} onClick={() => setMobileOpen(false)}>
            <Users className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Users</span>}
          </NavLink>
        )}
        {isAdmin && (
          <NavLink to="/audit-logs" className={navLinkClass} onClick={() => setMobileOpen(false)}>
            <History className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Audit Log</span>}
          </NavLink>
        )}
        <NavLink to="/profile" className={navLinkClass} onClick={() => setMobileOpen(false)}>
          <UserCircle className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Profile</span>}
        </NavLink>
      </nav>
      <div className="border-t border-slate-800 p-3">
        {!collapsed && (
          <p className="mb-2 truncate px-2 text-xs text-slate-500">Signed in as</p>
        )}
        {!collapsed && (
          <p className="truncate px-2 text-sm font-medium text-white">{user?.name}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 border-r border-slate-800 transition-all lg:static',
          collapsed ? 'w-[72px]' : 'w-60',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {sidebar}
      </aside>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-label="Close overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-slate-200 bg-white px-4 shadow-sm">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-900">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
            {user && <RoleBadge role={user.role} />}
            <Separator orientation="vertical" className="h-8" />
            <Button type="button" variant="outline" size="sm" onClick={onLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
