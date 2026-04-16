import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { createGroup } from '../../utils/mockData';
import { toast } from 'sonner';
import { Users, FileText } from 'lucide-react';

export function CreateGroup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên lớp/nhóm');
      return;
    }

    const newGroup = createGroup({
      name: formData.name.trim(),
      description: formData.description.trim(),
      memberIds: [],
    });

    toast.success('Tạo lớp/nhóm thành công!');
    navigate(`/admin/groups/${newGroup.id}`);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Tạo lớp/nhóm mới</h1>
        <p className="text-muted-foreground">
          Tạo lớp học hoặc nhóm làm việc mới
        </p>
      </div>

      <Card className="border-2">
        <CardHeader>
          <CardTitle>Thông tin lớp/nhóm</CardTitle>
          <CardDescription>
            Sau khi tạo, bạn có thể thêm thành viên vào lớp/nhóm
          </CardDescription>
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

            <div className="space-y-2">
              <Label htmlFor="description" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Mô tả (tùy chọn)
              </Label>
              <Textarea
                id="description"
                placeholder="VD: Lớp học Lập Trình Web - Khóa 2024-2026"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-input-background min-h-[100px]"
                rows={4}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">
                Tạo lớp/nhóm
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin/groups')}
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
