import { Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  PawPrint,
  Network,
  Dna,
  BarChart3,
  Settings,
  Home,
  Activity,
} from 'lucide-react';
import SearchBar from './components/SearchBar';
import AlertBanner from './components/AlertBanner';

import PetList from './pages/PetList';
import PetDetail from './pages/PetDetail';
import PetForm from './pages/PetForm';
import PedigreeTree from './pages/PedigreeTree';
import GeneReports from './pages/GeneReports';
import GeneReportDetail from './pages/GeneReportDetail';
import RiskPrediction from './pages/RiskPrediction';
import BreedingManage from './pages/BreedingManage';
import BreedingPairDetail from './pages/BreedingPairDetail';
import PetTimeline from './pages/PetTimeline';
import GeneticDashboard from './pages/GeneticDashboard';

const navItems = [
  { path: '/', label: '首页', icon: Home, exact: true },
  { path: '/pets', label: '宠物管理', icon: PawPrint },
  { path: '/pedigree', label: '谱系图', icon: Network },
  { path: '/gene-reports', label: '基因报告', icon: Dna },
  { path: '/genetic-dashboard', label: '遗传看板', icon: Activity },
  { path: '/risk-prediction', label: '风险预测', icon: BarChart3 },
  { path: '/breeding', label: '种畜管理', icon: Settings },
];

function App() {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center">
              <PawPrint className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">宠物基因平台</h1>
              <p className="text-xs text-gray-500">谱系与遗传病预测</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-900">基因检测提示</p>
            <p className="text-xs text-gray-600 mt-1">
              上传基因检测报告，自动解析位点数据，评估遗传风险。
            </p>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto flex flex-col">
        <AlertBanner />
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {getPageTitle(location.pathname)}
              </h2>
              <p className="text-sm text-gray-500">
                {getPageSubtitle(location.pathname)}
              </p>
            </div>
            <SearchBar />
          </div>
        </header>
        <div className="flex-1 p-8 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pets" element={<PetList />} />
            <Route path="/pets/new" element={<PetForm />} />
            <Route path="/pets/:id" element={<PetDetail />} />
            <Route path="/pets/:id/edit" element={<PetForm />} />
            <Route path="/pets/:id/timeline" element={<PetTimeline />} />
            <Route path="/pedigree" element={<PedigreeTree />} />
            <Route path="/pedigree/:petId" element={<PedigreeTree />} />
            <Route path="/gene-reports" element={<GeneReports />} />
            <Route path="/gene-reports/:id" element={<GeneReportDetail />} />
            <Route path="/risk-prediction" element={<RiskPrediction />} />
            <Route path="/genetic-dashboard" element={<GeneticDashboard />} />
            <Route path="/breeding" element={<BreedingManage />} />
            <Route path="/breeding/:id" element={<BreedingPairDetail />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">欢迎使用宠物基因谱系平台</h1>
        <p className="text-gray-600 mt-1">
          管理宠物信息，建立谱系关系，分析遗传风险
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="宠物总数" value="8" icon={PawPrint} color="blue" />
        <StatCard title="种畜数量" value="5" icon={Settings} color="green" />
        <StatCard title="遗传标记" value="14" icon={Dna} color="purple" />
        <StatCard title="基因报告" value="3" icon={BarChart3} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">快速入口</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link
              to="/pets/new"
              className="flex flex-col items-center p-4 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
            >
              <PawPrint className="w-8 h-8 text-primary-600 mb-2" />
              <span className="text-sm font-medium text-primary-700">添加宠物</span>
            </Link>
            <Link
              to="/pedigree"
              className="flex flex-col items-center p-4 bg-secondary-50 rounded-lg hover:bg-secondary-100 transition-colors"
            >
              <Network className="w-8 h-8 text-secondary-600 mb-2" />
              <span className="text-sm font-medium text-secondary-700">查看谱系</span>
            </Link>
            <Link
              to="/gene-reports"
              className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <Dna className="w-8 h-8 text-green-600 mb-2" />
              <span className="text-sm font-medium text-green-700">基因报告</span>
            </Link>
            <Link
              to="/risk-prediction"
              className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <BarChart3 className="w-8 h-8 text-orange-600 mb-2" />
              <span className="text-sm font-medium text-orange-700">风险预测</span>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">平台功能</h2>
          <div className="space-y-3">
            <FeatureItem
              title="可视化谱系树"
              description="交互式谱系图，支持拖拽编辑，直观展示亲属关系"
            />
            <FeatureItem
              title="基因报告解析"
              description="支持PDF和图片格式，自动识别遗传标记位点"
            />
            <FeatureItem
              title="遗传病风险预测"
              description="基于遗传标记数据库，计算个体和后代患病概率"
            />
            <FeatureItem
              title="近交系数计算"
              description="评估亲缘关系程度，指导科学繁育决策"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  icon: any;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2 flex-shrink-0"></div>
      <div>
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function getPageTitle(pathname: string): string {
  if (pathname === '/') return '首页';
  if (pathname.startsWith('/pets/new')) return '添加宠物';
  if (pathname.startsWith('/pets/') && pathname.includes('/edit')) return '编辑宠物';
  if (pathname.startsWith('/pets/') && pathname.includes('/timeline')) return '时间轴';
  if (pathname.startsWith('/pets/')) return '宠物详情';
  if (pathname === '/pets') return '宠物管理';
  if (pathname.startsWith('/pedigree')) return '谱系图';
  if (pathname.startsWith('/gene-reports/')) return '基因报告详情';
  if (pathname === '/gene-reports') return '基因报告';
  if (pathname === '/risk-prediction') return '风险预测';
  if (pathname === '/genetic-dashboard') return '遗传看板';
  if (pathname.startsWith('/breeding/')) return '繁殖配对详情';
  if (pathname === '/breeding') return '种畜管理';
  return '宠物基因平台';
}

function getPageSubtitle(pathname: string): string {
  if (pathname === '/') return '管理宠物信息，建立谱系关系，分析遗传风险';
  if (pathname.startsWith('/pets/new')) return '填写新宠物的基本信息';
  if (pathname.startsWith('/pets/') && pathname.includes('/edit')) return '修改宠物信息';
  if (pathname.startsWith('/pets/') && pathname.includes('/timeline')) return '查看宠物成长历程';
  if (pathname.startsWith('/pets/')) return '查看宠物详细信息和遗传数据';
  if (pathname === '/pets') return '管理所有宠物的基本信息';
  if (pathname.startsWith('/pedigree')) return '可视化展示宠物家族谱系关系';
  if (pathname.startsWith('/gene-reports/')) return '查看基因检测报告详细解析';
  if (pathname === '/gene-reports') return '上传和管理基因检测报告';
  if (pathname === '/risk-prediction') return '分析遗传病风险和预测后代风险';
  if (pathname === '/genetic-dashboard') return '种群遗传多样性数据看板';
  if (pathname.startsWith('/breeding/')) return '查看繁殖配对详细信息和风险评估';
  if (pathname === '/breeding') return '管理种畜信息和繁殖配对';
  return '宠物基因谱系平台';
}

export default App;
