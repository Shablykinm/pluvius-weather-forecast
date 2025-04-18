const BaseService = require('../baseService'); // Импорт базового сервиса
const GismeteoParser = require('./gismeteoParser'); // Импорт парсера для Gismeteo
const DateHelper = require('../../helper/dateHelper'); // Импорт анализатора погоды
const WeatherAnalyzer = require('../weatherAnalyzer')

class GismeteoService extends BaseService {
    // Конструктор сервиса, передающий конфигурацию базовому классу
    constructor(config) {
        super(config); // Вызов конструктора родительского класса
    }

    // Метод для проверки погоды
    async checkWeather() {
        try {
            // Загружаем страницу с информацией о погоде
            const $ = await this.loadPage(this.config.url);
            if (!$) return null; // Если не удалось загрузить страницу, возвращаем null

            // Парсим данные с загруженной страницы
            const rawData = this.parseData($);
            console.log(JSON.stringify({ 'gismeteo': rawData })); // Логируем полученные данные
            this.validateData(rawData); // Проверяем валидность данных

            // Анализируем данные о погоде
            const analysis = WeatherAnalyzer.analyze(rawData);
            return this.formatResult(rawData, analysis); // Форматируем итоговые данные

        } catch (error) {
            console.error('Gismeteo parsing error:', error); // Логируем ошибку парсинга
            return null; // Возвращаем null в случае ошибки
        }
    }

    // Метод для парсинга данных со страницы
    parseData($) {
        console.log(DateHelper.getDateNow());
        // Извлекаем различные данные о погоде с помощью парсера Gismeteo
        const times = GismeteoParser.extractTimes($); // Временные метки
        const updated = GismeteoParser.extractForecastDates($); // Даты прогнозов
        const weatherStates = GismeteoParser.extractWeatherStates($); // Состояния погоды
        const temperatures = GismeteoParser.extractTemperatures($); // Температуры
        const feelsTemperatures = GismeteoParser.extractFeelsTemperatures($); // Ощущаемые температуры
        const precipitations = GismeteoParser.extractPrecipitations($); // Осадки

        // Возвращаем структурированные данные о погоде
        return {
            DefaultData: {
                times: times,
                updated: updated,
                weatherStates: weatherStates,
                temperatures: temperatures,
                feelsTemperatures: feelsTemperatures
            },
            Precipitation: {
                times: times,
                updated: updated,
                weatherStates: weatherStates,
                precipitations: precipitations,
            }
        };
    }



}

// Экспортируем класс для использования в других модулях
module.exports = GismeteoService;
