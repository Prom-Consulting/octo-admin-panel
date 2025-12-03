# 📥 Руководство по Импортерам

## 🎯 Поддерживаемые системы

Система поддерживает импорт из трех популярных CRM для салонов красоты:

1. **DIKIDI** - Популярная CRM для салонов
2. **ZAPISIKZ** - Казахстанская система онлайн-записи
3. **Altegio (YCLIENTS)** - Международная система управления

---

## 1️⃣ DIKIDI Импорт

### Формат файла:

```excel
| Дата       | Время  | Клиент    | Телефон       | Мастер        | Услуга   | Стоимость |
|------------|--------|-----------|---------------|---------------|----------|-----------|
| 06.11.2025 | 10:00  | Анна И.   | +996555123456 | Мастер Айгуль | Маникюр  | 800       |
| 06.11.2025 | 14:00  | Петр С.   | +996700999888 | Мастер Жанна  | Педикюр  | 1200      |
```

### Пример импорта:

```bash
curl -X POST http://localhost:3000/api/branches/1/imports/upload \
  -F "file=@dikidi_journal.xlsx" \
  -F "organizationId=1" \
  -F "importType=dikidi" \
  -F "skipDuplicates=true"
```

### Особенности:

- ✅ Формат даты: DD.MM.YYYY
- ✅ Время: HH:MM
- ✅ Телефон: любой формат (нормализуется)
- ✅ Автоматическое создание мастеров и клиентов
- ✅ Статус всех записей: "completed"

---

## 2️⃣ ZAPISIKZ Импорт

### Формат файла:

```excel
| Время                        | Мастер            | Клиент  | Телефон       | Статус    | Источник     |
|------------------------------|-------------------|---------|---------------|-----------|--------------|
| 30 Октября, 18:40 - 20:00    | Таннура М.        | Гулжан  | 996772248411  | Обслужен  | WEB          |
| 31 Октября, 10:00 - 11:30    | Айгуль К.         | Марина  | 996555123456  | Отменено  | Instagram    |
```

### Пример импорта:

```bash
curl -X POST http://localhost:3000/api/branches/1/imports/upload \
  -F "file=@zapisikz_export.xlsx" \
  -F "organizationId=1" \
  -F "importType=zapisikz" \
  -F "skipDuplicates=true"
```

### Особенности:

- ✅ Формат даты: "30 Октября, 18:40 - 20:00" (русский)
- ✅ Автоматический расчет длительности
- ✅ Поддержка статусов:
  - "Обслужен" → completed
  - "В ожидании" → scheduled
  - "Отменено" → canceled
- ✅ Извлечение источника:
  - WEB → website
  - Instagram → instagram
  - WhatsApp → whatsapp
  - Telegram → telegram

---

## 3️⃣ Altegio (YCLIENTS) Импорт

### Формат файла:

```excel
| Дата       | Время начала | Время окончания | Клиент      | Телефон       | Сотрудник    | Услуга  | Стоимость | Статус         | Способ оплаты |
|------------|--------------|-----------------|-------------|---------------|--------------|---------|-----------|----------------|---------------|
| 06.11.2025 | 10:00        | 11:30           | Иванов И.   | +7999123456   | Мария П.     | Стрижка | 1500      | Визит состоялся| Карта         |
| 06.11.2025 | 14:00        | 15:00           | Петрова А.  | +7988765432   | Елена С.     | Маникюр | 1200      | Не пришел      | -             |
```

### Пример импорта:

```bash
curl -X POST http://localhost:3000/api/branches/1/imports/upload \
  -F "file=@altegio_export.xlsx" \
  -F "organizationId=1" \
  -F "importType=altegio" \
  -F "skipDuplicates=true"
```

### Особенности:

- ✅ Формат даты: DD.MM.YYYY или YYYY-MM-DD
- ✅ Поддержка русских и английских названий колонок
- ✅ Автоматический расчет длительности
- ✅ Поддержка статусов:
  - "Визит состоялся" → completed
  - "Не пришел" → canceled
  - "Отменен" → canceled
  - "Подтвержден" → scheduled
- ✅ Способы оплаты:
  - "Наличные" → cash
  - "Карта" → card
  - "Перевод" → transfer
  - "Сертификат" → gift_certificate
- ✅ Статус оплаты: "Да"/"Нет" → paid/unpaid

---

## 🔄 Сравнение форматов

| Параметр | DIKIDI | ZAPISIKZ | Altegio |
|----------|--------|----------|---------|
| **Формат даты** | DD.MM.YYYY | Русский текст | DD.MM.YYYY |
| **Время** | HH:MM | Range (HH:MM - HH:MM) | Start + End |
| **Длительность** | Нет | Авто | Есть/Авто |
| **Статусы** | Нет | 3 статуса | 4 статуса |
| **Оплата** | Нет | Нет | Да |
| **Источник** | Нет | Да | Да |
| **Комментарии** | Нет | Нет | Да |

---

## 📊 Общий процесс импорта

Все три импортера следуют одинаковому процессу:

```
1. Парсинг файла (10%)
   ↓
2. Извлечение уникальных мастеров/клиентов (20%)
   ↓
3. Создание/поиск мастеров в БД (30%)
   ↓
4. Создание/поиск клиентов в БД (50%)
   ↓
5. Создание записей (assignments) (70-95%)
   ↓
6. Финализация (100%)
```

---

## 🎯 API Примеры

### Frontend (React):

```typescript
const uploadFile = async (file: File, importType: 'dikidi' | 'zapisikz' | 'altegio') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('organizationId', '1');
  formData.append('importType', importType);
  formData.append('skipDuplicates', 'true');

  const response = await fetch('/api/branches/1/imports/upload', {
    method: 'POST',
    body: formData,
  });

  const { data } = await response.json();
  return data.jobId;
};

// Использование
const jobId = await uploadFile(file, 'zapisikz');
```

### Backend (Node.js):

```typescript
import { ImportService } from './services/import-export-service';

// Создать задачу импорта
const jobId = await ImportService.createImportJob({
  jobId: `import_${Date.now()}`,
  filePath: './uploads/file.xlsx',
  branchId: 1,
  organizationId: 1,
  importType: 'altegio',
  options: {
    skipDuplicates: true,
    batchSize: 100,
  },
});

// Проверить статус
const progress = await ImportService.getJobProgress(jobId);
console.log(`Progress: ${progress.progress}%`);
console.log(`Created: ${progress.createdRecords} records`);
```

---

## ⚠️ Важные замечания

### Дубликаты:

Система проверяет дубликаты по комбинации:
- `branch_id`
- `assignment_date`
- `start_time`
- `employee_id`

Если `skipDuplicates=true`, существующие записи будут пропущены.

### Пропуск ошибок:

Если строка не может быть импортирована (например, неверный формат даты), она пропускается, а ошибка записывается в лог. Импорт продолжается.

### Память:

Все импортеры обрабатывают данные батчами по 100 записей (настраивается через `batchSize`), что позволяет импортировать большие файлы без переполнения памяти.

---

## 🔧 Подготовка файлов

### DIKIDI:

1. Откройте DIKIDI Journal
2. Экспортируйте журнал в Excel
3. Убедитесь, что есть колонки: Дата, Время, Клиент, Телефон, Мастер, Услуга

### ZAPISIKZ:

1. Откройте ZAPISIKZ
2. Экспортируйте записи
3. Убедитесь, что формат времени: "30 Октября, 18:40 - 20:00"

### Altegio:

1. Откройте Altegio/YCLIENTS
2. Перейдите в "Записи" → "Экспорт"
3. Выберите период
4. Скачайте Excel файл

---

## 📈 Производительность

| Размер файла | Записей | Время импорта | Память |
|--------------|---------|---------------|--------|
| 100 KB | 1,000 | 5-10 сек | ~100 MB |
| 500 KB | 5,000 | 20-30 сек | ~150 MB |
| 1 MB | 10,000 | 40-60 сек | ~200 MB |
| 5 MB | 50,000 | 3-5 мин | ~300 MB |

---

## 🐛 Troubleshooting

### Ошибка: "Invalid date format"

**Решение:** Проверьте формат даты в файле:
- DIKIDI: DD.MM.YYYY
- ZAPISIKZ: "День Месяц, ЧЧ:ММ"
- Altegio: DD.MM.YYYY или YYYY-MM-DD

### Ошибка: "Master not found"

**Решение:** Убедитесь, что колонка "Мастер" или "Сотрудник" заполнена

### Ошибка: "Duplicate record"

**Решение:** Используйте `skipDuplicates=true` при импорте

---

## 🎓 Примеры файлов

См. папку `examples/` для примеров файлов каждого формата:
- `examples/dikidi_example.xlsx`
- `examples/zapisikz_example.xlsx`
- `examples/altegio_example.xlsx`

---

**Версия:** 1.0.0  
**Дата:** 3 декабря 2025  
**Статус:** ✅ Все импортеры готовы
