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
} from 'lucide-react';
import { breedingApi, BreedingPair } from '../services/api';

export default function BreedingPairDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pair, setPair] = useState<BreedingPair | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadPair();
  }, [id]);

  async function loadPair() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await breedingApi.getPair(id);
      setPair(data);
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

  const getSpeciesEmoji = (species: string) =>
    species === 'dog' ? '🐕' : species === 'cat' ? '🐱' : '🐾';

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
                        riskAssessment.inbreedingRisk === 'high' || riskAssessment.inbreedingRisk === 'very_high'
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
    </div>
  );
}
