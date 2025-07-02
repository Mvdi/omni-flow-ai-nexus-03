import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LayoutDashboard, Users, Ticket, Calendar, Database, Bot, Settings, Menu, X, ChevronDown, ShoppingCart, Bell, LogOut, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
export const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [reminderCount, setReminderCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // Load logo from localStorage on component mount
  useEffect(() => {
    const savedLogo = localStorage.getItem('company-logo');
    if (savedLogo) {
      setCompanyLogo(savedLogo);
    }
  }, []);

  // Load reminder count for notifications
  useEffect(() => {
    const fetchReminderCount = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('ticket_reminders')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_completed', false)
          .lte('remind_at', new Date().toISOString());

        if (error) throw error;
        setReminderCount(data?.length || 0);
      } catch (error) {
        console.error('Error fetching reminder count:', error);
      }
    };

    fetchReminderCount();
    
    // Refresh count every minute
    const interval = setInterval(fetchReminderCount, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Logget ud",
        description: "Du er nu logget ud af systemet.",
      });
      
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Fejl",
        description: "Der opstod en fejl under logout.",
        variant: "destructive",
      });
    }
  };

  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.substring(0, 2).toUpperCase();
  };

  const getUserDisplayName = () => {
    return user?.email || 'Unknown User';
  };
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
                {companyLogo ? <img src={companyLogo} alt="Company Logo" className="w-full h-full object-contain rounded-lg" /> : <LayoutDashboard className="h-5 w-5 text-white" />}
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

          {/* User Menu with Notifications */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Notifications Bell */}
            <Button variant="ghost" size="sm" className="relative" onClick={() => navigate('/support')}>
              <Bell className="h-4 w-4" />
              {reminderCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs bg-red-500 text-white rounded-full">
                  {reminderCount > 9 ? '9+' : reminderCount}
                </Badge>
              )}
            </Button>

            {/* User Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="relative">
                  <Avatar className="w-6 h-6 mr-2">
                    <AvatarFallback className="text-xs bg-gradient-to-r from-green-400 to-blue-500 text-white">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden lg:inline text-sm">{getUserDisplayName()}</span>
                  <ChevronDown className="h-3 w-3 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center space-x-2 p-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-gradient-to-r from-green-400 to-blue-500 text-white">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{getUserDisplayName()}</p>
                    <p className="text-xs text-muted-foreground">Logget ind</p>
                  </div>
                </div>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={() => navigate('/support')} className="cursor-pointer">
                  <Bell className="h-4 w-4 mr-2" />
                  Notifikationer
                  {reminderCount > 0 && (
                    <Badge className="ml-auto bg-red-500 text-white text-xs">
                      {reminderCount}
                    </Badge>
                  )}
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
                  <Settings className="h-4 w-4 mr-2" />
                  Indstillinger
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  Log ud
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button variant="ghost" size="sm" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && <div className="md:hidden py-4 border-t">
            <div className="space-y-1">
              {navigationItems.map(item => {
            const Icon = item.icon;
            return <Link key={item.href} to={item.href} onClick={() => setIsMobileMenuOpen(false)} className={cn("flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200", isActive(item.href) ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50")}>
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>;
          })}
            </div>
          </div>}
      </div>
    </nav>;
};