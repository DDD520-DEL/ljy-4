import { useState, useEffect } from 'react';
import { X, Save, Bell, Calendar } from 'lucide-react';
import { reminderApi, petApi, Pet, Reminder } from '../services/api';

interface Props {
  petId?: string;
  reminder?: Reminder | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReminderForm({ petId, reminder, onClose, onSuccess }: Props) {
  const [selectedPetId, setSelectedPetId] = useState(petId || '');
  const [title, setTitle] = useState('');
  const [remindDate, setRemindDate] = useState('');
  const [remindTime, setRemindTime] = useState('09:00');
  const [notes, setNotes] = useState('');
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPets();
  }, []);

  useEffect(() => {
    if (reminder) {
      setSelectedPetId(reminder.petId);
      setTitle(reminder.title);
      const dt = new Date(reminder.remindAt);
      const offset = dt.getTimezoneOffset();
      const localDT = new Date(dt.getTime() - offset * 60 * 1000);
      setRemindDate(localDT.toISOString().split('T')[0]);
      setRemindTime(localDT.toTimeString().slice(0, 5));
      setNotes(reminder.notes || '');
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const offset = tomorrow.getTimezoneOffset();
      const localTomorrow = new Date(tomorrow.getTime() - offset * 60 * 1000);
      setRemindDate(localTomorrow.toISOString().split('T')[0]);
    }
  }, [reminder]);

  async function loadPets() {
    setLoading(true);
    try {
      const data = await petApi.list();
      setPets(data);
      if (!petId && !reminder && data.length > 0) {
        setSelectedPetId(data[0].id);
      }
    } catch (error) {
      console.error('加载宠物列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPetId) {
      alert('请选择关联的宠物');
      return;
    }
    if (!title.trim()) {
      alert('请输入提醒标题');
      return;
    }
    if (!remindDate) {
      alert('请选择提醒日期');
      return;
    }

    const remindAt = new Date(`${remindDate}T${remindTime}`).toISOString();

    setSaving(true);
    try {
      if (reminder) {
        await reminderApi.update(reminder.id, {
          petId: selectedPetId,
          title: title.trim(),
          remindAt,
          notes: notes.trim() || null,
        });
        alert('提醒已更新');
      } else {
        await reminderApi.create({
          petId: selectedPetId,
          title: title.trim(),
          remindAt,
          notes: notes.trim() || null,
        });
        alert('提醒已创建');
      }
      onSuccess();
    } catch (error: any) {
      alert(`保存失败: ${error.error || error.message || '未知错误'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {reminder ? '编辑提醒' : '新建提醒'}
              </h2>
              <p className="text-sm text-gray-500">
                为宠物设置待办事项提醒
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                关联宠物 <span className="text-red-500">*</span>
              </label>
              {loading ? (
                <div className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-400">
                  加载中...
                </div>
              ) : (
                <select
                  value={selectedPetId}
                  onChange={(e) => setSelectedPetId(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">请选择宠物</option>
                  {pets.map((pet) => (
                    <option key={pet.id} value={pet.id}>
                      {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐱' : '🐾'}
                      {pet.name}
                      {pet.breed ? ` · ${pet.breed}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                提醒标题 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：接种疫苗、驱虫、体检等"
                required
                maxLength={100}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                提醒日期时间 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={remindDate}
                    onChange={(e) => setRemindDate(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <input
                  type="time"
                  value={remindTime}
                  onChange={(e) => setRemindTime(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                备注说明
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="可选：添加具体的备注信息..."
                maxLength={500}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">
                {notes.length}/500
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? '保存中...' : reminder ? '更新提醒' : '创建提醒'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
