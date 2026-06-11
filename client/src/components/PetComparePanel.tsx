import { X } from 'lucide-react';
import { PetCompareData } from '../services/api';

interface PetComparePanelProps {
  pet1: PetCompareData;
  pet2: PetCompareData;
  onClose: () => void;
}

function getSpeciesLabel(species: string) {
  if (species === 'dog') return '🐕 犬';
  if (species === 'cat') return '🐱 猫';
  return species;
}

function getGenderLabel(gender: string) {
  if (gender === 'male') return '♂ 雄性';
  if (gender === 'female') return '♀ 雌性';
  return '未知';
}

function getInbreedingColor(level: string) {
  switch (level) {
    case 'very_high': return 'text-red-700 bg-red-100';
    case 'high': return 'text-red-600 bg-red-50';
    case 'medium': return 'text-yellow-700 bg-yellow-50';
    default: return 'text-green-700 bg-green-50';
  }
}

function getRiskBadge(level: string) {
  switch (level) {
    case 'high':
      return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">高风险</span>;
    case 'medium':
      return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700">中风险</span>;
    case 'low':
      return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">低风险</span>;
    default:
      return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">{level}</span>;
  }
}

function getInheritanceLabel(inheritance: string) {
  const map: Record<string, string> = {
    autosomal_dominant: '常染色体显性',
    autosomal_recessive: '常染色体隐性',
    x_linked: 'X连锁',
  };
  return map[inheritance] || inheritance;
}

function CompareRow({ label, value1, value2, highlight }: { label: string; value1: React.ReactNode; value2: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`grid grid-cols-[140px_1fr_1fr] border-b border-gray-100 ${highlight ? 'bg-gray-50/50' : ''}`}>
      <div className="px-4 py-2.5 text-sm font-medium text-gray-500 border-r border-gray-100">
        {label}
      </div>
      <div className="px-4 py-2.5 text-sm text-gray-900 border-r border-gray-100">
        {value1 || <span className="text-gray-400">-</span>}
      </div>
      <div className="px-4 py-2.5 text-sm text-gray-900">
        {value2 || <span className="text-gray-400">-</span>}
      </div>
    </div>
  );
}

export default function PetComparePanel({ pet1, pet2, onClose }: PetComparePanelProps) {
  const allMarkerDiseases = new Set<string>();
  const pet1MarkerMap = new Map<string, typeof pet1.geneMarkers[0]>();
  const pet2MarkerMap = new Map<string, typeof pet2.geneMarkers[0]>();

  pet1.geneMarkers.forEach((m) => {
    allMarkerDiseases.add(m.markerId);
    pet1MarkerMap.set(m.markerId, m);
  });
  pet2.geneMarkers.forEach((m) => {
    allMarkerDiseases.add(m.markerId);
    pet2MarkerMap.set(m.markerId, m);
  });

  const sortedMarkerIds = Array.from(allMarkerDiseases).sort((a, b) => {
    const m1 = pet1MarkerMap.get(a) || pet2MarkerMap.get(a);
    const m2 = pet1MarkerMap.get(b) || pet2MarkerMap.get(b);
    return (m1?.disease || '').localeCompare(m2?.disease || '');
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-[90vw] max-w-5xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">宠物对比</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {pet1.name} vs {pet2.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-[140px_1fr_1fr] border-b border-gray-200 bg-gray-50">
            <div className="px-4 py-3 text-sm font-semibold text-gray-500 border-r border-gray-100">
              对比项
            </div>
            <div className="px-4 py-3 border-r border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-full flex items-center justify-center">
                  <span className="text-lg">
                    {pet1.species === 'dog' ? '🐕' : pet1.species === 'cat' ? '🐱' : '🐾'}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{pet1.name}</p>
                  <p className="text-xs text-gray-500">{pet1.breed || '未知品种'}</p>
                </div>
              </div>
            </div>
            <div className="px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-full flex items-center justify-center">
                  <span className="text-lg">
                    {pet2.species === 'dog' ? '🐕' : pet2.species === 'cat' ? '🐱' : '🐾'}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{pet2.name}</p>
                  <p className="text-xs text-gray-500">{pet2.breed || '未知品种'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 py-2 bg-blue-50">
            <h3 className="text-sm font-semibold text-blue-800">基本信息</h3>
          </div>
          <CompareRow label="物种" value1={getSpeciesLabel(pet1.species)} value2={getSpeciesLabel(pet2.species)} />
          <CompareRow label="品种" value1={pet1.breed} value2={pet2.breed} />
          <CompareRow label="性别" value1={getGenderLabel(pet1.gender)} value2={getGenderLabel(pet2.gender)} />
          <CompareRow
            label="出生日期"
            value1={pet1.birthDate ? new Date(pet1.birthDate).toLocaleDateString() : null}
            value2={pet2.birthDate ? new Date(pet2.birthDate).toLocaleDateString() : null}
          />
          <CompareRow label="毛色" value1={pet1.color} value2={pet2.color} />
          <CompareRow
            label="体重"
            value1={pet1.weight != null ? `${pet1.weight} kg` : null}
            value2={pet2.weight != null ? `${pet2.weight} kg` : null}
          />
          <CompareRow
            label="种用状态"
            value1={pet1.isBreeding ? <span className="text-green-700 bg-green-50 px-2 py-0.5 rounded text-xs font-medium">种用</span> : <span className="text-gray-500 text-xs">非种用</span>}
            value2={pet2.isBreeding ? <span className="text-green-700 bg-green-50 px-2 py-0.5 rounded text-xs font-medium">种用</span> : <span className="text-gray-500 text-xs">非种用</span>}
          />
          <CompareRow label="父亲" value1={pet1.parentNames.father} value2={pet2.parentNames.father} />
          <CompareRow label="母亲" value1={pet1.parentNames.mother} value2={pet2.parentNames.mother} />

          <div className="px-4 py-2 bg-orange-50 mt-1">
            <h3 className="text-sm font-semibold text-orange-800">近交系数</h3>
          </div>
          <CompareRow
            label="近交系数"
            value1={
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold">{(pet1.inbreedingCoefficient * 100).toFixed(2)}%</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getInbreedingColor(pet1.inbreedingRiskLevel)}`}>
                  {pet1.inbreedingInterpretation}
                </span>
              </div>
            }
            value2={
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold">{(pet2.inbreedingCoefficient * 100).toFixed(2)}%</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getInbreedingColor(pet2.inbreedingRiskLevel)}`}>
                  {pet2.inbreedingInterpretation}
                </span>
              </div>
            }
            highlight
          />

          <div className="px-4 py-2 bg-purple-50 mt-1">
            <h3 className="text-sm font-semibold text-purple-800">
              基因标记检测结果
              <span className="ml-2 text-xs font-normal text-purple-600">
                共 {sortedMarkerIds.length} 个标记
              </span>
            </h3>
          </div>

          {sortedMarkerIds.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              两只宠物暂无基因标记检测数据
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[140px_1fr_1fr] border-b border-gray-200 bg-gray-50/80">
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 border-r border-gray-100">检测项目</div>
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 border-r border-gray-100">{pet1.name}</div>
                <div className="px-4 py-2 text-xs font-semibold text-gray-500">{pet2.name}</div>
              </div>
              {sortedMarkerIds.map((markerId) => {
                const m1 = pet1MarkerMap.get(markerId);
                const m2 = pet2MarkerMap.get(markerId);
                const markerName = m1?.markerName || m2?.markerName || '';
                const disease = m1?.disease || m2?.disease || '';
                const inheritance = m1?.inheritance || m2?.inheritance || '';
                const riskLevel = m1?.riskLevel || m2?.riskLevel || '';

                return (
                  <div key={markerId} className="grid grid-cols-[140px_1fr_1fr] border-b border-gray-100 hover:bg-gray-50/50">
                    <div className="px-4 py-2.5 border-r border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{markerName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{disease}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {getRiskBadge(riskLevel)}
                        <span className="text-xs text-gray-400">{getInheritanceLabel(inheritance)}</span>
                      </div>
                    </div>
                    <div className="px-4 py-2.5 border-r border-gray-100">
                      {m1 ? (
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-gray-900">{m1.genotype}</span>
                            {m1.zygosity && (
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                m1.zygosity === 'homozygous' ? 'bg-red-50 text-red-600' :
                                m1.zygosity === 'heterozygous' ? 'bg-yellow-50 text-yellow-700' :
                                'bg-gray-50 text-gray-600'
                              }`}>
                                {m1.zygosity === 'homozygous' ? '纯合' : m1.zygosity === 'heterozygous' ? '杂合' : m1.zygosity}
                              </span>
                            )}
                          </div>
                          {m1.source && <p className="text-xs text-gray-400 mt-0.5">来源: {m1.source}</p>}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">未检测</span>
                      )}
                    </div>
                    <div className="px-4 py-2.5">
                      {m2 ? (
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-gray-900">{m2.genotype}</span>
                            {m2.zygosity && (
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                m2.zygosity === 'homozygous' ? 'bg-red-50 text-red-600' :
                                m2.zygosity === 'heterozygous' ? 'bg-yellow-50 text-yellow-700' :
                                'bg-gray-50 text-gray-600'
                              }`}>
                                {m2.zygosity === 'homozygous' ? '纯合' : m2.zygosity === 'heterozygous' ? '杂合' : m2.zygosity}
                              </span>
                            )}
                          </div>
                          {m2.source && <p className="text-xs text-gray-400 mt-0.5">来源: {m2.source}</p>}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">未检测</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
