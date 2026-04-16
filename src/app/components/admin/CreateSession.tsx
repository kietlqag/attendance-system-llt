import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { createSession, getGroups, getCurrentUser } from '../../utils/mockData';
import { toast } from 'sonner';
import { Calendar, Clock, Users, Plus } from 'lucide-react';

export function CreateSession() {
  const navigate = useNavigate();
  const groups = getGroups();
  const currentUser = getCurrentUser();

  const [formData, setFormData] = useState({
    name: '',
    groupId: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.groupId || !formData.startDate || !formData.startTime || !formData.endDate || !formData.endTime) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

    if (endDateTime <= startDateTime) {
      toast.error('Thời gian kết thúc phải sau thời gian bắt đầu');
      return;
    }

    const newSession = createSession({
      name: formData.name,
      groupId: formData.groupId,
      startTime: startDateTime,
      endTime: endDateTime,
      createdBy: currentUser?.id || '',
      status: 'active',
    });

    toast.success('Tạo phiên điểm danh thành công!');
    navigate(`/admin/session/${newSession.id}`);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Tạo phiên điểm danh mới</h1>
        <p className="text-muted-foreground">
          Điền thông tin để tạo phiên điểm danh mới cho lớp/nhóm của bạn
        </p>
      </div>

      <Card className="border-2">
        <CardHeader>
          <CardTitle>Thông tin phiên điểm danh</CardTitle>
          <CardDescription>
            Hệ thống sẽ tự động tạo mã QR và token điểm danh
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Session Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Tên buổi điểm danh
              </Label>
              <Input
                id="name"
                placeholder="VD: Buổi học số 1 - Lập Trình Web"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-input-background"
                required
              />
            </div>

            {/* Group Selection */}
            <div className="space-y-2">
              <Label htmlFor="group" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Lớp/Nhóm
              </Label>
              <Select
                value={formData.groupId}
                onValueChange={(value) => setFormData({ ...formData, groupId: value })}
              >
                <SelectTrigger className="bg-input-background">
                  <SelectValue placeholder="Chọn lớp/nhóm" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name} ({group.memberIds.length} thành viên)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Date & Time */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Ngày bắt đầu
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="bg-input-background"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Giờ bắt đầu
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="bg-input-background"
                  required
                />
              </div>
            </div>

            {/* End Date & Time */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="endDate" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Ngày kết thúc
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="bg-input-background"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Giờ kết thúc
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="bg-input-background"
                  required
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">
                Tạo phiên điểm danh
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin')}
              >
                Hủy
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
