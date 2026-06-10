import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  PawPrint,
  Calendar,
  Ruler,
  FileText,
  Network,
  Dna,
  Trash2,
  Plus,
  Clock,
} from 'lucide-react';
import { petApi, geneReportApi, geneticsApi, Pet, RiskSummary } from '../services/api';

export default function PetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pet, setPet] = useState<Pet | null>(null);
  const [riskSummary, setRiskSummary] = useState<RiskSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'relations' | 'genes' | 'reports'>('info');

  useEffect(() => {
    if (id) {
      loadPet();
      loadRisk();
    }
  }, [id]);

  async function loadPet() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await petApi.get(id);
      setPet(data);
    } catch (error) {
      console.error('加载宠物详情失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadRisk() {
    if (!id) return;
    try {
      const data = await geneticsApi.getPetRisk(id);
      setRiskSummary(data);
    } catch (error) {
      console.error('加载风险评估失败:', error);
    }
  }

  async function handleGenerateMockReport() {
    if (!id) return;
    if (!confirm('生成模拟基因报告用于演示？')) return;

    try {
      await geneReportApi.createMock(id);
      loadPet();
      loadRisk();
      alert('模拟报告已生成！');
    } catch (error) {
      alert('生成失败');
    }
  }

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

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-amber-600 bg-amber-50';
      case 'low':
        return 'text-green-600 bg-green-50';
      case 'carrier':
        return 'text-purple-600 bg-purple-50';
      default:
        return 'text-gray-600 bg-gray-50';
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

  if (loading) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>;
  }

  if (!pet) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">宠物不存在</p>
        <Link to="/pets" className="text-primary-600 hover:underline">
          返回列表
        </Link>
      </div>
    );
  }

  const parents = pet.childRelations || [];
  const children = pet.parentRelations || [];
  const geneReports = pet.geneReports || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/pets"
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{pet.name}</h1>
          <p className="text-gray-600">
            {pet.breed || '未知品种'} · {getSpeciesLabel(pet.species)}
          </p>
        </div>
        <Link
          to={`/pets/${pet.id}/edit`}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          <Edit className="w-4 h-4" />
          编辑
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex border-b border-gray-200">
              {[
                { key: 'info', label: '基本信息', icon: PawPrint },
                { key: 'relations', label: '亲属关系', icon: Network },
                { key: 'genes', label: '基因标记', icon: Dna },
                { key: 'reports', label: '基因报告', icon: FileText },
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
              {activeTab === 'info' && (
                <div className="grid grid-cols-2 gap-6">
                  <InfoItem label="名字" value={pet.name} />
                  <InfoItem label="物种" value={getSpeciesLabel(pet.species)} />
                  <InfoItem label="品种" value={pet.breed || '未知'} />
                  <InfoItem
                    label="性别"
                    value={
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getGenderColor(
                          pet.gender
                        )}`}
                      >
                        {getGenderLabel(pet.gender)}
                      </span>
                    }
                  />
                  <InfoItem
                    label="出生日期"
                    value={
                      pet.birthDate
                        ? new Date(pet.birthDate).toLocaleDateString()
                        : '未知'
                    }
                  />
                  <InfoItem label="毛色" value={pet.color || '未知'} />
                  <InfoItem label="体重" value={pet.weight ? `${pet.weight} kg` : '未知'} />
                  <InfoItem
                    label="是否种用"
                    value={pet.isBreeding ? '是' : '否'}
                  />
                  {pet.description && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500 mb-1">描述</p>
                      <p className="text-gray-900">{pet.description}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'relations' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">父母</h3>
                    {parents.length === 0 ? (
                      <p className="text-sm text-gray-500">暂无父母信息</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {parents.map((rel) => (
                          <Link
                            key={rel.id}
                            to={`/pets/${rel.parentId}`}
                            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-200">
                              <span className="text-lg">
                                {rel.parent?.species === 'dog'
                                  ? '🐕'
                                  : rel.parent?.species === 'cat'
                                  ? '🐱'
                                  : '🐾'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {rel.parent?.name || '未知'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {rel.relationType === 'father' ? '父亲' : '母亲'}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">后代</h3>
                    {children.length === 0 ? (
                      <p className="text-sm text-gray-500">暂无后代信息</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {children.map((rel) => (
                          <Link
                            key={rel.id}
                            to={`/pets/${rel.childId}`}
                            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-200">
                              <span className="text-lg">
                                {rel.child?.species === 'dog'
                                  ? '🐕'
                                  : rel.child?.species === 'cat'
                                  ? '🐱'
                                  : '🐾'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {rel.child?.name || '未知'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {pet.gender === 'male' ? '子代（父）' : '子代（母）'}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4">
                    <Link
                      to={`/pedigree/${pet.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium"
                    >
                      <Network className="w-4 h-4" />
                      查看完整谱系图
                    </Link>
                  </div>
                </div>
              )}

              {activeTab === 'genes' && (
                <div>
                  {riskSummary ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm text-gray-500">总体风险评估</p>
                          <span
                            className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(
                              riskSummary.overallRisk
                            )}`}
                          >
                            {getRiskLabel(riskSummary.overallRisk)}
                          </span>
                        </div>
                        <div className="flex gap-6 text-sm">
                          <div>
                            <span className="text-gray-500">检测位点：</span>
                            <span className="font-medium">
                              {riskSummary.summary.tested}/
                              {riskSummary.summary.total}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">高风险：</span>
                            <span className="font-medium text-red-600">
                              {riskSummary.summary.highRisk}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">携带者：</span>
                            <span className="font-medium text-purple-600">
                              {riskSummary.summary.carrier}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {riskSummary.markers.map((marker) => (
                          <div
                            key={marker.markerName}
                            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                          >
                            <div>
                              <p className="font-medium text-gray-900">{marker.disease}</p>
                              <p className="text-sm text-gray-500">
                                {marker.markerName} · {marker.geneName} ·{' '}
                                {marker.inheritance === 'autosomal_dominant'
                                  ? '常染色体显性'
                                  : marker.inheritance === 'autosomal_recessive'
                                  ? '常染色体隐性'
                                  : marker.inheritance === 'x_linked'
                                  ? 'X连锁'
                                  : marker.inheritance}
                              </p>
                            </div>
                            <div className="text-right">
                              <span
                                className={`risk-badge risk-${marker.riskLevel}`}
                              >
                                {getRiskLabel(marker.riskLevel)}
                              </span>
                              <p className="text-xs text-gray-500 mt-1">
                                {marker.genotype}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Dna className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">暂无基因检测数据</p>
                      <button
                        onClick={handleGenerateMockReport}
                        className="mt-3 text-sm text-primary-600 hover:underline"
                      >
                        生成模拟数据
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reports' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-medium text-gray-900">基因检测报告</h3>
                    <button
                      onClick={handleGenerateMockReport}
                      className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                    >
                      <Plus className="w-4 h-4" />
                      生成模拟报告
                    </button>
                  </div>

                  {geneReports.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">暂无基因检测报告</p>
                      <p className="text-sm text-gray-400 mt-1">
                        上传PDF或图片格式的基因检测报告
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {geneReports.map((report) => (
                        <div
                          key={report.id}
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                              <FileText className="w-5 h-5 text-primary-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{report.fileName}</p>
                              <p className="text-sm text-gray-500">
                                上传于{' '}
                                {new Date(report.uploadedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              report.status === 'parsed'
                                ? 'bg-green-50 text-green-700'
                                : report.status === 'failed'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-yellow-50 text-yellow-700'
                            }`}
                          >
                            {report.status === 'parsed'
                              ? '已解析'
                              : report.status === 'failed'
                              ? '解析失败'
                              : '解析中'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">快速操作</h3>
            <div className="space-y-2">
              <Link
                to={`/pets/${pet.id}/timeline`}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm"
              >
                <Clock className="w-5 h-5 text-amber-600" />
                <span>健康时间轴</span>
              </Link>
              <Link
                to={`/pedigree/${pet.id}`}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm"
              >
                <Network className="w-5 h-5 text-primary-600" />
                <span>查看谱系图</span>
              </Link>
              <Link
                to="/risk-prediction"
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm"
              >
                <Dna className="w-5 h-5 text-purple-600" />
                <span>遗传病风险预测</span>
              </Link>
              <Link
                to="/breeding"
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm"
              >
                <Ruler className="w-5 h-5 text-green-600" />
                <span>近交系数计算</span>
              </Link>
            </div>
          </div>

          {riskSummary && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">遗传风险概览</h3>
              <div className="space-y-3">
                <RiskStat
                  label="高风险"
                  value={riskSummary.summary.highRisk}
                  color="red"
                />
                <RiskStat
                  label="中风险"
                  value={riskSummary.summary.mediumRisk}
                  color="amber"
                />
                <RiskStat
                  label="携带者"
                  value={riskSummary.summary.carrier}
                  color="purple"
                />
                <RiskStat
                  label="低风险"
                  value={riskSummary.summary.lowRisk}
                  color="green"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <div className="text-gray-900">{value}</div>
    </div>
  );
}

function RiskStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
    green: 'bg-green-100 text-green-700',
    purple: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <span
        className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${colorClasses[color]}`}
      >
        {value}
      </span>
    </div>
  );
}
