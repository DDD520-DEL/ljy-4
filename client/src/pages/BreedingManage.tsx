import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Settings,
  Ruler,
  Plus,
  Trash2,
  PawPrint,
  AlertTriangle,
  Shield,
  ArrowRight,
  Heart,
  Sparkles,
  ArrowUpDown,
  Check,
  Info,
  Eye,
} from 'lucide-react';
import {
  breedingApi,
  petApi,
  Pet,
  BreedingPair,
  PairInbreedingResult,
  BreedingRecommendation,
} from '../services/api';

export default function BreedingManage() {
  const [breedingPets, setBreedingPets] = useState<Pet[]>([]);
  const [breedingPairs, setBreedingPairs] = useState<BreedingPair[]>([]);
  const [recommendations, setRecommendations] = useState<BreedingRecommendation[]>([]);
  const [recommendationsTotal, setRecommendationsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pets' | 'pairs' | 'calculator' | 'recommendations'>('pets');
  const [sortBy, setSortBy] = useState<'risk' | 'inbreeding' | 'genetic'>('risk');
  const [recSpeciesFilter, setRecSpeciesFilter] = useState('all');
  const [addingPairId, setAddingPairId] = useState<string | null>(null);

  const [maleId, setMaleId] = useState('');
  const [femaleId, setFemaleId] = useState('');
  const [pairResult, setPairResult] = useState<PairInbreedingResult | null>(null);
  const [calculating, setCalculating] = useState(false);

  const [speciesFilter, setSpeciesFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [pets, pairs] = await Promise.all([
        breedingApi.listBreedingPets(),
        breedingApi.listPairs(),
      ]);
      setBreedingPets(pets);
      setBreedingPairs(pairs);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecommendations() {
    setRecommendationsLoading(true);
    try {
      const result = await breedingApi.getRecommendations({
        species: recSpeciesFilter === 'all' ? undefined : recSpeciesFilter,
        limit: 30,
      });
      setRecommendations(result.recommendations || []);
      setRecommendationsTotal(result.total || 0);
    } catch (error) {
      console.error('加载推荐失败:', error);
    } finally {
      setRecommendationsLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'recommendations') {
      loadRecommendations();
    }
  }, [activeTab, recSpeciesFilter]);

  async function addRecommendationToPair(rec: BreedingRecommendation) {
    setAddingPairId(rec.id);
    try {
      await breedingApi.createPair({
        maleId: rec.male.id,
        femaleId: rec.female.id,
      });
      loadData();
      alert('已添加到配种对');
    } catch (error: any) {
      if (error?.error?.includes('已存在')) {
        alert('该配种对已存在');
      } else {
        alert(`添加失败: ${error?.error || '未知错误'}`);
      }
    } finally {
      setAddingPairId(null);
    }
  }

  async function calculatePair() {
    if (!maleId || !femaleId) {
      alert('请选择雄性和雌性宠物');
      return;
    }

    setCalculating(true);
    try {
      const result = await breedingApi.getPairInbreeding(maleId, femaleId);
      setPairResult(result);
    } catch (error) {
      alert('计算失败');
    } finally {
      setCalculating(false);
    }
  }

  async function addBreedingPair() {
    if (!maleId || !femaleId) {
      alert('请选择雄性和雌性宠物');
      return;
    }

    try {
      await breedingApi.createPair({ maleId, femaleId });
      loadData();
      alert('配种对已添加');
    } catch (error: any) {
      alert(`添加失败: ${error.error || '未知错误'}`);
    }
  }

  async function removePair(id: string) {
    if (!confirm('确定要删除这个配种对吗？')) return;

    try {
      await breedingApi.removePair(id);
      loadData();
    } catch (error) {
      alert('删除失败');
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'very_high':
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'carrier':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'very_high':
        return '极高风险';
      case 'high':
        return '高风险';
      case 'medium':
        return '中风险';
      case 'carrier':
        return '携带者';
      case 'low':
        return '低风险';
      default:
        return '未知';
    }
  };

  const filteredPets = breedingPets.filter((pet) => {
    if (speciesFilter !== 'all' && pet.species !== speciesFilter) return false;
    if (genderFilter !== 'all' && pet.gender !== genderFilter) return false;
    return true;
  });

  const malePets = breedingPets.filter((p) => p.gender === 'male');
  const femalePets = breedingPets.filter((p) => p.gender === 'female');

  const sortedRecommendations = useMemo(() => {
    const list = [...recommendations];
    const riskOrder: Record<string, number> = {
      low: 0,
      carrier: 1,
      medium: 2,
      high: 3,
      very_high: 4,
      unknown: 5,
    };

    switch (sortBy) {
      case 'risk':
        return list.sort((a, b) => {
          const levelDiff = riskOrder[a.overallRiskLevel] - riskOrder[b.overallRiskLevel];
          if (levelDiff !== 0) return levelDiff;
          return a.combinedRiskScore - b.combinedRiskScore;
        });
      case 'inbreeding':
        return list.sort((a, b) => a.inbreedingCoefficient - b.inbreedingCoefficient);
      case 'genetic':
        return list.sort((a, b) => {
          const levelDiff = riskOrder[a.overallGeneticRiskLevel] - riskOrder[b.overallGeneticRiskLevel];
          if (levelDiff !== 0) return levelDiff;
          return a.overallGeneticRiskScore - b.overallGeneticRiskScore;
        });
      default:
        return list;
    }
  }, [recommendations, sortBy]);

  const isPairExists = (maleId: string, femaleId: string) => {
    return breedingPairs.some(
      (p) => p.maleId === maleId && p.femaleId === femaleId
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">种畜管理</h1>
        <p className="text-gray-600 mt-1">
          管理可繁殖种群，计算近交系数，评估配种风险
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200">
          {[
            { key: 'pets', label: '种畜库', icon: PawPrint },
            { key: 'pairs', label: '配种对', icon: Heart },
            { key: 'recommendations', label: '智能推荐', icon: Sparkles },
            { key: 'calculator', label: '近交系数计算', icon: Ruler },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {activeTab === 'pets' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">物种:</span>
                  <select
                    value={speciesFilter}
                    onChange={(e) => setSpeciesFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                  >
                    <option value="all">全部</option>
                    <option value="dog">犬</option>
                    <option value="cat">猫</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">性别:</span>
                  <select
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                  >
                    <option value="all">全部</option>
                    <option value="male">雄性</option>
                    <option value="female">雌性</option>
                  </select>
                </div>
                <div className="text-sm text-gray-500">
                  共 <span className="font-medium text-gray-900">{filteredPets.length}</span> 只种畜
                </div>
              </div>

              {loading ? (
                <div className="text-center py-12 text-gray-500">加载中...</div>
              ) : filteredPets.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <PawPrint className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">暂无种畜</h3>
                  <p className="text-gray-500 mt-1">在宠物信息中标记为种用的宠物会显示在这里</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPets.map((pet) => (
                    <div
                      key={pet.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-full flex items-center justify-center">
                          <span className="text-2xl">
                            {pet.species === 'dog'
                              ? '🐕'
                              : pet.species === 'cat'
                              ? '🐱'
                              : '🐾'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {pet.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {pet.breed || '未知品种'}
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            pet.gender === 'male'
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-pink-50 text-pink-600'
                          }`}
                        >
                          {pet.gender === 'male' ? '♂ 雄' : '♀ 雌'}
                        </span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Settings className="w-3.5 h-3.5" />
                          <span>种用个体</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'pairs' && (
            <div className="space-y-4">
              {breedingPairs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Heart className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">暂无配种对</h3>
                  <p className="text-gray-500 mt-1">在近交系数计算中添加配种对</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {breedingPairs.map((pair) => (
                    <div
                      key={pair.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                            <span className="text-xl">
                              {pair.male?.species === 'dog'
                                ? '🐕'
                                : '🐱'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {pair.male?.name || '未知'}
                            </p>
                            <p className="text-xs text-gray-500">父本</p>
                          </div>
                        </div>
                        <Heart className="w-5 h-5 text-red-400" />
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-pink-50 rounded-full flex items-center justify-center">
                            <span className="text-xl">
                              {pair.female?.species === 'dog'
                                ? '🐕'
                                : '🐱'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {pair.female?.name || '未知'}
                            </p>
                            <p className="text-xs text-gray-500">母本</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {pair.inbreedingCoefficient !== null && (
                          <div className="text-right">
                            <p className="text-sm text-gray-500">近交系数</p>
                            <p className="font-semibold text-gray-900">
                              {(pair.inbreedingCoefficient * 100).toFixed(2)}%
                            </p>
                          </div>
                        )}
                        <Link
                          to={`/breeding/${pair.id}`}
                          className="flex items-center gap-1 px-3 py-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors text-sm font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          详情
                        </Link>
                        <button
                          onClick={() => removePair(pair.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">物种:</span>
                    <select
                      value={recSpeciesFilter}
                      onChange={(e) => setRecSpeciesFilter(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                    >
                      <option value="all">全部</option>
                      <option value="dog">犬</option>
                      <option value="cat">猫</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">排序:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                    >
                      <option value="risk">综合风险</option>
                      <option value="genetic">遗传风险</option>
                      <option value="inbreeding">近交系数</option>
                    </select>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  共 <span className="font-medium text-gray-900">{recommendationsTotal}</span> 个推荐配对
                  {sortedRecommendations.length < recommendationsTotal && (
                    <span className="ml-1">（展示前 {sortedRecommendations.length} 个）</span>
                  )}
                </div>
              </div>

              {recommendationsLoading ? (
                <div className="text-center py-16 text-gray-500">
                  <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                  <p>正在分析基因数据，生成推荐配对...</p>
                </div>
              ) : sortedRecommendations.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">暂无推荐配对</h3>
                  <p className="text-gray-500 mt-1">
                    系统未找到符合条件的低风险配对组合
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    提示：请确保种畜库中有足够的公母个体，且已上传基因检测报告
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {sortedRecommendations.map((rec, index) => {
                    const exists = isPairExists(rec.male.id, rec.female.id);
                    const isAdding = addingPairId === rec.id;

                    return (
                      <div
                        key={rec.id}
                        className={`border rounded-xl p-5 transition-all hover:shadow-md ${
                          rec.overallRiskLevel === 'low'
                            ? 'border-green-200 bg-green-50/30'
                            : rec.overallRiskLevel === 'carrier'
                            ? 'border-purple-200 bg-purple-50/30'
                            : rec.overallRiskLevel === 'medium'
                            ? 'border-amber-200 bg-amber-50/30'
                            : rec.overallRiskLevel === 'high' || rec.overallRiskLevel === 'very_high'
                            ? 'border-red-200 bg-red-50/30'
                            : 'border-gray-200 bg-gray-50/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-xs font-semibold text-gray-500 shadow-sm">
                              {index + 1}
                            </span>
                            <span
                              className={`text-xs px-2.5 py-1 rounded-full font-medium ${getRiskColor(
                                rec.overallRiskLevel
                              )}`}
                            >
                              {getRiskLabel(rec.overallRiskLevel)}
                            </span>
                          </div>
                          {exists ? (
                            <span className="text-xs text-green-600 flex items-center gap-1 bg-green-100 px-2 py-1 rounded-full">
                              <Check className="w-3 h-3" />
                              已添加
                            </span>
                          ) : (
                            <button
                              onClick={() => addRecommendationToPair(rec)}
                              disabled={isAdding}
                              className="text-xs px-3 py-1.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              {isAdding ? '添加中...' : '添加配种对'}
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex-1 flex items-center gap-2 bg-white rounded-lg p-3 border border-gray-100">
                            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-lg">
                                {rec.male.species === 'dog' ? '🐕' : '🐱'}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 text-sm truncate">
                                {rec.male.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {rec.male.breed || '未知品种'} · ♂
                              </p>
                            </div>
                          </div>

                          <Heart className="w-5 h-5 text-red-400 flex-shrink-0" />

                          <div className="flex-1 flex items-center gap-2 bg-white rounded-lg p-3 border border-gray-100">
                            <div className="w-10 h-10 bg-pink-50 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-lg">
                                {rec.female.species === 'dog' ? '🐕' : '🐱'}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 text-sm truncate">
                                {rec.female.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {rec.female.breed || '未知品种'} · ♀
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mb-4">
                          <div className="bg-white rounded-lg p-2.5 text-center border border-gray-100">
                            <p className="text-xs text-gray-500 mb-0.5">综合风险</p>
                            <p
                              className={`text-sm font-bold ${
                                rec.overallRiskLevel === 'low'
                                  ? 'text-green-600'
                                  : rec.overallRiskLevel === 'carrier'
                                  ? 'text-purple-600'
                                  : rec.overallRiskLevel === 'medium'
                                  ? 'text-amber-600'
                                  : rec.overallRiskLevel === 'high' || rec.overallRiskLevel === 'very_high'
                                  ? 'text-red-600'
                                  : 'text-gray-600'
                              }`}
                            >
                              {getRiskLabel(rec.overallRiskLevel)}
                            </p>
                          </div>
                          <div className="bg-white rounded-lg p-2.5 text-center border border-gray-100">
                            <p className="text-xs text-gray-500 mb-0.5">近交系数</p>
                            <p className="text-sm font-bold text-gray-900">
                              {(rec.inbreedingCoefficient * 100).toFixed(2)}%
                            </p>
                          </div>
                          <div className="bg-white rounded-lg p-2.5 text-center border border-gray-100">
                            <p className="text-xs text-gray-500 mb-0.5">遗传评分</p>
                            <p className="text-sm font-bold text-gray-900">
                              {(rec.overallGeneticRiskScore * 100).toFixed(1)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                          <Info className="w-3.5 h-3.5" />
                          <span>风险位点分布</span>
                        </div>
                        <div className="grid grid-cols-5 gap-1">
                          <div className="text-center p-1.5 bg-gray-100 rounded">
                            <p className="text-sm font-semibold text-gray-900">
                              {rec.riskSummary.total || 0}
                            </p>
                            <p className="text-xs text-gray-500">总位</p>
                          </div>
                          <div className="text-center p-1.5 bg-red-100 rounded">
                            <p className="text-sm font-semibold text-red-700">
                              {rec.riskSummary.highRisk || 0}
                            </p>
                            <p className="text-xs text-red-600">高风</p>
                          </div>
                          <div className="text-center p-1.5 bg-amber-100 rounded">
                            <p className="text-sm font-semibold text-amber-700">
                              {rec.riskSummary.mediumRisk || 0}
                            </p>
                            <p className="text-xs text-amber-600">中风</p>
                          </div>
                          <div className="text-center p-1.5 bg-purple-100 rounded">
                            <p className="text-sm font-semibold text-purple-700">
                              {rec.riskSummary.carrier || 0}
                            </p>
                            <p className="text-xs text-purple-600">携带</p>
                          </div>
                          <div className="text-center p-1.5 bg-green-100 rounded">
                            <p className="text-sm font-semibold text-green-700">
                              {rec.riskSummary.lowRisk || 0}
                            </p>
                            <p className="text-xs text-green-600">低风</p>
                          </div>
                        </div>

                        {rec.topRisks && rec.topRisks.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-gray-200">
                            <p className="text-xs text-gray-500 mb-2">主要风险位点：</p>
                            <div className="space-y-1.5">
                              {rec.topRisks.slice(0, 2).map((risk, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between text-xs bg-white rounded px-2.5 py-1.5 border border-gray-100"
                                >
                                  <span className="font-medium text-gray-700">
                                    {risk.disease}
                                  </span>
                                  <span
                                    className={
                                      risk.offspringRiskLevel === 'high'
                                        ? 'text-red-600'
                                        : 'text-amber-600'
                                    }
                                  >
                                    {(risk.offspringRisk * 100).toFixed(0)}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'calculator' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  近交系数计算器
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  选择两只宠物，计算它们之间的亲缘关系系数和预期后代的近交系数
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      雄性宠物
                    </label>
                    <select
                      value={maleId}
                      onChange={(e) => {
                        setMaleId(e.target.value);
                        setPairResult(null);
                      }}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">请选择雄性</option>
                      {malePets.map((pet) => (
                        <option key={pet.id} value={pet.id}>
                          {pet.name} ({pet.breed || pet.species})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-center">
                    <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center">
                      <ArrowRight className="w-7 h-7 text-primary-600" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      雌性宠物
                    </label>
                    <select
                      value={femaleId}
                      onChange={(e) => {
                        setFemaleId(e.target.value);
                        setPairResult(null);
                      }}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">请选择雌性</option>
                      {femalePets.map((pet) => (
                        <option key={pet.id} value={pet.id}>
                          {pet.name} ({pet.breed || pet.species})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-center gap-3 mt-6">
                  <button
                    onClick={calculatePair}
                    disabled={!maleId || !femaleId || calculating}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Ruler className="w-4 h-4" />
                    {calculating ? '计算中...' : '计算近交系数'}
                  </button>
                  <button
                    onClick={addBreedingPair}
                    disabled={!maleId || !femaleId}
                    className="flex items-center gap-2 px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    添加到配种对
                  </button>
                </div>
              </div>

              {pairResult && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div
                      className={`p-5 rounded-xl border ${getRiskColor(
                        pairResult.inbreedingRiskLevel
                      )}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/50 rounded-lg flex items-center justify-center">
                          <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm opacity-80">近交风险</p>
                          <p className="text-xl font-bold">
                            {getRiskLabel(pairResult.inbreedingRiskLevel)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 bg-white rounded-xl border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                          <Ruler className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">亲缘系数</p>
                          <p className="text-xl font-bold text-gray-900">
                            {(pairResult.kinshipCoefficient * 100).toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 bg-white rounded-xl border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                          <Shield className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">后代近交系数</p>
                          <p className="text-xl font-bold text-gray-900">
                            {(pairResult.offspringInbreedingCoefficient * 100).toFixed(
                              2
                            )}
                            %
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-3">评估说明</h3>
                    <p className="text-gray-600">{pairResult.inbreedingInterpretation}</p>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">遗传风险概览</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">
                          {pairResult.geneticRisk.summary?.total || 0}
                        </p>
                        <p className="text-xs text-gray-500">总位点数</p>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <p className="text-2xl font-bold text-red-600">
                          {pairResult.geneticRisk.summary?.highRisk || 0}
                        </p>
                        <p className="text-xs text-red-600">高风险</p>
                      </div>
                      <div className="text-center p-3 bg-amber-50 rounded-lg">
                        <p className="text-2xl font-bold text-amber-600">
                          {pairResult.geneticRisk.summary?.mediumRisk || 0}
                        </p>
                        <p className="text-xs text-amber-600">中风险</p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">
                          {pairResult.geneticRisk.summary?.carrier || 0}
                        </p>
                        <p className="text-xs text-purple-600">携带者</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">
                          {pairResult.geneticRisk.summary?.lowRisk || 0}
                        </p>
                        <p className="text-xs text-green-600">低风险</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
