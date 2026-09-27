import { ArrowRight, Check, Leaf, MapPin, Plus, Recycle, Sparkles, Users } from 'lucide-react'
import { useStore } from '../store'
import type { EcoMarker, Page } from '../types'
import { LazyEcoMap } from '../components/LazyEcoMap'

export function HomePage({ onNavigate, onSelect, onAdd }: { onNavigate: (page: Page) => void; onSelect: (m: EcoMarker) => void; onAdd: () => void }) {
  const { markers } = useStore()
  const scrollToHow = () => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return (
    <main>
      <section className="hero section-shell">
        <div className="hero-copy">
          <div className="pill"><Sparkles size={15} /> Чистый город начинается с одной точки</div>
          <h1>Замечай.<br /><em>Отмечай.</em> Меняй.</h1>
          <p>Интерактивная карта загрязнений, которая объединяет тех, кому не всё равно. Добавляйте проблемные места и помогайте им исчезать.</p>
          <div className="hero-actions"><button className="button" onClick={() => onNavigate('map')}><MapPin size={18} /> Открыть карту</button><button className="text-link link-button" onClick={scrollToHow}>Как это работает <ArrowRight size={17} /></button></div>
          <div className="hero-proof"><div className="proof-faces"><span>АК</span><span>МП</span><span>ЕС</span><span>+2к</span></div><p><strong>2 840 человек</strong><br />уже делают город чище</p></div>
        </div>
        <div className="hero-visual">
          <div className="hero-map-card">
            <LazyEcoMap markers={markers} onMarkerClick={onSelect} interactive={false} zoom={3} />
            <div className="live-label"><i /> Карта обновляется</div>
            <div className="map-stat"><strong>{markers.length}</strong><span>активных точек<br />на карте</span></div>
          </div>
          <div className="leaf-orbit"><Leaf size={23} /></div>
        </div>
      </section>

      <section className="impact-strip">
        <div><strong>2 840</strong><span>участников</span></div><i /><div><strong>1 247</strong><span>точек добавлено</span></div><i /><div><strong>863</strong><span>места уже очищено</span></div><i /><div><strong>69%</strong><span>точек убирают</span></div>
      </section>

      <section className="section-shell how-section" id="how">
        <div className="section-heading centered"><span className="eyebrow">Просто и полезно</span><h2>Три шага к чистому городу</h2><p>Не нужно быть экоактивистом — достаточно заметить и рассказать.</p></div>
        <div className="steps">
          <article><span className="step-number">01</span><div className="step-icon green"><MapPin /></div><h3>Найдите место</h3><p>Заметили мусор? Определите геопозицию или выберите точку на карте.</p></article>
          <article><span className="step-number">02</span><div className="step-icon yellow"><Recycle /></div><h3>Расскажите о нём</h3><p>Добавьте фото, выберите категории и укажите примерный объём.</p></article>
          <article><span className="step-number">03</span><div className="step-icon blue"><Users /></div><h3>Действуйте вместе</h3><p>Уберите сами или поделитесь точкой. Любое участие имеет значение.</p></article>
        </div>
      </section>

      <section className="map-showcase section-shell">
        <div className="showcase-map"><LazyEcoMap markers={markers} onMarkerClick={onSelect} zoom={3} /></div>
        <div className="showcase-copy"><span className="eyebrow">Живая карта</span><h2>Всё важное —<br />перед глазами</h2><p>Каждая точка содержит фотографию, описание, тип и объём мусора. Цвет метки помогает быстро оценить ситуацию.</p>
          <ul><li><span className="volume-dot small" /><span><strong>Зелёная</strong> — немного мусора</span></li><li><span className="volume-dot medium" /><span><strong>Жёлтая</strong> — средний объём</span></li><li><span className="volume-dot large" /><span><strong>Красная</strong> — нужна помощь</span></li></ul>
          <div className="showcase-actions">
            <button className="button" onClick={onAdd}><Plus size={17} /> Добавить метку</button>
            <button className="button button-ghost" onClick={() => onNavigate('map')}>Посмотреть всю карту <ArrowRight size={17} /></button>
          </div>
        </div>
      </section>

      <section className="section-shell principles">
        <div className="principle-quote"><Leaf /><blockquote>«Большие перемены начинаются с маленького действия рядом с домом»</blockquote></div>
        <div className="principle-copy"><span className="eyebrow">Наш подход</span><h2>Технологии — для людей и природы</h2><p>Мы сделали Эко карту простой и открытой. Без лишнего шума, сложных форм и барьеров.</p><div className="check-list"><span><Check /> Бесплатная карта</span><span><Check /> Открытые данные</span><span><Check /> Никакой рекламы</span><span><Check /> Вместе эффективнее</span></div></div>
      </section>

      <section className="cta section-shell"><div className="cta-leaf"><Leaf /></div><span className="eyebrow">Начните сегодня</span><h2>Ваш район может стать чище</h2><p>Откройте карту, найдите ближайшую точку и сделайте первый шаг.</p><button className="button button-light" onClick={() => onNavigate('map')}>Перейти к карте <ArrowRight size={18} /></button></section>
    </main>
  )
}
