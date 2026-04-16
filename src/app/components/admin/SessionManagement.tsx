import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
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
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  deleteSession,
  getGroupsFromFirebase,
  getRecordsFromFirebase,
  getSessionsFromFirebase,
  updateSession,
} from '../../utils/mockData';
import { Calendar, CheckCircle, ChevronRight, Clock, Pencil, Plus, Trash2, Users, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { AttendanceSession, Group } from '../../utils/mockData';

const toLocalDateTimeInputValue = (value: Date | string) => {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

export function SessionManagement() {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [recordCountsBySession, setRecordCountsBySession] = useState<Record<string, number>>({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<AttendanceSession | null>(null);
  const [deletingSession, setDeletingSession] = useState<AttendanceSession | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    groupId: '',
    startTime: '',
    endTime: '',
  });

  const loadData = async () => {
    try {
      const [allSessions, allGroups, allRecords] = await Promise.all([
        getSessionsFromFirebase(),
        getGroupsFromFirebase(),
        getRecordsFromFirebase(),
      ]);

      const sorted = [...allSessions].sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
      setSessions(sorted);
      setGroups(allGroups);

      const counts = allRecords.reduce<Record<string, number>>((acc, item) => {
        acc[item.sessionId] = (acc[item.sessionId] || 0) + 1;
        return acc;
      }, {});
      setRecordCountsBySession(counts);
    } catch {
      setSessions([]);
      setGroups([]);
      setRecordCountsBySession({});
    }
  };

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;

    void loadData();
    timer = setInterval(() => {
      void loadData();
    }, 5000);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  const getGroupName = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    return group?.name || 'Không xác định';
  };

  const formatDateTime = (value: Date | string) => new Date(value).toLocaleString('vi-VN');

  const getStatusBadge = (session: AttendanceSession) => {
    const now = new Date();
    const endTime = new Date(session.endTime);

    if (now > endTime) {
      return (
        <Badge variant="secondary" className="gap-1">
          <XCircle className="w-3 h-3" />
          Đã kết thúc
        </Badge>
      );
    }

    return (
      <Badge variant="default" className="gap-1">
        <CheckCircle className="w-3 h-3" />
        Đang hoạt động
      </Badge>
    );
  };

  const openEditDialog = (session: AttendanceSession) => {
    setEditingSession(session);
    setEditForm({
      name: session.name,
      groupId: session.groupId,
      startTime: toLocalDateTimeInputValue(session.startTime),
      endTime: toLocalDateTimeInputValue(session.endTime),
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;

    const startTime = new Date(editForm.startTime);
    const endTime = new Date(editForm.endTime);

    if (!editForm.name.trim() || !editForm.groupId || Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      toast.error('Vui lòng điền đầy đủ thông tin phiên');
      return;
    }

    if (startTime >= endTime) {
      toast.error('Thời gian bắt đầu phải trước thời gian kết thúc');
      return;
    }

    const success = await updateSession(editingSession.id, {
      name: editForm.name.trim(),
      groupId: editForm.groupId,
      startTime,
      endTime,
    });

    if (!success) {
      toast.error('Không thể cập nhật phiên điểm danh');
      return;
    }

    toast.success('Đã cập nhật phiên điểm danh');
    setEditDialogOpen(false);
    setEditingSession(null);
    await loadData();
  };

  const openDeleteDialog = (session: AttendanceSession) => {
    setDeletingSession(session);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSession = async () => {
    if (!deletingSession) return;

    const success = await deleteSession(deletingSession.id);
    if (!success) {
      toast.error('Không thể xóa phiên điểm danh');
      return;
    }

    toast.success('Đã xóa phiên điểm danh');
    setDeleteDialogOpen(false);
    setDeletingSession(null);
    await loadData();
  };

  const activeSessions = sessions.filter((s) => new Date() <= new Date(s.endTime));
  const completedSessions = sessions.filter((s) => new Date() > new Date(s.endTime));

  const renderSessionCard = (session: AttendanceSession, isActive: boolean) => (
    <Card
      key={session.id}
      className={`hover:shadow-lg transition-shadow border-2 ${isActive ? 'border-primary/20' : ''}`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isActive ? 'bg-primary/10' : 'bg-gray-100'
              }`}
            >
              <Calendar className={`w-6 h-6 ${isActive ? 'text-primary' : 'text-gray-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-lg">{session.name}</h3>
                {getStatusBadge(session)}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{getGroupName(session.groupId)}</span>
                </div>
                <div className="text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Bắt đầu: {formatDateTime(session.startTime)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Kết thúc: {formatDateTime(session.endTime)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-4 h-4" />
                  <span>{recordCountsBySession[session.id] || 0} lượt điểm danh</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" onClick={() => openEditDialog(session)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openDeleteDialog(session)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Link to={`/admin/session/${session.id}`}>
              <Button variant="ghost" size="icon">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Link to="/admin/create-session">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Tạo phiên mới
          </Button>
        </Link>
      </div>

      {activeSessions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-semibold">Phiên đang hoạt động</h2>
            <Badge variant="default">{activeSessions.length}</Badge>
          </div>
          {activeSessions.map((session) => renderSessionCard(session, true))}
        </div>
      )}

      {completedSessions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-semibold">Phiên đã kết thúc</h2>
            <Badge variant="secondary">{completedSessions.length}</Badge>
          </div>
          {completedSessions.map((session) => renderSessionCard(session, false))}
        </div>
      )}

      {sessions.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Chưa có phiên điểm danh nào. Tạo phiên đầu tiên của bạn!</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa phiên điểm danh</DialogTitle>
            <DialogDescription>Cập nhật thông tin phiên đang chọn</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editSessionName">Tên phiên</Label>
              <Input
                id="editSessionName"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="VD: Buổi học số 3"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editSessionGroup">Lớp/Nhóm</Label>
              <select
                id="editSessionGroup"
                value={editForm.groupId}
                onChange={(e) => setEditForm({ ...editForm, groupId: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                required
              >
                <option value="" disabled>
                  Chọn lớp/nhóm
                </option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editSessionStart">Bắt đầu</Label>
                <Input
                  id="editSessionStart"
                  type="datetime-local"
                  value={editForm.startTime}
                  onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editSessionEnd">Kết thúc</Label>
                <Input
                  id="editSessionEnd"
                  type="datetime-local"
                  value={editForm.endTime}
                  onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                  required
                />
              </div>
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa phiên</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa phiên "{deletingSession?.name || ''}"? Tất cả bản ghi điểm danh của phiên này cũng sẽ bị xóa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSession}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xóa phiên
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
