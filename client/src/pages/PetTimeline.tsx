import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Scale,
  Dna,
  Heart,
  Calendar,
  ChevronRight,
  PawPrint,
  Plus,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import {
  petApi,
  TimelineResponse,
  TimelineEvent,
  WeightRecord,
  Pet,
  WeightTrendPoint,
} from '../services/api';

export default function PetTimeline() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [timelineData, setTimelineData] = useState<TimelineResponse | null>(null);
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'weight' | 'gene' | 'breeding'>('all');
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [newWeight, setNewWeight] = useState({ weight: '', note: '', recordedAt: '' });

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  async function loadData() {
    if (!id) return;
    setLoading(true);
    try {
      const [timeline, petData] = await Promise.all([
        petApi.timeline(id),
        petApi.get(id),
      ]);
      setTimelineData(timeline);
      setPet(petData);
    } catch (error) {
      console.error('加载时间轴数据失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddWeight() {
    if (!id || !newWeight.weight) return;

    try {
      await petApi.createWeight(id, {
        weight: parseFloat(newWeight.weight),
        note: newWeight.note || null,
        recordedAt: newWeight.recordedAt || undefined,
      });
      setShowWeightModal(false);
      setNewWeight({ weight: '', note: '', recordedAt: '' });
      loadData();
    } catch (error) {
      console.error('添加体重记录失败:', error);
      alert('添加失败');
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'weight':
        return <Scale className="w-5 h-5" />;
      case 'gene':
        return <Dna className="w-5 h-5" />;
      case 'breeding':
        return <Heart className="w-5 h-5" />;
      default:
        return <Calendar className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'weight':
        return 'bg-blue-500 text-white';
      case 'gene':
        return 'bg-purple-500 text-white';
      case 'breeding':
        return 'bg-pink-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getTypeBg = (type: string) => {
    switch (type) {
      case 'weight':
        return 'bg-blue-50 border-blue-200 hover:border-blue-400';
      case 'gene':
        return 'bg-purple-50 border-purple-200 hover:border-purple-400';
      case 'breeding':
        return 'bg-pink-50 border-pink-200 hover:border-pink-400';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getFilterLabel = (type: string) => {
    switch (type) {
      case 'weight':
        return '体重记录';
      case 'gene':
        return '基因检测';
      case 'breeding':
        return '繁殖记录';
      default:
        return '全部';
    }
  };

  const getSpeciesLabel = (species: string) => {
    if (species === 'dog') return '🐕 犬';
    if (species === 'cat') return '🐱 猫';
    return species;
  };

  const filteredEvents =
    timelineData?.events.filter(
      (event) => filter === 'all' || event.type === filter
    ) || [];

  if (loading) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>;
  }

  if (!timelineData || !pet) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">宠物不存在</p>
        <Link to="/pets" className="text-primary-600 hover:underline">
          返回列表
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to={`/pets/${id}`}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{pet.name} 的健康时间轴</h1>
          <p className="text-gray-600">
            {pet.breed || '未知品种'} · {getSpeciesLabel(pet.species)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <PawPrint className="w-5 h-5 text-primary-500" />
              宠物信息
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">当前体重</span>
                <span className="font-medium">
                  {pet.weight ? `${pet.weight} kg` : '未记录'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">出生日期</span>
                <span className="font-medium">
                  {pet.birthDate
                    ? new Date(pet.birthDate).toLocaleDateString()
                    : '未知'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">体重记录</span>
                <span className="font-medium">{timelineData.stats.totalWeightRecords} 条</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">基因报告</span>
                <span className="font-medium">{timelineData.stats.totalGeneReports} 份</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">繁殖记录</span>
                <span className="font-medium">{timelineData.stats.totalBreedingRecords} 次</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">筛选类型</h3>
            <div className="space-y-2">
              {(['all', 'weight', 'gene', 'breeding'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === type
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${getTypeColor(type)}`}></span>
                  {getFilterLabel(type)}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">快速操作</h3>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => setShowWeightModal(true)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                记录体重
              </button>
              <Link
                to="/gene-reports"
                className="w-full flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium"
              >
                <Dna className="w-4 h-4" />
                上传基因报告
              </Link>
              <Link
                to="/breeding"
                className="w-full flex items-center gap-2 px-3 py-2 bg-pink-50 text-pink-700 rounded-lg hover:bg-pink-100 transition-colors text-sm font-medium"
              >
                <Heart className="w-4 h-4" />
                繁殖管理
              </Link>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {timelineData.weightTrend.length >= 2 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-500" />
                体重变化趋势
              </h2>
              <WeightTrendChart data={timelineData.weightTrend} />
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">健康时间轴</h2>

            {filteredEvents.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">暂无时间轴记录</p>
                <p className="text-sm text-gray-400 mt-1">
                  记录体重、上传基因报告或添加繁殖记录后，将在这里显示时间线
                </p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                <div className="space-y-6">
                  {filteredEvents.map((event, index) => (
                    <TimelineCard
                      key={event.id}
                      event={event}
                      isLast={index === filteredEvents.length - 1}
                      petId={id!}
                      getTypeIcon={getTypeIcon}
                      getTypeColor={getTypeColor}
                      getTypeBg={getTypeBg}
                      onNavigate={() => navigate(event.link)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showWeightModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">记录体重</h3>
              <button
                onClick={() => setShowWeightModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  体重 (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={newWeight.weight}
                  onChange={(e) =>
                    setNewWeight({ ...newWeight, weight: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="例如: 25.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  记录日期
                </label>
                <input
                  type="date"
                  value={newWeight.recordedAt}
                  onChange={(e) =>
                    setNewWeight({ ...newWeight, recordedAt: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  备注
                </label>
                <textarea
                  value={newWeight.note}
                  onChange={(e) =>
                    setNewWeight({ ...newWeight, note: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                  placeholder="可选：记录身体状况、饮食变化等"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowWeightModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  取消
                </button>
                <button
                  onClick={handleAddWeight}
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WeightTrendChart({ data }: { data: WeightTrendPoint[] }) {
  if (data.length < 2) return null;

  const weights = data.map((d) => d.weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;
  const padding = range * 0.15;

  const chartW = 600;
  const chartH = 180;
  const padL = 50;
  const padR = 20;
  const padT = 20;
  const padB = 40;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const yMin = minW - padding;
  const yMax = maxW + padding;
  const yRange = yMax - yMin;

  const scaleX = (i: number) => padL + (i / (data.length - 1)) * plotW;
  const scaleY = (w: number) => padT + plotH - ((w - yMin) / yRange) * plotH;

  const points = data.map((d, i) => `${scaleX(i)},${scaleY(d.weight)}`).join(' ');
  const areaPoints = `${scaleX(0)},${scaleY(yMin)} ${points} ${scaleX(data.length - 1)},${scaleY(yMin)}`;

  const ticks = 5;
  const yTicks = Array.from({ length: ticks }, (_, i) => {
    const val = yMin + (yRange / (ticks - 1)) * i;
    return { val, y: scaleY(val) };
  });

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-48">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => (
          <g key={tick.val}>
            <line
              x1={padL}
              y1={tick.y}
              x2={chartW - padR}
              y2={tick.y}
              stroke="#E5E7EB"
              strokeWidth="1"
            />
            <text
              x={padL - 8}
              y={tick.y + 4}
              textAnchor="end"
              className="text-xs fill-gray-400"
              fontSize="11"
            >
              {tick.val.toFixed(1)}
            </text>
          </g>
        ))}

        <polygon points={areaPoints} fill="url(#areaGrad)" />

        <polyline
          points={points}
          fill="none"
          stroke="#3B82F6"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {data.map((d, i) => (
          <g key={i}>
            <circle
              cx={scaleX(i)}
              cy={scaleY(d.weight)}
              r="4"
              fill="white"
              stroke="#3B82F6"
              strokeWidth="2"
            />
            <text
              x={scaleX(i)}
              y={chartH - 8}
              textAnchor="middle"
              className="fill-gray-400"
              fontSize="10"
            >
              {new Date(d.date).toLocaleDateString('zh-CN', {
                month: 'short',
                day: 'numeric',
              })}
            </text>
          </g>
        ))}

        <text x={padL - 8} y={padT - 4} textAnchor="end" className="fill-gray-500" fontSize="11">
          kg
        </text>
      </svg>
    </div>
  );
}

function TimelineCard({
  event,
  isLast,
  petId,
  getTypeIcon,
  getTypeColor,
  getTypeBg,
  onNavigate,
}: {
  event: TimelineEvent;
  isLast: boolean;
  petId: string;
  getTypeIcon: (type: string) => React.ReactNode;
  getTypeColor: (type: string) => string;
  getTypeBg: (type: string) => string;
  onNavigate: () => void;
}) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="relative pl-16">
      <div
        className={`absolute left-4 w-5 h-5 rounded-full ${getTypeColor(
          event.type
        )} flex items-center justify-center transform -translate-x-1/2`}
      >
        <span className="scale-75">{getTypeIcon(event.type)}</span>
      </div>

      {!isLast && (
        <div className="absolute left-4 top-5 bottom-0 w-0.5 bg-gray-200 transform -translate-x-1/2"></div>
      )}

      <div
        onClick={onNavigate}
        className={`cursor-pointer rounded-xl border p-4 transition-all hover:shadow-md ${getTypeBg(
          event.type
        )}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-gray-500">
                {formatDate(event.date)} {formatTime(event.date)}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(
                  event.type
                )}`}
              >
                {event.title}
              </span>
            </div>
            <p className="font-medium text-gray-900">{event.summary}</p>

            {event.type === 'weight' && event.detail && (
              <WeightEventDetail detail={event.detail} />
            )}
            {event.type === 'gene' && event.detail && (
              <GeneEventDetail detail={event.detail} />
            )}
            {event.type === 'breeding' && event.detail && (
              <BreedingEventDetail detail={event.detail} />
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}

function WeightEventDetail({ detail }: { detail: any }) {
  if (!detail) return null;

  const trendIcon =
    detail.trend === 'up' ? (
      <TrendingUp className="w-4 h-4 text-red-500" />
    ) : detail.trend === 'down' ? (
      <TrendingDown className="w-4 h-4 text-green-500" />
    ) : detail.trend === 'stable' ? (
      <Minus className="w-4 h-4 text-gray-400" />
    ) : null;

  const trendColor =
    detail.trend === 'up'
      ? 'text-red-600'
      : detail.trend === 'down'
      ? 'text-green-600'
      : 'text-gray-500';

  return (
    <div className="mt-2 space-y-1">
      {detail.delta !== null && detail.delta !== undefined && (
        <div className="flex items-center gap-1.5 text-sm">
          {trendIcon}
          <span className={trendColor}>
            {detail.delta > 0 ? '+' : ''}
            {detail.delta} kg
          </span>
          {detail.deltaPercent !== null && (
            <span className="text-gray-400 text-xs">
              ({detail.deltaPercent > 0 ? '+' : ''}
              {detail.deltaPercent}%)
            </span>
          )}
          {detail.previousWeight !== null && (
            <span className="text-gray-400 text-xs">
              较上次 {detail.previousWeight} kg
            </span>
          )}
        </div>
      )}
      {detail.note && (
        <p className="text-sm text-gray-500">{detail.note}</p>
      )}
    </div>
  );
}

function GeneEventDetail({ detail }: { detail: any }) {
  if (!detail) return null;

  const statusLabel =
    detail.status === 'parsed'
      ? '已解析'
      : detail.status === 'failed'
      ? '解析失败'
      : '解析中';
  const statusColor =
    detail.status === 'parsed'
      ? 'bg-green-100 text-green-700'
      : detail.status === 'failed'
      ? 'bg-red-100 text-red-700'
      : 'bg-yellow-100 text-yellow-700';

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center gap-2 text-sm">
        <FileText className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-gray-600">{detail.fileName}</span>
        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${statusColor}`}>
          {statusLabel}
        </span>
      </div>
      {detail.markerSummary && (
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-500">
            共 {detail.markerSummary.total} 位点
          </span>
          {detail.markerSummary.highRisk > 0 && (
            <span className="text-red-600 font-medium">
              高风险 {detail.markerSummary.highRisk}
            </span>
          )}
          {detail.markerSummary.carrier > 0 && (
            <span className="text-purple-600 font-medium">
              携带者 {detail.markerSummary.carrier}
            </span>
          )}
          {detail.markerSummary.mediumRisk > 0 && (
            <span className="text-amber-600 font-medium">
              中风险 {detail.markerSummary.mediumRisk}
            </span>
          )}
          {detail.markerSummary.lowRisk > 0 && (
            <span className="text-green-600 font-medium">
              低风险 {detail.markerSummary.lowRisk}
            </span>
          )}
        </div>
      )}
      {detail.parsedAt && (
        <p className="text-xs text-gray-400">
          解析完成于 {new Date(detail.parsedAt).toLocaleString('zh-CN')}
        </p>
      )}
    </div>
  );
}

function BreedingEventDetail({ detail }: { detail: any }) {
  if (!detail) return null;

  const inbreedingPercent = detail.inbreedingCoefficient
    ? (detail.inbreedingCoefficient * 100).toFixed(2)
    : null;

  const inbreedingRiskLevel =
    detail.inbreedingCoefficient !== null && detail.inbreedingCoefficient !== undefined
      ? detail.inbreedingCoefficient > 0.125
        ? 'high'
        : detail.inbreedingCoefficient > 0.0625
        ? 'medium'
        : 'low'
      : null;

  const inbreedingColor =
    inbreedingRiskLevel === 'high'
      ? 'text-red-600'
      : inbreedingRiskLevel === 'medium'
      ? 'text-amber-600'
      : 'text-green-600';

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>
          配偶：{detail.partnerName}
          {detail.partnerBreed ? ` (${detail.partnerBreed})` : ''}
        </span>
      </div>
      {inbreedingPercent && (
        <div className="flex items-center gap-1.5 text-sm">
          <Shield className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-500">近交系数：</span>
          <span className={`font-medium ${inbreedingColor}`}>{inbreedingPercent}%</span>
        </div>
      )}
      {detail.riskAssessment && (
        <div className="flex items-center gap-2 text-xs">
          {detail.riskAssessment.geneticRisk && (
            <span
              className={`px-1.5 py-0.5 rounded font-medium ${
                detail.riskAssessment.geneticRisk === 'high'
                  ? 'bg-red-100 text-red-700'
                  : detail.riskAssessment.geneticRisk === 'medium'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              遗传风险：{detail.riskAssessment.geneticRisk === 'high' ? '高' : detail.riskAssessment.geneticRisk === 'medium' ? '中' : '低'}
            </span>
          )}
          {detail.riskAssessment.inbreedingRisk && (
            <span
              className={`px-1.5 py-0.5 rounded font-medium ${
                detail.riskAssessment.inbreedingRisk === 'high' || detail.riskAssessment.inbreedingRisk === 'very_high'
                  ? 'bg-red-100 text-red-700'
                  : detail.riskAssessment.inbreedingRisk === 'medium'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              近交风险：{detail.riskAssessment.inbreedingRisk === 'very_high' ? '极高' : detail.riskAssessment.inbreedingRisk === 'high' ? '高' : detail.riskAssessment.inbreedingRisk === 'medium' ? '中' : '低'}
            </span>
          )}
        </div>
      )}
      {detail.notes && (
        <p className="text-sm text-gray-500">{detail.notes}</p>
      )}
    </div>
  );
}
