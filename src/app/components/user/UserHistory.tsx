import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { getCurrentUser, getRecordsByUser, getSessions } from '../../utils/mockData';
import { CheckCircle, Calendar, Clock, Search, Filter } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { AttendanceRecord } from '../../utils/mockData';

export function UserHistory() {
  const [records, setRecords] = useState<(AttendanceRecord & { sessionName: string })[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<(AttendanceRecord & { sessionName: string })[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('all');

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const userRecords = getRecordsByUser(currentUser.id);
    const sessions = getSessions();

    const recordsWithSession = userRecords
      .map(record => {
        const session = sessions.find(s => s.id === record.sessionId);
        return {
          ...record,
          sessionName: session?.name || 'Không xác định',
        };
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    setRecords(recordsWithSession);
    setFilteredRecords(recordsWithSession);
  }, []);

  useEffect(() => {
    let filtered = [...records];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.sessionName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by period
    if (filterPeriod !== 'all') {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      switch (filterPeriod) {
        case 'today':
          filtered = filtered.filter(r => r.timestamp >= todayStart);
          break;
        case 'thisMonth':
          filtered = filtered.filter(r => r.timestamp >= monthStart && r.timestamp <= monthEnd);
          break;
      }
    }

    setFilteredRecords(filtered);
  }, [searchTerm, filterPeriod, records]);

  // Group records by date
  const groupedRecords: Record<string, typeof filteredRecords> = {};
  filteredRecords.forEach(record => {
    const dateKey = format(record.timestamp, 'dd/MM/yyyy', { locale: vi });
    if (!groupedRecords[dateKey]) {
      groupedRecords[dateKey] = [];
    }
    groupedRecords[dateKey].push(record);
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Lịch sử điểm danh</h1>
        <p className="text-muted-foreground">
          Xem lại tất cả các lần điểm danh của bạn
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng số lần</p>
                <p className="text-2xl font-bold text-primary">{records.length}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tháng này</p>
                <p className="text-2xl font-bold">
                  {records.filter(r => {
                    const now = new Date();
                    return r.timestamp >= startOfMonth(now) && r.timestamp <= endOfMonth(now);
                  }).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hôm nay</p>
                <p className="text-2xl font-bold">
                  {records.filter(r => {
                    const now = new Date();
                    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    return r.timestamp >= todayStart;
                  }).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-secondary/50 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-secondary-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm theo tên buổi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-input-background"
              />
            </div>
            <div className="sm:w-48">
              <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                <SelectTrigger className="bg-input-background">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="today">Hôm nay</SelectItem>
                  <SelectItem value="thisMonth">Tháng này</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* History List */}
      {Object.keys(groupedRecords).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchTerm || filterPeriod !== 'all'
                ? 'Không tìm thấy kết quả phù hợp'
                : 'Bạn chưa có lịch sử điểm danh'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedRecords).map(([date, dateRecords]) => (
            <Card key={date} className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {date}
                </CardTitle>
                <CardDescription>
                  {dateRecords.length} lần điểm danh
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dateRecords.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{record.sessionName}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Clock className="w-3.5 h-3.5" />
                            {format(record.timestamp, 'HH:mm:ss', { locale: vi })}
                          </div>
                        </div>
                      </div>
                      <Badge variant={record.status === 'valid' ? 'default' : 'destructive'}>
                        {record.status === 'valid' ? 'Hợp lệ' : 'Không hợp lệ'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
