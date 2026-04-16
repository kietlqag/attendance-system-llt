import { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router';
import { getCurrentUser, getStudentAccounts, logout } from '../../utils/mockData';
import { Button } from '../ui/button';
import { LogOut, Home, QrCode, History, Menu, X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export function UserLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user || user.role !== 'user') {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    logout();
    toast.success('Đã đăng xuất');
    navigate('/login');
  };

  const currentUser = getCurrentUser();
  const currentStudent = currentUser
    ? getStudentAccounts().find(
        (account) =>
          account.userId === currentUser.id ||
          account.email === currentUser.email ||
          account.fullName === currentUser.name
      )
    : undefined;
  const currentStudentId = currentStudent?.studentId || (currentUser?.id?.startsWith('sv_') ? currentUser.id.replace(/^sv_/, '') : '');

  const menuItems = [
    {
      path: '/user',
      icon: Home,
      label: 'Trang chủ',
      exact: true,
    },
    {
      path: '/user/scan',
      icon: QrCode,
      label: 'Quét QR điểm danh',
    },
    {
      path: '/user/history',
      icon: History,
      label: 'Lịch sử điểm danh',
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
            {sidebarOpen && (
              <div className="space-y-1 text-center">
                <p className="text-sm font-semibold truncate">{currentStudentId}</p>
                <p className="text-xs text-muted-foreground truncate">{currentUser?.name}</p>
              </div>
            )}
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = item.exact
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path) && item.path !== '/user';

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
              )?.label || 'Hệ thống điểm danh'}
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
