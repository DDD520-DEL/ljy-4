import { useState, useEffect, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Clock, Trash2, Dna, Plus } from 'lucide-react';
import { geneReportApi, petApi, GeneReport, Pet } from '../services/api';

export default function GeneReports() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<string>('');
  const [reports, setReports] = useState<GeneReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPets();
  }, []);

  useEffect(() => {
    if (selectedPet) {
      loadReports();
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

  async function loadReports() {
    if (!selectedPet) return;
    setLoading(true);
    try {
      const data = await geneReportApi.listByPet(selectedPet);
      setReports(data);
    } catch (error) {
      console.error('加载报告列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedPet) return;

    setUploading(true);
    try {
      await geneReportApi.upload(selectedPet, file);
      loadReports();
      alert('文件上传成功，正在解析...');
    } catch (error) {
      alert('上传失败');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleGenerateMock() {
    if (!selectedPet) return;

    if (!confirm('生成模拟基因报告用于演示？')) return;

    try {
      await geneReportApi.createMock(selectedPet);
      loadReports();
      alert('模拟报告已生成！');
    } catch (error) {
      alert('生成失败');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定要删除这份报告吗？')) return;

    try {
      await geneReportApi.remove(id);
      loadReports();
    } catch (error) {
      alert('删除失败');
    }
  }

  const currentPet = pets.find((p) => p.id === selectedPet);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'parsed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500 animate-spin" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'parsed':
        return '已解析';
      case 'failed':
        return '解析失败';
      default:
        return '解析中';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'parsed':
        return 'text-green-700 bg-green-50';
      case 'failed':
        return 'text-red-700 bg-red-50';
      default:
        return 'text-yellow-700 bg-yellow-50';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">基因报告管理</h1>
        <p className="text-gray-600 mt-1">
          上传和管理基因检测报告，自动解析遗传标记位点
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">选择宠物</h2>
            <select
              value={selectedPet}
              onChange={(e) => setSelectedPet(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {pets.map((pet) => (
              <option key={pet.id} value={pet.id}>
                {pet.name} ({pet.breed || pet.species}
              </option>
            ))}
            </select>

            {currentPet && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">
                    {currentPet.species === 'dog'
                      ? '🐕'
                      : currentPet.species === 'cat'
                      ? '🐱'
                      : '🐾'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{currentPet.name}</p>
                  <p className="text-xs text-gray-500">
                    {currentPet.breed || '未知品种'}
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">报告数量</span>
                  <span className="font-medium text-gray-900">{reports.length} 份</span>
                </div>
              </div>
            </div>
          )}

            <div className="mt-4 space-y-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!selectedPet || uploading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                {uploading ? '上传中...' : '上传报告'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                onClick={handleGenerateMock}
                disabled={!selectedPet}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                生成模拟报告
              </button>
            </div>
          </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mt-4">
              <h3 className="font-medium text-gray-900 mb-3">支持格式</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-red-500" />
                  PDF 文档
                </li>
                <li className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  图片格式 (JPG, PNG)
                </li>
              </ul>
            </div>
          </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">检测报告列表</h2>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="text-center py-12 text-gray-500">加载中...</div>
              ) : reports.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Dna className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">暂无基因检测报告</h3>
                  <p className="text-gray-500 mt-1">上传基因检测报告或生成模拟数据</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center">
                          <FileText className="w-6 h-6 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {report.fileName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {report.reportType === 'pdf'
                              ? 'PDF报告'
                              : report.reportType === 'image'
                              ? '图片报告'
                              : '模拟报告'}
                            {' · '}
                            上传于 {new Date(report.uploadedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            report.status
                          )}`}
                        >
                          {getStatusIcon(report.status)}
                          {getStatusText(report.status)}
                        </span>
                        <button
                          onClick={() => handleDelete(report.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
          </div>

          {reports.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mt-4">
              <h3 className="font-semibold text-gray-900 mb-4">解析说明</h3>
              <div className="text-sm text-gray-600 space-y-2">
                <p>
                  <strong>PDF解析：</strong>
                  系统自动识别PDF中的基因位点名称和基因型结果
                </p>
                <p>
                  <strong>图片识别：</strong>
                  支持常见基因检测机构的报告图片，使用OCR技术识别文字内容
                </p>
                <p>
                  <strong>标记匹配：</strong>
                  自动匹配内置遗传标记数据库，解读检测结果
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
