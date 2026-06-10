import { useState, useEffect } from 'react';
import { BarChart3, AlertTriangle, Shield, Activity, Dna, ArrowRight } from 'lucide-react';
import {
  geneticsApi,
  petApi,
  Pet,
  RiskSummary,
  OffspringRisk,
} from '../services/api';

export default function RiskPrediction() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<string>('');
  const [individualRisk, setIndividualRisk] = useState<RiskSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const [parent1, setParent1] = useState<string>('');
  const [parent2, setParent2] = useState<string>('');
  const [offspringRisk, setOffspringRisk] = useState<OffspringRisk | null>(null);
  const [calculating, setCalculating] = useState(false);

  const [activeTab, setActiveTab] = useState<'individual' | 'offspring'>('individual');

  useEffect(() => {
    loadPets();
  }, []);

  useEffect(() => {
    if (selectedPet) {
      loadIndividualRisk();
    }
  }, [selectedPet]);

  async function loadPets() {
    try {
      const data = await petApi.list();
      setPets(data);
      if (data.length > 0) {
        setSelectedPet(data[0].id);
      }
    } catch (error) {
      console.error('加载宠物列表失败:', error);
    }
  }

  async function loadIndividualRisk() {
    if (!selectedPet) return;
    setLoading(true);
    try {
      const data = await geneticsApi.getPetRisk(selectedPet);
      setIndividualRisk(data);
    } catch (error) {
      console.error('加载个体风险失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function calculateOffspringRisk() {
    if (!parent1 || !parent2) {
      alert('请选择两个亲本');
      return;
    }

    if (parent1 === parent2) {
      alert('两个亲本不能是同一只宠物');
      return;
    }

    setCalculating(true);
    try {
      const data = await geneticsApi.getOffspringRisk(parent1, parent2);
      setOffspringRisk(data);
    } catch (error) {
      alert('计算失败');
    } finally {
      setCalculating(false);
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'carrier':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'high':
        return '高风险';
      case 'medium':
        return '中风险';
      case 'low':
        return '低风险';
      case 'carrier':
        return '携带者';
      default:
        return '未知';
    }
  };

  const getRiskBgColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-amber-500';
      case 'low':
        return 'bg-green-500';
      case 'carrier':
        return 'bg-purple-500';
      default:
        return 'bg-gray-400';
    }
  };

  const malePets = pets.filter((p) => p.gender === 'male');
  const femalePets = pets.filter((p) => p.gender === 'female');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">遗传病风险预测</h1>
        <p className="text-gray-600 mt-1">
          基于遗传标记数据库，评估个体及后代的遗传病风险
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('individual')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'individual'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Activity className="w-4 h-4" />
            个体风险评估
          </button>
          <button
            onClick={() => setActiveTab('offspring')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'offspring'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            后代风险预测
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'individual' && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex-1 max-w-xs">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    选择宠物
                  </label>
                  <select
                    value={selectedPet}
                    onChange={(e) => setSelectedPet(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    {pets.map((pet) => (
                      <option key={pet.id} value={pet.id}>
                        {pet.name} ({pet.breed || pet.species})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-12 text-gray-500">加载中...</div>
              ) : individualRisk ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <RiskStatCard
                      label="总体风险"
                      value={getRiskLabel(individualRisk.overallRisk)}
                      icon={AlertTriangle}
                      level={individualRisk.overallRisk}
                    />
                    <StatCard
                      label="检测位点"
                      value={`${individualRisk.summary.tested}/${individualRisk.summary.total}`}
                      icon={Dna}
                      color="blue"
                    />
                    <StatCard
                      label="高风险"
                      value={individualRisk.summary.highRisk}
                      icon={AlertTriangle}
                      color="red"
                    />
                    <StatCard
                      label="携带者"
                      value={individualRisk.summary.carrier}
                      icon={Shield}
                      color="purple"
                    />
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">风险详情</h3>
                    <div className="space-y-3">
                      {individualRisk.markers.map((marker) => (
                        <div
                          key={marker.markerName}
                          className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-3 h-3 rounded-full ${getRiskBgColor(
                                marker.riskLevel
                              )}`}
                            ></div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {marker.disease}
                              </p>
                              <p className="text-sm text-gray-500">
                                {marker.markerName} · {marker.geneName}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-medium ${getRiskColor(
                                marker.riskLevel
                              )}`}
                            >
                              {getRiskLabel(marker.riskLevel)}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
                              基因型: {marker.genotype}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  暂无基因检测数据
                </div>
              )}
            </div>
          )}

          {activeTab === 'offspring' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    父本 (雄性)
                  </label>
                  <select
                    value={parent1}
                    onChange={(e) => setParent1(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">请选择雄性宠物</option>
                    {malePets.map((pet) => (
                      <option key={pet.id} value={pet.id}>
                        {pet.name} ({pet.breed || pet.species})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-center">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <ArrowRight className="w-6 h-6 text-primary-600" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    母本 (雌性)
                  </label>
                  <select
                    value={parent2}
                    onChange={(e) => setParent2(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">请选择雌性宠物</option>
                    {femalePets.map((pet) => (
                      <option key={pet.id} value={pet.id}>
                        {pet.name} ({pet.breed || pet.species})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={calculateOffspringRisk}
                  disabled={!parent1 || !parent2 || calculating}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {calculating ? '计算中...' : '计算后代风险'}
                </button>
              </div>

              {offspringRisk && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <RiskStatCard
                      label="总体遗传风险"
                      value={getRiskLabel(offspringRisk.overallRisk)}
                      icon={AlertTriangle}
                      level={offspringRisk.overallRisk}
                    />
                    <StatCard
                      label="风险评分"
                      value={(offspringRisk.overallRiskScore * 100).toFixed(1) + '%'}
                      icon={BarChart3}
                      color="blue"
                    />
                    <StatCard
                      label="高风险位点"
                      value={offspringRisk.summary.highRisk}
                      icon={AlertTriangle}
                      color="red"
                    />
                    <StatCard
                      label="检测位点数"
                      value={offspringRisk.summary.total}
                      icon={Dna}
                      color="green"
                    />
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">
                      各位点遗传风险
                    </h3>
                    <div className="space-y-3">
                      {offspringRisk.markerRisks.map((marker) => (
                        <div
                          key={marker.markerName}
                          className="p-4 bg-white rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-medium text-gray-900">
                                {marker.disease}
                              </p>
                              <p className="text-sm text-gray-500">
                                {marker.markerName}
                              </p>
                            </div>
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-medium ${getRiskColor(
                                marker.offspringRiskLevel
                              )}`}
                            >
                              {getRiskLabel(marker.offspringRiskLevel)}
                              {' '}({(marker.offspringRisk * 100).toFixed(0)}%)
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                              父: {marker.parent1Genotype}
                            </span>
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                            <span className="bg-pink-50 text-pink-700 px-2 py-0.5 rounded">
                              母: {marker.parent2Genotype}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-gray-500">
                            {marker.explanation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {!offspringRisk && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">
                    选择双亲进行预测
                  </h3>
                  <p className="text-gray-500 mt-1">
                    选择父本和母本，计算后代的遗传病风险概率
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RiskStatCard({
  label,
  value,
  icon: Icon,
  level,
}: {
  label: string;
  value: string;
  icon: any;
  level: string;
}) {
  const colorClasses: Record<string, string> = {
    high: 'from-red-500 to-red-600',
    medium: 'from-amber-500 to-amber-600',
    low: 'from-green-500 to-green-600',
    carrier: 'from-purple-500 to-purple-600',
    unknown: 'from-gray-500 to-gray-600',
  };

  return (
    <div
      className={`bg-gradient-to-br ${colorClasses[level] || colorClasses.unknown} rounded-xl p-5 text-white`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/80 text-sm">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50',
    red: 'text-red-600 bg-red-50',
    green: 'text-green-600 bg-green-50',
    purple: 'text-purple-600 bg-purple-50',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 ${colorClasses[color]} rounded-lg flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
