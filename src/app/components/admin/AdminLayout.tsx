import { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router';
import { getCurrentUser, logout } from '../../utils/mockData';
import { Button } from '../ui/button';
import { LogOut, LayoutDashboard, Calendar, Users, Menu, X, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import appLogo from '../../../assets/LogoCLBLLT-NoBG.png';

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') {
      navigate('/admin/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    logout();
    toast.success('Đã đăng xuất');
    navigate('/admin/login');
  };

  const menuItems = [
    {
      path: '/admin',
      icon: LayoutDashboard,
      label: 'Tổng quan',
      exact: true,
    },
    {
      path: '/admin/users',
      icon: UserCog,
      label: 'Quản lý sinh viên',
    },
    {
      path: '/admin/groups',
      icon: Users,
      label: 'Quản lý lớp',
    },
    {
      path: '/admin/sessions',
      icon: Calendar,
      label: 'Quản lý phiên điểm danh',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex">
      <aside
        className={`bg-white border-r-2 border-primary/20 shadow-lg transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-0 md:w-20'
        } flex-shrink-0 overflow-hidden`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-center">
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center flex-shrink-0 bg-white">
                <img src={appLogo} alt="Logo" className="w-[88%] h-[88%] object-contain" />
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = item.exact
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path) && item.path !== '/admin';

              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={active ? 'default' : 'ghost'}
                    className={`w-full justify-start gap-3 ${!sidebarOpen && 'md:justify-center md:px-0'}`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span>{item.label}</span>}
                  </Button>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={handleLogout}
              className={`w-full gap-3 ${!sidebarOpen && 'md:justify-center md:px-0'}`}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>Đăng xuất</span>}
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="mr-4"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <h2 className="font-semibold text-lg text-gray-900">
              {menuItems.find((item) =>
                item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)
              )?.label || 'Quản trị hệ thống'}
            </h2>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
