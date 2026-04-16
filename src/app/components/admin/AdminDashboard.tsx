import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { getSessionsFromFirebase, getGroupsFromFirebase, getStudentAccountsFromFirebase } from '../../utils/mockData';
import { Calendar, Users, QrCode, Clock, ChevronRight } from 'lucide-react';
import type { AttendanceSession, Group, StudentAccount } from '../../utils/mockData';

export function AdminDashboard() {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [studentAccounts, setStudentAccounts] = useState<StudentAccount[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allSessions, allGroups, allStudentAccounts] = await Promise.all([
          getSessionsFromFirebase(),
          getGroupsFromFirebase(),
          getStudentAccountsFromFirebase(),
        ]);
        const sorted = [...allSessions].sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
        setSessions(sorted);
        setGroups(allGroups);
        setStudentAccounts(allStudentAccounts);
      } catch {
        setSessions([]);
        setGroups([]);
        setStudentAccounts([]);
      }
    };

    void loadData();
  }, []);

  const activeSessions = sessions.filter((s) => new Date() <= s.endTime).length;
  const totalMembers = studentAccounts.length;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/admin/sessions">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Quản lý phiên điểm danh
              </CardTitle>
              <CardDescription>Xem và quản lý tất cả các phiên điểm danh</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary mb-2">{sessions.length}</div>
              <p className="text-sm text-muted-foreground">{activeSessions} phiên đang hoạt động</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/groups">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
                Quản lý lớp
              </CardTitle>
              <CardDescription>Quản lý lớp và thành viên</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent mb-2">{groups.length}</div>
              <p className="text-sm text-muted-foreground">{totalMembers} thành viên</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Phiên điểm danh gần đây</h2>
          <Link to="/admin/create-session">
            <Button>
              <QrCode className="w-4 h-4 mr-2" />
              Tạo phiên mới
            </Button>
          </Link>
        </div>

        <div className="grid gap-4">
          {sessions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <QrCode className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Chưa có phiên điểm danh nào.</p>
                <Link to="/admin/create-session">
                  <Button>
                    <QrCode className="w-4 h-4 mr-2" />
                    Tạo phiên mới
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            sessions.slice(0, 5).map((session) => {
              const isActive = new Date() <= new Date(session.endTime);
              const group = groups.find((g) => g.id === session.groupId);

              return (
                <Card key={session.id} className="hover:shadow-lg transition-shadow border-2">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              isActive ? 'bg-primary/10' : 'bg-gray-100'
                            }`}
                          >
                            <QrCode className={`w-6 h-6 ${isActive ? 'text-primary' : 'text-gray-600'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-lg">{session.name}</h3>
                              <Badge variant={isActive ? 'default' : 'secondary'}>
                                {isActive ? 'Đang hoạt động' : 'Đã kết thúc'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{group?.name || 'Không có nhóm'}</p>
                            <div className="flex flex-wrap gap-4 text-sm">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                {new Date(session.endTime).toLocaleString('vi-VN')}
                              </div>
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <QrCode className="w-4 h-4" />
                                Mã: {session.token}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Link to={`/admin/session/${session.id}`}>
                        <Button variant="ghost" size="icon" className="flex-shrink-0">
                          <ChevronRight className="w-5 h-5" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {sessions.length > 5 && (
          <div className="mt-4 text-center">
            <Link to="/admin/sessions">
              <Button variant="outline">Xem tất cả phiên điểm danh</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
