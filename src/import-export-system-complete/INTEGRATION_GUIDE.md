```bash
npm install bullmq ioredis xlsx
# или
bun add bullmq ioredis xlsx
```

### 1.2 Установите dev-зависимости:

```bash
npm install -D concurrently copyfiles tsx @types/node
# или
bun add -d concurrently copyfiles tsx @types/node
```

---

## Шаг 2: Настройка Redis

### 2.1 Запустите Redis через Docker:

```bash
docker run -d \
  --name import-export-redis \
  -p 6379:6379 \
  -v redis-data:/data \
  redis:7-alpine redis-server --appendonly yes
```

### 2.2 Проверьте подключение:

```bash
docker exec -it import-export-redis redis-cli ping
# Должно вернуть: PONG
```

### 2.3 Добавьте в .env:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Database (если еще не настроен)
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

---

## Шаг 3: Копирование файлов

### 3.1 Создайте структуру папок:

```bash
mkdir -p src/services
mkdir -p src/workers
mkdir -p src/routes
mkdir -p logs
mkdir -p tmp/imports
mkdir -p tmp/exports
```

### 3.2 Скопируйте файлы:

```bash
# Основной сервис
cp import-export-service.ts src/services/

# Воркеры
cp import-worker.ts src/workers/
cp export-worker.ts src/workers/

# Роуты
cp import-export-routes.ts src/routes/

# Конфигурация
cp ecosystem.config.js ./
cp docker-compose.workers.yml ./
```

### 3.3 Обновите импорты в файлах:

В `import-worker.ts` и `export-worker.ts` обновите пути:

```typescript
// Было:
import { sequelize } from '../dbConfig/dbConfig';
import Assignment from '../modules/assignments/models/Assignment';

// Стало (под вашу структуру):
import { sequelize } from '@/dbConfig/dbConfig';
import Assignment from '@/modules/assignments/models/Assignment';
```

---

## Шаг 4: Обновление типов

### 4.1 Создайте файл types для импорта/экспорта:

```typescript
// src/types/import-export.ts

export interface ImportJobData {
  jobId: string;
  filePath: string;
  branchId: number;
  organizationId: number;
  importType: 'dikidi' | 'zapisikz' | 'altegio';
  options?: {
    skipDuplicates?: boolean;
    updateExisting?: boolean;
    batchSize?: number;
  };
}

export interface ExportJobData {
  jobId: string;
  branchId: number;
  organizationId: number;
  dateFrom?: Date;
  dateTo?: Date;
  exportType: 'assignments' | 'clients' | 'staff' | 'full';
  format: 'xlsx' | 'csv' | 'json';
}

export interface JobProgress {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  totalRecords?: number;
  processedRecords?: number;
  createdRecords?: number;
  updatedRecords?: number;
  errorRecords?: number;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
}
```

---

## Шаг 5: Регистрация роутов

### 5.1 В вашем главном файле (app.ts или index.ts):

```typescript
import express from 'express';
import { registerImportExportRoutes } from './routes/import-export-routes';

const app = express();

// ... другие middleware ...

// Регистрация роутов импорта/экспорта
registerImportExportRoutes(app);

// ... остальной код ...

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### 5.2 Добавьте CORS если нужно:

```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
```

---

## Шаг 6: Запуск воркеров

### Вариант A: Локальная разработка (рекомендуется для начала)

```bash
# Терминал 1: Запустите import worker
npm run worker:import:dev

# Терминал 2: Запустите export worker
npm run worker:export:dev

# Или вместе:
npm run workers:dev
```

### Вариант B: Production через PM2

```bash
# Установите PM2 глобально
npm install -g pm2

# Соберите проект
npm run build

# Запустите воркеры через PM2
pm2 start ecosystem.config.js

# Проверьте статус
pm2 status

# Смотрите логи
pm2 logs

# Остановить
pm2 stop all
```

### Вариант C: Docker (для production)

```bash
# Запустите все через Docker Compose
docker-compose -f docker-compose.workers.yml up -d

# Проверьте статус
docker-compose -f docker-compose.workers.yml ps

# Смотрите логи
docker-compose -f docker-compose.workers.yml logs -f

# Остановить
docker-compose -f docker-compose.workers.yml down
```

---

## Шаг 7: Тестирование

### 7.1 Проверьте доступность API:

```bash
# Health check
curl http://localhost:3000/api/branches/1/imports/stats?organizationId=1
```

### 7.2 Тестовый импорт:

```bash
# Создайте тестовый Excel файл или используйте существующий
curl -X POST http://localhost:3000/api/branches/1/imports/upload \
  -F "file=@test-import.xlsx" \
  -F "organizationId=1" \
  -F "importType=dikidi" \
  -F "skipDuplicates=true"

# Ответ должен содержать jobId
# {
#   "success": true,
#   "data": {
#     "jobId": "1",
#     "message": "Import queued successfully"
#   }
# }
```

### 7.3 Проверьте статус:

```bash
# Замените 1 на ваш jobId
curl http://localhost:3000/api/branches/1/imports/1/status
```

### 7.4 Тестовый экспорт:

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
```

### 7.5 Скачайте экспорт:

```bash
# После того как статус станет "completed"
curl http://localhost:3000/api/branches/1/exports/EXPORT_JOB_ID/download \
  -O export.xlsx
```

---

## Шаг 8: Мониторинг (опционально)

### 8.1 Установите Bull Board:

```bash
npm install @bull-board/api @bull-board/express
```

### 8.2 Добавьте в app.ts:

```typescript
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { importQueue, exportQueue } from './services/import-export-service';

// Bull Board UI
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

console.log('📊 Bull Board available at http://localhost:3000/admin/queues');
```

### 8.3 Откройте в браузере:

```
http://localhost:3000/admin/queues
```

---

## 🔍 Проверка работоспособности

### Checklist финальной проверки:

```bash
# 1. Redis работает
docker exec -it import-export-redis redis-cli ping
# Ожидается: PONG

# 2. Воркеры запущены
pm2 status
# Должно показать: import-worker (online), export-worker (online)

# 3. API отвечает
curl http://localhost:3000/api/branches/1/imports/stats?organizationId=1
# Ожидается: {"success": true, "data": {...}}

# 4. Можно загрузить файл
curl -X POST http://localhost:3000/api/branches/1/imports/upload \
  -F "file=@test.xlsx" \
  -F "organizationId=1" \
  -F "importType=dikidi"
# Ожидается: {"success": true, "data": {"jobId": "..."}}
```

---

## 🐛 Troubleshooting

### Проблема 1: "Cannot connect to Redis"

```bash
# Проверьте Redis
docker ps | grep redis

# Если не запущен, запустите
docker start import-export-redis

# Проверьте переменные окружения
echo $REDIS_HOST
echo $REDIS_PORT
```

### Проблема 2: "Worker not processing jobs"

```bash
# Проверьте логи воркера
pm2 logs import-worker

# Перезапустите воркер
pm2 restart import-worker

# Проверьте очередь в Bull Board
# http://localhost:3000/admin/queues
```

### Проблема 3: "File upload fails"

```bash
# Проверьте права на папки
ls -la tmp/imports
ls -la tmp/exports

# Создайте если не существуют
mkdir -p tmp/imports tmp/exports
chmod 755 tmp/imports tmp/exports
```

### Проблема 4: "Database connection error"

```bash
# Проверьте DATABASE_URL
echo $DATABASE_URL

# Проверьте подключение к БД
psql $DATABASE_URL -c "SELECT 1"
```

---

## 📊 Мониторинг в Production

### PM2 Commands:

```bash
# Статус всех процессов
pm2 status

# Мониторинг в реальном времени
pm2 monit

# Логи всех процессов
pm2 logs

# Логи конкретного процесса
pm2 logs import-worker

# Рестарт при ошибке
pm2 restart import-worker

# Информация о процессе
pm2 info import-worker

# Удалить процесс
pm2 delete import-worker
```

### Redis Commands:

```bash
# Подключиться к Redis CLI
docker exec -it import-export-redis redis-cli

# Проверить очереди
KEYS bull:*

# Количество задач в очереди
LLEN bull:import-jobs:wait

# Очистить очередь (ОСТОРОЖНО!)
FLUSHDB
```

---

## 📝 Package.json Scripts

Добавьте в ваш `package.json`:

```json
{
  "scripts": {
    "workers:dev": "concurrently \"tsx watch src/workers/import-worker.ts\" \"tsx watch src/workers/export-worker.ts\"",
    "workers:build": "tsc",
    "workers:start": "pm2 start ecosystem.config.js",
    "workers:stop": "pm2 stop ecosystem.config.js",
    "workers:logs": "pm2 logs",
    "redis:start": "docker start import-export-redis || docker run -d --name import-export-redis -p 6379:6379 redis:alpine",
    "redis:stop": "docker stop import-export-redis"
  }
}
```