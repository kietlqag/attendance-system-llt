import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Mail, Pencil, Trash2, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import {
  getGroupsFromFirebase,
  getStudentAccountsFromFirebase,
  getUsers,
  importStudentsToGroup,
  removeMemberFromGroup,
  updateGroupMemberProfile,
} from '../../utils/mockData';
import type { Group, StudentAccount, User } from '../../utils/mockData';

export function GroupDetail() {
  const { groupId } = useParams();
  const navigate = useNavigate();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [studentAccounts, setStudentAccounts] = useState<StudentAccount[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [userToRemove, setUserToRemove] = useState<string | null>(null);

  const [newUserForm, setNewUserForm] = useState({
    studentId: '',
    name: '',
    email: '',
    password: 'user123',
  });

  const [editUserForm, setEditUserForm] = useState({
    studentId: '',
    name: '',
    email: '',
  });

  useEffect(() => {
    void loadGroup();
  }, [groupId]);

  const loadGroup = async () => {
    if (!groupId) return;

    const [groups, accounts] = await Promise.all([
      getGroupsFromFirebase(),
      getStudentAccountsFromFirebase(),
    ]);

    setStudentAccounts(accounts);

    const foundGroup = groups.find((g) => g.id === groupId);
    if (!foundGroup) return;

    setGroup(foundGroup);

    const allUsers = getUsers();
    const groupMembers = allUsers.filter((u) => u.role === 'user' && foundGroup.memberIds.includes(u.id));

    setMembers(groupMembers);
  };

  const resolveStudentId = (member: User) => {
    const account = studentAccounts.find(
      (item) => item.userId === member.id || item.email === member.email
    );

    if (account?.studentId) {
      return account.studentId;
    }

    if (member.id.startsWith('sv_')) {
      return member.id.replace(/^sv_/, '');
    }

    return 'N/A';
  };

  const handleEditClick = (member: User) => {
    setEditingMemberId(member.id);
    setEditUserForm({
      studentId: resolveStudentId(member),
      name: member.name,
      email: member.email,
    });
    setEditDialogOpen(true);
  };

  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingMemberId) return;

    const result = await updateGroupMemberProfile(editingMemberId, {
      studentId: editUserForm.studentId,
      fullName: editUserForm.name,
      email: editUserForm.email,
    });

    if (!result.success) {
      toast.error(result.message || 'Không thể cập nhật thành viên');
      return;
    }

    toast.success('Đã cập nhật thông tin thành viên');
    setEditDialogOpen(false);
    setEditingMemberId(null);
    await loadGroup();
  };

  const handleRemoveClick = (userId: string) => {
    setUserToRemove(userId);
    setRemoveDialogOpen(true);
  };

  const handleRemoveConfirm = async () => {
    if (!groupId || !userToRemove) return;

    const success = await removeMemberFromGroup(groupId, userToRemove);
    if (success) {
      toast.success('Đã xóa thành viên');
      await loadGroup();
    } else {
      toast.error('Không thể xóa thành viên');
    }

    setRemoveDialogOpen(false);
    setUserToRemove(null);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!groupId) return;

    if (!newUserForm.studentId.trim() || !newUserForm.name.trim() || !newUserForm.email.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (studentAccounts.some((a) => a.studentId.trim() === newUserForm.studentId.trim())) {
      toast.error('MSSV đã tồn tại');
      return;
    }

    if (studentAccounts.some((a) => a.email === newUserForm.email.trim().toLowerCase())) {
      toast.error('Email đã tồn tại');
      return;
    }

    await importStudentsToGroup(groupId, [
      {
        studentId: newUserForm.studentId.trim(),
        fullName: newUserForm.name.trim(),
        email: newUserForm.email.trim().toLowerCase(),
        password: newUserForm.password || 'user123',
      },
    ]);

    toast.success(`Đã tạo tài khoản cho ${newUserForm.name.trim()}`);
    setNewUserForm({ studentId: '', name: '', email: '', password: 'user123' });
    setCreateDialogOpen(false);
    await loadGroup();
  };

  if (!group) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Không tìm thấy lớp/nhóm</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/admin/groups')} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Tạo tài khoản mới
          </Button>
        </div>
      </div>

      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {group.name} ({members.length} thành viên)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Chưa có thành viên nào</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => setCreateDialogOpen(true)} variant="outline">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Tạo tài khoản mới
                </Button>
              </div>
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
                    <TableHead className="text-right w-32">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member, index) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium">{resolveStudentId(member)}</TableCell>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell className="text-muted-foreground">{member.email}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEditClick(member)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveClick(member.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
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

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo tài khoản sinh viên mới</DialogTitle>
            <DialogDescription>
              Tài khoản mới sẽ được tự động thêm vào lớp/nhóm này
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newUserStudentId">MSSV</Label>
              <Input
                id="newUserStudentId"
                placeholder="VD: 25145318"
                value={newUserForm.studentId}
                onChange={(e) => setNewUserForm({ ...newUserForm, studentId: e.target.value })}
                className="bg-input-background"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newUserName">Họ và tên</Label>
              <Input
                id="newUserName"
                placeholder="VD: Nguyễn Văn A"
                value={newUserForm.name}
                onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                className="bg-input-background"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newUserEmail" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                id="newUserEmail"
                type="email"
                placeholder="VD: nguyenvana@example.com"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                className="bg-input-background"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newUserPassword">Mật khẩu mặc định</Label>
              <Input
                id="newUserPassword"
                type="text"
                value={newUserForm.password}
                onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                className="bg-input-background"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Hủy
              </Button>
              <Button type="submit">Tạo tài khoản</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa thành viên</DialogTitle>
            <DialogDescription>Cập nhật MSSV, họ tên và email của thành viên</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditMember} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editUserStudentId">MSSV</Label>
              <Input
                id="editUserStudentId"
                placeholder="VD: 25145318"
                value={editUserForm.studentId}
                onChange={(e) => setEditUserForm({ ...editUserForm, studentId: e.target.value })}
                className="bg-input-background"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editUserName">Họ và tên</Label>
              <Input
                id="editUserName"
                placeholder="VD: Nguyễn Văn A"
                value={editUserForm.name}
                onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                className="bg-input-background"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editUserEmail" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                id="editUserEmail"
                type="email"
                placeholder="VD: nguyenvana@example.com"
                value={editUserForm.email}
                onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                className="bg-input-background"
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Hủy
              </Button>
              <Button type="submit">Lưu thay đổi</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>Bạn có chắc chắn muốn xóa thành viên này khỏi lớp/nhóm?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
