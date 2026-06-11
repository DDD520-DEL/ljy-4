import { useState, useEffect } from 'react';
import { Search, Filter, AlertTriangle, Heart, BookOpen, PawPrint, Info, ExternalLink, Shield } from 'lucide-react';
import { geneticDiseaseApi, GeneticDisease } from '../services/api';

export default function GeneticDiseaseEncyclopedia() {
  const [diseases, setDiseases] = useState<GeneticDisease[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDisease, setSelectedDisease] = useState<GeneticDisease | null>(null);

  const [filters, setFilters] = useState({
    species: 'all',
    inheritance: 'all',
    search: '',
  });

  useEffect(() => {
    loadDiseases();
  }, [filters]);

  async function loadDiseases() {
    setLoading(true);
    try {
      const data = await geneticDiseaseApi.list({
        species: filters.species,
        inheritance: filters.inheritance,
        search: filters.search || undefined,
      });
      setDiseases(data);
    } catch (error) {
      console.error('加载遗传病列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  const speciesOptions = [
    { value: 'all', label: '全部物种' },
    { value: 'dog', label: '🐕 犬' },
    { value: 'cat', label: '🐱 猫' },
  ];

  const inheritanceOptions = [
    { value: 'all', label: '全部遗传模式' },
    { value: 'autosomal_dominant', label: '常染色体显性' },
    { value: 'autosomal_recessive', label: '常染色体隐性' },
    { value: 'x_linked', label: 'X连锁' },
    { value: 'mitochondrial', label: '线粒体遗传' },
  ];

  const getSpeciesLabel = (species: string) => {
    if (species === 'dog') return '🐕 犬类';
    if (species === 'cat') return '🐱 猫类';
    return species;
  };

  const getInheritanceLabel = (inheritance: string) => {
    const labelMap: Record<string, string> = {
      autosomal_dominant: '常染色体显性',
      autosomal_recessive: '常染色体隐性',
      x_linked: 'X连锁',
      mitochondrial: '线粒体遗传',
      polygenic: '多基因遗传',
    };
    return labelMap[inheritance] || inheritance;
  };

  const getInheritanceColor = (inheritance: string) => {
    const colorMap: Record<string, string> = {
      autosomal_dominant: 'bg-red-100 text-red-700',
      autosomal_recessive: 'bg-blue-100 text-blue-700',
      x_linked: 'bg-purple-100 text-purple-700',
      mitochondrial: 'bg-orange-100 text-orange-700',
      polygenic: 'bg-green-100 text-green-700',
    };
    return colorMap[inheritance] || 'bg-gray-100 text-gray-700';
  };

  const getRiskLevelColor = (riskLevel: string | null) => {
    if (!riskLevel) return 'bg-gray-100 text-gray-600';
    const colorMap: Record<string, string> = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-green-100 text-green-700',
    };
    return colorMap[riskLevel] || 'bg-gray-100 text-gray-600';
  };

  const getRiskLevelLabel = (riskLevel: string | null) => {
    if (!riskLevel) return '未知';
    const labelMap: Record<string, string> = {
      high: '高风险',
      medium: '中风险',
      low: '低风险',
    };
    return labelMap[riskLevel] || riskLevel;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">遗传病知识库</h1>
        <p className="text-gray-600 mt-1">了解常见宠物遗传病的特征、遗传模式和防治方法</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索疾病名称或描述..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="border-0 focus:ring-0 text-sm w-64"
            />
          </div>

          <div className="h-6 w-px bg-gray-200"></div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filters.species}
              onChange={(e) => setFilters({ ...filters, species: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {speciesOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-400" />
            <select
              value={filters.inheritance}
              onChange={(e) => setFilters({ ...filters, inheritance: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {inheritanceOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="ml-auto text-sm text-gray-500">
            共 <span className="font-semibold text-gray-900">{diseases.length}</span> 种遗传病
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : diseases.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">暂无遗传病数据</h3>
          <p className="text-gray-500 mt-1">未找到符合条件的遗传病</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {diseases.map((disease) => (
            <div
              key={disease.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedDisease(disease)}
            >
              <div className="h-2 bg-gradient-to-r from-red-400 to-orange-400"></div>

              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 line-clamp-1">{disease.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{getSpeciesLabel(disease.species)}</p>
                  </div>
                  {disease.riskLevel && (
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ml-2 flex-shrink-0 ${getRiskLevelColor(disease.riskLevel)}`}>
                      {getRiskLevelLabel(disease.riskLevel)}
                    </span>
                  )}
                </div>

                <div className="flex gap-2 mb-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getInheritanceColor(disease.inheritance)}`}>
                    {getInheritanceLabel(disease.inheritance)}
                  </span>
                </div>

                {disease.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {disease.description}
                  </p>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2 text-gray-600">
                    <Heart className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-gray-700">典型症状：</span>
                      <span className="line-clamp-1">
                        {disease.symptoms.slice(0, 2).join('、')}
                        {disease.symptoms.length > 2 && '...'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-gray-600">
                    <PawPrint className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-gray-700">好发品种：</span>
                      <span className="line-clamp-1">
                        {disease.affectedBreeds.slice(0, 2).join('、')}
                        {disease.affectedBreeds.length > 2 && '...'}
                      </span>
                    </div>
                  </div>
                </div>

                <button className="mt-4 w-full text-sm text-primary-600 font-medium hover:text-primary-700 flex items-center justify-center gap-1">
                  <Info className="w-4 h-4" />
                  查看详情
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedDisease && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedDisease(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-3 bg-gradient-to-r from-red-400 to-orange-400"></div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-12px)]">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedDisease.name}</h2>
                  <p className="text-gray-500 mt-1">{getSpeciesLabel(selectedDisease.species)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedDisease.riskLevel && (
                    <span className={`text-sm px-3 py-1 rounded-full font-medium ${getRiskLevelColor(selectedDisease.riskLevel)}`}>
                      {getRiskLevelLabel(selectedDisease.riskLevel)}
                    </span>
                  )}
                  <span className={`text-sm px-3 py-1 rounded-full font-medium ${getInheritanceColor(selectedDisease.inheritance)}`}>
                    {getInheritanceLabel(selectedDisease.inheritance)}
                  </span>
                  <button
                    onClick={() => setSelectedDisease(null)}
                    className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {selectedDisease.description && (
                <p className="text-gray-600 mb-6 leading-relaxed bg-gray-50 rounded-xl p-4">
                  {selectedDisease.description}
                </p>
              )}

              {selectedDisease.prevalence && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    患病率信息
                  </h3>
                  <p className="text-gray-600 bg-orange-50 rounded-xl p-4">
                    {selectedDisease.prevalence}
                  </p>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  典型症状
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedDisease.symptoms.map((symptom, index) => (
                    <span
                      key={index}
                      className="text-sm bg-red-50 text-red-700 px-3 py-1.5 rounded-lg"
                    >
                      {symptom}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <PawPrint className="w-4 h-4 text-primary-500" />
                  好发品种
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedDisease.affectedBreeds.map((breed, index) => (
                    <span
                      key={index}
                      className="text-sm bg-primary-50 text-primary-700 px-3 py-1.5 rounded-lg"
                    >
                      {breed}
                    </span>
                  ))}
                </div>
              </div>

              {selectedDisease.references && selectedDisease.references.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-green-500" />
                    参考文献
                  </h3>
                  <ul className="space-y-2">
                    {selectedDisease.references.map((ref, index) => (
                      <li key={index}>
                        <a
                          href={ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 rounded-lg p-3 hover:bg-blue-100 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{ref.title}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
