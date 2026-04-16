import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { getSessionsFromFirebase, getGroupsFromFirebase, getUserById, subscribeRecordsBySession } from '../../utils/mockData';
import { QRCodeSVG } from 'qrcode.react';
import { Calendar, Clock, Users, Download, Copy, ArrowLeft, QrCode } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';
import type { AttendanceSession, AttendanceRecord } from '../../utils/mockData';

export function SessionDetail() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const qrRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const loadData = async () => {
      if (sessionId) {
        const sessions = await getSessionsFromFirebase();
        const foundSession = sessions.find(s => s.id === sessionId);
        if (foundSession) {
          setSession(foundSession);
          unsubscribe = subscribeRecordsBySession(sessionId, setRecords);
        }
      }
      setGroups(await getGroupsFromFirebase());
    };

    void loadData();

    return () => {
      unsubscribe?.();
    };
  }, [sessionId]);

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Không tìm thấy phiên điểm danh</p>
      </div>
    );
  }

  const group = groups.find(g => g.id === session.groupId);
  const now = new Date();
  const isActive = now >= session.startTime && now <= session.endTime;
  const isUpcoming = now < session.startTime;
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
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `QR-${session.token}.png`;
      link.href = pngUrl;
      link.click();
      toast.success('Đã tải QR code');
    };

    img.onerror = () => {
      toast.error('Không thể tải QR code');
      URL.revokeObjectURL(url);
    };

    img.src = url;
  };

  const exportToCSV = () => {
    const headers = ['STT', 'Họ tên', 'Email', 'Thời gian điểm danh', 'Trạng thái'];
    const rows = records.map((record, index) => {
      const user = getUserById(record.userId);
      return [
        index + 1,
        user?.name || 'N/A',
        user?.email || 'N/A',
        format(record.timestamp, 'HH:mm:ss dd/MM/yyyy', { locale: vi }),
        record.status === 'valid' ? 'Hợp lệ' : 'Không hợp lệ',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `diemdanh-${session.token}.csv`;
    link.click();
    toast.success('Đã xuất báo cáo');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/admin')} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV} className="gap-2">
            <Download className="w-4 h-4" />
            Xuất Excel
          </Button>
        </div>
      </div>

      {/* Session Info */}
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
              <CardDescription className="text-base">{group?.name || 'Không có nhóm'}</CardDescription>
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
                {format(session.startTime, 'HH:mm', { locale: vi })} -{' '}
                <span className="font-semibold text-sm">
                  {format(session.startTime, 'dd/MM/yyyy', { locale: vi })}
                </span>
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Thời gian kết thúc</span>
              </div>
              <p className="font-semibold">
                {format(session.endTime, 'HH:mm', { locale: vi })} -{' '}
                <span className="font-semibold text-sm">
                  {format(session.endTime, 'dd/MM/yyyy', { locale: vi })}
                </span>
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

      {/* QR Code */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              QR Code điểm danh
            </CardTitle>
            <CardDescription>
              Chiếu mã này để sinh viên quét
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <div ref={qrRef} className="bg-white p-6 rounded-xl border-4 border-primary/20">
              <QRCodeSVG
                value={session.token}
                size={240}
                level="H"
                includeMargin={false}
              />
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
            <CardDescription>
              Sinh viên có thể nhập mã này thủ công
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-6 rounded-lg text-center">
              <p className="text-3xl font-mono font-bold text-primary tracking-wider">
                {session.token}
              </p>
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

      {/* Attendance List */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Danh sách đã điểm danh ({records.length})</CardTitle>
          <CardDescription>
            Cập nhật theo thời gian thực
          </CardDescription>
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
                        <TableCell className="font-medium">{user?.name || 'N/A'}</TableCell>
                        <TableCell className="text-muted-foreground">{user?.email || 'N/A'}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(record.timestamp, 'HH:mm:ss', { locale: vi })}
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

