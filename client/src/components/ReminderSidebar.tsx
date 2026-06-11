import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Plus,
  Check,
  Trash2,
  Edit3,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertCircle,
  Calendar as CalendarIcon,
} from 'lucide-react';
import {
  reminderApi,
  Reminder,
  TodayRemindersResponse,
} from '../services/api';
import ReminderForm from './ReminderForm';

interface Props {
  refreshTrigger?: number;
}

export default function ReminderSidebar({ refreshTrigger }: Props) {
  const [data, setData] = useState<TodayRemindersResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [actionIds, setActionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadReminders();
  }, [refreshTrigger]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadReminders(false);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  async function loadReminders(showLoading = true) {
    if (showLoading) setLoading(true);
    try {
      const result = await reminderApi.getToday();
      setData(result);
    } catch (error) {
      console.error('加载提醒失败:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  function getReminderCategory(remindAt: string): 'today' | 'upcoming' | 'none' {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);
    const endOf7Days = new Date(endOfDay.getTime() + 7 * 24 * 60 * 60 * 1000);
    const date = new Date(remindAt);
    if (date <= endOfDay) return 'today';
    if (date <= endOf7Days) return 'upcoming';
    return 'none';
  }

  function insertSorted(list: Reminder[], item: Reminder): Reminder[] {
    const result = [...list, item];
    result.sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime());
    return result;
  }

  async function handleToggleComplete(reminder: Reminder) {
    setActionIds((prev) => new Set(prev).add(reminder.id));
    try {
      const updated = await reminderApi.toggleComplete(reminder.id);
      setData((prev) => {
        if (!prev) return prev;
        const isInToday = prev.today.some((r) => r.id === reminder.id);
        const isInUpcoming = prev.upcoming.some((r) => r.id === reminder.id);
        const wasOverdue = isInToday && isOverdue(reminder);

        if (updated.isCompleted) {
          return {
            ...prev,
            today: prev.today.filter((r) => r.id !== reminder.id),
            upcoming: prev.upcoming.filter((r) => r.id !== reminder.id),
            stats: {
              ...prev.stats,
              todayCount: isInToday ? prev.stats.todayCount - 1 : prev.stats.todayCount,
              upcomingCount: isInUpcoming ? prev.stats.upcomingCount - 1 : prev.stats.upcomingCount,
              overdueCount: wasOverdue
                ? prev.stats.overdueCount - 1
                : prev.stats.overdueCount,
            },
          };
        } else {
          const category = getReminderCategory(updated.remindAt);
          if (category === 'today') {
            const alreadyExists = prev.today.some((r) => r.id === updated.id);
            const newToday = alreadyExists
              ? prev.today.map((r) => (r.id === updated.id ? updated : r))
              : insertSorted(prev.today, updated);
            const newOverdue = isOverdue(updated)
              ? prev.stats.overdueCount + (wasOverdue ? 0 : 1)
              : prev.stats.overdueCount - (wasOverdue ? 1 : 0);
            return {
              ...prev,
              today: newToday,
              upcoming: prev.upcoming.filter((r) => r.id !== updated.id),
              stats: {
                ...prev.stats,
                todayCount: alreadyExists ? prev.stats.todayCount : prev.stats.todayCount + 1,
                upcomingCount: isInUpcoming ? prev.stats.upcomingCount - 1 : prev.stats.upcomingCount,
                overdueCount: Math.max(0, newOverdue),
              },
            };
          } else if (category === 'upcoming') {
            const alreadyExists = prev.upcoming.some((r) => r.id === updated.id);
            return {
              ...prev,
              today: prev.today.filter((r) => r.id !== updated.id),
              upcoming: alreadyExists
                ? prev.upcoming.map((r) => (r.id === updated.id ? updated : r))
                : insertSorted(prev.upcoming, updated),
              stats: {
                ...prev.stats,
                todayCount: isInToday ? prev.stats.todayCount - 1 : prev.stats.todayCount,
                upcomingCount: alreadyExists ? prev.stats.upcomingCount : prev.stats.upcomingCount + 1,
                overdueCount: wasOverdue
                  ? prev.stats.overdueCount - 1
                  : prev.stats.overdueCount,
              },
            };
          }
          return {
            ...prev,
            today: prev.today.filter((r) => r.id !== updated.id),
            upcoming: prev.upcoming.filter((r) => r.id !== updated.id),
            stats: {
              ...prev.stats,
              todayCount: isInToday ? prev.stats.todayCount - 1 : prev.stats.todayCount,
              upcomingCount: isInUpcoming ? prev.stats.upcomingCount - 1 : prev.stats.upcomingCount,
              overdueCount: wasOverdue
                ? prev.stats.overdueCount - 1
                : prev.stats.overdueCount,
            },
          };
        }
      });
    } catch (error) {
      console.error('切换完成状态失败:', error);
    } finally {
      setActionIds((prev) => {
        const next = new Set(prev);
        next.delete(reminder.id);
        return next;
      });
    }
  }

  async function handleDelete(reminder: Reminder) {
    if (!confirm(`确定要删除提醒"${reminder.title}"吗？`)) return;
    setActionIds((prev) => new Set(prev).add(reminder.id));
    try {
      await reminderApi.remove(reminder.id);
      setData((prev) => {
        if (!prev) return prev;
        const isInToday = prev.today.some((r) => r.id === reminder.id);
        const isInUpcoming = prev.upcoming.some((r) => r.id === reminder.id);
        return {
          ...prev,
          today: prev.today.filter((r) => r.id !== reminder.id),
          upcoming: prev.upcoming.filter((r) => r.id !== reminder.id),
          stats: {
            ...prev.stats,
            todayCount: isInToday ? prev.stats.todayCount - 1 : prev.stats.todayCount,
            upcomingCount: isInUpcoming ? prev.stats.upcomingCount - 1 : prev.stats.upcomingCount,
            overdueCount: isInToday && isOverdue(reminder)
              ? prev.stats.overdueCount - 1
              : prev.stats.overdueCount,
          },
        };
      });
    } catch (error) {
      console.error('删除提醒失败:', error);
    } finally {
      setActionIds((prev) => {
        const next = new Set(prev);
        next.delete(reminder.id);
        return next;
      });
    }
  }

  function handleEdit(reminder: Reminder) {
    setEditingReminder(reminder);
    setShowForm(true);
  }

  function handleNewReminder() {
    setEditingReminder(null);
    setShowForm(true);
  }

  function handleFormSuccess() {
    setShowForm(false);
    setEditingReminder(null);
    loadReminders();
  }

  function isOverdue(reminder: Reminder): boolean {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return new Date(reminder.remindAt) < startOfDay;
  }

  function formatReminderTime(remindAt: string): string {
    const date = new Date(remindAt);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    const endOfTomorrow = new Date(startOfTomorrow.getTime() + 24 * 60 * 60 * 1000 - 1);

    if (date < startOfToday) {
      const days = Math.floor((startOfToday.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
      if (days === 0) {
        return `已过期 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
      }
      return `已过期 ${days} 天`;
    } else if (date < startOfTomorrow) {
      return `今天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date < endOfTomorrow) {
      return `明天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }

  const totalCount = data ? data.stats.todayCount + data.stats.upcomingCount : 0;

  if (!data) {
    return (
      <div className="p-4 border-t border-gray-200">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 rounded w-3/4"></div>
          <div className="h-16 bg-gray-100 rounded-lg"></div>
          <div className="h-16 bg-gray-100 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200">
      <div className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            totalCount > 0 ? 'bg-amber-100' : 'bg-gray-100'
          }`}>
            <Bell className={`w-4 h-4 ${totalCount > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-900">待办提醒</span>
            {totalCount > 0 && (
              <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                {totalCount}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNewReminder();
            }}
            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            title="新建提醒"
          >
            <Plus className="w-4 h-4" />
          </button>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4">
          {totalCount === 0 ? (
            <div className="text-center py-6">
              <CalendarIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">暂无待办提醒</p>
              <button
                onClick={handleNewReminder}
                className="mt-2 text-xs text-primary-600 hover:underline font-medium"
              >
                点击创建第一个提醒
              </button>
            </div>
          ) : (
            <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
              {data.stats.overdueCount > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-xs font-semibold text-red-600">
                      已过期 ({data.stats.overdueCount})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {data.today.filter(isOverdue).map((reminder) => (
                      <ReminderItem
                        key={reminder.id}
                        reminder={reminder}
                        isOverdue={true}
                        isActionLoading={actionIds.has(reminder.id)}
                        onToggleComplete={() => handleToggleComplete(reminder)}
                        onEdit={() => handleEdit(reminder)}
                        onDelete={() => handleDelete(reminder)}
                        formatTime={formatReminderTime}
                      />
                    ))}
                  </div>
                </div>
              )}

              {data.today.filter((r) => !isOverdue(r)).length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-semibold text-amber-600">
                      今日待办 ({data.today.filter((r) => !isOverdue(r)).length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {data.today.filter((r) => !isOverdue(r)).map((reminder) => (
                      <ReminderItem
                        key={reminder.id}
                        reminder={reminder}
                        isOverdue={false}
                        isActionLoading={actionIds.has(reminder.id)}
                        onToggleComplete={() => handleToggleComplete(reminder)}
                        onEdit={() => handleEdit(reminder)}
                        onDelete={() => handleDelete(reminder)}
                        formatTime={formatReminderTime}
                      />
                    ))}
                  </div>
                </div>
              )}

              {data.upcoming.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-xs font-semibold text-blue-600">
                      未来7天 ({data.upcoming.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {data.upcoming.map((reminder) => (
                      <ReminderItem
                        key={reminder.id}
                        reminder={reminder}
                        isOverdue={false}
                        isUpcoming={true}
                        isActionLoading={actionIds.has(reminder.id)}
                        onToggleComplete={() => handleToggleComplete(reminder)}
                        onEdit={() => handleEdit(reminder)}
                        onDelete={() => handleDelete(reminder)}
                        formatTime={formatReminderTime}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <ReminderForm
          reminder={editingReminder}
          onClose={() => {
            setShowForm(false);
            setEditingReminder(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}

interface ReminderItemProps {
  reminder: Reminder;
  isOverdue: boolean;
  isUpcoming?: boolean;
  isActionLoading: boolean;
  onToggleComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
  formatTime: (date: string) => string;
}

function ReminderItem({
  reminder,
  isOverdue,
  isUpcoming,
  isActionLoading,
  onToggleComplete,
  onEdit,
  onDelete,
  formatTime,
}: ReminderItemProps) {
  const bgClass = isOverdue
    ? 'bg-red-50/70 border-red-200'
    : isUpcoming
    ? 'bg-blue-50/50 border-blue-200'
    : 'bg-amber-50/50 border-amber-200';

  const timeClass = isOverdue
    ? 'text-red-600'
    : isUpcoming
    ? 'text-blue-600'
    : 'text-amber-600';

  return (
    <div className={`border rounded-xl p-3 ${bgClass} group hover:shadow-sm transition-all`}>
      <div className="flex items-start gap-2.5">
        <button
          onClick={onToggleComplete}
          disabled={isActionLoading}
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
            isOverdue
              ? 'border-red-400 hover:bg-red-500 hover:border-red-500'
              : isUpcoming
              ? 'border-blue-400 hover:bg-blue-500 hover:border-blue-500'
              : 'border-amber-400 hover:bg-amber-500 hover:border-amber-500'
          } disabled:opacity-50`}
          title="标记完成"
        >
          {!isActionLoading ? null : (
            <Check className={`w-3 h-3 text-white ${isOverdue ? 'opacity-50' : ''}`} />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">
            {reminder.title}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs font-medium ${timeClass} flex items-center gap-1`}>
              <Clock className="w-3 h-3" />
              {formatTime(reminder.remindAt)}
            </span>
            {reminder.pet && (
              <Link
                to={`/pets/${reminder.pet.id}`}
                className="text-xs text-gray-500 hover:text-primary-600 hover:underline flex items-center gap-1 truncate max-w-[120px]"
                onClick={(e) => e.stopPropagation()}
              >
                {reminder.pet.species === 'dog' ? '🐕' : reminder.pet.species === 'cat' ? '🐱' : '🐾'}
                <span className="truncate">{reminder.pet.name}</span>
              </Link>
            )}
          </div>
          {reminder.notes && (
            <p className="text-xs text-gray-500 mt-1.5 line-clamp-1">
              💬 {reminder.notes}
            </p>
          )}
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            disabled={isActionLoading}
            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
            title="编辑"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            disabled={isActionLoading}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            title="删除"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
