import { Database, Eye, LockKeyhole, MapPinned, ShieldCheck } from 'lucide-react'

export function PrivacyPage() {
  return <main className="privacy-page section-shell">
    <header className="privacy-hero"><span className="eyebrow">Ваши данные под защитой</span><h1>Политика конфиденциальности</h1><p>Объясняем простыми словами, какие данные использует «Эко карта» и для чего они нужны.</p><small>Последнее обновление: 29 сентября 2026 года</small></header>
    <section className="privacy-grid">
      <article><span><Database /></span><h2>Какие данные хранятся</h2><p>Имя, фамилия, электронная почта, локальный SHA-256-хеш пароля, добавленные метки, фотографии и записи на групповые уборки. В текущей frontend-версии эти сведения сохраняются только в localStorage вашего браузера.</p></article>
      <article><span><Eye /></span><h2>Что видят другие</h2><p>Посетителям карты доступны адрес точки, категории и объём мусора, фотография, комментарий и сокращённое имя автора. Электронная почта публично не показывается.</p></article>
      <article><span><MapPinned /></span><h2>Карта и геолокация</h2><p>Геолокация используется только после вашего разрешения. Для карты применяются OpenStreetMap и Leaflet, а поиск адресов выполняется через Nominatim.</p></article>
      <article><span><LockKeyhole /></span><h2>Управление данными</h2><p>Вы можете изменить имя и фамилию в личном кабинете. Очистка данных сайта в настройках браузера удалит локальные аккаунты, метки и настройки на этом устройстве.</p></article>
    </section>
    <section className="privacy-note"><ShieldCheck /><div><h2>Важное правило для фотографий</h2><p>Не загружайте изображения людей, документов, автомобильных номеров и другой личной информации без законного основания или согласия владельца.</p></div></section>
  </main>
}
