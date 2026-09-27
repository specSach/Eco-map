# Эко карта

Интерактивный frontend-прототип сервиса для отметки загрязнённых мест. Сделан на React, TypeScript, Tailwind CSS и OpenStreetMap/Leaflet.

## Запуск

```bash
npm install
npm run dev
```

Production-сборка:

```bash
npm run build
```

## Что уже работает

- светлая и тёмная темы;
- главная, полноценная карта и личный кабинет;
- регистрация и вход с сохранением профиля по электронной почте;
- создание метки с фотографией, категориями, объёмом и координатами;
- поиск адреса через бесплатный геокодер OpenStreetMap Nominatim;
- определение текущей геопозиции;
- просмотр карточки точки в боковой панели и отметка «убрано»;
- изменение имени, фамилии и пароля в интерфейсе;
- локальное сохранение данных в `localStorage`.

Авторизацию, хранение фотографий и операции с метками можно заменить API-вызовами в `src/store.tsx` без перестройки компонентов интерфейса.

## Участники проекта

- **Тестирование:**
  - [Илья Орехов](https://github.com/hidetaka77)
- **Frontend:**
  - [Роман Карпов](https://github.com/specSach)
- **Backend:**
  - [Михаил Ганин](https://github.com/i11wantmore)
  - [Никита Заволокин](https://github.com/petuhebuchi)
  - [Павел Хавроничев](https://github.com/Pablo228-user)

## SEO и публикация

Проект настроен для публикации по адресу `https://specsach.github.io/Eco-map/`: добавлены canonical, Open Graph, Schema.org, `robots.txt`, `sitemap.xml` и web app manifest. Если домен изменится, необходимо заменить этот адрес в `index.html`, `public/robots.txt` и `public/sitemap.xml`.
