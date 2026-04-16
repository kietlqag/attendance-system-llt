import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { 
  getGroupsFromFirebase, 
  getUsers, 
  addMemberToGroup, 
  removeMemberFromGroup,
  createUser,
  getUserById,
} from '../../utils/mockData';
import { ArrowLeft, UserPlus, Trash2, Users, Mail } from 'lucide-react';
import { toast } from 'sonner';
import type { Group, User } from '../../utils/mockData';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
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

export function GroupDetail() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<string | null>(null);
  
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: 'user123',
  });

  useEffect(() => {
    void loadGroup();
  }, [groupId]);

  const loadGroup = async () => {
    if (!groupId) return;

    const groups = await getGroupsFromFirebase();
    const foundGroup = groups.find(g => g.id === groupId);
    if (foundGroup) {
      setGroup(foundGroup);
      
      // Load members
      const allUsers = getUsers();
      const groupMembers = allUsers.filter(u => 
        u.role === 'user' && foundGroup.memberIds.includes(u.id)
      );
      setMembers(groupMembers);

      // Load available users (not in group)
      const available = allUsers.filter(u => 
        u.role === 'user' && !foundGroup.memberIds.includes(u.id)
      );
      setAvailableUsers(available);
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!groupId) return;

    const success = await addMemberToGroup(groupId, userId);
    if (success) {
      toast.success('Đã thêm thành viên');
      await loadGroup();
      setAddDialogOpen(false);
    } else {
      toast.error('Không thể thêm thành viên');
    }
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

    if (!newUserForm.name.trim() || !newUserForm.email.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    // Check if email exists
    const existingUsers = getUsers();
    if (existingUsers.some(u => u.email === newUserForm.email)) {
      toast.error('Email đã tồn tại');
      return;
    }

    const newUser = createUser({
      name: newUserForm.name.trim(),
      email: newUserForm.email.trim(),
      password: newUserForm.password || 'user123',
      role: 'user',
    });

    // Add to group if we have a groupId
    if (groupId) {
      await addMemberToGroup(groupId, newUser.id);
    }

    toast.success(`Đã tạo tài khoản cho ${newUser.name}`);
    setNewUserForm({ name: '', email: '', password: 'user123' });
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
      {/* Header */}
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
          <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Thêm thành viên
          </Button>
        </div>
      </div>

      {/* Group Info */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="text-2xl">{group.name}</CardTitle>
                <Badge variant="secondary">{members.length} thành viên</Badge>
              </div>
              <CardDescription className="text-base">
                {group.description || 'Không có mô tả'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Members List */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Danh sách thành viên ({members.length})
          </CardTitle>
          <CardDescription>
            Quản lý thành viên trong lớp/nhóm
          </CardDescription>
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
                <Button onClick={() => setAddDialogOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Thêm thành viên
                </Button>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">STT</TableHead>
                    <TableHead>Họ tên</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right w-24">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member, index) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell className="text-muted-foreground">{member.email}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveClick(member.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm thành viên vào lớp/nhóm</DialogTitle>
            <DialogDescription>
              Chọn người dùng từ danh sách để thêm vào lớp/nhóm
            </DialogDescription>
          </DialogHeader>
          
          {availableUsers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>Không có người dùng nào khả dụng</p>
              <Button
                onClick={() => {
                  setAddDialogOpen(false);
                  setCreateDialogOpen(true);
                }}
                className="mt-4"
              >
                Tạo tài khoản mới
              </Button>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {availableUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <Button onClick={() => handleAddMember(user.id)} size="sm">
                    Thêm
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>T?o t?i kho?n sinh vi?n m?i</DialogTitle>
            <DialogDescription>
              Tài khoản mới sẽ được tự động thêm vào lớp/nhóm này
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateUser} className="space-y-4">
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
              <p className="text-xs text-muted-foreground">
                Người dùng có thể đổi mật khẩu sau khi đăng nhập
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Hủy
              </Button>
              <Button type="submit">
                Tạo tài khoản
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa thành viên này khỏi lớp/nhóm?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
