## 📦 Установка

### 1. Установите зависимости:

```bash
npm install bullmq ioredis xlsx
# или
bun add bullmq ioredis xlsx
```

### 2. Запустите Redis:

```bash
# Docker
docker run -d -p 6379:6379 redis:alpine

# или через docker-compose
docker-compose up -d redis
```

### 3. Добавьте в .env:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 4. Скопируйте файлы:

```bash
# Основные файлы
cp import-export-service.ts src/services/
cp import-worker.ts src/workers/
cp export-worker.ts src/workers/
cp import-export-routes.ts src/routes/
```

### 5. Зарегистрируйте роуты:

```typescript
// В вашем главном файле (app.ts или index.ts)
import { registerImportExportRoutes } from './routes/import-export-routes';

// После инициализации app
registerImportExportRoutes(app);
```

### 6. Запустите воркеры:

```bash
# В отдельных терминалах или через PM2
node dist/workers/import-worker.js
node dist/workers/export-worker.js

# или через PM2
pm2 start dist/workers/import-worker.js --name import-worker
pm2 start dist/workers/export-worker.js --name export-worker
```

---

## ⚡ Быстрый старт

### Импорт DIKIDI Excel файла:

```bash
curl -X POST http://localhost:3000/api/branches/1/imports/upload \
  -F "file=@journal.xlsx" \
  -F "organizationId=1" \
  -F "importType=dikidi" \
  -F "skipDuplicates=true"

# Ответ:
{
  "success": true,
  "data": {
    "jobId": "1",
    "message": "Import queued successfully",
    "estimatedTime": "1-5 minutes"
  }
}
```

### Проверка статуса:

```bash
curl http://localhost:3000/api/branches/1/imports/1/status

# Ответ:
{
  "success": true,
  "data": {
    "jobId": "1",
    "status": "processing",
    "progress": 45,
    "currentStep": "Processing assignments: 230/500",
    "totalRecords": 500,
    "processedRecords": 230,
    "createdRecords": 215,
    "errorRecords": 15
  }
}
```

### Экспорт данных:

```bash
curl -X POST http://localhost:3000/api/branches/1/exports/create \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": 1,
    "exportType": "assignments",
    "format": "xlsx",
    "dateFrom": "2025-01-01",
    "dateTo": "2025-12-31"
  }'

# Ответ:
{
  "success": true,
  "data": {
    "jobId": "2",
    "message": "Export queued successfully",
    "estimatedTime": "1-3 minutes"
  }
}
```

### Скачать экспортированный файл:

```bash
# Сначала проверьте статус
curl http://localhost:3000/api/branches/1/exports/2/status

# Когда status = "completed", скачайте
curl http://localhost:3000/api/branches/1/exports/2/download \
  -O export.xlsx
```

---

## 🌐 API Endpoints

### 📥 Импорт

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/branches/:branchId/imports/upload` | Загрузить файл для импорта |
| GET | `/api/branches/:branchId/imports/:jobId/status` | Статус задачи импорта |
| GET | `/api/branches/:branchId/imports/list` | Список всех импортов |
| DELETE | `/api/branches/:branchId/imports/:jobId` | Отменить задачу |
| GET | `/api/branches/:branchId/imports/stats` | Статистика импортов |

### 📤 Экспорт

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/branches/:branchId/exports/create` | Создать задачу экспорта |
| GET | `/api/branches/:branchId/exports/:jobId/status` | Статус задачи экспорта |
| GET | `/api/branches/:branchId/exports/:jobId/download` | Скачать файл |

---

## 💡 Примеры использования

### 1. Импорт с обработкой дубликатов

```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('organizationId', '1');
formData.append('branchId', '1');
formData.append('importType', 'dikidi');
formData.append('skipDuplicates', 'true'); // Пропустить дубликаты
formData.append('batchSize', '500'); // Батч по 500 записей

const response = await fetch('/api/branches/1/imports/upload', {
  method: 'POST',
  body: formData,
});

const { data } = await response.json();
console.log('Job ID:', data.jobId);
```

### 2. Мониторинг прогресса импорта

```typescript
async function monitorImport(jobId: string) {
  const interval = setInterval(async () => {
    const response = await fetch(`/api/branches/1/imports/${jobId}/status`);
    const { data } = await response.json();

    console.log(`Progress: ${data.progress}%`);
    console.log(`Step: ${data.currentStep}`);
    console.log(`Created: ${data.createdRecords}`);

    if (data.status === 'completed' || data.status === 'failed') {
      clearInterval(interval);
      console.log('Import finished:', data.status);
    }
  }, 2000); // Проверять каждые 2 секунды
}
```

### 3. Экспорт с фильтрами по дате

```typescript
const exportData = {
  organizationId: 1,
  exportType: 'assignments', // или 'clients', 'staff', 'full'
  format: 'xlsx', // или 'csv'
  dateFrom: '2025-01-01',
  dateTo: '2025-03-31',
};

const response = await fetch('/api/branches/1/exports/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(exportData),
});

const { data } = await response.json();
const jobId = data.jobId;

// Ждем завершения
await waitForExportCompletion(jobId);

// Скачиваем
window.location.href = `/api/branches/1/exports/${jobId}/download`;
```

### 4. Получение статистики

```typescript
const response = await fetch('/api/branches/1/imports/stats?organizationId=1');
const { data } = await response.json();

console.log('Total imports:', data.total);
console.log('Completed:', data.completed);
console.log('Failed:', data.failed);
console.log('Total records imported:', data.totalRecordsImported);
```

---

## 📊 Мониторинг

### Bull Board (веб-интерфейс для очередей)

Установите Bull Board для визуального мониторинга:

```bash
npm install @bull-board/express @bull-board/api
```

```typescript
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { importQueue, exportQueue } from './import-export-service';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullMQAdapter(importQueue),
    new BullMQAdapter(exportQueue),
  ],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

// Теперь откройте http://localhost:3000/admin/queues
```

### Логирование

```typescript
// Добавьте в ваш logger
import { importQueue, exportQueue } from './import-export-service';

importQueue.on('completed', (job) => {
  console.log(`✅ Import completed: ${job.id}`);
  // Отправьте уведомление пользователю
});

importQueue.on('failed', (job, err) => {
  console.error(`❌ Import failed: ${job?.id}`, err);
  // Отправьте уведомление администратору
});
```

---

##  Настройка производительности

### Увеличение производительности:

```typescript
// В import-worker.ts измените concurrency
const worker = new Worker('import-jobs', processorFunction, {
  connection,
  concurrency: 5, // Обрабатывать 5 импортов одновременно
});

// Увеличьте размер батча
const batchSize = options?.batchSize || 500; // Вместо 100
```

### Масштабирование:

```bash
# Запустите несколько воркеров
pm2 start dist/workers/import-worker.js -i 3 --name import-worker
pm2 start dist/workers/export-worker.js -i 2 --name export-worker
