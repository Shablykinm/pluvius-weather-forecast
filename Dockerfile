# Используем официальный образ Node.js с Alpine (легковесный)
FROM node:20-alpine

# Создаем рабочую директорию
WORKDIR /usr/src/app

# Копируем зависимости
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install 

# Копируем исходный код
COPY . .


# Запускаем приложение
CMD ["npm", "start"]