'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  TrendingUp,
  AlertTriangle,
  Activity,
  Sparkles,
} from 'lucide-react';

const navItems = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    description: 'Overview & Metrics',
  },
  {
    title: 'Inventory',
    href: '/inventory',
    icon: Package,
    description: 'Manage Stock',
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: TrendingUp,
    description: 'Forecasts & Insights',
  },
  {
    title: 'Alerts',
    href: '/alerts',
    icon: AlertTriangle,
    description: 'Active Alerts',
  },
  {
    title: 'Events',
    href: '/events',
    icon: Activity,
    description: 'Event Logs',
  },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/40 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
            <Sparkles className="h-6 w-6 text-primary" />
            <span>StreamStock AI</span>
          </Link>
          <p className="text-xs text-muted-foreground mt-1">
            Real-Time Inventory Management
          </p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                  'hover:bg-muted hover:text-foreground',
                  isActive
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{item.title}</div>
                  <div
                    className={cn(
                      'text-xs',
                      isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                    )}
                  >
                    {item.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            <span>System Online</span>
          </div>
          <p>Kafka Event Streaming Active</p>
        </div>
      </aside>
    </div>
  );
}
