import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter, PawPrint, Edit, Trash2, Eye, Clock } from 'lucide-react';
import { petApi, Pet } from '../services/api';

export default function PetList() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState({
    species: searchParams.get('species') || 'all',
    gender: searchParams.get('gender') || 'all',
    search: searchParams.get('search') || '',
  });

  useEffect(() => {
    loadPets();
  }, [filters]);

  async function loadPets() {
    setLoading(true);
    try {
      const data = await petApi.list({
        species: filters.species,
        gender: filters.gender,
        search: filters.search || undefined,
      });
      setPets(data);
    } catch (error) {
      console.error('加载宠物列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定要删除这只宠物吗？')) return;

    try {
      await petApi.remove(id);
      loadPets();
    } catch (error) {
      alert('删除失败');
    }
  }

  const speciesOptions = [
    { value: 'all', label: '全部物种' },
    { value: 'dog', label: '犬' },
    { value: 'cat', label: '猫' },
  ];

  const genderOptions = [
    { value: 'all', label: '全部性别' },
    { value: 'male', label: '雄性' },
    { value: 'female', label: '雌性' },
  ];

  const getGenderLabel = (gender: string) => {
    if (gender === 'male') return '♂ 雄性';
    if (gender === 'female') return '♀ 雌性';
    return '未知';
  };

  const getSpeciesLabel = (species: string) => {
    if (species === 'dog') return '🐕 犬';
    if (species === 'cat') return '🐱 猫';
    return species;
  };

  const getGenderColor = (gender: string) => {
    if (gender === 'male') return 'text-blue-600 bg-blue-50';
    if (gender === 'female') return 'text-pink-600 bg-pink-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">宠物管理</h1>
          <p className="text-gray-600 mt-1">管理所有宠物的基本信息和谱系关系</p>
        </div>
        <Link
          to="/pets/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          添加宠物
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索宠物名称或品种..."
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
            <select
              value={filters.gender}
              onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {genderOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : pets.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <PawPrint className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">暂无宠物</h3>
          <p className="text-gray-500 mt-1">开始添加您的第一只宠物吧</p>
          <Link
            to="/pets/new"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            添加宠物
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pets.map((pet) => (
            <div
              key={pet.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">
                        {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐱' : '🐾'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{pet.name}</h3>
                      <p className="text-sm text-gray-500">{pet.breed || '未知品种'}</p>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${getGenderColor(
                      pet.gender
                    )}`}
                  >
                    {getGenderLabel(pet.gender)}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-gray-400">物种：</span>
                    <span>{getSpeciesLabel(pet.species)}</span>
                  </div>
                  {pet.birthDate && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-gray-400">生日：</span>
                      <span>{new Date(pet.birthDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {pet.isBreeding && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                        种用
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 px-5 py-3 bg-gray-50 flex justify-end gap-2">
                <Link
                  to={`/pets/${pet.id}/timeline`}
                  className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                  title="健康时间轴"
                >
                  <Clock className="w-4 h-4" />
                </Link>
                <Link
                  to={`/pets/${pet.id}`}
                  className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  title="查看详情"
                >
                  <Eye className="w-4 h-4" />
                </Link>
                <Link
                  to={`/pets/${pet.id}/edit`}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="编辑"
                >
                  <Edit className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => handleDelete(pet.id)}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="删除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
