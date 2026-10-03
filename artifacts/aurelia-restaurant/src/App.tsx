import { useEffect, useState } from 'react';
import { Route, Switch } from 'wouter';
import MenuPage from './pages/menu';
import NotFound from './pages/not-found';
import { Menu, X, ArrowLeft, MapPin, Phone, Clock, Instagram } from 'lucide-react';
import {
  fetchPublishedRestaurant,
  formatOpeningHours,
  getProfileSettings,
  getPublicImageUrl,
  getSafeExternalUrl,
  type RestaurantProfile,
} from '@/lib/supabase-profile';

const navigation = [
  { label: 'الرئيسية', href: '#home' },
  { label: 'القائمة', href: '/menu' },
  { label: 'الحجز', href: '#booking' },
  { label: 'عن أوريليا', href: '#story' },
  { label: 'تواصل معنا', href: '#contact' },
];

const dishes = [
  {
    image: '/images/lamb.jpg',
    name: 'كتف الغنم',
    description: 'مطهو على مهل، دبس الرمان، فريكة محمّصة وأعشاب طازجة.',
    price: '٢٨ دولاراً',
    id: 'lamb',
  },
  {
    image: '/images/octopus.jpg',
    name: 'أخطبوط مشوي',
    description: 'بطاطا بالزعفران، ليمون محروق وزيت بقدونس.',
    price: '٢٤ دولاراً',
    id: 'octopus',
  },
  {
    image: '/images/risotto.jpg',
    name: 'ريزوتو الفطر',
    description: 'فطر بري، مريمية مقرمشة ولمسة من زيت الزيتون.',
    price: '٢٢ دولاراً',
    id: 'risotto',
  },
  {
    image: '/images/dessert.jpg',
    name: 'طبقات الفستق والورد',
    description: 'رقائق ذهبية، كريمة خفيفة وتوت أحمر.',
    price: '١٤ دولاراً',
    id: 'dessert',
  },
];

function Brand({
  footer = false,
  name = 'AURELIA',
}: {
  footer?: boolean;
  name?: string;
}) {
  return (
    <div className={footer ? 'footer-brand' : 'brand'} role="img" aria-label={`أوريليا ${name}`}>
      <span className="brand-emblem" aria-hidden="true">أ</span>
      <span>
        <span className="brand-name">{name}</span>
        <span className="brand-ar">أوريليا</span>
      </span>
    </div>
  );
}

function Navigation({ restaurantName }: { restaurantName: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <header className="nav-shell">
      <nav className="nav" aria-label="التنقل الرئيسي" dir="rtl">
        <Brand name={restaurantName} />
        <div id="primary-navigation" className={`nav-links${open ? ' open' : ''}`}>
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              data-testid={`link-nav-${item.href.slice(1)}`}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </a>
          ))}
        </div>
        <a className="button nav-book" href="#contact" data-testid="link-book-nav">احجز طاولتك <ArrowLeft size={15} aria-hidden="true" /></a>
        <button
          type="button"
          className="menu-toggle"
          aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
          aria-expanded={open}
          aria-controls="primary-navigation"
          onClick={() => setOpen((value) => !value)}
          data-testid="button-mobile-menu"
        >
          {open ? <X size={23} /> : <Menu size={23} />}
        </button>
      </nav>
    </header>
  );
}

function Hero({ profile }: { profile: RestaurantProfile | null }) {
  return (
    <section className="hero" id="home" aria-labelledby="hero-title">
      <img className="hero-image" src={getPublicImageUrl(profile?.cover_image_path, '/images/aurelia-hero.jpg')} alt={`قاعة ${profile?.name ?? 'أوريليا'} الدافئة على ضوء المساء`} fetchPriority="high" />
      <div className="wrap hero-content" dir="rtl">
        <div className="hero-kicker reveal">حكاية من ضفّتَي المتوسط</div>
        <h1 id="hero-title" className="reveal delay-1">حكاية تُروى<br /><span>على مهل.</span></h1>
        <p className="hero-copy reveal delay-2">نكهات من ضفّتَي المتوسط، وموسم يكتب فصله كل يوم. في أوريليا، لكل طبق حكاية ولكل لقاء مكانه.</p>
        <div className="hero-actions reveal delay-3">
          <a className="button" href="#contact" data-testid="link-book-hero">احجز طاولتك <ArrowLeft size={16} aria-hidden="true" /></a>
          <a className="button button-ghost" href="/menu" data-testid="link-menu-hero">استكشف القائمة</a>
        </div>
      </div>
      <div className="wrap hero-foot" dir="rtl">
        <span>مطبخ متوسطي معاصر</span>
        <span>مكوّنات موسمية · ضيافة دافئة</span>
      </div>
    </section>
  );
}

function Story({ profile }: { profile: RestaurantProfile | null }) {
  return (
    <section id="story" className="story" aria-labelledby="story-title">
      <div className="wrap story-grid" dir="rtl">
        <div className="story-copy">
          <div className="eyebrow">من حكايتنا</div>
          <h2 id="story-title" className="section-title">دفء الضيافة،<br />في قلب المدينة.</h2>
          <p>{profile?.description || 'بدأت أوريليا من ذاكرة مائدة طويلة؛ خبز يُكسر بين الأيدي، وأطباق تتنقّل، وأحاديث لا تستعجل نهايتها. أخذنا من مطابخ المتوسط ما نحب، وتركنا للموسم أن يختار ما يليق به.'}</p>
          {!profile?.description && <p>نطبخ بمكوّنات قريبة، ونقدّمها كما نؤمن بالضيافة: بكرم صادق، وتفاصيل لا تحتاج إلى ضجيج.</p>}
          <div className="story-sign">أهلاً بكم في مائدتنا</div>
        </div>
        <div className="story-image-wrap">
          <img className="story-image" src="/images/story.jpg" alt="لمسة أخيرة من الطاهي على طبق موسمي" loading="lazy" />
          <div className="story-note">من أرضٍ واحدة، حكايات كثيرة</div>
        </div>
      </div>
    </section>
  );
}

function MenuSection() {
  return (
    <section className="dishes" id="menu" aria-labelledby="menu-title">
      <div className="wrap" dir="rtl">
        <div className="section-head">
          <div>
            <div className="eyebrow">من مطبخنا اليوم</div>
            <h2 className="section-title" id="menu-title">على المائدة</h2>
          </div>
          <p>قائمة تتبدّل مع المواسم، وتبقى وفية لما يجمعنا: مكوّن طازج، ونكهة تعرف طريقها إلى الذاكرة.</p>
        </div>
        <div className="dish-grid">
          {dishes.map((dish) => (
            <article className="dish-card" key={dish.id} data-testid={`card-dish-${dish.id}`}>
              <div className="dish-image-box">
                <img src={dish.image} alt={dish.name} loading="lazy" />
              </div>
              <div className="dish-meta">
                <h3>{dish.name}</h3>
                <span className="price">{dish.price}</span>
              </div>
              <p>{dish.description}</p>
            </article>
          ))}
        </div>
        <div className="all-menu"><a href="/menu" data-testid="link-full-menu">استكشف القائمة الكاملة <ArrowLeft size={14} aria-hidden="true" /></a></div>
      </div>
    </section>
  );
}

function Atmosphere({ profile }: { profile: RestaurantProfile | null }) {
  return (
    <section className="atmosphere" aria-labelledby="atmosphere-title">
      <div className="wrap atmosphere-grid" dir="rtl">
        <div className="atmosphere-copy">
          <div className="eyebrow">مساحة للّقاء</div>
          <h2 id="atmosphere-title" className="section-title">مكانٌ يشبه<br />العودة.</h2>
          <p>ضوء خافت، خشب دافئ، وطاولات صُمّمت لتطول عندها السهرة. تعالوا لعشاء هادئ، أو لمناسبة تستحق أن نتذكّرها.</p>
        </div>
        <div>
           <img className="atmosphere-image" src={getPublicImageUrl(profile?.gallery_image_paths[0], '/images/ambience.jpg')} alt={`تفاصيل دافئة من قاعة الطعام في ${profile?.name ?? 'أوريليا'}`} loading="lazy" />
          <div className="atmosphere-caption"><span>ضيافة على مهل</span><span>كل مساء، حكاية جديدة</span></div>
        </div>
      </div>
    </section>
  );
}

function Quote() {
  return (
    <section className="quote-band" aria-label="روح المائدة">
      <div className="quote-mark" aria-hidden="true">„</div>
      <blockquote>أجمل ما في المائدة، ما يبقى بعد آخر لقمة.</blockquote>
      <p>روح أوريليا</p>
    </section>
  );
}

function Booking() {
  return (
    <section className="booking" id="booking" aria-labelledby="booking-title">
      <div className="wrap booking-content" dir="rtl">
        <div className="eyebrow">طاولتكم بانتظاركم</div>
        <h2 className="section-title" id="booking-title">نترك لكم<br />المقعد الأقرب.</h2>
        <p>لترتيب زيارتكم أو الاستفسار عن التوفّر، تواصلوا معنا مباشرة. يسعدنا أن نساعدكم في اختيار الوقت المناسب.</p>
        <a className="button button-light" href="#contact" data-testid="link-book-cta">تواصلوا لترتيب الزيارة <ArrowLeft size={16} aria-hidden="true" /></a>
        <small>تفاصيل التواصل أدناه؛ خدمة الحجز المباشر قيد الإعداد.</small>
      </div>
    </section>
  );
}

function Contact({
  profile,
  profileMessage,
}: {
  profile: RestaurantProfile | null;
  profileMessage: string | null;
}) {
  const openingHours = formatOpeningHours(profile?.opening_hours);
  const phone = profile?.phone?.trim();
  const mapUrl = profile?.address
    ? `https://maps.google.com/?q=${encodeURIComponent(profile.address)}`
    : null;

  return (
    <section className="contact" id="contact" aria-labelledby="contact-title">
      <div className="wrap contact-grid" dir="rtl">
        <div>
          <div className="eyebrow">في انتظار زيارتكم</div>
          <h2 className="section-title" id="contact-title">نلتقي<br />على المائدة.</h2>
          <p className="contact-note">{profile?.description || 'تفاصيل الموقع وساعات العمل وطرق التواصل أدناه ستُحدّد عند تثبيت بيانات المطعم.'}</p>
          {profileMessage && <p className="profile-status" role="status">{profileMessage}</p>}
          <div className="contact-details">
            <div className="contact-detail">
              <span className="detail-icon"><MapPin size={19} aria-hidden="true" /></span>
              <div><h3>العنوان</h3><p>{mapUrl ? <a href={mapUrl} target="_blank" rel="noreferrer">{profile?.address}</a> : 'يُضاف بعد تثبيت موقع المطعم'}</p></div>
            </div>
            <div className="contact-detail">
              <span className="detail-icon"><Clock size={19} aria-hidden="true" /></span>
              <div><h3>ساعات الاستقبال</h3><p>{openingHours || 'تُعلن عند اعتماد مواعيد الافتتاح'}</p></div>
            </div>
            <div className="contact-detail">
              <span className="detail-icon"><Phone size={18} aria-hidden="true" /></span>
              <div><h3>للاستفسار وترتيب الزيارة</h3><p>{phone ? <a href={`tel:${phone.replace(/[^\d+]/g, '')}`}>{phone}</a> : 'يُضاف رقم التواصل بعد تثبيت بيانات الفرع'}</p></div>
            </div>
          </div>
        </div>
        <div className="map-placeholder" role="img" aria-label={profile?.address ? `موقع ${profile.name} على الخريطة` : 'مساحة مخصّصة لخريطة أوريليا بعد تثبيت موقع المطعم'}>
          <div className="map-label"><div className="map-pin" aria-hidden="true"><span>أ</span></div><strong>{profile?.address || 'أوريليا · الموقع قريباً'}</strong></div>
        </div>
      </div>
    </section>
  );
}

function Footer({
  restaurantName,
  instagramUrl,
}: {
  restaurantName: string;
  instagramUrl: string | null;
}) {
  return (
    <footer className="footer">
      <div className="wrap" dir="rtl">
        <div className="footer-main">
          <div>
            <Brand footer name={restaurantName} />
            <div className="footer-tagline">للمائدة التي تجمعنا.</div>
          </div>
          <nav className="footer-links" aria-label="تنقل التذييل">
            {navigation.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
          </nav>
        </div>
        <div className="footer-bottom">
          <span>© أوريليا ٢٠٢٥ · جميع الحقوق محفوظة</span>
          <div className="socials">
            {instagramUrl ? <a href={instagramUrl} target="_blank" rel="noreferrer" aria-label="حساب أوريليا على إنستغرام"><Instagram size={15} aria-hidden="true" /> إنستغرام</a> : <span aria-label="حساب أوريليا على إنستغرام سيُضاف لاحقاً"><Instagram size={15} aria-hidden="true" /> حساب أوريليا على إنستغرام · قريباً</span>}
            <a href="#home" data-testid="link-back-top">العودة إلى الأعلى ↑</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function Home() {
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const settings = getProfileSettings();

  useEffect(() => {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
    document.title = `${profile?.name ?? 'أوريليا'} — مائدة متوسطية معاصرة`;
    let description = document.querySelector('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.setAttribute('name', 'description');
      document.head.appendChild(description);
    }
    description.setAttribute('content', profile?.description || 'أوريليا، مطعم متوسطي معاصر. نكهات موسمية، ضيافة دافئة ومائدة تجمعنا.');
  }, [profile]);

  useEffect(() => {
    let active = true;
    if (!settings.url && !settings.anonKey) {
      setProfileMessage('تُعرض المعلومات الأساسية حالياً. أضف إعدادات Supabase لعرض بيانات المطعم المنشورة.');
      return () => {
        active = false;
      };
    }

    if (!settings.url || !settings.anonKey) {
      setProfileMessage('إعدادات Supabase غير مكتملة؛ أضف رابط المشروع ومفتاح anon معاً.');
      return () => {
        active = false;
      };
    }

    setProfileMessage(null);
    fetchPublishedRestaurant(settings)
      .then((restaurant) => {
        if (!active) return;
        if (!restaurant) {
          setProfileMessage(`لم يُعثر على مطعم منشور بالمعرّف "${settings.slug}". تُعرض المعلومات الأساسية حالياً.`);
          return;
        }
        setProfile(restaurant);
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error('Could not load the published restaurant profile:', error);
        setProfileMessage('تعذّر تحميل بيانات المطعم من Supabase؛ تُعرض المعلومات الأساسية حالياً.');
      });

    return () => {
      active = false;
    };
  }, [settings.url, settings.anonKey, settings.slug]);

  const restaurantName = profile?.name ?? 'AURELIA';
  const instagramUrl = getSafeExternalUrl(profile?.social_links.instagram);

  return (
    <>
      <a className="skip-link" href="#main-content">انتقل إلى المحتوى</a>
      <Navigation restaurantName={restaurantName} />
      <main id="main-content">
        <Hero profile={profile} />
        <Story profile={profile} />
        <MenuSection />
        <Atmosphere profile={profile} />
        <Quote />
        <Booking />
        <Contact profile={profile} profileMessage={profileMessage} />
      </main>
      <Footer restaurantName={restaurantName} instagramUrl={instagramUrl} />
    </>
  );
}

function App() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/menu" component={MenuPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;