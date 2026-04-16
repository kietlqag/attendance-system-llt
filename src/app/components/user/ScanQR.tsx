import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { getCurrentUser, getSessionByTokenFromFirebase, createRecord } from '../../utils/mockData';
import { QrCode, Keyboard, CheckCircle, XCircle, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { Html5Qrcode } from 'html5-qrcode';

export function ScanQR() {
  const [manualToken, setManualToken] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [html5QrCode, setHtml5QrCode] = useState<Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      if (html5QrCode) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [html5QrCode]);

  const handleAttendance = async (token: string) => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      toast.error('Vui lòng đăng nhập lại');
      return;
    }

    const session = await getSessionByTokenFromFirebase(token);
    if (!session) {
      setResult({
        success: false,
        message: 'Mã điểm danh không hợp lệ',
      });
      toast.error('Mã điểm danh không hợp lệ');
      return;
    }

    const attendanceResult = createRecord(session.id, currentUser.id);
    setResult({
      success: attendanceResult.success,
      message: attendanceResult.message,
    });

    if (attendanceResult.success) {
      toast.success(attendanceResult.message);
    } else {
      toast.error(attendanceResult.message);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) {
      toast.error('Vui lòng nhập mã điểm danh');
      return;
    }
    void handleAttendance(manualToken.trim());
  };

  const startScanner = async () => {
    setScanning(true);
    setResult(null);

    try {
      const scanner = new Html5Qrcode('qr-reader');
      setHtml5QrCode(scanner);

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          void handleAttendance(decodedText);
          scanner.stop().then(() => {
            setScanning(false);
          });
        },
        () => {
          // Ignore errors while scanning
        }
      );
    } catch {
      toast.error('Không thể khởi động camera. Vui lòng nhập mã thủ công.');
      setScanning(false);
    }
  };

  const stopScanner = () => {
    if (html5QrCode) {
      html5QrCode.stop().then(() => {
        setScanning(false);
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {result && (
        <Card className={`border-2 ${result.success ? 'border-primary bg-primary/5' : 'border-destructive bg-destructive/5'}`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                result.success ? 'bg-primary' : 'bg-destructive'
              }`}>
                {result.success ? (
                  <CheckCircle className="w-8 h-8 text-white" />
                ) : (
                  <XCircle className="w-8 h-8 text-white" />
                )}
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-semibold mb-1 ${
                  result.success ? 'text-primary' : 'text-destructive'
                }`}>
                  {result.success ? 'Điểm danh thành công!' : 'Điểm danh thất bại'}
                </h3>
                <p className="text-muted-foreground">{result.message}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="scan" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scan" className="gap-2">
            <Camera className="w-4 h-4" />
            Quét QR Code
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2">
            <Keyboard className="w-4 h-4" />
            Nhập mã
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scan">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Quét QR Code
              </CardTitle>
              <CardDescription>Sử dụng camera để quét mã QR điểm danh</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!scanning ? (
                <div className="space-y-4">
                  <div className="bg-muted rounded-lg p-12 flex flex-col items-center justify-center">
                    <div className="w-24 h-24 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                      <QrCode className="w-12 h-12 text-primary" />
                    </div>
                    <p className="text-muted-foreground text-center mb-6">
                      Nhấn nút bên dưới để bật camera và quét mã QR
                    </p>
                    <Button onClick={startScanner} size="lg" className="gap-2">
                      <Camera className="w-5 h-5" />
                      Bật camera
                    </Button>
                  </div>
                  <div className="bg-primary/5 p-4 rounded-lg">
                    <p className="text-sm font-semibold mb-2">Lưu ý:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>- Cho phép trình duyệt truy cập camera</li>
                      <li>- Đưa QR code vào khung hình</li>
                      <li>- Giữ camera ổn định để quét</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div id="qr-reader" className="rounded-lg overflow-hidden"></div>
                  <Button onClick={stopScanner} variant="outline" className="w-full">
                    Dừng quét
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Keyboard className="w-5 h-5" />
                Nhập mã thủ công
              </CardTitle>
              <CardDescription>Nhập mã điểm danh được cung cấp bởi giảng viên</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="token">Mã điểm danh</Label>
                  <Input
                    id="token"
                    placeholder="VD: ATT-2026-001"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    className="bg-input-background text-lg font-mono tracking-wider"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Nhập chính xác mã điểm danh được hiển thị trên màn hình
                  </p>
                </div>

                <Button type="submit" className="w-full" size="lg">
                  Điểm danh
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
