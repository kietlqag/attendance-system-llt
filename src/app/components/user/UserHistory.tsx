import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { getCurrentUser, getRecordsByUserFromFirebase, getSessionsFromFirebase } from '../../utils/mockData';
import { CheckCircle, Calendar, Clock, Search, Filter } from 'lucide-react';
import type { AttendanceRecord } from '../../utils/mockData';
import { formatDateVN, formatTimeVN, isSameDayVN, isSameMonthVN } from '../../utils/dateTime';

export function UserHistory() {
  const [records, setRecords] = useState<(AttendanceRecord & { sessionName: string })[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<(AttendanceRecord & { sessionName: string })[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('all');

  useEffect(() => {
    const load = async () => {
      const currentUser = getCurrentUser();
      if (!currentUser) return;

      const [userRecords, sessions] = await Promise.all([
        getRecordsByUserFromFirebase(currentUser.id),
        getSessionsFromFirebase(),
      ]);

      const recordsWithSession = userRecords
        .map((record) => {
          const session = sessions.find((s) => s.id === record.sessionId);
          return {
            ...record,
            sessionName: session?.name || 'Không xác định',
          };
        })
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      setRecords(recordsWithSession);
      setFilteredRecords(recordsWithSession);
    };

    void load();
  }, []);

  useEffect(() => {
    let filtered = [...records];

    if (searchTerm) {
      filtered = filtered.filter((record) => record.sessionName.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    if (filterPeriod !== 'all') {
      const now = new Date();

      switch (filterPeriod) {
        case 'today':
          filtered = filtered.filter((r) => isSameDayVN(r.timestamp, now));
          break;
        case 'thisMonth':
          filtered = filtered.filter((r) => isSameMonthVN(r.timestamp, now));
          break;
      }
    }

    setFilteredRecords(filtered);
  }, [searchTerm, filterPeriod, records]);

  const groupedRecords: Record<string, typeof filteredRecords> = {};
  filteredRecords.forEach((record) => {
    const dateKey = formatDateVN(record.timestamp);
    if (!groupedRecords[dateKey]) {
      groupedRecords[dateKey] = [];
    }
    groupedRecords[dateKey].push(record);
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
                            {formatTimeVN(record.timestamp)}
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
