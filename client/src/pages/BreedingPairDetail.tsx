import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Heart,
  Shield,
  AlertTriangle,
  Trash2,
  Ruler,
  PawPrint,
  Plus,
  Baby,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Activity,
} from 'lucide-react';
import { breedingApi, BreedingPair, LitterRecord } from '../services/api';
import LitterRecordForm from '../components/LitterRecordForm';

export default function BreedingPairDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pair, setPair] = useState<BreedingPair | null>(null);
  const [litters, setLitters] = useState<LitterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLitterForm, setShowLitterForm] = useState(false);
  const [expandedLitter, setExpandedLitter] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadPair();
  }, [id]);

  async function loadPair() {
    if (!id) return;
    setLoading(true);
    try {
      const [pairData, littersData] = await Promise.all([
        breedingApi.getPair(id),
        breedingApi.listLitters(id),
      ]);
      setPair(pairData);
      setLitters(littersData);
    } catch (error) {
      console.error('加载配种对详情失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!id || !confirm('确定删除这个配种对？')) return;
    try {
      await breedingApi.removePair(id);
      navigate('/breeding');
    } catch (error) {
      alert('删除失败');
    }
  }

  async function handleDeleteLitter(litterId: string) {
    if (!confirm('确定删除这个窝产记录？这将同时删除关联的仔宠数据。')) return;
    try {
      await breedingApi.removeLitter(litterId);
      loadPair();
    } catch (error) {
      alert('删除失败');
    }
  }

  function getSpeciesEmoji(species: string) {
    return species === 'dog' ? '🐕' : species === 'cat' ? '🐱' : '🐾';
  }

  function getStatusBadge(status: string) {
    if (status === 'alive') {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
          <CheckCircle2 className="w-3 h-3" />
          存活
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
        <XCircle className="w-3 h-3" />
        死亡
      </span>
    );
  }

  function getHealthBadge(health: string) {
    const colors: Record<string, string> = {
      normal: 'bg-green-100 text-green-700',
      weak: 'bg-yellow-100 text-yellow-700',
      sick: 'bg-orange-100 text-orange-700',
      genetic_issue: 'bg-red-100 text-red-700',
    };
    const labels: Record<string, string> = {
      normal: '正常',
      weak: '体弱',
      sick: '患病',
      genetic_issue: '遗传问题',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${colors[health] || 'bg-gray-100 text-gray-700'}`}>
        {labels[health] || health}
      </span>
    );
  }

  function getMatchBadge(level?: string) {
    if (!level) return null;
    const config: Record<string, { label: string; color: string }> = {
      exact: { label: '完全符合', color: 'bg-green-100 text-green-700' },
      partial: { label: '部分符合', color: 'bg-amber-100 text-amber-700' },
      none: { label: '不符合', color: 'bg-red-100 text-red-700' },
    };
    const cfg = config[level] || { label: level, color: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cfg.color}`}>
        {cfg.label}
      </span>
    );
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>;
  }

  if (!pair) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">配种对不存在</p>
        <Link to="/breeding" className="text-primary-600 hover:underline">
          返回繁殖管理
        </Link>
      </div>
    );
  }

  const inbreedingCoeff = pair.inbreedingCoefficient ?? 0;
  const inbreedingPercent = (inbreedingCoeff * 100).toFixed(2);

  const riskLevel =
    inbreedingCoeff > 0.25
      ? 'very_high'
      : inbreedingCoeff > 0.125
      ? 'high'
      : inbreedingCoeff > 0.0625
      ? 'medium'
      : 'low';

  const riskColor =
    riskLevel === 'very_high' || riskLevel === 'high'
      ? 'bg-red-50 border-red-200 text-red-700'
      : riskLevel === 'medium'
      ? 'bg-amber-50 border-amber-200 text-amber-700'
      : 'bg-green-50 border-green-200 text-green-700';

  const riskLabel =
    riskLevel === 'very_high'
      ? '极高风险'
      : riskLevel === 'high'
      ? '高风险'
      : riskLevel === 'medium'
      ? '中风险'
      : '低风险';

  const riskAssessment = pair.riskAssessment as any;

  const totalPuppies = litters.reduce((sum, l) => sum + l.totalCount, 0);
  const totalAlive = litters.reduce((sum, l) => sum + l.aliveCount, 0);
  const totalDead = litters.reduce((sum, l) => sum + l.deadCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/breeding"
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">配种对详情</h1>
          <p className="text-gray-600">
            {pair.name || `${pair.male?.name || '未知'} × ${pair.female?.name || '未知'}`}
          </p>
        </div>
        <button
          onClick={() => setShowLitterForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors font-medium"
        >
          <Baby className="w-4 h-4" />
          记录产仔
        </button>
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium"
        >
          <Trash2 className="w-4 h-4" />
          删除
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              配种对信息
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-xs text-blue-500 font-medium mb-2">父本</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-blue-200">
                    <span className="text-2xl">{getSpeciesEmoji(pair.male?.species || '')}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{pair.male?.name || '未知'}</p>
                    <p className="text-sm text-gray-500">{pair.male?.breed || '未知品种'} · ♂</p>
                  </div>
                </div>
                <Link
                  to={`/pets/${pair.maleId}/timeline`}
                  className="inline-block mt-3 text-sm text-blue-600 hover:underline"
                >
                  查看时间轴 →
                </Link>
              </div>

              <div className="p-5 bg-pink-50 rounded-xl border border-pink-200">
                <p className="text-xs text-pink-500 font-medium mb-2">母本</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-pink-200">
                    <span className="text-2xl">{getSpeciesEmoji(pair.female?.species || '')}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{pair.female?.name || '未知'}</p>
                    <p className="text-sm text-gray-500">{pair.female?.breed || '未知品种'} · ♀</p>
                  </div>
                </div>
                <Link
                  to={`/pets/${pair.femaleId}/timeline`}
                  className="inline-block mt-3 text-sm text-pink-600 hover:underline"
                >
                  查看时间轴 →
                </Link>
              </div>
            </div>

            {pair.notes && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">备注</p>
                <p className="text-gray-900">{pair.notes}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Ruler className="w-5 h-5 text-blue-500" />
              近交系数评估
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-5 rounded-xl border ${riskColor}`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/50 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm opacity-80">近交风险</p>
                    <p className="text-xl font-bold">{riskLabel}</p>
                  </div>
                </div>
              </div>
              <div className="p-5 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Ruler className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">近交系数</p>
                    <p className="text-xl font-bold text-gray-900">{inbreedingPercent}%</p>
                  </div>
                </div>
              </div>
              <div className="p-5 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                    <Shield className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">创建时间</p>
                    <p className="text-lg font-bold text-gray-900">
                      {new Date(pair.createdAt).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Baby className="w-5 h-5 text-pink-500" />
                产仔记录
              </h2>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-500">
                  共 <span className="font-semibold text-gray-900">{litters.length}</span> 窝
                </span>
                <span className="text-gray-500">
                  仔宠 <span className="font-semibold text-gray-900">{totalPuppies}</span> 只
                </span>
                <span className="text-green-600">
                  存活 <span className="font-semibold">{totalAlive}</span>
                </span>
                <span className="text-red-600">
                  死亡 <span className="font-semibold">{totalDead}</span>
                </span>
              </div>
            </div>

            {litters.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Baby className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">暂无产仔记录</h3>
                <p className="text-gray-500 mt-1">点击上方"记录产仔"按钮开始录入</p>
              </div>
            ) : (
              <div className="space-y-4">
                {litters.map((litter) => (
                  <div
                    key={litter.id}
                    className="border border-gray-200 rounded-xl overflow-hidden"
                  >
                    <div
                      className="p-4 bg-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() =>
                        setExpandedLitter(expandedLitter === litter.id ? null : litter.id)
                      }
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-pink-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {new Date(litter.birthDate).toLocaleDateString('zh-CN')}
                          </p>
                          <p className="text-sm text-gray-500">
                            共产 {litter.totalCount} 只 · 存活 {litter.aliveCount} · 死亡{' '}
                            {litter.deadCount}
                          </p>
                        </div>
                        {litter.healthComparison?.matchLevel &&
                          getMatchBadge(litter.healthComparison.matchLevel)}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('确定删除这个窝产记录？')) {
                              handleDeleteLitter(litter.id);
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {expandedLitter === litter.id ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {expandedLitter === litter.id && (
                      <div className="p-4 space-y-4">
                        {litter.notes && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">备注</p>
                            <p className="text-sm text-gray-700">{litter.notes}</p>
                          </div>
                        )}

                        {litter.healthComparison && (
                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
                              <Activity className="w-4 h-4" />
                              预测风险与实际健康结果对比
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              {litter.healthComparison.predictedRisks?.length > 0 && (
                                <div>
                                  <p className="text-xs text-amber-600 mb-1">预测风险：</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {litter.healthComparison.predictedRisks.map((r, i) => (
                                      <span
                                        key={i}
                                        className="text-xs px-2 py-0.5 bg-white rounded-full text-amber-700 border border-amber-200"
                                      >
                                        {r}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {litter.healthComparison.actualHealthIssues?.length > 0 && (
                                <div>
                                  <p className="text-xs text-amber-600 mb-1">实际健康问题：</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {litter.healthComparison.actualHealthIssues.map((r, i) => (
                                      <span
                                        key={i}
                                        className="text-xs px-2 py-0.5 bg-white rounded-full text-amber-700 border border-amber-200"
                                      >
                                        {r}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            {litter.healthComparison.notes && (
                              <p className="mt-3 text-xs text-amber-700">
                                分析：{litter.healthComparison.notes}
                              </p>
                            )}
                          </div>
                        )}

                        {litter.puppies && litter.puppies.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                              <PawPrint className="w-4 h-4" />
                              仔宠列表（{litter.puppies.length}）
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {litter.puppies.map((puppy, idx) => (
                                <div
                                  key={puppy.id}
                                  className={`p-3 rounded-lg border ${
                                    puppy.status === 'dead'
                                      ? 'bg-red-50 border-red-200'
                                      : 'bg-white border-gray-200'
                                  }`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-semibold text-gray-600">
                                        {idx + 1}
                                      </span>
                                      <div>
                                        {puppy.pet ? (
                                          <Link
                                            to={`/pets/${puppy.petId}`}
                                            className="font-medium text-gray-900 hover:text-primary-600 text-sm"
                                          >
                                            {puppy.name || puppy.pet.name}
                                          </Link>
                                        ) : (
                                          <p className="font-medium text-gray-900 text-sm">
                                            {puppy.name || `幼崽${idx + 1}`}
                                          </p>
                                        )}
                                        <p className="text-xs text-gray-500">
                                          {puppy.gender === 'male'
                                            ? '♂ 雄'
                                            : puppy.gender === 'female'
                                            ? '♀ 雌'
                                            : '性别未知'}
                                          {puppy.birthWeight && ` · ${puppy.birthWeight}kg`}
                                          {puppy.color && ` · ${puppy.color}`}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                      {getStatusBadge(puppy.status)}
                                      {getHealthBadge(puppy.healthStatus)}
                                    </div>
                                  </div>
                                  {puppy.healthNotes && (
                                    <p className="mt-2 text-xs text-gray-500 border-t border-gray-100 pt-2">
                                      {puppy.healthNotes}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {riskAssessment && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-500" />
                风险评估
              </h3>
              <div className="space-y-3">
                {riskAssessment.geneticRisk && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">遗传风险</span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        riskAssessment.geneticRisk === 'high'
                          ? 'bg-red-100 text-red-700'
                          : riskAssessment.geneticRisk === 'medium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {riskAssessment.geneticRisk === 'high'
                        ? '高风险'
                        : riskAssessment.geneticRisk === 'medium'
                        ? '中风险'
                        : '低风险'}
                    </span>
                  </div>
                )}
                {riskAssessment.inbreedingRisk && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">近交风险</span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        riskAssessment.inbreedingRisk === 'high' ||
                        riskAssessment.inbreedingRisk === 'very_high'
                          ? 'bg-red-100 text-red-700'
                          : riskAssessment.inbreedingRisk === 'medium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {riskAssessment.inbreedingRisk === 'very_high'
                        ? '极高'
                        : riskAssessment.inbreedingRisk === 'high'
                        ? '高'
                        : riskAssessment.inbreedingRisk === 'medium'
                        ? '中'
                        : '低'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">繁殖统计</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">总窝数</span>
                <span className="text-lg font-bold text-gray-900">{litters.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">总产仔数</span>
                <span className="text-lg font-bold text-gray-900">{totalPuppies}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">存活数</span>
                <span className="text-lg font-bold text-green-600">{totalAlive}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">存活率</span>
                <span className="text-lg font-bold text-green-600">
                  {totalPuppies > 0 ? ((totalAlive / totalPuppies) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">快速导航</h3>
            <div className="space-y-2">
              <Link
                to={`/pets/${pair.maleId}/timeline`}
                className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm"
              >
                <PawPrint className="w-4 h-4 text-blue-600" />
                <span>{pair.male?.name} 的时间轴</span>
              </Link>
              <Link
                to={`/pets/${pair.femaleId}/timeline`}
                className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm"
              >
                <PawPrint className="w-4 h-4 text-pink-600" />
                <span>{pair.female?.name} 的时间轴</span>
              </Link>
              <Link
                to="/breeding"
                className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm"
              >
                <Heart className="w-4 h-4 text-primary-600" />
                <span>繁殖管理</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {showLitterForm && pair && (
        <LitterRecordForm
          pairId={pair.id}
          pair={pair}
          onClose={() => setShowLitterForm(false)}
          onSuccess={() => {
            setShowLitterForm(false);
            loadPair();
          }}
        />
      )}
    </div>
  );
}
