import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { getCurrentUser, getSessionByTokenFromFirebase, createRecord } from '../../utils/mockData';
import { QrCode, Keyboard, CheckCircle, XCircle, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { Html5Qrcode } from 'html5-qrcode';

const SCANNER_ELEMENT_ID = 'qr-reader';

export function ScanQR() {
  const [manualToken, setManualToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<'scan' | 'manual'>('scan');

  const canUseCamera = useMemo(() => {
    if (typeof window === 'undefined') return true;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return true;
    return window.isSecureContext;
  }, []);

  useEffect(() => {
    return () => {
      if (scanner) {
        scanner.stop().catch(() => undefined);
        scanner.clear().catch(() => undefined);
      }
    };
  }, [scanner]);

  useEffect(() => {
    if (!scanning || activeTab !== 'scan') {
      return;
    }

    let cancelled = false;

    const bootScanner = async () => {
      if (!canUseCamera) {
        toast.error('Camera chỉ hoạt động trên HTTPS hoặc localhost.');
        setScanning(false);
        return;
      }

      try {
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          toast.error('Không tìm thấy camera trên thiết bị này. Vui lòng nhập mã thủ công.');
          setScanning(false);
          return;
        }
      } catch {
        // Continue, start() will return detailed permission/device error.
      }

      try {
        const instance = new Html5Qrcode(SCANNER_ELEMENT_ID);
        if (cancelled) return;

        setScanner(instance);
        await instance.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText) => {
            void handleAttendance(decodedText);
            void instance.stop().then(() => {
              setScanning(false);
            });
          },
          () => {
            // ignore frame decode errors
          }
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.toLowerCase().includes('permission')) {
          toast.error('Trình duyệt chưa cấp quyền camera. Hãy cho phép camera rồi thử lại.');
        } else if (message.toLowerCase().includes('secure')) {
          toast.error('Camera yêu cầu HTTPS hoặc localhost.');
        } else {
          toast.error('Không thể khởi động camera. Vui lòng nhập mã thủ công.');
        }
        setScanning(false);
      }
    };

    void bootScanner();

    return () => {
      cancelled = true;
    };
  }, [scanning, activeTab, canUseCamera]);

  const stopScanner = async () => {
    if (!scanner) {
      setScanning(false);
      return;
    }

    try {
      await scanner.stop();
      await scanner.clear();
    } catch {
      // ignore stop/clear errors
    } finally {
      setScanning(false);
      setScanner(null);
    }
  };

  const handleAttendance = async (token: string) => {
    setSubmitting(true);

    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        toast.error('Vui lòng đăng nhập lại');
        return;
      }

      let session = null;
      try {
        session = await getSessionByTokenFromFirebase(token);
      } catch (error) {
        const errorCode = (error as { code?: string } | null)?.code;
        const message =
          errorCode === 'auth/admin-restricted-operation'
            ? 'Firebase chưa bật Anonymous Auth cho sinh viên.'
            : errorCode === 'permission-denied'
            ? 'Firestore rules chưa cho phép sinh viên truy cập phiên điểm danh.'
            : 'Không thể truy cập dữ liệu điểm danh. Vui lòng thử lại.';
        setResult({ success: false, message });
        toast.error(message);
        return;
      }

      if (!session) {
        const message = 'Mã điểm danh không hợp lệ';
        setResult({ success: false, message });
        toast.error(message);
        return;
      }

      const attendanceResult = await createRecord(session.id, currentUser.id, session);
      setResult({
        success: attendanceResult.success,
        message: attendanceResult.message,
      });

      if (attendanceResult.success) {
        toast.success(attendanceResult.message);
      } else {
        toast.error(attendanceResult.message);
      }
    } catch {
      const message = 'Yêu cầu điểm danh thất bại. Vui lòng thử lại.';
      setResult({ success: false, message });
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!manualToken.trim()) {
      toast.error('Vui lòng nhập mã điểm danh');
      return;
    }
    await handleAttendance(manualToken.trim());
  };

  const startScanner = () => {
    setResult(null);
    setScanning(true);
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
                <h3 className={`text-lg font-semibold mb-1 ${result.success ? 'text-primary' : 'text-destructive'}`}>
                  {result.success ? 'Điểm danh thành công!' : 'Điểm danh thất bại'}
                </h3>
                <p className="text-muted-foreground">{result.message}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'scan' | 'manual')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scan" className="gap-2">
            <Camera className="w-4 h-4" />
            Quét QR Code
          </TabsTrigger>
          <TabsTrigger
            value="manual"
            className="gap-2"
            onClick={() => {
              void stopScanner();
            }}
          >
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
            </CardHeader>
            <CardContent className="space-y-4">
              {!scanning ? (
                <div className="space-y-4">
                  <div className="bg-muted rounded-lg p-12 flex flex-col items-center justify-center">
                    <div className="w-24 h-24 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                      <QrCode className="w-12 h-12 text-primary" />
                    </div>
                    <p className="text-muted-foreground text-center mb-6">Nhấn nút bên dưới để bật camera và quét mã QR</p>
                    <Button onClick={startScanner} size="lg" className="gap-2" disabled={!canUseCamera}>
                      <Camera className="w-5 h-5" />
                      Bật camera
                    </Button>
                    {!canUseCamera && (
                      <p className="text-xs text-destructive mt-3 text-center">Camera yêu cầu HTTPS (hoặc localhost).</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div id={SCANNER_ELEMENT_ID} className="rounded-lg overflow-hidden min-h-[320px]" />
                  <Button onClick={() => void stopScanner()} variant="outline" className="w-full">
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
                  <p className="text-sm text-muted-foreground">Nhập chính xác mã điểm danh được hiển thị trên màn hình</p>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                  {submitting ? 'Đang xử lý...' : 'Điểm danh'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
