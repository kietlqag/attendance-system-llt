import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { getSessions, getGroups, getRecordsBySession } from '../../utils/mockData';
import { Plus, Calendar, Clock, Users, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import type { AttendanceSession, Group } from '../../utils/mockData';

export function SessionManagement() {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    loadSessions();
    setGroups(getGroups());
  }, []);

  const loadSessions = () => {
    const allSessions = getSessions();
    // Sort by start time, newest first
    const sorted = [...allSessions].sort((a, b) => 
      b.startTime.getTime() - a.startTime.getTime()
    );
    setSessions(sorted);
  };

  const getGroupName = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    return group?.name || 'Không xác định';
  };

  const getStatusBadge = (session: AttendanceSession) => {
    const now = new Date();
    const endTime = new Date(session.endTime);
    
    if (now > endTime) {
      return (
        <Badge variant="secondary" className="gap-1">
          <XCircle className="w-3 h-3" />
          Đã kết thúc
        </Badge>
      );
    }
    
    return (
      <Badge variant="default" className="gap-1">
        <CheckCircle className="w-3 h-3" />
        Đang hoạt động
      </Badge>
    );
  };

  const activeSessions = sessions.filter(s => new Date() <= new Date(s.endTime));
  const completedSessions = sessions.filter(s => new Date() > new Date(s.endTime));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Quản lý phiên điểm danh</h1>
          <p className="text-muted-foreground">
            Xem và quản lý tất cả các phiên điểm danh
          </p>
        </div>
        <Link to="/admin/create-session">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Tạo phiên mới
          </Button>
        </Link>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-2 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng số phiên</CardTitle>
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{sessions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              phiên điểm danh
            </p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đang hoạt động</CardTitle>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{activeSessions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              phiên đang mở
            </p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đã kết thúc</CardTitle>
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <XCircle className="h-5 w-5 text-gray-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-600">{completedSessions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              phiên đã đóng
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-semibold">Phiên đang hoạt động</h2>
            <Badge variant="default">{activeSessions.length}</Badge>
          </div>
          {activeSessions.map((session) => (
            <Card key={session.id} className="hover:shadow-lg transition-shadow border-2 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{session.name}</h3>
                        {getStatusBadge(session)}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>{getGroupName(session.groupId)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(session.endTime).toLocaleString('vi-VN')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle className="w-4 h-4" />
                          <span>{getRecordsBySession(session.id).length} lượt điểm danh</span>
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
          ))}
        </div>
      )}

      {/* Completed Sessions */}
      {completedSessions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-semibold">Phiên đã kết thúc</h2>
            <Badge variant="secondary">{completedSessions.length}</Badge>
          </div>
          {completedSessions.map((session) => (
            <Card key={session.id} className="hover:shadow-lg transition-shadow border-2">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-6 h-6 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{session.name}</h3>
                        {getStatusBadge(session)}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>{getGroupName(session.groupId)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(session.endTime).toLocaleString('vi-VN')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle className="w-4 h-4" />
                          <span>{getRecordsBySession(session.id).length} lượt điểm danh</span>
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
          ))}
        </div>
      )}

      {/* Empty State */}
      {sessions.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Chưa có phiên điểm danh nào. Tạo phiên đầu tiên của bạn!
            </p>
            <Link to="/admin/create-session">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Tạo phiên mới
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}