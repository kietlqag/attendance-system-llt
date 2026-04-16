import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { createGroup, importStudentsToGroup, type ImportedStudentRow } from '../../utils/mockData';
import { toast } from 'sonner';
import { Users, Upload, FileSpreadsheet, Download } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { firebaseAuth } from '../../../lib/firebase';

type RawRow = Record<string, unknown>;

const normalizeHeader = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const pickValue = (row: RawRow, aliases: string[]): string => {
  const entries = Object.entries(row);
  for (const [key, value] of entries) {
    if (aliases.includes(normalizeHeader(key))) {
      return String(value ?? '').trim();
    }
  }
  return '';
};

const mapRowsToStudents = (rows: RawRow[]): ImportedStudentRow[] => {
  const mapped = rows
    .map((row) => {
      const studentId = pickValue(row, ['mssv', 'studentid', 'studentcode', 'studentnumber', 'masosinhvien']);
      const fullName = pickValue(row, ['hoten', 'fullname', 'name', 'ten']);
      const email = pickValue(row, ['email', 'mail']);
      const password = pickValue(row, ['mk', 'matkhau', 'password', 'pass']);

      return {
        studentId,
        fullName,
        email,
        password,
      };
    })
    .filter((item) => item.studentId && item.fullName && item.email && item.password);

  const uniqueByStudentId = new Map<string, ImportedStudentRow>();
  mapped.forEach((item) => {
    uniqueByStudentId.set(item.studentId.toLowerCase(), item);
  });

  return Array.from(uniqueByStudentId.values());
};

export function CreateGroup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
  });
  const [importRows, setImportRows] = useState<ImportedStudentRow[]>([]);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [parsing, setParsing] = useState(false);

  const previewRows = useMemo(() => importRows.slice(0, 5), [importRows]);

  const handleCsvFile = async (file: File) => {
    const text = await file.text();
    const result = Papa.parse<RawRow>(text, { header: true, skipEmptyLines: true });
    if (result.errors.length > 0) {
      throw new Error(result.errors[0].message);
    }
    return mapRowsToStudents(result.data as RawRow[]);
  };

  const handleExcelFile = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return [];
    }
    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<RawRow>(worksheet, { defval: '' });
    return mapRowsToStudents(rows);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setParsing(true);
    try {
      const lower = file.name.toLowerCase();
      const rows = lower.endsWith('.csv') ? await handleCsvFile(file) : await handleExcelFile(file);

      if (rows.length === 0) {
        toast.error('Không đọc được dữ liệu hợp lệ. Hãy kiểm tra đúng cột mẫu.');
        setImportRows([]);
        setSelectedFileName(file.name);
        return;
      }

      setImportRows(rows);
      setSelectedFileName(file.name);
      toast.success(`Đã nạp ${rows.length} sinh viên từ file.`);
    } catch (error) {
      toast.error(`Không thể đọc file: ${(error as Error).message}`);
      setImportRows([]);
      setSelectedFileName(file.name);
    } finally {
      setParsing(false);
      event.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên lớp/nhóm');
      return;
    }

    if (!firebaseAuth.currentUser) {
      toast.error('Phiên đăng nhập admin đã hết. Vui lòng đăng nhập lại.');
      navigate('/admin/login');
      return;
    }

    try {
      const newGroup = await createGroup({
        name: formData.name.trim(),
        description: '',
        memberIds: [],
      });

      if (importRows.length > 0) {
        const result = await importStudentsToGroup(newGroup.id, importRows);
        toast.success(
          `Tạo lớp thành công. Thêm mới ${result.added}, cập nhật ${result.updated}, gán vào lớp ${result.linkedToGroup} sinh viên.`
        );
      } else {
        toast.success('Tạo lớp/nhóm thành công!');
      }

      navigate(`/admin/groups/${newGroup.id}`);
    } catch (error) {
      const firebaseCode = typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code ?? '')
        : '';
      if (firebaseCode.includes('permission-denied')) {
        toast.error('Firestore chưa cấp quyền ghi cho tài khoản hiện tại. Kiểm tra Firestore Rules.');
        return;
      }
      const message = error instanceof Error ? error.message : 'Lỗi không xác định';
      toast.error(`Không thể tạo lớp: ${message}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Tạo mới</h1>
      </div>

      <Card className="border-2">
        <CardHeader>
          <CardTitle>Thông tin lớp/nhóm</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Tên lớp/nhóm
              </Label>
              <Input
                id="name"
                placeholder="VD: Lớp Lập Trình Web K19"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-input-background"
                required
              />
            </div>

            <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <Label htmlFor="student-file" className="flex items-center gap-2 text-sm font-semibold">
                  <FileSpreadsheet className="w-4 h-4" />
                  Danh sách sinh viên (.csv, .xlsx, .xls)
                </Label>
                <div className="flex items-center gap-3">
                  <a
                    href="/templates/student-import-template.csv"
                    download
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Download className="w-4 h-4" />
                    Mẫu CSV
                  </a>
                  <a
                    href="/templates/student-import-template.xlsx"
                    download
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Download className="w-4 h-4" />
                    Mẫu XLSX
                  </a>
                </div>
              </div>

              <Input
                id="student-file"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                disabled={parsing}
              />

              {selectedFileName && (
                <p className="text-sm">
                  File đã chọn: <strong>{selectedFileName}</strong> {parsing ? '(đang đọc...)' : ''}
                </p>
              )}

              {importRows.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Đã nạp {importRows.length} sinh viên</p>
                  <div className="rounded-md border bg-background p-3 overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="py-1 pr-3">MSSV</th>
                          <th className="py-1 pr-3">Họ tên</th>
                          <th className="py-1">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row) => (
                          <tr key={row.studentId} className="border-b last:border-0">
                            <td className="py-1 pr-3">{row.studentId}</td>
                            <td className="py-1 pr-3">{row.fullName}</td>
                            <td className="py-1">{row.email}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">
                <Upload className="w-4 h-4 mr-2" />
                Tạo lớp
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/admin/groups')}>
                Hủy
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
