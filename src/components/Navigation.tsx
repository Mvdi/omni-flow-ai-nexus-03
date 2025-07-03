import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Users, Ticket, Calendar, Database, Bot, Settings, Menu, X, ChevronDown, ShoppingCart, RotateCcw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import UserMenu from '@/components/UserMenu';
import { NotificationBell } from '@/components/NotificationBell';
export const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const location = useLocation();
  const { user, loading } = useAuth();

  // Load logo from localStorage on component mount
  useEffect(() => {
    const savedLogo = localStorage.getItem('company-logo');
    if (savedLogo) {
      setCompanyLogo(savedLogo);
    }
  }, []);
  const navigationItems = [{
    href: '/',
    label: 'Dashboard',
    icon: LayoutDashboard
  }, {
    href: '/leads',
    label: 'Leads',
    icon: Users
  }, {
    href: '/orders',
    label: 'Ordre',
    icon: ShoppingCart
  }, {
    href: '/subscriptions',
    label: 'Abonnementer',
    icon: RotateCcw
  }, {
    href: '/support',
    label: 'Support',
    icon: Ticket
  }, {
    href: '/planning',
    label: 'Planlægning',
    icon: Calendar
  }, {
    href: '/customers',
    label: 'Kundekartotek',
    icon: Database
  }, {
    href: '/ai-assistant',
    label: 'AI Assistant',
    icon: Bot
  }, {
    href: '/settings',
    label: 'Indstillinger',
    icon: Settings
  }];
  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };
  return <nav className="bg-white shadow-lg border-b sticky top-0 z-50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                {companyLogo ? (
                  <img src={companyLogo} alt="Company Logo" className="w-full h-full object-contain rounded-lg" />
                ) : (
                  <LayoutDashboard className="h-5 w-5 text-white" />
                )}
              </div>
              <span className="text-xl font-bold text-gray-900">MM Systems</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navigationItems.map(item => {
            const Icon = item.icon;
            return <Link key={item.href} to={item.href} className={cn("flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200", isActive(item.href) ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50")}>
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>;
          })}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <NotificationBell />
            {user ? <UserMenu /> : (
              <Button variant="outline" size="sm" className="relative">
                <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {user?.email?.substring(0, 2).toUpperCase() || 'U'}
                </div>
              </Button>
            )}
          </div>

          {/* Mobile menu button and user menu */}
          <div className="md:hidden flex items-center space-x-2">
            <NotificationBell />
            {user && <UserMenu />}
            <Button variant="ghost" size="sm" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="touch-target">
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && <div className="md:hidden py-4 border-t bg-white/95 backdrop-blur-sm">
            <div className="space-y-1">
              {navigationItems.map(item => {
            const Icon = item.icon;
            return <Link key={item.href} to={item.href} onClick={() => setIsMobileMenuOpen(false)} className={cn("flex items-center space-x-3 px-4 py-4 rounded-lg text-base font-medium transition-all duration-200 touch-target", isActive(item.href) ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-gray-600 active:bg-gray-100")}>
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>;
          })}
            </div>
          </div>}
      </div>
    </nav>;
};