const BaseService = require('../baseService'); // Импорт базового сервиса
const YandexParser = require('./yandexParser'); // Импорт парсера Yandex
const WeatherAnalyzer = require('../weatherAnalyzer'); // Импорт анализатора погоды

class YandexService extends BaseService {
  constructor(config) {
      super(config);
      // Извлекаем lat и lon из URL конфига
      const configUrl = new URL(config.url);
      this.lat = configUrl.searchParams.get('lat');
      this.lon = configUrl.searchParams.get('lon');
      
      if (!this.lat || !this.lon) {
          throw new Error('YandexService: lat/lon missing in URL');
      }
  }

    // Метод для проверки погоды
    async checkWeather() {
      try {
          const $ = await this.loadPage(this.config.url);
          if (!$) return null;
          
          // Формируем URL детальной страницы напрямую
          const tempPage$ = await this.getDetailedPage();
          if (!tempPage$) return null;

          const rawData = this.parseData($, tempPage$);
          console.log(JSON.stringify({ 'yandex': rawData }));
          this.validateData(rawData);

          const analysis = WeatherAnalyzer.analyze(rawData);
          return this.formatResult(rawData, analysis);

      } catch (error) {
          console.error('Yandex parsing error:', error);
          return null;
      }
  }

  async getDetailedPage() {
      try {
          // Формируем URL второй страницы
          const detailUrl = `https://dzen.ru/pogoda/?lat=${this.lat}&lon=${this.lon}`;
          console.log('[Yandex] Detail URL:', detailUrl);

          const tempPage$ = await this.loadPage(detailUrl);
          if (!tempPage$) {
              console.error('[Yandex] Failed to load detail page');
              return null;
          }

          // Отладочное сохранение HTML
          const fs = require('fs');
          fs.writeFileSync('debug_detail.html', tempPage$.html());
          
          return tempPage$;
      } catch (e) {
          console.error('[Yandex] Detail page error:', e);
          return null;
      }
  }

    // Метод для парсинга данных с загруженных страниц
    parseData($, tempPage$) {
        const parsed = YandexParser.parse($, tempPage$); // Используем YandexParser для парсинга данных

        return {
            DefaultData: {
                times: parsed.tempTimes, // Время температур
                updated: parsed.tempUpdated, // Обновленные временные метки
                weatherStates: parsed.tempWeatherStates, // Состояния погоды
                temperatures: parsed.temperatures, // Температуры
                feelsTemperatures: parsed.feelsTemperatures // Ощущаемые температуры
            },
            Precipitation: {
                times: parsed.times, // Время осадков
                updated: parsed.updated, // Обновленные временные метки для осадков
                weatherStates: parsed.weatherStates, // Состояния погоды для осадков
                precipitations: parsed.precipitations // Данные об осадках
            }
        };
    }

    
    
    

    
}

// Экспортируем класс для использования в других модулях
module.exports = YandexService;
