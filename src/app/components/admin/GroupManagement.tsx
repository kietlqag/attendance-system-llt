import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { getGroupsFromFirebase, deleteGroup } from '../../utils/mockData';
import { Users, Plus, ChevronRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Group } from '../../utils/mockData';
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

export function GroupManagement() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);

  useEffect(() => {
    void loadGroups();
  }, []);

  const loadGroups = async () => {
    const remoteGroups = await getGroupsFromFirebase();
    setGroups(remoteGroups);
  };

  const handleDeleteClick = (groupId: string) => {
    setGroupToDelete(groupId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (groupToDelete) {
      const success = await deleteGroup(groupToDelete);
      if (success) {
        toast.success('Đã xóa lớp/nhóm');
        await loadGroups();
      } else {
        toast.error('Không thể xóa lớp/nhóm');
      }
    }
    setDeleteDialogOpen(false);
    setGroupToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Link to="/admin/groups/create">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Tạo lớp/nhóm mới
          </Button>
        </Link>
      </div>

      {/* Groups List */}
      <div className="space-y-4">
        {groups.length === 0 ? (
          <Card>
            <CardContent className="py-20 text-center">
              <Users className="w-16 h-16 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Chưa có lớp/nhóm nào</p>
            </CardContent>
          </Card>
        ) : (
          groups.map((group) => (
            <Card key={group.id} className="hover:shadow-lg transition-shadow border-2">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{group.name}</h3>
                        <Badge variant="secondary">{group.memberIds.length} thành viên</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {group.description || 'Không có mô tả'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(group.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Link to={`/admin/groups/${group.id}`}>
                      <Button variant="ghost" size="icon">
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa lớp/nhóm này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

