const moment = require('moment-timezone');
const DateHelper = require('../../helper/dateHelper'); 

class YandexParser {
    static iconMap = {
        // Соответствие иконок состояния погоды их названиям
        'skc_d': 'Ясно', 'skc_n': 'Ясно',
        'fg_d': 'Туман', 'fg_n': 'Туман',
        'bkn_d': 'Переменная облачность', 'bkn_n': 'Переменная облачность',
        'bkn_-ra_d': 'Слабый дождь', 'bkn_-ra_n': 'Слабый дождь',
        'bkn_-sn_d': 'Слабый снег', 'bkn_-sn_n': 'Слабый снег',
        'bkn_ra_d': 'Дождь', 'bkn_ra_n': 'Дождь',
        'bkn_sn_d': 'Снег', 'bkn_sn_n': 'Снег',
        'bkn_+ra_d': 'Сильный дождь', 'bkn_+ra_n': 'Сильный дождь',
        'bkn_+sn_d': 'Сильный снег', 'bkn_+sn_n': 'Сильный снег',
        'ovc_ts': 'Гроза', 'ovc_ts_ra': 'Гроза с дождем',
        'ovc_ts_ha': 'Гроза с градом', 'ovc': 'Пасмурно',
        'ovc_-ra': 'Пасмурно со слабым дождем', 'ovc_-sn': 'Пасмурно со слабым снегом',
        'ovc_ra': 'Пасмурно с дождем', 'ovc_sn': 'Пасмурно со снегом',
        'ovc_+ra': 'Пасмурно с сильным дождем', 'ovc_+sn': 'Пасмурно с сильным снегом',
        'ovc_ra_sn': 'Дождь со снегом', 'ovc_ha': 'Град',
        '-bl': 'Метель', 'bl': 'Сильная метель',
        'dst': 'Пыль', 'du_st': 'Пыльная буря',
        'smog': 'Смог', 'strm': 'Шторм',
        'vlka': 'Извержение вулкана'
    };
    // Метод для парсинга погодных данных с заданных страниц
    static parse($, tempPage$) {
        // Основные данные с детальной страницы
        const tempTimes = this.extractTempTimes(tempPage$); // Время, когда указана температура
        const tempUpdated = this.generateUpdatedTimes(tempTimes.length); // Обновленные временные метки
        const tempWeatherStates = this.extractTempWeatherStates(tempPage$); // Состояние погоды
        const temperatures = this.extractTemperatures(tempPage$); // Температуры

        // Данные об осадках с главной страницы
        const times = this.extractTimes($); // Время осадков
        const updated = this.generateUpdatedTimes(times.length); // Обновленные временные метки
        const weatherStates = this.extractWeatherStates($); // Состояние погоды
        const precipitations = this.extractPrecipitations($); // Осадки

        // Возвращаем все собранные данные в виде объекта
        return {
            tempTimes: tempTimes,
            tempUpdated: tempUpdated,
            tempWeatherStates: tempWeatherStates,
            temperatures: temperatures,
            feelsTemperatures: temperatures, // Используем те же температуры для ощущения

            times: times,
            updated: updated,
            weatherStates: weatherStates,
            precipitations: precipitations,
        };
    }

    // Извлечение временных значений из деталей погоды
    static extractTempTimes(tempPage$) {
        try {
            // Устанавливаем текущий момент времени с учетом часового пояса
            const now = DateHelper.getDateNow(); // Укажите нужный часовой пояс
            let currentDay = now.clone().startOf('day'); // Клонируем и начинаем с начала дня
            
            const elements = tempPage$('.fact__hour').filter((i, el) => {
                const tempText = tempPage$(el).find('.fact__hour-temp').text();
                return /\d+°/.test(tempText);
            });
    
            const dates = [];
            let previousTime = null;
    
            elements.each((i, el) => {
                const label = tempPage$(el).find('.fact__hour-label');
                if (label.length === 0) return;
    
                let timeText = label.text().trim();
                // Удаляем название дня недели, если есть
                timeText = timeText.replace(/^[а-яё]+,?\s*/i, '').replace(/\s/g, '');
    
                // Парсим часы и минуты
                const [hours, minutes] = timeText.split(':').map(Number);
    
                // Создаем момент времени
                let date = currentDay.clone()
                    .hour(hours)
                    .minute(minutes || 0)
                    .second(0);
    
                // Проверяем переход на следующий день
                if (previousTime !== null && date.isBefore(previousTime)) {
                    currentDay = currentDay.add(1, 'day');
                    date = currentDay.clone()
                        .hour(hours)
                        .minute(minutes || 0)
                        .second(0);
                }
    
                dates.push(date.toDate());
                previousTime = date;
            });
    
            return dates.filter(date => !isNaN(date.getTime()));
        } catch (e) {
            console.error('[TempTimes] Error:', e);
            return [];
        }
    }
    
    
    // Извлечение температурных значений
    static extractTemperatures(tempPage$) {
        try {
            // Выбираем элементы с числовой температурой
            return tempPage$('.fact__hour').filter((i, el) => {
                const tempText = tempPage$(el).find('.fact__hour-temp').text();
                return /\d+°/.test(tempText); // Проверка на числовую температуру
            }).map((i, el) => {
                const tempElem = tempPage$(el).find('.fact__hour-temp');
                if (tempElem.length === 0) return null; // Если нет элемента с температурой, возвращаем null

                const tempText = tempElem.text()
                    .replace(/[^0-9+-]/g, '') // Убираем все, кроме цифр и знаков
                    .trim();

                if (!tempText) return null; // Пропускаем пустые значения

                return parseInt(tempText); // Преобразовываем текст в целое число
            }).get().filter(v => {
                return Number.isInteger(v); // Отфильтровываем невалидные значения
            });
        } catch (e) {
            console.error('[Temperatures] Error:', e); // Логируем ошибку
            return []; // Возвращаем пустой массив в случае ошибки
        }
    }

    // Извлечение состояний погоды из детальной страницы
    static extractTempWeatherStates(tempPage$) {
        const filteredElements = tempPage$('.fact__hour').filter((i, el) => {
            const tempText = tempPage$(el).find('.fact__hour-temp').text();
            return /\d+°/.test(tempText);
        });

        return filteredElements.find('img').map((i, el) => {
            const src = tempPage$(el).attr('src');
            if (!src) return "Неизвестное состояние"; // Добавляем проверку
            
            const match = src.match(/\/([^\/]+)\.svg$/); // Проверяем результат match
            const iconKey = match ? match[1] : null;
            
            return iconKey ? 
                (this.iconMap[iconKey] || this.parseComplexIcon(iconKey)) : 
                "Неизвестное состояние";
        }).get();
    }

    // Извлечение временных значений с главной страницы
    static extractTimes($) {
        return $('.timeline-item[data-timestamp]')
            .map((i, el) => {
                const timestamp = $(el).attr('data-timestamp'); // Получаем timestamp
                if (!timestamp) return null; // Если нет, возвращаем null
                
                const date = new Date(parseInt(timestamp)); // Преобразуем timestamp в объект Date
                return date;
            })
            .get()
            .filter(date => !isNaN(date.getTime())); // Фильтруем только валидные даты
    }

    // Парсинг времени обновления
    static parseUpdateTime(baseDate, timeStr) {
        const match = timeStr.match(/(\d+):(\d+)/); // Ищем строку формата "чч:мм"
        if (!match) return new Date(); // Если не найдено, возвращаем текущую дату
        
        const date = new Date(baseDate); // Создаем новую дату на основе базовой
        date.setHours(parseInt(match[1]), parseInt(match[2]), 0, 0); // Устанавливаем часы и минуты
        return date;
    }

    // Генерация обновленных временных меток
    static generateUpdatedTimes(count) {
        const now = DateHelper.getDateNow();
        return Array(count).fill(null).map(() => {
            return new Date(now); // Создаем новые даты с учетом смещения
        });
    }

    // Извлечение состояния погоды с главной страницы
    static extractWeatherStates($) {
        return $('.timeline-item img[src*="funky"]')
            .map((i, el) => {
                const src = $(el).attr('src');
                if (!src) return "Неизвестное состояние"; // Проверка
                
                const match = src.match(/\/([^\/]+)\.svg$/);
                const iconKey = match ? match[1] : null;
                
                return iconKey ? 
                    (this.iconMap[iconKey] || this.parseComplexIcon(iconKey)) : 
                    "Неизвестное состояние";
            }).get();
    }

    // Обработка сложных иконок состояния погоды
    static parseComplexIcon(iconKey) {
        const parts = iconKey.split('_'); // Разбиваем ключ на части

        // Определяем и возвращаем состояния погоды на основе ключей
        if (parts.includes('ts')) {
            if (parts.includes('ra')) return 'Гроза с дождем';
            if (parts.includes('ha')) return 'Гроза с градом';
            return 'Гроза';
        }

        if (parts.includes('ra')) {
            const strength = parts.find(p => p === '+' || p === '-');
            return strength ?
                `${strength === '+' ? 'Сильный' : 'Слабый'} дождь` :
                'Дождь';
        }

        if (parts.includes('sn')) {
            const strength = parts.find(p => p === '+' || p === '-');
            return strength ?
                `${strength === '+' ? 'Сильный' : 'Слабый'} снег` :
                'Снег';
        }

        if (parts.includes('ha')) return 'Град';
        if (parts.includes('bl')) return parts[0] === '-' ? 'Метель' : 'Сильная метель';
        if (parts.includes('dst')) return 'Пыль';
        if (parts.includes('du_st')) return 'Пыльная буря';
        if (parts.includes('smog')) return 'Смог';
        if (parts.includes('strm')) return 'Шторм';
        if (parts.includes('vlka')) return 'Извержение вулкана';

        return 'Неизвестное состояние'; // Возвращаем значение по умолчанию
    }

    // Извлечение информации об осадках
    static extractPrecipitations($) {
        const PRECIPITATION_KEYS = [
            'ra', 'sn', 'ts', 'ha',
            'strm', 'bl', 'du_st', 'vlka'
        ];

        return $('.timeline-item img[src*="funky"]')
            .map((i, el) => {
                const src = $(el).attr('src');
                if (!src) return 0; // Защита
                
                const match = src.match(/\/([^\/]+)\.svg$/);
                const iconKey = match ? match[1] : "";
                
                return PRECIPITATION_KEYS.some(key => iconKey.includes(key)) ? 1 : 0;
            }).get();
    }
}

module.exports = YandexParser; // Экспортируем класс для использования в других модулях
