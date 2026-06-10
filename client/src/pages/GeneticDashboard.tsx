import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import { AlertTriangle, Dna, Users, Activity, RefreshCw } from 'lucide-react';
import {
  dashboardApi,
  DashboardStats,
  BreedDistributionItem,
  MarkerCarrierRateItem,
  DiseaseFrequencyItem,
} from '../services/api';

const COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8',
  '#6d28d9', '#7c3aed', '#5b21b6', '#4c1d95', '#3b0764',
  '#4f46e5', '#4338ca', '#3730a3', '#e11d48', '#db2777',
];

const RISK_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
  very_high: '#991b1b',
  unknown: '#9ca3af',
};

const INHERITANCE_LABELS: Record<string, string> = {
  autosomal_dominant: '常染色体显性',
  autosomal_recessive: '常染色体隐性',
  x_linked: 'X连锁',
};

export default function GeneticDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [speciesFilter, setSpeciesFilter] = useState<string>('all');

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardApi.getStats();
      setStats(data);
    } catch (err: any) {
      setError(err?.error || err?.message || '获取统计数据失败');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>正在加载种群遗传多样性数据...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 font-medium">加载失败</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={fetchStats}
            className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const allSpecies = Array.from(
    new Set([
      ...stats.breedDistribution.map((b) => b.species),
      ...stats.markerCarrierRates.map((m) => m.species),
      ...stats.diseaseFrequencies.map((d) => d.species),
    ])
  );

  const filteredBreeds = speciesFilter === 'all'
    ? stats.breedDistribution
    : stats.breedDistribution.filter((b) => b.species === speciesFilter);

  const filteredMarkers = speciesFilter === 'all'
    ? stats.markerCarrierRates
    : stats.markerCarrierRates.filter((m) => m.species === speciesFilter);

  const filteredDiseases = speciesFilter === 'all'
    ? stats.diseaseFrequencies
    : stats.diseaseFrequencies.filter((d) => d.species === speciesFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">种群遗传多样性看板</h1>
          <p className="text-gray-500 mt-1">全面展示种群品种分布、遗传标记携带率、近交系数和遗传病检出频率</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={speciesFilter}
            onChange={(e) => setSpeciesFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">全部物种</option>
            {allSpecies.map((s) => (
              <option key={s} value={s}>
                {s === 'dog' ? '犬' : s === 'cat' ? '猫' : s}
              </option>
            ))}
          </select>
          <button
            onClick={fetchStats}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
        </div>
      </div>

      <SummaryCards stats={stats} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <BreedDistributionChart data={filteredBreeds} />
        <InbreedingDistributionChart data={stats.inbreedingDistribution} speciesFilter={speciesFilter} />
      </div>

      <MarkerCarrierRateChart data={filteredMarkers} />

      <DiseaseFrequencyChart data={filteredDiseases} />
    </div>
  );
}

function SummaryCards({ stats }: { stats: DashboardStats }) {
  const totalPets = stats.breedDistribution.reduce((sum, b) => sum + b.count, 0);
  const totalBreeds = stats.breedDistribution.filter((b) => b.breed !== '未知品种').length;
  const totalMarkers = stats.markerCarrierRates.length;
  const testedMarkerCount = stats.markerCarrierRates.filter((m) => m.testedCount > 0).length;
  const avgCarrierRate = testedMarkerCount > 0
    ? stats.markerCarrierRates
        .filter((m) => m.testedCount > 0)
        .reduce((sum, m) => sum + m.carrierRate, 0) / testedMarkerCount
    : 0;
  const avgInbreeding = stats.inbreedingDistribution.averageCoefficient;
  const highRiskInbreeding = stats.inbreedingDistribution.distribution.high +
    stats.inbreedingDistribution.distribution.very_high;
  const totalDiseases = stats.diseaseFrequencies.length;
  const detectedDiseases = stats.diseaseFrequencies.filter((d) => d.affectedCount > 0).length;

  const cards = [
    {
      title: '种群总数',
      value: totalPets,
      subtitle: `${totalBreeds} 个品种`,
      icon: Users,
      color: 'blue',
    },
    {
      title: '遗传标记',
      value: totalMarkers,
      subtitle: `${testedMarkerCount} 个已检测`,
      icon: Dna,
      color: 'purple',
    },
    {
      title: '平均携带率',
      value: (avgCarrierRate * 100).toFixed(1) + '%',
      subtitle: '遗传标记携带率',
      icon: Activity,
      color: 'amber',
    },
    {
      title: '平均近交系数',
      value: (avgInbreeding * 100).toFixed(2) + '%',
      subtitle: highRiskInbreeding > 0 ? `${highRiskInbreeding} 只高风险` : '种群健康',
      icon: AlertTriangle,
      color: highRiskInbreeding > 0 ? 'red' : 'green',
    },
  ];

  const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'bg-blue-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', iconBg: 'bg-purple-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', iconBg: 'bg-amber-100' },
    red: { bg: 'bg-red-50', text: 'text-red-600', iconBg: 'bg-red-100' },
    green: { bg: 'bg-green-50', text: 'text-green-600', iconBg: 'bg-green-100' },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const colors = colorMap[card.color];
        return (
          <div key={card.title} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                <p className="text-xs text-gray-400 mt-1">{card.subtitle}</p>
              </div>
              <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${colors.iconBg}`}>
                <Icon className={`w-5 h-5 ${colors.text}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BreedDistributionChart({ data }: { data: BreedDistributionItem[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">品种分布</h3>
        <p className="text-gray-400 text-center py-8">暂无品种数据</p>
      </div>
    );
  }

  const speciesGroups = new Map<string, BreedDistributionItem[]>();
  for (const item of data) {
    if (!speciesGroups.has(item.species)) {
      speciesGroups.set(item.species, []);
    }
    speciesGroups.get(item.species)!.push(item);
  }

  const pieDataBySpecies: Map<string, { name: string; value: number; color: string }[]> = new Map();
  let colorIdx = 0;
  for (const [species, breeds] of speciesGroups) {
    const pieData = breeds.map((b) => ({
      name: b.breed,
      value: b.count,
      color: COLORS[colorIdx++ % COLORS.length],
    }));
    pieDataBySpecies.set(species, pieData);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">品种分布</h3>
      <div className="space-y-6">
        {Array.from(pieDataBySpecies.entries()).map(([species, pieData]) => {
          const total = pieData.reduce((s, d) => s + d.value, 0);
          return (
            <div key={species}>
              <p className="text-sm font-medium text-gray-600 mb-2">
                {species === 'dog' ? '犬' : species === 'cat' ? '猫' : species}
                <span className="text-gray-400 ml-2">共 {total} 只</span>
              </p>
              <div className="flex items-start gap-4">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      labelLine={{ strokeWidth: 1 }}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: any) => [`${value} 只`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5 pt-2">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: d.color }}
                        />
                        <span className="text-gray-700">{d.name}</span>
                      </div>
                      <span className="font-medium text-gray-900">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InbreedingDistributionChart({
  data,
  speciesFilter,
}: {
  data: DashboardStats['inbreedingDistribution'];
  speciesFilter: string;
}) {
  const filteredDetails = speciesFilter === 'all'
    ? data.details
    : data.details.filter((d) => d.species === speciesFilter);

  const scatterData = filteredDetails.map((d) => ({
    petName: d.petName,
    coefficient: Math.round(d.inbreedingCoefficient * 10000) / 100,
    riskLevel: d.riskLevel,
    breed: d.breed || '未知',
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">近交系数分布</h3>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatBox label="有双亲信息" value={data.petsWithBothParents} suffix=" 只" />
        <StatBox label="平均近交系数" value={(data.averageCoefficient * 100).toFixed(2)} suffix="%" />
        <StatBox label="最大近交系数" value={(data.maxCoefficient * 100).toFixed(2)} suffix="%" />
        <StatBox label="高风险个体" value={data.distribution.high + data.distribution.very_high} suffix=" 只" />
      </div>

      <div className="mb-6">
        <p className="text-sm font-medium text-gray-600 mb-3">近交系数区间分布</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.buckets} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="range" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip formatter={(value: any) => [`${value} 只`, '数量']} />
            <Bar dataKey="count" name="数量" radius={[4, 4, 0, 0]}>
              {data.buckets.map((_, index) => (
                <Cell
                  key={`bar-${index}`}
                  fill={
                    index === 0
                      ? '#22c55e'
                      : index === 1
                      ? '#86efac'
                      : index === 2
                      ? '#f59e0b'
                      : index === 3
                      ? '#ef4444'
                      : '#991b1b'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {scatterData.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-600 mb-3">个体近交系数散点图</p>
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="petName"
                type="category"
                tick={{ fontSize: 10 }}
                angle={-30}
                textAnchor="end"
                height={50}
              />
              <YAxis
                dataKey="coefficient"
                type="number"
                name="近交系数"
                unit="%"
                tick={{ fontSize: 12 }}
              />
              <ZAxis range={[60, 200]} />
              <Tooltip
                formatter={(value: any, name: any) => [`${value}%`, '近交系数']}
                labelFormatter={(label) => `个体: ${label}`}
              />
              <Scatter data={scatterData} fill="#6366f1">
                {scatterData.map((entry, index) => (
                  <Cell
                    key={`scatter-${index}`}
                    fill={RISK_COLORS[entry.riskLevel] || '#6366f1'}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-gray-500">
            {Object.entries(RISK_COLORS).map(([level, color]) => (
              <div key={level} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span>
                  {level === 'low'
                    ? '低风险'
                    : level === 'medium'
                    ? '中等'
                    : level === 'high'
                    ? '高风险'
                    : level === 'very_high'
                    ? '极高风险'
                    : '未知'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.petsWithBothParents === 0 && (
        <p className="text-gray-400 text-center py-4">暂无具有双亲信息的个体数据</p>
      )}
    </div>
  );
}

function MarkerCarrierRateChart({ data }: { data: MarkerCarrierRateItem[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">遗传标记携带率统计</h3>
        <p className="text-gray-400 text-center py-8">暂无遗传标记数据</p>
      </div>
    );
  }

  const barData = data.map((m) => ({
    name: m.markerName,
    disease: m.disease,
    carrierRate: Math.round(m.carrierRate * 10000) / 100,
    affectedRate: Math.round(m.affectedRate * 10000) / 100,
    detectionRate: Math.round(m.detectionRate * 10000) / 100,
    testedCount: m.testedCount,
    totalInSpecies: m.totalInSpecies,
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">遗传标记携带率统计</h3>
      <p className="text-sm text-gray-500 mb-4">
        展示各遗传标记在种群中的携带率、患病率和检测覆盖率
      </p>

      <ResponsiveContainer width="100%" height={Math.max(300, barData.length * 35 + 60)}>
        <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" tick={{ fontSize: 12 }} unit="%" />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11 }}
            width={75}
          />
          <Tooltip
            formatter={(value: any, name: any) => {
              const labels: Record<string, string> = {
                carrierRate: '携带率',
                affectedRate: '患病率',
                detectionRate: '检测覆盖率',
              };
              return [`${value}%`, labels[name] || name];
            }}
            labelFormatter={(label) => {
              const item = barData.find((d) => d.name === label);
              return item ? `${label} (${item.disease})` : label;
            }}
          />
          <Legend
            formatter={(value) => {
              const labels: Record<string, string> = {
                carrierRate: '携带率',
                affectedRate: '患病率',
                detectionRate: '检测覆盖率',
              };
              return labels[value] || value;
            }}
          />
          <Bar dataKey="detectionRate" fill="#93c5fd" radius={[0, 2, 2, 0]} barSize={12} />
          <Bar dataKey="carrierRate" fill="#fbbf24" radius={[0, 2, 2, 0]} barSize={12} />
          <Bar dataKey="affectedRate" fill="#ef4444" radius={[0, 2, 2, 0]} barSize={12} />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-2 text-gray-600 font-medium">标记名称</th>
              <th className="text-left py-2 px-2 text-gray-600 font-medium">关联疾病</th>
              <th className="text-left py-2 px-2 text-gray-600 font-medium">遗传模式</th>
              <th className="text-right py-2 px-2 text-gray-600 font-medium">种群数</th>
              <th className="text-right py-2 px-2 text-gray-600 font-medium">已检测</th>
              <th className="text-right py-2 px-2 text-gray-600 font-medium">携带者</th>
              <th className="text-right py-2 px-2 text-gray-600 font-medium">患病</th>
              <th className="text-right py-2 px-2 text-gray-600 font-medium">携带率</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.markerId} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-2 font-medium text-gray-900">{m.markerName}</td>
                <td className="py-2 px-2 text-gray-700">{m.disease}</td>
                <td className="py-2 px-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                    {INHERITANCE_LABELS[m.inheritance] || m.inheritance}
                  </span>
                </td>
                <td className="py-2 px-2 text-right text-gray-600">{m.totalInSpecies}</td>
                <td className="py-2 px-2 text-right text-gray-600">{m.testedCount}</td>
                <td className="py-2 px-2 text-right text-amber-600 font-medium">{m.carrierCount}</td>
                <td className="py-2 px-2 text-right text-red-600 font-medium">{m.affectedCount}</td>
                <td className="py-2 px-2 text-right font-medium">
                  <span
                    className={
                      m.carrierRate > 0.3
                        ? 'text-red-600'
                        : m.carrierRate > 0.1
                        ? 'text-amber-600'
                        : 'text-green-600'
                    }
                  >
                    {(m.carrierRate * 100).toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DiseaseFrequencyChart({ data }: { data: DiseaseFrequencyItem[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">遗传病检出频率</h3>
        <p className="text-gray-400 text-center py-8">暂无遗传病检出数据</p>
      </div>
    );
  }

  const barData = data.map((d) => ({
    name: d.disease,
    species: d.species,
    detectionFrequency: Math.round(d.detectionFrequency * 10000) / 100,
    carrierFrequency: Math.round(d.carrierFrequency * 10000) / 100,
    affectedCount: d.affectedCount,
    carrierCount: d.carrierCount,
    testedCount: d.testedCount,
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">遗传病检出频率</h3>
      <p className="text-sm text-gray-500 mb-4">
        各遗传病在种群中的患病检出率与携带频率
      </p>

      <ResponsiveContainer width="100%" height={Math.max(300, barData.length * 35 + 60)}>
        <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" tick={{ fontSize: 12 }} unit="%" />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11 }}
            width={95}
          />
          <Tooltip
            formatter={(value: any, name: any) => {
              const labels: Record<string, string> = {
                detectionFrequency: '患病检出率',
                carrierFrequency: '携带频率',
              };
              return [`${value}%`, labels[name] || name];
            }}
          />
          <Legend
            formatter={(value) => {
              const labels: Record<string, string> = {
                detectionFrequency: '患病检出率',
                carrierFrequency: '携带频率',
              };
              return labels[value] || value;
            }}
          />
          <Bar dataKey="carrierFrequency" fill="#fbbf24" radius={[0, 2, 2, 0]} barSize={16} />
          <Bar dataKey="detectionFrequency" fill="#ef4444" radius={[0, 2, 2, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-2 text-gray-600 font-medium">疾病名称</th>
              <th className="text-left py-2 px-2 text-gray-600 font-medium">物种</th>
              <th className="text-left py-2 px-2 text-gray-600 font-medium">遗传模式</th>
              <th className="text-right py-2 px-2 text-gray-600 font-medium">已检测</th>
              <th className="text-right py-2 px-2 text-gray-600 font-medium">患病数</th>
              <th className="text-right py-2 px-2 text-gray-600 font-medium">携带数</th>
              <th className="text-right py-2 px-2 text-gray-600 font-medium">检出率</th>
              <th className="text-right py-2 px-2 text-gray-600 font-medium">携带率</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, idx) => (
              <tr key={`${d.disease}-${d.species}-${idx}`} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-2 font-medium text-gray-900">{d.disease}</td>
                <td className="py-2 px-2 text-gray-700">
                  {d.species === 'dog' ? '犬' : d.species === 'cat' ? '猫' : d.species}
                </td>
                <td className="py-2 px-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                    {INHERITANCE_LABELS[d.inheritance] || d.inheritance}
                  </span>
                </td>
                <td className="py-2 px-2 text-right text-gray-600">{d.testedCount}</td>
                <td className="py-2 px-2 text-right text-red-600 font-medium">{d.affectedCount}</td>
                <td className="py-2 px-2 text-right text-amber-600 font-medium">{d.carrierCount}</td>
                <td className="py-2 px-2 text-right">
                  <span className={d.detectionFrequency > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                    {(d.detectionFrequency * 100).toFixed(2)}%
                  </span>
                </td>
                <td className="py-2 px-2 text-right">
                  <span className={d.carrierFrequency > 0 ? 'text-amber-600 font-medium' : 'text-gray-400'}>
                    {(d.carrierFrequency * 100).toFixed(2)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatBox({ label, value, suffix }: { label: string; value: string | number; suffix?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-900 mt-0.5">
        {value}
        {suffix && <span className="text-sm font-normal text-gray-500">{suffix}</span>}
      </p>
    </div>
  );
}
