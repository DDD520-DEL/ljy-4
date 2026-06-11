import { useState, useEffect } from 'react';
import { Search, Filter, MapPin, Clock, Heart, BookOpen, PawPrint, Info } from 'lucide-react';
import { breedApi, Breed } from '../services/api';

export default function BreedEncyclopedia() {
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBreed, setSelectedBreed] = useState<Breed | null>(null);

  const [filters, setFilters] = useState({
    species: 'all',
    search: '',
  });

  useEffect(() => {
    loadBreeds();
  }, [filters]);

  async function loadBreeds() {
    setLoading(true);
    try {
      const data = await breedApi.list({
        species: filters.species,
        search: filters.search || undefined,
      });
      setBreeds(data);
    } catch (error) {
      console.error('加载品种列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  const speciesOptions = [
    { value: 'all', label: '全部物种' },
    { value: 'dog', label: '🐕 犬' },
    { value: 'cat', label: '🐱 猫' },
  ];

  const getSpeciesLabel = (species: string) => {
    if (species === 'dog') return '🐕 犬类';
    if (species === 'cat') return '🐱 猫类';
    return species;
  };

  const getSizeCategoryLabel = (size: string | null) => {
    if (!size) return '未知';
    const sizeMap: Record<string, string> = {
      small: '小型',
      medium: '中型',
      large: '大型',
    };
    return sizeMap[size] || size;
  };

  const getSizeCategoryColor = (size: string | null) => {
    if (!size) return 'bg-gray-100 text-gray-600';
    const colorMap: Record<string, string> = {
      small: 'bg-green-100 text-green-700',
      medium: 'bg-blue-100 text-blue-700',
      large: 'bg-purple-100 text-purple-700',
    };
    return colorMap[size] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">品种百科</h1>
        <p className="text-gray-600 mt-1">了解不同宠物品种的特点、遗传病和饲养要点</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索品种名称或原产地..."
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

          <div className="ml-auto text-sm text-gray-500">
            共 <span className="font-semibold text-gray-900">{breeds.length}</span> 个品种
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : breeds.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <PawPrint className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">暂无品种数据</h3>
          <p className="text-gray-500 mt-1">未找到符合条件的品种</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {breeds.map((breed) => (
            <div
              key={breed.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedBreed(breed)}
            >
              <div className="h-32 bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center">
                <span className="text-6xl">
                  {breed.species === 'dog' ? '🐕' : breed.species === 'cat' ? '🐱' : '🐾'}
                </span>
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{breed.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{getSpeciesLabel(breed.species)}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getSizeCategoryColor(breed.sizeCategory)}`}>
                    {getSizeCategoryLabel(breed.sizeCategory)}
                  </span>
                </div>

                {breed.temperament && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {breed.temperament}
                  </p>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{breed.origin || '未知'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>{breed.avgLifespan || '未知'}</span>
                  </div>
                  <div className="flex items-start gap-2 text-gray-600">
                    <Heart className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-1">
                      {breed.commonDiseases && breed.commonDiseases.length > 0
                        ? breed.commonDiseases.slice(0, 2).join('、')
                        : '暂无数据'}
                    </span>
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

      {selectedBreed && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedBreed(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-48 bg-gradient-to-br from-primary-200 to-secondary-200 flex items-center justify-center relative">
              <span className="text-8xl">
                {selectedBreed.species === 'dog' ? '🐕' : selectedBreed.species === 'cat' ? '🐱' : '🐾'}
              </span>
              <button
                onClick={() => setSelectedBreed(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-192px)]">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedBreed.name}</h2>
                  <p className="text-gray-500 mt-1">{getSpeciesLabel(selectedBreed.species)}</p>
                </div>
                <span className={`text-sm px-3 py-1 rounded-full font-medium ${getSizeCategoryColor(selectedBreed.sizeCategory)}`}>
                  {getSizeCategoryLabel(selectedBreed.sizeCategory)}
                </span>
              </div>

              {selectedBreed.description && (
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {selectedBreed.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">原产地</span>
                  </div>
                  <p className="font-medium text-gray-900">{selectedBreed.origin || '未知'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">平均寿命</span>
                  </div>
                  <p className="font-medium text-gray-900">{selectedBreed.avgLifespan || '未知'}</p>
                </div>
              </div>

              {selectedBreed.temperament && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <PawPrint className="w-4 h-4 text-primary-500" />
                    性格特点
                  </h3>
                  <p className="text-gray-600 bg-gray-50 rounded-xl p-4">
                    {selectedBreed.temperament}
                  </p>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  常见遗传病
                </h3>
                {selectedBreed.commonDiseases && selectedBreed.commonDiseases.length > 0 ? (
                  <ul className="space-y-2">
                    {selectedBreed.commonDiseases.map((disease, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 bg-red-50 rounded-lg p-3"
                      >
                        <span className="w-2 h-2 bg-red-400 rounded-full mt-1.5 flex-shrink-0"></span>
                        <span className="text-sm text-gray-700">{disease}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-sm bg-gray-50 rounded-xl p-4">
                    暂无相关数据
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-green-500" />
                  饲养要点
                </h3>
                {selectedBreed.carePoints && selectedBreed.carePoints.length > 0 ? (
                  <ul className="space-y-2">
                    {selectedBreed.carePoints.map((point, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 bg-green-50 rounded-lg p-3"
                      >
                        <span className="w-2 h-2 bg-green-400 rounded-full mt-1.5 flex-shrink-0"></span>
                        <span className="text-sm text-gray-700">{point}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-sm bg-gray-50 rounded-xl p-4">
                    暂无相关数据
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
