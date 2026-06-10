import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Dna,
  CheckCircle,
  AlertCircle,
  Clock,
  Trash2,
  Download,
} from 'lucide-react';
import { geneReportApi, GeneReport } from '../services/api';

export default function GeneReportDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<(GeneReport & { pet?: any }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadReport();
  }, [id]);

  async function loadReport() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await geneReportApi.get(id);
      setReport(data);
    } catch (error) {
      console.error('加载报告详情失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!id || !confirm('确定删除这份报告？')) return;
    try {
      await geneReportApi.remove(id);
      navigate('/gene-reports');
    } catch (error) {
      alert('删除失败');
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>;
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">报告不存在</p>
        <Link to="/gene-reports" className="text-primary-600 hover:underline">
          返回报告列表
        </Link>
      </div>
    );
  }

  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    parsed: { label: '已解析', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-5 h-5 text-green-500" /> },
    failed: { label: '解析失败', color: 'bg-red-100 text-red-700', icon: <AlertCircle className="w-5 h-5 text-red-500" /> },
    pending: { label: '解析中', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-5 h-5 text-yellow-500 animate-spin" /> },
  };
  const status = statusConfig[report.status] || statusConfig.pending;

  const parsedData = report.parsedData as any;
  const markers = parsedData?.markers || [];

  const highRiskCount = markers.filter((m: any) => m.riskLevel === 'high').length;
  const carrierCount = markers.filter((m: any) => m.riskLevel === 'carrier').length;
  const mediumRiskCount = markers.filter((m: any) => m.riskLevel === 'medium').length;
  const lowRiskCount = markers.filter((m: any) => m.riskLevel === 'low').length;

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'carrier': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'high': return '高风险';
      case 'medium': return '中风险';
      case 'carrier': return '携带者';
      case 'low': return '低风险';
      default: return '未知';
    }
  };

  const getInheritanceLabel = (inheritance: string) => {
    switch (inheritance) {
      case 'autosomal_dominant': return '常染色体显性';
      case 'autosomal_recessive': return '常染色体隐性';
      case 'x_linked': return 'X连锁';
      default: return inheritance;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/gene-reports"
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">基因检测报告详情</h1>
          <p className="text-gray-600">{report.fileName}</p>
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
              <FileText className="w-5 h-5 text-primary-500" />
              报告信息
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">文件名</p>
                <p className="text-gray-900 font-medium">{report.fileName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">报告类型</p>
                <p className="text-gray-900 font-medium">
                  {report.reportType === 'pdf' ? 'PDF报告' : report.reportType === 'image' ? '图片报告' : '模拟报告'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">上传时间</p>
                <p className="text-gray-900 font-medium">
                  {new Date(report.uploadedAt).toLocaleString('zh-CN')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">解析状态</p>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                  {status.icon}
                  {status.label}
                </span>
              </div>
              {report.parsedAt && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">解析时间</p>
                  <p className="text-gray-900 font-medium">
                    {new Date(report.parsedAt).toLocaleString('zh-CN')}
                  </p>
                </div>
              )}
              {report.pet && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">关联宠物</p>
                  <Link
                    to={`/pets/${report.petId}`}
                    className="text-primary-600 hover:underline font-medium"
                  >
                    {report.pet.name}
                  </Link>
                </div>
              )}
            </div>
          </div>

          {markers.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Dna className="w-5 h-5 text-purple-500" />
                检测位点结果
              </h2>
              <div className="space-y-3">
                {markers.map((marker: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{marker.disease || marker.markerName}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getRiskColor(marker.riskLevel)}`}>
                          {getRiskLabel(marker.riskLevel)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {marker.markerName} · {marker.geneName}
                        {marker.inheritance && ` · ${getInheritanceLabel(marker.inheritance)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{marker.genotype}</p>
                      {marker.zygosity && (
                        <p className="text-xs text-gray-500">
                          {marker.zygosity === 'homozygous' ? '纯合' : marker.zygosity === 'heterozygous' ? '杂合' : marker.zygosity}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {markers.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">风险概览</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">总检测位点</span>
                  <span className="font-medium text-gray-900">{markers.length}</span>
                </div>
                {highRiskCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">高风险</span>
                    <span className="font-medium text-red-600">{highRiskCount}</span>
                  </div>
                )}
                {mediumRiskCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">中风险</span>
                    <span className="font-medium text-amber-600">{mediumRiskCount}</span>
                  </div>
                )}
                {carrierCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">携带者</span>
                    <span className="font-medium text-purple-600">{carrierCount}</span>
                  </div>
                )}
                {lowRiskCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">低风险</span>
                    <span className="font-medium text-green-600">{lowRiskCount}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-4 gap-1 h-4 rounded overflow-hidden">
                  {highRiskCount > 0 && (
                    <div className="bg-red-500" style={{ gridColumn: `span ${Math.max(1, Math.round((highRiskCount / markers.length) * 4))}` }}></div>
                  )}
                  {mediumRiskCount > 0 && (
                    <div className="bg-amber-500" style={{ gridColumn: `span ${Math.max(1, Math.round((mediumRiskCount / markers.length) * 4))}` }}></div>
                  )}
                  {carrierCount > 0 && (
                    <div className="bg-purple-500" style={{ gridColumn: `span ${Math.max(1, Math.round((carrierCount / markers.length) * 4))}` }}></div>
                  )}
                  {lowRiskCount > 0 && (
                    <div className="bg-green-500" style={{ gridColumn: `span ${Math.max(1, Math.round((lowRiskCount / markers.length) * 4))}` }}></div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">快速导航</h3>
            <div className="space-y-2">
              <Link
                to={`/pets/${report.petId}/timeline`}
                className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm"
              >
                <Dna className="w-4 h-4 text-amber-600" />
                <span>查看健康时间轴</span>
              </Link>
              <Link
                to={`/pets/${report.petId}`}
                className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm"
              >
                <FileText className="w-4 h-4 text-primary-600" />
                <span>查看宠物详情</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
