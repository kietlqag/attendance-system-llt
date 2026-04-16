import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { getUsers, createUser, deleteUser, updateUser } from '../../utils/mockData';
import { Upload, UserPlus, Trash2, Edit, Search, Download, Users } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import type { User } from '../../utils/mockData';

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: 'user123',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, users]);

  const loadUsers = () => {
    const allUsers = getUsers();
    const studentUsers = allUsers.filter(u => u.role === 'user');
    setUsers(studentUsers);
  };

  const filterUsers = () => {
    if (!searchQuery) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(
      user =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
    );
    setFilteredUsers(filtered);
  };

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    const existingUsers = getUsers();
    if (existingUsers.find(u => u.email === newUser.email)) {
      toast.error('Email đã tồn tại');
      return;
    }

    createUser({
      ...newUser,
      role: 'user',
    });

    toast.success('Đã thêm sinh viên');
    setShowAddDialog(false);
    setNewUser({ name: '', email: '', password: 'user123' });
    loadUsers();
  };

  const handleEditUser = () => {
    if (!editingUser) return;

    if (!editingUser.name || !editingUser.email) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    updateUser(editingUser.id, {
      name: editingUser.name,
      email: editingUser.email,
    });

    toast.success('Đã cập nhật thông tin sinh viên');
    setShowEditDialog(false);
    setEditingUser(null);
    loadUsers();
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (confirm(`Bạn có chắc muốn xóa sinh viên ${userName}?`)) {
      deleteUser(userId);
      toast.success('Đã xóa sinh viên');
      loadUsers();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const importedUsers = results.data as any[];
        let successCount = 0;
        let errorCount = 0;

        const existingUsers = getUsers();

        importedUsers.forEach((row) => {
          const name = row.name || row['Họ và tên'] || row['Name'];
          const email = row.email || row['Email'];

          if (name && email) {
            if (!existingUsers.find(u => u.email === email)) {
              createUser({
                name,
                email,
                password: 'user123',
                role: 'user',
              });
              successCount++;
            } else {
              errorCount++;
            }
          } else {
            errorCount++;
          }
        });

        if (successCount > 0) {
          toast.success(`Đã import ${successCount} sinh viên thành công`);
          loadUsers();
        }
        if (errorCount > 0) {
          toast.warning(`${errorCount} dòng bị lỗi hoặc trùng lặp`);
        }
      },
      error: () => {
        toast.error('Lỗi khi đọc file CSV');
      },
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    const csv = 'name,email\nNguyễn Văn A,nguyenvana@example.com\nTrần Thị B,tranthib@example.com';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mau_danh_sach_sinh_vien.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportUsers = () => {
    const csv = Papa.unparse(
      users.map(u => ({
        'Họ và tên': u.name,
        'Email': u.email,
      }))
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `danh_sach_sinh_vien_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Đã xuất danh sách sinh viên');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Quản lý sinh viên</h1>
          <p className="text-muted-foreground">
            Quản lý danh sách sinh viên và import từ file CSV
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-2 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng số sinh viên</CardTitle>
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{users.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              sinh viên trong hệ thống
            </p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kết quả tìm kiếm</CardTitle>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Search className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{filteredUsers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              sinh viên được hiển thị
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Thao tác nhanh</CardTitle>
          <CardDescription>
            Thêm sinh viên mới hoặc import từ file CSV
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button onClick={() => setShowAddDialog(true)} className="gap-2">
              <UserPlus className="w-4 h-4" />
              Thêm sinh viên
            </Button>

            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Import CSV
            </Button>

            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Tải file mẫu
            </Button>

            <Button
              variant="outline"
              onClick={handleExportUsers}
              className="gap-2"
              disabled={users.length === 0}
            >
              <Download className="w-4 h-4" />
              Xuất danh sách
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm theo tên hoặc email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách sinh viên</CardTitle>
          <CardDescription>
            {filteredUsers.length} sinh viên
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery
                  ? 'Không tìm thấy sinh viên nào'
                  : 'Chưa có sinh viên nào. Thêm sinh viên mới hoặc import từ file CSV!'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>STT</TableHead>
                    <TableHead>Họ và tên</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Vai trò</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user, index) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">Sinh viên</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingUser(user);
                              setShowEditDialog(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(user.id, user.name)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm sinh viên mới</DialogTitle>
            <DialogDescription>
              Nhập thông tin sinh viên để thêm vào hệ thống
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Họ và tên *</Label>
              <Input
                id="name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="Nguyễn Văn A"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="nguyenvana@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu mặc định</Label>
              <Input
                id="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Mật khẩu mặc định: user123
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleAddUser}>Thêm sinh viên</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa thông tin sinh viên</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin sinh viên
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Họ và tên *</Label>
                <Input
                  id="edit-name"
                  value={editingUser.name}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, name: e.target.value })
                  }
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingUser.email}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, email: e.target.value })
                  }
                  placeholder="nguyenvana@example.com"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleEditUser}>Lưu thay đổi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
