# Используем официальный образ Node.js с Alpine (легковесный)
FROM node:20-alpine

# Устанавливаем системные зависимости для Chromium
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    ttf-liberation \  # шрифты Liberation
    font-noto \       # Шрифты Noto
    fontconfig

# Создаем рабочую директорию
WORKDIR /usr/src/app

# Копируем зависимости
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install --production

# Копируем исходный код
COPY . .

# Устанавливаем переменные окружения по умолчанию
ENV NODE_ENV=production

# Запускаем приложение
CMD ["npm", "start"]