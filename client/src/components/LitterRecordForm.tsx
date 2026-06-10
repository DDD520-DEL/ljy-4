import { useState, useRef } from 'react';
import { X, Plus, Save, PawPrint, Heart, Trash2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import {
  breedingApi,
  PuppyRecordInput,
  HealthComparison,
  BreedingPair,
} from '../services/api';

type PuppyWithTempId = PuppyRecordInput & { _tempId: string };

interface Props {
  pairId: string;
  pair: BreedingPair;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LitterRecordForm({ pairId, pair, onClose, onSuccess }: Props) {
  const idCounterRef = useRef(0);
  const generateTempId = () => `puppy_${Date.now()}_${++idCounterRef.current}`;

  const [birthDate, setBirthDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalCount, setTotalCount] = useState(0);
  const [aliveCount, setAliveCount] = useState(0);
  const [deadCount, setDeadCount] = useState(0);
  const [notes, setNotes] = useState('');
  const [puppies, setPuppies] = useState<PuppyWithTempId[]>([]);
  const [saving, setSaving] = useState(false);

  const [healthComparison, setHealthComparison] = useState<HealthComparison>({
    predictedRisks: [],
    actualHealthIssues: [],
    matchLevel: '',
    notes: '',
  });

  const riskAssessment = pair.riskAssessment as any;

  const syncCountsFromList = (list: PuppyWithTempId[]) => {
    const alive = list.filter((p) => p.status !== 'dead').length;
    const dead = list.filter((p) => p.status === 'dead').length;
    setAliveCount(alive);
    setDeadCount(dead);
    setTotalCount(list.length);
  };

  const addPuppy = () => {
    const newPuppy: PuppyWithTempId = {
      _tempId: generateTempId(),
      gender: 'male',
      status: 'alive',
      healthStatus: 'normal',
    };
    const newList = [...puppies, newPuppy];
    setPuppies(newList);
    syncCountsFromList(newList);
  };

  const updatePuppy = (tempId: string, field: keyof PuppyRecordInput, value: any) => {
    const updated = puppies.map((p) =>
      p._tempId === tempId ? { ...p, [field]: value } : p
    );
    setPuppies(updated);
    if (field === 'status') {
      syncCountsFromList(updated);
    }
  };

  const removePuppy = (tempId: string) => {
    const updated = puppies.filter((p) => p._tempId !== tempId);
    setPuppies(updated);
    syncCountsFromList(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!birthDate) {
      alert('请选择出生日期');
      return;
    }

    if (puppies.length === 0) {
      if (!confirm('尚未添加仔宠信息，是否继续提交？')) return;
    }

    setSaving(true);
    try {
      const puppiesForSubmit: PuppyRecordInput[] = puppies.map(
        ({ _tempId, ...rest }) => rest
      );
      await breedingApi.createLitter(pairId, {
        birthDate,
        totalCount: totalCount || puppies.length,
        aliveCount,
        deadCount,
        notes: notes || undefined,
        puppies: puppiesForSubmit,
        healthComparison:
          healthComparison.predictedRisks?.length ||
          healthComparison.actualHealthIssues?.length ||
          healthComparison.matchLevel ||
          healthComparison.notes
            ? healthComparison
            : undefined,
      });
      alert('产仔记录已保存，仔宠已自动注册并建立亲子关系');
      onSuccess();
    } catch (error: any) {
      alert(`保存失败: ${error.error || error.message || '未知错误'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">记录产仔</h2>
              <p className="text-sm text-gray-500">
                {pair.male?.name} × {pair.female?.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  出生日期 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  总产仔数
                </label>
                <input
                  type="number"
                  min="0"
                  value={totalCount}
                  onChange={(e) => setTotalCount(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  存活数
                </label>
                <input
                  type="number"
                  min="0"
                  value={aliveCount}
                  className="w-full px-4 py-2.5 border border-green-300 rounded-lg bg-green-50 text-green-700 font-medium"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  死亡数
                </label>
                <input
                  type="number"
                  min="0"
                  value={deadCount}
                  className="w-full px-4 py-2.5 border border-red-300 rounded-lg bg-red-50 text-red-700 font-medium"
                  readOnly
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                备注
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                placeholder="记录产仔过程中的特殊情况..."
              />
            </div>

            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <PawPrint className="w-5 h-5 text-primary-500" />
                    仔宠信息
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    每只仔宠将自动注册为新宠物并建立亲子关系
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addPuppy}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors font-medium"
                >
                  <Plus className="w-4 h-4" />
                  添加仔宠
                </button>
              </div>

              {puppies.length === 0 ? (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                  <PawPrint className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">还没有添加仔宠信息</p>
                  <p className="text-sm text-gray-400 mt-1">点击上方"添加仔宠"按钮开始录入</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {puppies.map((puppy, index) => (
                    <div
                      key={puppy._tempId}
                      className={`border rounded-xl p-4 ${
                        puppy.status === 'dead'
                          ? 'bg-red-50/50 border-red-200'
                          : 'bg-gray-50/50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-sm font-semibold text-gray-600 shadow-sm border">
                            {index + 1}
                          </span>
                          <span className="text-sm font-medium text-gray-700">
                            仔宠 {index + 1}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePuppy(puppy._tempId)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">名字</label>
                          <input
                            type="text"
                            value={puppy.name || ''}
                            onChange={(e) => updatePuppy(puppy._tempId, 'name', e.target.value)}
                            placeholder="可选"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">性别</label>
                          <select
                            value={puppy.gender}
                            onChange={(e) => updatePuppy(puppy._tempId, 'gender', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          >
                            <option value="male">♂ 雄</option>
                            <option value="female">♀ 雌</option>
                            <option value="unknown">未知</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">出生体重(kg)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={puppy.birthWeight || ''}
                            onChange={(e) =>
                              updatePuppy(
                                puppy._tempId,
                                'birthWeight',
                                e.target.value ? parseFloat(e.target.value) : undefined
                              )
                            }
                            placeholder="0.00"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">毛色</label>
                          <input
                            type="text"
                            value={puppy.color || ''}
                            onChange={(e) => updatePuppy(puppy._tempId, 'color', e.target.value)}
                            placeholder="可选"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">状态</label>
                          <select
                            value={puppy.status || 'alive'}
                            onChange={(e) => updatePuppy(puppy._tempId, 'status', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          >
                            <option value="alive">存活</option>
                            <option value="dead">死亡</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">健康状态</label>
                          <select
                            value={puppy.healthStatus || 'normal'}
                            onChange={(e) => updatePuppy(puppy._tempId, 'healthStatus', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          >
                            <option value="normal">正常</option>
                            <option value="weak">体弱</option>
                            <option value="sick">患病</option>
                            <option value="genetic_issue">遗传问题</option>
                          </select>
                        </div>
                      </div>
                      {(puppy.healthStatus !== 'normal' || puppy.status === 'dead') && (
                        <div className="mt-3">
                          <label className="block text-xs text-gray-500 mb-1">健康备注</label>
                          <input
                            type="text"
                            value={puppy.healthNotes || ''}
                            onChange={(e) => updatePuppy(puppy._tempId, 'healthNotes', e.target.value)}
                            placeholder="描述具体的健康问题..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                预测风险与实际健康结果对比
              </h3>

              {riskAssessment && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-700 font-medium mb-2">配种前预测风险：</p>
                  <div className="flex flex-wrap gap-2">
                    {riskAssessment.geneticRisk && (
                      <span className="text-xs px-2.5 py-1 bg-white rounded-full text-blue-700 border border-blue-200">
                        遗传风险: {riskAssessment.geneticRisk === 'high' ? '高' : riskAssessment.geneticRisk === 'medium' ? '中' : '低'}
                      </span>
                    )}
                    {riskAssessment.inbreedingRisk && (
                      <span className="text-xs px-2.5 py-1 bg-white rounded-full text-blue-700 border border-blue-200">
                        近交风险: {riskAssessment.inbreedingRisk === 'very_high' ? '极高' : riskAssessment.inbreedingRisk === 'high' ? '高' : riskAssessment.inbreedingRisk === 'medium' ? '中' : '低'}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    预测风险项（可多选）
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['遗传病风险高', '近交风险高', '体弱风险', '先天缺陷风险'].map((risk) => (
                      <label
                        key={risk}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-full text-sm cursor-pointer hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={healthComparison.predictedRisks?.includes(risk) || false}
                          onChange={(e) => {
                            const current = healthComparison.predictedRisks || [];
                            const updated = e.target.checked
                              ? [...current, risk]
                              : current.filter((r) => r !== risk);
                            setHealthComparison({ ...healthComparison, predictedRisks: updated });
                          }}
                          className="w-4 h-4 text-primary-600 rounded"
                        />
                        {risk}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    实际健康问题（可多选）
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['无异常', '遗传疾病', '先天缺陷', '体弱死亡', '其他健康问题'].map((issue) => (
                      <label
                        key={issue}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-full text-sm cursor-pointer hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={healthComparison.actualHealthIssues?.includes(issue) || false}
                          onChange={(e) => {
                            const current = healthComparison.actualHealthIssues || [];
                            const updated = e.target.checked
                              ? [...current, issue]
                              : current.filter((r) => r !== issue);
                            setHealthComparison({ ...healthComparison, actualHealthIssues: updated });
                          }}
                          className="w-4 h-4 text-primary-600 rounded"
                        />
                        {issue}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    预测符合程度
                  </label>
                  <select
                    value={healthComparison.matchLevel || ''}
                    onChange={(e) =>
                      setHealthComparison({ ...healthComparison, matchLevel: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">请选择</option>
                    <option value="exact">完全符合</option>
                    <option value="partial">部分符合</option>
                    <option value="none">不符合</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    对比备注
                  </label>
                  <textarea
                    value={healthComparison.notes || ''}
                    onChange={(e) =>
                      setHealthComparison({ ...healthComparison, notes: e.target.value })
                    }
                    rows={2}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                    placeholder="记录预测与实际结果的对比分析..."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? '保存中...' : '保存记录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
