import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { getCurrentUser, getRecordsFromFirebase, getSessionsFromFirebase } from '../../utils/mockData';
import { QrCode, CheckCircle, Clock } from 'lucide-react';
import { formatDateTimeVN, isSameDayVN, isSameMonthVN } from '../../utils/dateTime';

export function UserDashboard() {
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [attendanceCount, setAttendanceCount] = useState({ today: 0, thisMonth: 0, total: 0 });

  useEffect(() => {
    const load = async () => {
      const currentUser = getCurrentUser();
      if (!currentUser) return;

      const [allRecords, sessions] = await Promise.all([
        getRecordsFromFirebase(),
        getSessionsFromFirebase(),
      ]);
      const records = allRecords.filter((record) => record.userId === currentUser.id);

      const now = new Date();
      const todayCount = records.filter((r) => isSameDayVN(r.timestamp, now)).length;
      const monthCount = records.filter((r) => isSameMonthVN(r.timestamp, now)).length;

      const recent = records
        .slice()
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 5)
        .map((record) => {
          const session = sessions.find((s) => s.id === record.sessionId);
          return {
            ...record,
            sessionName: session?.name || 'Không xác định',
          };
        });

      setAttendanceCount({ today: todayCount, thisMonth: monthCount, total: records.length });
      setRecentAttendance(recent);
    };

    void load();
  }, []);

  return (
    <div className="space-y-8">
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
                  <p className="text-xs text-muted-foreground mt-2">
                    Hôm nay: {attendanceCount.today} | Tháng này: {attendanceCount.thisMonth} | Tổng: {attendanceCount.total}
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
                  <p className="text-xs text-muted-foreground mt-2">Bạn đã điểm danh {attendanceCount.total} lần</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card className="border-2">
        <CardHeader>
          <CardTitle>Điểm danh gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          {recentAttendance.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Bạn chưa có lịch sử điểm danh</p>
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
                        {formatDateTimeVN(record.timestamp)}
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
