import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { UserCircle, Lock } from 'lucide-react';
import { getCurrentUser, loginAdminWithFirebase } from '../utils/mockData';
import { toast } from 'sonner';
import coverLogin from '../../assets/coverlogin.jpg';

export function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      navigate(currentUser.role === 'admin' ? '/admin' : '/user');
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const user = await loginAdminWithFirebase(normalizedEmail, password);

      if (user) {
        toast.success(`Xin chào, ${user.name}!`);
        navigate('/admin');
      } else {
        toast.error('Email hoặc mật khẩu không đúng');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-end justify-center p-4 md:p-6 bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${coverLogin})`, backgroundSize: '115%', backgroundPosition: 'center 80%' }}
    >
      <div className="absolute inset-0 bg-black/45" />

      <div className="w-full max-w-[460px] relative z-10">
        <Card className="border border-white/25 bg-white/60 backdrop-blur-sm shadow-xl">
          <CardHeader className="space-y-1 pb-3 text-center">
            <CardTitle className="text-xl">Đăng nhập Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-input-background"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-input-background"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-10" disabled={loading}>
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
