import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Check,
  Bell,
  RefreshCw,
  Dna,
  Network,
} from 'lucide-react';
import {
  alertApi,
  BreedingAlert,
  UnreadAlertsResponse,
} from '../services/api';

interface AlertBannerProps {
  refreshTrigger?: number;
}

export default function AlertBanner({ refreshTrigger }: AlertBannerProps) {
  const [alertData, setAlertData] = useState<UnreadAlertsResponse | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, [refreshTrigger]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadAlerts(false);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadAlerts(showLoading = true) {
    if (showLoading) setLoading(true);
    try {
      const data = await alertApi.getUnread();
      setAlertData(data);
    } catch (error) {
      console.error('加载警告失败:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  async function handleMarkAsRead(alert: BreedingAlert) {
    setMarkingIds((prev) => new Set(prev).add(alert.id));
    try {
      await alertApi.markAsRead(alert.id);
      setAlertData((prev) => {
        if (!prev) return prev;
        const newAlerts = prev.alerts.filter((a) => a.id !== alert.id);
        const isDanger = alert.severity === 'danger';
        return {
          ...prev,
          alerts: newAlerts,
          stats: {
            ...prev.stats,
            total: prev.stats.total - 1,
            danger: isDanger ? prev.stats.danger - 1 : prev.stats.danger,
            warning: !isDanger ? prev.stats.warning - 1 : prev.stats.warning,
          },
          affectedPetIds: Array.from(
            new Set(newAlerts.map((a) => a.petId).filter(Boolean) as string[])
          ),
        };
      });
    } catch (error) {
      console.error('标记已读失败:', error);
    } finally {
      setMarkingIds((prev) => {
        const next = new Set(prev);
        next.delete(alert.id);
        return next;
      });
    }
  }

  async function handleMarkAllAsRead() {
    if (!alertData || alertData.alerts.length === 0) return;
    setMarkingAll(true);
    try {
      await alertApi.markAllAsRead();
      setAlertData(null);
    } catch (error) {
      console.error('全部标记已读失败:', error);
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleRefresh() {
    try {
      await alertApi.runScan();
      await loadAlerts();
    } catch (error) {
      console.error('刷新警告失败:', error);
    }
  }

  if (!alertData || alertData.stats.total === 0) {
    return null;
  }

  const hasDanger = alertData.stats.danger > 0;
  const bannerBgClass = hasDanger
    ? 'bg-red-50 border-red-200'
    : 'bg-amber-50 border-amber-200';
  const bannerBorderClass = hasDanger ? 'border-red-200' : 'border-amber-200';
  const bannerTextClass = hasDanger ? 'text-red-800' : 'text-amber-800';
  const bannerIconClass = hasDanger ? 'text-red-600' : 'text-amber-600';

  const severityConfig: Record<
    string,
    { bg: string; text: string; border: string; icon: any; label: string }
  > = {
    danger: {
      bg: 'bg-red-50',
      text: 'text-red-800',
      border: 'border-red-200',
      icon: AlertCircle,
      label: '严重',
    },
    warning: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      icon: AlertTriangle,
      label: '警告',
    },
  };

  const alertTypeConfig: Record<string, { icon: any; label: string; color: string }> = {
    inbreeding_threshold: {
      icon: Network,
      label: '近交超标',
      color: 'text-purple-600',
    },
    genetic_high_risk: {
      icon: Dna,
      label: '高风险基因',
      color: 'text-rose-600',
    },
  };

  return (
    <div
      className={`border-b ${bannerBorderClass} ${bannerBgClass} transition-all duration-200`}
    >
      <div className="max-w-full">
        <div
          className={`flex items-center justify-between px-6 py-3 ${bannerTextClass}`}
        >
          <div className="flex items-center gap-3">
            {loading ? (
              <RefreshCw className={`w-5 h-5 ${bannerIconClass} animate-spin`} />
            ) : hasDanger ? (
              <AlertCircle className={`w-5 h-5 ${bannerIconClass}`} />
            ) : (
              <AlertTriangle className={`w-5 h-5 ${bannerIconClass}`} />
            )}
            <div className="flex items-center gap-3 text-sm">
              <span className="font-semibold">
                {alertData.stats.total} 条未读警告
              </span>
              <span className="text-xs opacity-75">
                {hasDanger && (
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full mr-2">
                    严重 {alertData.stats.danger}
                  </span>
                )}
                {alertData.stats.warning > 0 && (
                  <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    警告 {alertData.stats.warning}
                  </span>
                )}
              </span>
              <span className="text-xs opacity-60">
                涉及 {alertData.stats.affectedPets} 只种畜
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className={`p-1.5 rounded-lg hover:bg-white/50 transition-colors ${bannerTextClass} opacity-75 hover:opacity-100`}
              title="重新扫描"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleMarkAllAsRead}
              disabled={markingAll}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-white/60 hover:bg-white/80 transition-colors ${bannerTextClass} disabled:opacity-50`}
            >
              <Check className="w-3.5 h-3.5" />
              {markingAll ? '处理中...' : '全部已读'}
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className={`p-1.5 rounded-lg hover:bg-white/50 transition-colors ${bannerTextClass}`}
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="px-6 pb-4">
            <div className="bg-white/70 rounded-lg border border-white/50 overflow-hidden">
              <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                {alertData.alerts.map((alert) => {
                  const sevCfg = severityConfig[alert.severity] || severityConfig.warning;
                  const SevIcon = sevCfg.icon;
                  const typeCfg = alertTypeConfig[alert.alertType];
                  const TypeIcon = typeCfg?.icon || Bell;
                  const isMarking = markingIds.has(alert.id);

                  return (
                    <div
                      key={alert.id}
                      className={`flex items-start gap-3 px-4 py-3 ${sevCfg.bg} hover:bg-white/50 transition-colors`}
                    >
                      <div className={`mt-0.5 ${sevCfg.text}`}>
                        <SevIcon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-gray-900">
                            {alert.title}
                          </span>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${sevCfg.bg} ${sevCfg.text} border ${sevCfg.border} font-medium`}
                          >
                            {sevCfg.label}
                          </span>
                          {typeCfg && (
                            <span
                              className={`text-xs flex items-center gap-1 ${typeCfg.color}`}
                            >
                              <TypeIcon className="w-3 h-3" />
                              {typeCfg.label}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          {alert.pet && (
                            <Link
                              to={`/pets/${alert.pet.id}`}
                              className="text-primary-600 hover:underline font-medium flex items-center gap-1"
                            >
                              {alert.pet.species === 'dog'
                                ? '🐕'
                                : alert.pet.species === 'cat'
                                ? '🐱'
                                : '🐾'}
                              {alert.pet.name}
                              {alert.pet.breed && ` · ${alert.pet.breed}`}
                            </Link>
                          )}
                          {alert.details?.inbreedingCoefficient !== undefined && (
                            <span>
                              近交系数:{' '}
                              {(alert.details.inbreedingCoefficient * 100).toFixed(2)}%
                            </span>
                          )}
                          {alert.details?.genotype && (
                            <span>
                              基因型: <code className="bg-gray-100 px-1 rounded">{alert.details.genotype}</code>
                            </span>
                          )}
                          <span>
                            {new Date(alert.createdAt).toLocaleString('zh-CN', {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleMarkAsRead(alert)}
                        disabled={isMarking}
                        className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                        title="标记为已读"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
