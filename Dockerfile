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
    fontconfig


# Настраиваем переменные окружения для Puppeteer
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
    
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