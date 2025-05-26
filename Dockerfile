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
    fontconfig \ 
    && cp /usr/share/zoneinfo/Europe/Moscow /etc/localtime


# Настраиваем переменные окружения
ENV IS_DOCKER=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    NODE_ENV=production \
    TZ=Europe/Moscow

# Создаем рабочую директорию
WORKDIR /usr/src/app

# Копируем зависимости
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install --production

# Копируем исходный код
COPY . .


# Запускаем приложение
CMD ["npm", "start"]