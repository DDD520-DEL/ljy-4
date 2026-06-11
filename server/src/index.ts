import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import petsRouter from './routes/pets.js';
import relationsRouter from './routes/relations.js';
import geneReportsRouter from './routes/geneReports.js';
import geneticsRouter from './routes/genetics.js';
import breedingRouter from './routes/breeding.js';
import searchRouter from './routes/search.js';
import dashboardRouter from './routes/dashboard.js';
import alertsRouter from './routes/alerts.js';
import geneTestAppointmentsRouter from './routes/geneTestAppointments.js';
import breedsRouter from './routes/breeds.js';
import remindersRouter from './routes/reminders.js';
import healthReportsRouter from './routes/healthReports.js';
import { runFullAlertScan } from './utils/breedingAlerts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 9527;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '宠物基因谱系平台 API 运行正常' });
});

app.use('/api/pets', petsRouter);
app.use('/api/relations', relationsRouter);
app.use('/api/gene-reports', geneReportsRouter);
app.use('/api/genetics', geneticsRouter);
app.use('/api/breeding', breedingRouter);
app.use('/api/search', searchRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/gene-test-appointments', geneTestAppointmentsRouter);
app.use('/api/breeds', breedsRouter);
app.use('/api/reminders', remindersRouter);
app.use('/api/health-reports', healthReportsRouter);

app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误', message: err.message });
});

app.listen(PORT, async () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`📋 API 健康检查: http://localhost:${PORT}/api/health`);

  try {
    const scanResult = await runFullAlertScan();
    if (scanResult.total > 0) {
      console.log(
        `⚠️  启动警告扫描: 发现 ${scanResult.total} 个新警告 (近交: ${scanResult.inbreedingAlerts}, 遗传: ${scanResult.geneticAlerts})`
      );
    } else {
      console.log('✅ 启动警告扫描: 未发现新警告');
    }
  } catch (error) {
    console.error('启动警告扫描失败:', error);
  }
});

export default app;
