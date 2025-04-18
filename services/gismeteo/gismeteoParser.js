class GismeteoParser {
    // Основной метод для получения всех данных о погоде с страницы
    static parse($) {
        // Возвращаем объект с различными данными о погоде
        return {
            times: this.extractTimes($), // Извлечение временных меток
            forecastDates: this.extractForecastDates($), // Извлечение дат прогноза
            states: this.extractWeatherStates($), // Извлечение состояний погоды
            temperatures: this.extractTemperatures($), // Извлечение температур
            feelsTemperatures: this.extractFeelsTemperatures($), // Извлечение ощущаемых температур
            precipitations: this.extractPrecipitations($), // Извлечение данных об осадках
        };
    }

    // Метод для извлечения времени прогноза
    static extractTimes($) {
        const currentDate = new Date(); // Текущая дата
        const currentYear = currentDate.getUTCFullYear(); // Текущий год
        const currentMonth = currentDate.getUTCMonth(); // Текущий месяц
        const currentDay = currentDate.getUTCDate(); // Текущий день

        // Получаем элементы времени и преобразуем их в объекты Date
        return this.getTimeItems($)
            .map((i, el) => {
                const timeStr = $(el).find('span').text().trim(); // Получаем текст времени
                if (!/\d{1,2}:\d{2}/.test(timeStr)) return null; // Проверяем на корректный формат времени

                const [hours, minutes] = timeStr.split(':').map(Number); // Разделяем на часы и минуты
                if (hours > 23 || minutes > 59) return null; // Проверка на допустимые значения

                // Создаем объект Date в формате UTC
                return new Date(Date.UTC(currentYear, currentMonth, currentDay, hours, minutes));
            })
            .get() // Преобразуем в массив
            .filter(date => date instanceof Date && !isNaN(date)); // Фильтруем валидные даты
    }

    // Новый метод для извлечения дат прогноза
    static extractForecastDates($) {
        // Извлекаем дату из атрибута title элементов времени
        return this.getTimeItems($)
            .map((i, el) => {
                const title = $(el).attr('title') || ''; // Получаем атрибут title элемента
                const dateString = title.split(',')[0].replace('Прогноз от: ', '').trim(); // Извлечение даты
                return new Date(dateString); // Создаем объект Date
            })
            .get(); // Преобразуем в массив
    }

    // Общий метод для получения элементов времени (для переиспользования)
    static getTimeItems($) {
        // Возвращаем элементы, содержащие дату и время
        return $('.widget-row-datetime-time .row-item:not(:has(.widget-row-caption))');
    }

    // Метод для извлечения состояний погоды
    static extractWeatherStates($) {
        // Получаем состояния погоды из атрибутов data-tooltip
        return $('.widget-row-icon .row-item[data-tooltip]')
            .map((i, el) => $(el).attr('data-tooltip')?.trim() || '') // Извлечение состояния
            .get(); // Преобразование в массив
    }

    // Метод для извлечения температур воздуха
    static extractTemperatures($) {
        return $('.widget-row-chart-temperature-air .value temperature-value[value]')
            .map((i, el) => parseInt($(el).attr('value')) || null) // Извлечение значения температуры
            .get() // Преобразование в массив
            .filter(temp => !isNaN(temp)); // Фильтрация нечисловых значений
    }

    // Метод для извлечения ощущаемых температур
    static extractFeelsTemperatures($) {
        return $('.widget-row-chart-temperature-heat-index .value temperature-value[value]')
            .map((i, el) => parseInt($(el).attr('value')) || null) // Извлечение значения температуры
            .get() // Преобразование в массив
            .filter(temp => !isNaN(temp)); // Фильтрация нечисловых значений
    }

    // Метод для извлечения данных об осадках
    static extractPrecipitations($) {
        return $('.widget-row-precipitation-bars .row-item')
            .map((i, el) => {
                const text = $(el).find('.item-unit').text().trim(); // Получаем текст осадков
                // Преобразуем текст в число с плавающей точкой
                return parseFloat(text.replace(',', '.')) || 0;
            })
            .get(); // Преобразование в массив
    }
}

// Экспортируем класс для использования в других модулях
module.exports = GismeteoParser;
