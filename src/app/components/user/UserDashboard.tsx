import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { getCurrentUser, getRecordsByUser, getSessions } from '../../utils/mockData';
import { QrCode, CheckCircle, Clock, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { vi } from 'date-fns/locale';

export function UserDashboard() {
  const [attendanceCount, setAttendanceCount] = useState({
    today: 0,
    thisMonth: 0,
    total: 0,
  });
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const records = getRecordsByUser(currentUser.id);
    const sessions = getSessions();
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const todayCount = records.filter(r => r.timestamp >= todayStart).length;
    const monthCount = records.filter(r => r.timestamp >= monthStart && r.timestamp <= monthEnd).length;

    setAttendanceCount({
      today: todayCount,
      thisMonth: monthCount,
      total: records.length,
    });

    // Get recent attendance with session info
    const recent = records
      .slice()
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 5)
      .map(record => {
        const session = sessions.find(s => s.id === record.sessionId);
        return {
          ...record,
          sessionName: session?.name || 'Không xác định',
        };
      });
    
    setRecentAttendance(recent);
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary to-accent p-8 rounded-2xl text-white">
        <h1 className="text-3xl font-bold mb-2">Chào mừng trở lại!</h1>
        <p className="text-white/90">
          Sẵn sàng điểm danh cho buổi học hôm nay chưa?
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-2 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hôm nay</CardTitle>
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{attendanceCount.today}</div>
            <p className="text-xs text-muted-foreground mt-1">
              lần điểm danh
            </p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tháng này</CardTitle>
            <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{attendanceCount.thisMonth}</div>
            <p className="text-xs text-muted-foreground mt-1">
              lần điểm danh
            </p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng cộng</CardTitle>
            <div className="w-10 h-10 bg-secondary/50 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-secondary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{attendanceCount.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              lần điểm danh
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Link to="/user/scan">
          <Card className="border-2 border-primary hover:border-primary/60 hover:shadow-lg transition-all cursor-pointer h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                  <QrCode className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">Quét mã điểm danh</h3>
                  <p className="text-sm text-muted-foreground">
                    Quét QR code hoặc nhập mã thủ công
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/user/history">
          <Card className="border-2 hover:border-primary/60 hover:shadow-lg transition-all cursor-pointer h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-accent/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock className="w-8 h-8 text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">Xem lịch sử</h3>
                  <p className="text-sm text-muted-foreground">
                    Kiểm tra lịch sử điểm danh của bạn
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Attendance */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Điểm danh gần đây</CardTitle>
          <CardDescription>
            5 lần điểm danh mới nhất của bạn
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentAttendance.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Bạn chưa có lịch sử điểm danh</p>
              <Link to="/user/scan">
                <Button className="mt-4">Điểm danh ngay</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAttendance.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{record.sessionName}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(record.timestamp, 'HH:mm - dd/MM/yyyy', { locale: vi })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="default">Thành công</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
