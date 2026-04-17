import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { QRCodeSVG } from 'qrcode.react';
import { Calendar, Clock, Copy, Download, QrCode, Users, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import {
  getGroupsFromFirebase,
  getRecordsBySessionFromFirebase,
  getSessionsFromFirebase,
  getStudentAccountsFromFirebase,
  getUserById,
  subscribeRecordsBySession,
} from '../../utils/mockData';
import type { AttendanceRecord, AttendanceSession, StudentAccount, Group } from '../../utils/mockData';
import { formatDateTimeVN, formatDateVN, formatHourMinuteVN } from '../../utils/dateTime';

export function SessionDetail() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const qrRef = useRef<HTMLDivElement | null>(null);

  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [studentAccounts, setStudentAccounts] = useState<StudentAccount[]>([]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let pollTimer: ReturnType<typeof setInterval> | undefined;

    const load = async () => {
      if (!sessionId) return;

      const [allSessions, allGroups, allStudentAccounts] = await Promise.all([
        getSessionsFromFirebase(),
        getGroupsFromFirebase(),
        getStudentAccountsFromFirebase(),
      ]);

      setGroups(allGroups);
      setStudentAccounts(allStudentAccounts);

      const found = allSessions.find((s) => s.id === sessionId) || null;
      setSession(found);
      if (!found) return;

      try {
        const initial = await getRecordsBySessionFromFirebase(sessionId);
        setRecords(initial);
      } catch {
        setRecords([]);
      }

      unsubscribe = subscribeRecordsBySession(sessionId, setRecords);

      // Fallback polling in case realtime stream is delayed or interrupted.
      pollTimer = setInterval(() => {
        void getRecordsBySessionFromFirebase(sessionId)
          .then(setRecords)
          .catch(() => undefined);
      }, 5000);
    };

    void load();

    return () => {
      unsubscribe?.();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [sessionId]);

  const resolveStudentId = (record: AttendanceRecord) => {
    if (record.userId.startsWith('sv_')) {
      return record.userId.replace(/^sv_/, '');
    }

    const user = getUserById(record.userId);
    const account = studentAccounts.find(
      (item) => item.userId === record.userId || (user?.email && item.email === user.email)
    );

    return account?.studentId || 'N/A';
  };

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Không tìm thấy phiên điểm danh</p>
      </div>
    );
  }

  const group = groups.find((g) => g.id === session.groupId);
  const now = new Date();
  const isActive = now >= session.startTime && now <= session.endTime;
  const isExpired = now > session.endTime;

  const copyToken = () => {
    navigator.clipboard.writeText(session.token);
    toast.success('Đã sao chép mã điểm danh');
  };

  const downloadQR = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) {
      toast.error('Không tìm thấy QR code');
      return;
    }

    const svgString = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const size = 240;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      toast.error('Không thể tạo hình ảnh QR code');
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      const link = document.createElement('a');
      link.download = `QR-${session.token}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Đã tải QR code');
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error('Không thể tải QR code');
    };

    img.src = url;
  };

  const exportToCSV = () => {
    const headers = ['STT', 'MSSV', 'Họ tên', 'Email', 'Thời gian điểm danh', 'Trạng thái'];
    const rows = records.map((record, index) => {
      const user = getUserById(record.userId);
      return [
        index + 1,
        resolveStudentId(record),
        user?.name || 'N/A',
        user?.email || 'N/A',
        formatDateTimeVN(record.timestamp),
        record.status === 'valid' ? 'Hợp lệ' : 'Không hợp lệ',
      ];
    });

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `diemdanh-${session.token}.csv`;
    link.click();
    toast.success('Đã xuất báo cáo');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/admin')} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </Button>
        <Button variant="outline" onClick={exportToCSV} className="gap-2">
          <Download className="w-4 h-4" />
          Xuất Excel
        </Button>
      </div>

      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="text-2xl">{session.name}</CardTitle>
                <Badge variant={isActive ? 'default' : isExpired ? 'outline' : 'secondary'}>
                  {isActive ? 'Đang diễn ra' : isExpired ? 'Đã kết thúc' : 'Sắp diễn ra'}
                </Badge>
              </div>
              <p className="text-base text-muted-foreground">{group?.name || 'Không có nhóm'}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Thời gian bắt đầu</span>
              </div>
              <p className="font-semibold">
                {formatHourMinuteVN(session.startTime)} - <span className="font-semibold text-sm">{formatDateVN(session.startTime)}</span>
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Thời gian kết thúc</span>
              </div>
              <p className="font-semibold">
                {formatHourMinuteVN(session.endTime)} - <span className="font-semibold text-sm">{formatDateVN(session.endTime)}</span>
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span className="text-sm">Đã điểm danh</span>
              </div>
              <p className="font-semibold">{records.length} người</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              QR Code điểm danh
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <div ref={qrRef} className="bg-white p-6 rounded-xl border-4 border-primary/20">
              <QRCodeSVG value={session.token} size={240} level="H" includeMargin={false} />
            </div>
            <Button onClick={downloadQR} variant="outline" className="w-full gap-2">
              <Download className="w-4 h-4" />
              Tải QR Code
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle>Mã điểm danh</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-6 rounded-lg text-center">
              <p className="text-3xl font-mono font-bold text-primary tracking-wider">{session.token}</p>
            </div>
            <Button onClick={copyToken} variant="outline" className="w-full gap-2">
              <Copy className="w-4 h-4" />
              Sao chép mã
            </Button>
            <div className="bg-primary/5 p-4 rounded-lg space-y-2">
              <p className="text-sm font-semibold">Hướng dẫn:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Chiếu QR code lên màn hình/máy chiếu</li>
                <li>• Sinh viên mở app và quét mã</li>
                <li>• Hoặc nhập mã thủ công nếu không quét được</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2">
        <CardHeader>
          <CardTitle>Danh sách đã điểm danh ({records.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chưa có ai điểm danh</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">STT</TableHead>
                    <TableHead>MSSV</TableHead>
                    <TableHead>Họ tên</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead className="text-right">Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record, index) => {
                    const user = getUserById(record.userId);
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell className="font-medium">{resolveStudentId(record)}</TableCell>
                        <TableCell className="font-medium">{user?.name || 'N/A'}</TableCell>
                        <TableCell className="text-muted-foreground">{user?.email || 'N/A'}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateTimeVN(record.timestamp)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={record.status === 'valid' ? 'default' : 'destructive'}>
                            {record.status === 'valid' ? 'Hợp lệ' : 'Không hợp lệ'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
