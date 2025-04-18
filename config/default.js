const dotenv = require('dotenv');
dotenv.config();

module.exports = {
    telegram: {
      default: {
        token: process.env.TELEGRAM_TOKEN,
        services: {
          //возможность распределения по топикам. если не надо - threadId: undefined
          yandex: {
            status: true,
            url: 'https://dzen.ru/pogoda/maps/nowcast?via=mmapw&is_autologin_ya=true&ll=40.519562_64.555937&z=15&lat=64.55490344400214&lon=40.52836004907352&utm_referrer=sso.dzen.ru&is_autologin_ya=true',
            chatId: -23423423423,
            threadId: 1111
          },
          rp5: {
            status: false,
            url: 'https://m.rp5.ru/%D0%9F%D0%BE%D0%B3%D0%BE%D0%B4%D0%B0_%D0%B2_%D0%90%D1%80%D1%85%D0%B0%D0%BD%D0%B3%D0%B5%D0%BB%D1%8C%D1%81%D0%BA%D0%B5,_%D0%90%D1%80%D1%85%D0%B0%D0%BD%D0%B3%D0%B5%D0%BB%D1%8C%D1%81%D0%BA%D0%B0%D1%8F_%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C',
            chatId: -23423423423,
            threadId: 2222
          },
          gismeteo: {
            status: true,
            url: 'https://www.gismeteo.ru/weather-arkhangelsk-3915/',
            chatId: -23423423423,
            threadId: 3333
          }
        }
      }
    }
  }