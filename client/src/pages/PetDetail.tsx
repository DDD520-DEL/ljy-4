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
  Repeat,
  User,
  Phone,
  Search,
  X,
  CheckCircle,
  AlertCircle,
  Building2,
  FlaskConical,
  Syringe,
  Scale,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import { petApi, geneReportApi, geneticsApi, geneTestAppointmentApi, Pet, RiskSummary, PetTransfer, GeneTestAppointment, GeneTestAppointmentStatus, VaccineRecord, WeightRecord, BreedWeightStandard } from '../services/api';

export default function PetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pet, setPet] = useState<Pet | null>(null);
  const [riskSummary, setRiskSummary] = useState<RiskSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'relations' | 'genes' | 'reports' | 'appointments' | 'transfers' | 'vaccines' | 'weight'>('info');
  const [weights, setWeights] = useState<WeightRecord[]>([]);
  const [weightsLoading, setWeightsLoading] = useState(false);
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [editingWeight, setEditingWeight] = useState<WeightRecord | null>(null);
  const [weightForm, setWeightForm] = useState({
    weight: '',
    recordedAt: new Date().toISOString().split('T')[0],
    note: '',
  });
  const [weightStandard, setWeightStandard] = useState<BreedWeightStandard | null>(null);
  const [weightStandardInfo, setWeightStandardInfo] = useState<{ isEstimated?: boolean; message: string }>({ message: '' });
  const [weightStandardLoading, setWeightStandardLoading] = useState(false);
  const [transfers, setTransfers] = useState<PetTransfer[]>([]);
  const [transfersLoading, setTransfersLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState('');
  const [editingTransfer, setEditingTransfer] = useState<PetTransfer | null>(null);
  const [formData, setFormData] = useState({
    fromOwnerName: '',
    fromOwnerContact: '',
    toOwnerName: '',
    toOwnerContact: '',
    transferDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [vaccines, setVaccines] = useState<VaccineRecord[]>([]);
  const [vaccinesLoading, setVaccinesLoading] = useState(false);
  const [showVaccineForm, setShowVaccineForm] = useState(false);
  const [editingVaccine, setEditingVaccine] = useState<VaccineRecord | null>(null);
  const [vaccineForm, setVaccineForm] = useState({
    vaccineName: '',
    vaccinationDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    institution: '',
    notes: '',
  });
  const [appointments, setAppointments] = useState<GeneTestAppointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<GeneTestAppointment | null>(null);
  const [appointmentForm, setAppointmentForm] = useState({
    institution: '',
    expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    testItems: [] as string[],
    notes: '',
  });

  const DEFAULT_TEST_ITEMS = [
    '常规遗传病筛查',
    '品种特异性检测',
    '血统鉴定',
    '毛色基因型',
    '药物敏感性',
    '运动能力基因',
  ];

  useEffect(() => {
    if (id) {
      loadPet();
      loadRisk();
    }
  }, [id]);

  useEffect(() => {
    if (id && activeTab === 'transfers') {
      loadTransfers();
    }
  }, [id, activeTab, ownerFilter]);

  useEffect(() => {
    if (id && activeTab === 'appointments') {
      loadAppointments();
    }
  }, [id, activeTab]);

  useEffect(() => {
    if (id && activeTab === 'vaccines') {
      loadVaccines();
    }
  }, [id, activeTab]);

  useEffect(() => {
    if (id && activeTab === 'weight') {
      loadWeights();
      loadWeightStandard();
    }
  }, [id, activeTab, pet?.species, pet?.breed]);

  async function loadWeights() {
    if (!id) return;
    setWeightsLoading(true);
    try {
      const data = await petApi.listWeights(id);
      setWeights(data);
    } catch (error) {
      console.error('加载体重记录失败:', error);
    } finally {
      setWeightsLoading(false);
    }
  }

  async function loadWeightStandard() {
    if (!pet?.species || !pet?.breed) return;
    setWeightStandardLoading(true);
    try {
      const data = await petApi.getBreedWeightStandard(pet.species, pet.breed);
      setWeightStandard(data.standard);
      setWeightStandardInfo({ isEstimated: data.isEstimated, message: data.message });
    } catch (error) {
      console.error('加载品种标准体重失败:', error);
    } finally {
      setWeightStandardLoading(false);
    }
  }

  function resetWeightForm() {
    setWeightForm({
      weight: '',
      recordedAt: new Date().toISOString().split('T')[0],
      note: '',
    });
    setEditingWeight(null);
    setShowWeightForm(false);
  }

  function handleEditWeight(record: WeightRecord) {
    setEditingWeight(record);
    setWeightForm({
      weight: String(record.weight),
      recordedAt: record.recordedAt.split('T')[0],
      note: record.note || '',
    });
    setShowWeightForm(true);
  }

  async function handleSubmitWeight(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;

    const weightNum = parseFloat(weightForm.weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      alert('请输入有效的体重');
      return;
    }

    try {
      if (editingWeight) {
        await petApi.updateWeight(id, editingWeight.id, {
          weight: weightNum,
          recordedAt: weightForm.recordedAt,
          note: weightForm.note || null,
        });
      } else {
        await petApi.createWeight(id, {
          weight: weightNum,
          recordedAt: weightForm.recordedAt,
          note: weightForm.note || null,
        });
      }
      resetWeightForm();
      loadWeights();
      loadPet();
    } catch (error) {
      console.error('保存体重记录失败:', error);
      alert('保存失败，请重试');
    }
  }

  async function handleDeleteWeight(recordId: string) {
    if (!id) return;
    if (!confirm('确定要删除这条体重记录吗？')) return;

    try {
      await petApi.removeWeight(id, recordId);
      loadWeights();
    } catch (error) {
      console.error('删除体重记录失败:', error);
      alert('删除失败，请重试');
    }
  }

  async function loadAppointments() {
    if (!id) return;
    setAppointmentsLoading(true);
    try {
      const data = await geneTestAppointmentApi.listByPet(id);
      setAppointments(data);
    } catch (error) {
      console.error('加载预约记录失败:', error);
    } finally {
      setAppointmentsLoading(false);
    }
  }

  function resetAppointmentForm() {
    setAppointmentForm({
      institution: '',
      expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      testItems: [],
      notes: '',
    });
    setEditingAppointment(null);
    setShowAppointmentForm(false);
  }

  function handleEditAppointment(apt: GeneTestAppointment) {
    setEditingAppointment(apt);
    setAppointmentForm({
      institution: apt.institution,
      expectedDate: apt.expectedDate.split('T')[0],
      testItems: Array.isArray(apt.testItems) ? apt.testItems : (apt.testItems ? JSON.parse(apt.testItems) : []),
      notes: apt.notes || '',
    });
    setShowAppointmentForm(true);
  }

  async function handleSubmitAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;

    if (appointmentForm.testItems.length === 0) {
      alert('请至少选择一个检测项目');
      return;
    }

    try {
      if (editingAppointment) {
        await geneTestAppointmentApi.update(editingAppointment.id, appointmentForm);
      } else {
        await geneTestAppointmentApi.create(id, {
          ...appointmentForm,
          status: 'pending',
        });
      }
      resetAppointmentForm();
      loadAppointments();
    } catch (error) {
      console.error('保存预约记录失败:', error);
      alert('保存失败，请重试');
    }
  }

  async function handleDeleteAppointment(aptId: string) {
    if (!id) return;
    if (!confirm('确定要删除这条预约记录吗？')) return;

    try {
      await geneTestAppointmentApi.remove(aptId);
      loadAppointments();
    } catch (error) {
      console.error('删除预约记录失败:', error);
      alert('删除失败，请重试');
    }
  }

  async function handleUpdateAppointmentStatus(aptId: string, status: GeneTestAppointmentStatus) {
    try {
      await geneTestAppointmentApi.updateStatus(aptId, status);
      loadAppointments();
    } catch (error) {
      console.error('更新预约状态失败:', error);
      alert('更新失败，请重试');
    }
  }

  async function loadTransfers() {
    if (!id) return;
    setTransfersLoading(true);
    try {
      const data = await petApi.listTransfers(id, ownerFilter || undefined);
      setTransfers(data);
    } catch (error) {
      console.error('加载流转记录失败:', error);
    } finally {
      setTransfersLoading(false);
    }
  }

  async function loadVaccines() {
    if (!id) return;
    setVaccinesLoading(true);
    try {
      const data = await petApi.listVaccines(id);
      setVaccines(data);
    } catch (error) {
      console.error('加载疫苗接种记录失败:', error);
    } finally {
      setVaccinesLoading(false);
    }
  }

  function resetVaccineForm() {
    setVaccineForm({
      vaccineName: '',
      vaccinationDate: new Date().toISOString().split('T')[0],
      expiryDate: '',
      institution: '',
      notes: '',
    });
    setEditingVaccine(null);
    setShowVaccineForm(false);
  }

  function handleEditVaccine(vaccine: VaccineRecord) {
    setEditingVaccine(vaccine);
    setVaccineForm({
      vaccineName: vaccine.vaccineName,
      vaccinationDate: vaccine.vaccinationDate.split('T')[0],
      expiryDate: vaccine.expiryDate ? vaccine.expiryDate.split('T')[0] : '',
      institution: vaccine.institution || '',
      notes: vaccine.notes || '',
    });
    setShowVaccineForm(true);
  }

  async function handleSubmitVaccine(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;

    try {
      if (editingVaccine) {
        await petApi.updateVaccine(id, editingVaccine.id, vaccineForm);
      } else {
        await petApi.createVaccine(id, vaccineForm);
      }
      resetVaccineForm();
      loadVaccines();
    } catch (error) {
      console.error('保存疫苗接种记录失败:', error);
      alert('保存失败，请重试');
    }
  }

  async function handleDeleteVaccine(vaccineId: string) {
    if (!id) return;
    if (!confirm('确定要删除这条疫苗接种记录吗？')) return;

    try {
      await petApi.removeVaccine(id, vaccineId);
      loadVaccines();
    } catch (error) {
      console.error('删除疫苗接种记录失败:', error);
      alert('删除失败，请重试');
    }
  }

  function resetForm() {
    setFormData({
      fromOwnerName: '',
      fromOwnerContact: '',
      toOwnerName: '',
      toOwnerContact: '',
      transferDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setEditingTransfer(null);
    setShowAddForm(false);
  }

  function handleEditTransfer(transfer: PetTransfer) {
    setEditingTransfer(transfer);
    setFormData({
      fromOwnerName: transfer.fromOwnerName,
      fromOwnerContact: transfer.fromOwnerContact || '',
      toOwnerName: transfer.toOwnerName,
      toOwnerContact: transfer.toOwnerContact || '',
      transferDate: transfer.transferDate.split('T')[0],
      notes: transfer.notes || '',
    });
    setShowAddForm(true);
  }

  async function handleSubmitTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;

    try {
      if (editingTransfer) {
        await petApi.updateTransfer(id, editingTransfer.id, formData);
      } else {
        await petApi.createTransfer(id, formData);
      }
      resetForm();
      loadTransfers();
    } catch (error) {
      console.error('保存流转记录失败:', error);
      alert('保存失败，请重试');
    }
  }

  async function handleDeleteTransfer(transferId: string) {
    if (!id) return;
    if (!confirm('确定要删除这条流转记录吗？')) return;

    try {
      await petApi.removeTransfer(id, transferId);
      loadTransfers();
    } catch (error) {
      console.error('删除流转记录失败:', error);
      alert('删除失败，请重试');
    }
  }

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

  const getAppointmentStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '待确认';
      case 'confirmed':
        return '已确认';
      case 'testing':
        return '检测中';
      case 'completed':
        return '已完成';
      case 'cancelled':
        return '已取消';
      default:
        return status;
    }
  };

  const getAppointmentStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-700 bg-yellow-50';
      case 'confirmed':
        return 'text-blue-700 bg-blue-50';
      case 'testing':
        return 'text-purple-700 bg-purple-50';
      case 'completed':
        return 'text-green-700 bg-green-50';
      case 'cancelled':
        return 'text-gray-700 bg-gray-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const formatTestItems = (items: string[] | string) => {
    if (Array.isArray(items)) return items;
    try {
      return JSON.parse(items);
    } catch {
      return [items];
    }
  };

  const getVaccineExpiryStatus = (expiryDate: string | null): { status: 'expired' | 'urgent' | 'warning' | 'normal' | 'none'; daysLeft: number | null } => {
    if (!expiryDate) return { status: 'none', daysLeft: null };
    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return { status: 'expired', daysLeft };
    if (daysLeft <= 7) return { status: 'urgent', daysLeft };
    if (daysLeft <= 30) return { status: 'warning', daysLeft };
    return { status: 'normal', daysLeft };
  };

  const getVaccineRowClass = (status: string) => {
    switch (status) {
      case 'expired':
        return 'bg-red-50 hover:bg-red-100';
      case 'urgent':
        return 'bg-orange-50 hover:bg-orange-100';
      case 'warning':
        return 'bg-yellow-50 hover:bg-yellow-100';
      default:
        return 'hover:bg-gray-50';
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
                { key: 'weight', label: '体重追踪', icon: Scale },
                { key: 'relations', label: '亲属关系', icon: Network },
                { key: 'genes', label: '基因标记', icon: Dna },
                { key: 'reports', label: '基因报告', icon: FileText },
                { key: 'appointments', label: '检测预约', icon: FlaskConical },
                { key: 'transfers', label: '流转记录', icon: Repeat },
                { key: 'vaccines', label: '疫苗接种', icon: Syringe },
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

              {activeTab === 'appointments' && (
                <div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <h3 className="text-sm font-medium text-gray-900">基因检测预约记录</h3>
                    <button
                      onClick={() => {
                        resetAppointmentForm();
                        setShowAppointmentForm(true);
                      }}
                      className="flex items-center gap-1 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      发起预约
                    </button>
                  </div>

                  {showAppointmentForm && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium text-gray-900">
                          {editingAppointment ? '编辑检测预约' : '发起基因检测预约'}
                        </h4>
                        <button
                          onClick={resetAppointmentForm}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <form onSubmit={handleSubmitAppointment} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            检测机构 <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              required
                              value={appointmentForm.institution}
                              onChange={(e) => setAppointmentForm({ ...appointmentForm, institution: e.target.value })}
                              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              placeholder="请输入检测机构名称"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            预计检测日期 <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="date"
                              required
                              value={appointmentForm.expectedDate}
                              onChange={(e) => setAppointmentForm({ ...appointmentForm, expectedDate: e.target.value })}
                              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            检测项目 <span className="text-red-500">*</span>
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {DEFAULT_TEST_ITEMS.map((item) => (
                              <label
                                key={item}
                                className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                                  appointmentForm.testItems.includes(item)
                                    ? 'border-primary-300 bg-primary-50'
                                    : 'border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={appointmentForm.testItems.includes(item)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setAppointmentForm({
                                        ...appointmentForm,
                                        testItems: [...appointmentForm.testItems, item],
                                      });
                                    } else {
                                      setAppointmentForm({
                                        ...appointmentForm,
                                        testItems: appointmentForm.testItems.filter((i) => i !== item),
                                      });
                                    }
                                  }}
                                  className="rounded text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-sm text-gray-700">{item}</span>
                              </label>
                            ))}
                          </div>
                          {appointmentForm.testItems.length === 0 && (
                            <p className="text-xs text-red-500 mt-1">请至少选择一个检测项目</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            备注
                          </label>
                          <textarea
                            rows={2}
                            value={appointmentForm.notes}
                            onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                            placeholder="预约注意事项、联系方式等..."
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={resetAppointmentForm}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                          >
                            取消
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                          >
                            {editingAppointment ? '保存修改' : '提交预约'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {appointmentsLoading ? (
                    <div className="text-center py-8 text-gray-500">加载中...</div>
                  ) : appointments.length === 0 ? (
                    <div className="text-center py-8">
                      <FlaskConical className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">暂无检测预约记录</p>
                      <p className="text-sm text-gray-400 mt-1">点击上方按钮发起基因检测预约</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {appointments.map((apt) => {
                        const items = formatTestItems(apt.testItems);
                        const canComplete = apt.status !== 'completed' && apt.status !== 'cancelled';
                        return (
                          <div
                            key={apt.id}
                            className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                                  <FlaskConical className="w-5 h-5 text-primary-600" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-gray-900">{apt.institution}</p>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${getAppointmentStatusColor(
                                        apt.status
                                      )}`}
                                    >
                                      {getAppointmentStatusLabel(apt.status)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    预计日期：{new Date(apt.expectedDate).toLocaleDateString('zh-CN')}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                {apt.status === 'pending' && (
                                  <button
                                    onClick={() => handleUpdateAppointmentStatus(apt.id, 'confirmed')}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="确认预约"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                )}
                                {apt.status === 'confirmed' && (
                                  <button
                                    onClick={() => handleUpdateAppointmentStatus(apt.id, 'testing')}
                                    className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                    title="开始检测"
                                  >
                                    <Clock className="w-4 h-4" />
                                  </button>
                                )}
                                {canComplete && (
                                  <button
                                    onClick={() => handleUpdateAppointmentStatus(apt.id, 'completed')}
                                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                    title="标记完成"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                )}
                                {apt.status !== 'completed' && apt.status !== 'cancelled' && (
                                  <button
                                    onClick={() => handleUpdateAppointmentStatus(apt.id, 'cancelled')}
                                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                    title="取消预约"
                                  >
                                    <AlertCircle className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleEditAppointment(apt)}
                                  className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                  title="编辑"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteAppointment(apt.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="删除"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {items.map((item: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                            {apt.notes && (
                              <p className="text-xs text-gray-500 bg-gray-50 rounded p-2">
                                备注：{apt.notes}
                              </p>
                            )}
                            {apt.completedAt && (
                              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" />
                                完成时间：{new Date(apt.completedAt).toLocaleString('zh-CN')}
                              </p>
                            )}
                            {apt.geneReports && apt.geneReports.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <p className="text-xs text-gray-500 mb-1">关联报告：</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {apt.geneReports.map((report) => (
                                    <span
                                      key={report.id}
                                      className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded text-xs flex items-center gap-1"
                                    >
                                      <FileText className="w-3 h-3" />
                                      {report.fileName}
                                    </span>
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

              {activeTab === 'transfers' && (
                <div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <h3 className="text-sm font-medium text-gray-900">宠物流转记录</h3>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="按饲主姓名筛选..."
                          value={ownerFilter}
                          onChange={(e) => setOwnerFilter(e.target.value)}
                          className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        {ownerFilter && (
                          <button
                            onClick={() => setOwnerFilter('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          resetForm();
                          setShowAddForm(true);
                        }}
                        className="flex items-center gap-1 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium whitespace-nowrap"
                      >
                        <Plus className="w-4 h-4" />
                        添加记录
                      </button>
                    </div>
                  </div>

                  {showAddForm && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium text-gray-900">
                          {editingTransfer ? '编辑流转记录' : '添加流转记录'}
                        </h4>
                        <button
                          onClick={resetForm}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <form onSubmit={handleSubmitTransfer} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              原饲主姓名 <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={formData.fromOwnerName}
                              onChange={(e) => setFormData({ ...formData, fromOwnerName: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              placeholder="请输入原饲主姓名"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              原饲主联系方式
                            </label>
                            <input
                              type="text"
                              value={formData.fromOwnerContact}
                              onChange={(e) => setFormData({ ...formData, fromOwnerContact: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              placeholder="电话/微信等"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              新饲主姓名 <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={formData.toOwnerName}
                              onChange={(e) => setFormData({ ...formData, toOwnerName: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              placeholder="请输入新饲主姓名"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              新饲主联系方式
                            </label>
                            <input
                              type="text"
                              value={formData.toOwnerContact}
                              onChange={(e) => setFormData({ ...formData, toOwnerContact: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              placeholder="电话/微信等"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            转让日期 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            value={formData.transferDate}
                            onChange={(e) => setFormData({ ...formData, transferDate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            备注
                          </label>
                          <textarea
                            rows={3}
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                            placeholder="转让原因、条件等备注信息..."
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={resetForm}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                          >
                            取消
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                          >
                            {editingTransfer ? '保存修改' : '添加记录'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {transfersLoading ? (
                    <div className="text-center py-8 text-gray-500">加载中...</div>
                  ) : transfers.length === 0 ? (
                    <div className="text-center py-8">
                      <Repeat className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">
                        {ownerFilter ? '未找到匹配的流转记录' : '暂无流转记录'}
                      </p>
                      {ownerFilter && (
                        <button
                          onClick={() => setOwnerFilter('')}
                          className="mt-2 text-sm text-primary-600 hover:underline"
                        >
                          清除筛选条件
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                      <div className="space-y-6">
                        {transfers.map((transfer, index) => (
                          <div key={transfer.id} className="relative pl-12">
                            <div className="absolute left-2 w-5 h-5 bg-primary-500 rounded-full border-4 border-white shadow flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                            </div>
                            {index < transfers.length - 1 && (
                              <div className="absolute left-4 top-6 w-0.5 h-full bg-gray-200"></div>
                            )}
                            <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                                    <Calendar className="w-4 h-4" />
                                    {new Date(transfer.transferDate).toLocaleDateString('zh-CN')}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                                      {transfer.fromOwnerName}
                                    </span>
                                    <Repeat className="w-4 h-4 text-primary-500" />
                                    <span className="px-2 py-1 bg-primary-50 text-primary-700 rounded text-sm font-medium">
                                      {transfer.toOwnerName}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleEditTransfer(transfer)}
                                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                    title="编辑"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTransfer(transfer.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="删除"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                                {transfer.fromOwnerContact && (
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    <span>原饲主: {transfer.fromOwnerContact}</span>
                                  </div>
                                )}
                                {transfer.toOwnerContact && (
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    <span>新饲主: {transfer.toOwnerContact}</span>
                                  </div>
                                )}
                              </div>
                              {transfer.notes && (
                                <div className="pt-3 border-t border-gray-100">
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium text-gray-700">备注：</span>
                                    {transfer.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'vaccines' && (
                <div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">疫苗接种记录</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        <span className="inline-flex items-center gap-1 mr-3"><span className="w-3 h-3 bg-red-100 border border-red-300 rounded"></span>已过期</span>
                        <span className="inline-flex items-center gap-1 mr-3"><span className="w-3 h-3 bg-orange-100 border border-orange-300 rounded"></span>7天内到期</span>
                        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></span>30天内到期</span>
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        resetVaccineForm();
                        setShowVaccineForm(true);
                      }}
                      className="flex items-center gap-1 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      添加记录
                    </button>
                  </div>

                  {showVaccineForm && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium text-gray-900">
                          {editingVaccine ? '编辑疫苗接种记录' : '添加疫苗接种记录'}
                        </h4>
                        <button
                          onClick={resetVaccineForm}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <form onSubmit={handleSubmitVaccine} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              疫苗名称 <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <Syringe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                type="text"
                                required
                                value={vaccineForm.vaccineName}
                                onChange={(e) => setVaccineForm({ ...vaccineForm, vaccineName: e.target.value })}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                placeholder="如：狂犬疫苗、六联疫苗等"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              接种机构
                            </label>
                            <div className="relative">
                              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                type="text"
                                value={vaccineForm.institution}
                                onChange={(e) => setVaccineForm({ ...vaccineForm, institution: e.target.value })}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                placeholder="如：XX宠物医院"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              接种日期 <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                type="date"
                                required
                                value={vaccineForm.vaccinationDate}
                                onChange={(e) => setVaccineForm({ ...vaccineForm, vaccinationDate: e.target.value })}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              有效期至
                            </label>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                type="date"
                                value={vaccineForm.expiryDate}
                                onChange={(e) => setVaccineForm({ ...vaccineForm, expiryDate: e.target.value })}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            备注
                          </label>
                          <textarea
                            rows={2}
                            value={vaccineForm.notes}
                            onChange={(e) => setVaccineForm({ ...vaccineForm, notes: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                            placeholder="接种反应、疫苗批号等..."
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={resetVaccineForm}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                          >
                            取消
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                          >
                            {editingVaccine ? '保存修改' : '添加记录'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {vaccinesLoading ? (
                    <div className="text-center py-8 text-gray-500">加载中...</div>
                  ) : vaccines.length === 0 ? (
                    <div className="text-center py-8">
                      <Syringe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">暂无疫苗接种记录</p>
                      <p className="text-sm text-gray-400 mt-1">点击上方按钮添加第一条记录</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-3 font-medium text-gray-600">疫苗名称</th>
                            <th className="text-left py-3 px-3 font-medium text-gray-600">接种日期</th>
                            <th className="text-left py-3 px-3 font-medium text-gray-600">有效期至</th>
                            <th className="text-left py-3 px-3 font-medium text-gray-600">接种机构</th>
                            <th className="text-left py-3 px-3 font-medium text-gray-600">状态</th>
                            <th className="text-right py-3 px-3 font-medium text-gray-600">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vaccines.map((vaccine) => {
                            const expiryInfo = getVaccineExpiryStatus(vaccine.expiryDate);
                            return (
                              <tr
                                key={vaccine.id}
                                className={`border-b border-gray-100 transition-colors ${getVaccineRowClass(expiryInfo.status)}`}
                              >
                                <td className="py-3 px-3">
                                  <div className="font-medium text-gray-900">{vaccine.vaccineName}</div>
                                  {vaccine.notes && (
                                    <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[180px]" title={vaccine.notes}>
                                      备注：{vaccine.notes}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-gray-700">
                                  {new Date(vaccine.vaccinationDate).toLocaleDateString('zh-CN')}
                                </td>
                                <td className="py-3 px-3 text-gray-700">
                                  {vaccine.expiryDate
                                    ? new Date(vaccine.expiryDate).toLocaleDateString('zh-CN')
                                    : <span className="text-gray-400">-</span>
                                  }
                                </td>
                                <td className="py-3 px-3 text-gray-700">
                                  {vaccine.institution || <span className="text-gray-400">-</span>}
                                </td>
                                <td className="py-3 px-3">
                                  {(() => {
                                    if (expiryInfo.status === 'none') {
                                      return <span className="text-gray-400 text-xs">长期有效</span>;
                                    }
                                    if (expiryInfo.status === 'expired') {
                                      return (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                                          <AlertCircle className="w-3 h-3" />
                                          已过期 {Math.abs(expiryInfo.daysLeft!)}天
                                        </span>
                                      );
                                    }
                                    if (expiryInfo.status === 'urgent') {
                                      return (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                                          <AlertCircle className="w-3 h-3" />
                                          剩余 {expiryInfo.daysLeft}天
                                        </span>
                                      );
                                    }
                                    if (expiryInfo.status === 'warning') {
                                      return (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                                          <Clock className="w-3 h-3" />
                                          剩余 {expiryInfo.daysLeft}天
                                        </span>
                                      );
                                    }
                                    return (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                                        <CheckCircle className="w-3 h-3" />
                                        有效
                                      </span>
                                    );
                                  })()}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex justify-end gap-1">
                                    <button
                                      onClick={() => handleEditVaccine(vaccine)}
                                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                      title="编辑"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteVaccine(vaccine.id)}
                                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                      title="删除"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'weight' && (
                <div className="space-y-6">
                  {weightStandard && (
                    <div className={`p-4 rounded-lg border ${weightStandardInfo.isEstimated ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900 flex items-center gap-2">
                            <Scale className="w-4 h-4" />
                            {pet?.breed || '该品种'}标准体重范围
                            {weightStandardInfo.isEstimated && (
                              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                                参考值
                              </span>
                            )}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {weightStandard.min} kg ~ {weightStandard.max} kg
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{weightStandardInfo.message}</p>
                        </div>
                        {pet?.weight && weightStandard && (
                          <div className="text-right">
                            <p className="text-xs text-gray-500">当前体重</p>
                            <p className={`font-semibold ${
                              pet.weight < weightStandard.min
                                ? 'text-blue-600'
                                : pet.weight > weightStandard.max
                                ? 'text-orange-600'
                                : 'text-green-600'
                            }`}>
                              {pet.weight} kg
                              {pet.weight < weightStandard.min && ' 偏轻'}
                              {pet.weight > weightStandard.max && ' 偏重'}
                              {pet.weight >= weightStandard.min && pet.weight <= weightStandard.max && ' 正常'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="text-sm font-medium text-gray-900">体重变化趋势</h3>
                    <button
                      onClick={() => {
                        resetWeightForm();
                        setShowWeightForm(true);
                      }}
                      className="flex items-center gap-1 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      录入体重
                    </button>
                  </div>

                  {showWeightForm && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium text-gray-900">
                          {editingWeight ? '编辑体重记录' : '录入体重记录'}
                        </h4>
                        <button
                          onClick={resetWeightForm}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <form onSubmit={handleSubmitWeight} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              体重 (kg) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                required
                                value={weightForm.weight}
                                onChange={(e) => setWeightForm({ ...weightForm, weight: e.target.value })}
                                className="w-full pl-9 pr-12 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                placeholder="请输入体重"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">kg</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              测量日期 <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                type="date"
                                required
                                value={weightForm.recordedAt}
                                onChange={(e) => setWeightForm({ ...weightForm, recordedAt: e.target.value })}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            备注
                          </label>
                          <textarea
                            rows={2}
                            value={weightForm.note}
                            onChange={(e) => setWeightForm({ ...weightForm, note: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                            placeholder="如：空腹测量、刚洗完澡等..."
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={resetWeightForm}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                          >
                            取消
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                          >
                            {editingWeight ? '保存修改' : '添加记录'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    {weightsLoading ? (
                      <div className="text-center py-12 text-gray-500">加载中...</div>
                    ) : weights.length === 0 ? (
                      <div className="text-center py-12">
                        <Scale className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">暂无体重记录</p>
                        <p className="text-sm text-gray-400 mt-1">点击上方按钮录入第一条体重记录</p>
                      </div>
                    ) : (
                      <>
                        <div className="h-72 mb-4">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={[...weights].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()).map((w) => ({
                                ...w,
                                dateLabel: new Date(w.recordedAt).toLocaleDateString('zh-CN'),
                              }))}
                              margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis
                                dataKey="dateLabel"
                                tick={{ fontSize: 11, fill: '#6b7280' }}
                                tickLine={false}
                              />
                              <YAxis
                                tick={{ fontSize: 11, fill: '#6b7280' }}
                                tickLine={false}
                                unit="kg"
                                domain={['dataMin - 1', 'dataMax + 1']}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#fff',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                }}
                                formatter={(value: any) => [`${value} kg`, '体重']}
                                labelFormatter={(label) => `日期: ${label}`}
                              />
                              <Legend wrapperStyle={{ fontSize: '12px' }} />
                              {weightStandard && weights.length > 0 && (
                                <>
                                  <ReferenceArea
                                    y1={weightStandard.min}
                                    y2={weightStandard.max}
                                    stroke="none"
                                    fill="#10b981"
                                    fillOpacity={0.1}
                                  />
                                  <Line
                                    type="monotone"
                                    dataKey={() => weightStandard.max}
                                    stroke="#10b981"
                                    strokeDasharray="5 5"
                                    strokeWidth={1.5}
                                    dot={false}
                                    name={`标准上限 (${weightStandard.max}kg)`}
                                    legendType="none"
                                  />
                                  <Line
                                    type="monotone"
                                    dataKey={() => weightStandard.min}
                                    stroke="#10b981"
                                    strokeDasharray="5 5"
                                    strokeWidth={1.5}
                                    dot={false}
                                    name={`标准下限 (${weightStandard.min}kg)`}
                                    legendType="none"
                                  />
                                </>
                              )}
                              <Line
                                type="monotone"
                                dataKey="weight"
                                stroke="#4f46e5"
                                strokeWidth={2.5}
                                dot={{ fill: '#4f46e5', strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6, fill: '#4f46e5' }}
                                name="体重"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>

                        {weightStandard && (
                          <div className="flex flex-wrap items-center gap-4 mb-4 px-2 text-xs text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <span className="w-4 h-0.5 bg-indigo-600 inline-block"></span>
                              <span>体重记录</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-4 h-0.5 border-t-2 border-dashed border-green-500 inline-block"></span>
                              <span>标准范围上下限</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-4 h-3 bg-green-500 bg-opacity-10 border border-green-200 rounded-sm inline-block"></span>
                              <span>标准体重区间</span>
                            </div>
                          </div>
                        )}

                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-3 font-medium text-gray-600">测量日期</th>
                                <th className="text-left py-3 px-3 font-medium text-gray-600">体重</th>
                                <th className="text-left py-3 px-3 font-medium text-gray-600">变化</th>
                                <th className="text-left py-3 px-3 font-medium text-gray-600">与标准范围</th>
                                <th className="text-left py-3 px-3 font-medium text-gray-600">备注</th>
                                <th className="text-right py-3 px-3 font-medium text-gray-600">操作</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...weights].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()).map((record, index, sortedArr) => {
                                const prevRecord = sortedArr[index + 1];
                                const delta = prevRecord ? +(record.weight - prevRecord.weight).toFixed(2) : null;
                                const deltaPercent = prevRecord && prevRecord.weight > 0
                                  ? +((delta! / prevRecord.weight) * 100).toFixed(1)
                                  : null;
                                const inRange = weightStandard
                                  ? record.weight >= weightStandard.min && record.weight <= weightStandard.max
                                  : null;
                                return (
                                  <tr
                                    key={record.id}
                                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                  >
                                    <td className="py-3 px-3 text-gray-700">
                                      {new Date(record.recordedAt).toLocaleDateString('zh-CN')}
                                    </td>
                                    <td className="py-3 px-3">
                                      <span className="font-medium text-gray-900">{record.weight}</span>
                                      <span className="text-gray-500 ml-1">kg</span>
                                    </td>
                                    <td className="py-3 px-3">
                                      {delta === null ? (
                                        <span className="text-gray-400 text-xs">-</span>
                                      ) : delta > 0 ? (
                                        <span className="inline-flex items-center gap-0.5 text-orange-600 text-xs font-medium">
                                          <TrendingUp className="w-3 h-3" />
                                          +{delta} kg (+{deltaPercent}%)
                                        </span>
                                      ) : delta < 0 ? (
                                        <span className="inline-flex items-center gap-0.5 text-blue-600 text-xs font-medium">
                                          <TrendingDown className="w-3 h-3" />
                                          {delta} kg ({deltaPercent}%)
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-0.5 text-gray-500 text-xs">
                                          <Minus className="w-3 h-3" />
                                          无变化
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3">
                                      {weightStandard ? (
                                        inRange ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-medium">
                                            <CheckCircle className="w-3 h-3" />
                                            正常范围
                                          </span>
                                        ) : record.weight < weightStandard.min ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                                            低于标准 {(weightStandard.min - record.weight).toFixed(2)}kg
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-xs font-medium">
                                            超出标准 {(record.weight - weightStandard.max).toFixed(2)}kg
                                          </span>
                                        )
                                      ) : (
                                        <span className="text-gray-400 text-xs">-</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3 text-gray-600 max-w-[180px]">
                                      {record.note ? (
                                        <span className="truncate block" title={record.note}>
                                          {record.note}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3">
                                      <div className="flex justify-end gap-1">
                                        <button
                                          onClick={() => handleEditWeight(record)}
                                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                          title="编辑"
                                        >
                                          <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteWeight(record.id)}
                                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                          title="删除"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
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
