# Используем официальный образ Bun
FROM oven/bun:1 AS base

# Рабочая директория
WORKDIR /app

# Скопируем package.json и lockfile
COPY package.json bun.lockb* ./

# Установим зависимости
RUN bun install --frozen-lockfile

# Копируем остальной код
COPY . .

# Откроем порт
EXPOSE 5900

# Запускаем приложение
CMD ["bun", "run", "src/index.ts"]
