import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, Minus, Plus, Search, ShoppingBag, Trash2, X } from 'lucide-react';
import { Link } from 'wouter';
import { categories, dishes, formatPrice, normalizeArabic, type MenuAddon, type MenuDish, type MenuSize } from './menu-data';
import { useMenuCart } from './use-menu-cart';
import './menu.css';

type DialogMode = 'dish' | 'cart' | null;

function BrandMark() {
  return <div className="menu-brand" aria-label="AURELIA أوريليا"><span className="menu-brand-mark" aria-hidden="true">أ</span><span><span className="menu-brand-name">AURELIA</span><span className="menu-brand-ar">أوريليا</span></span></div>;
}

function useDialogAccessibility(dialogRef: { current: HTMLElement | null }, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
    const focusables = () => Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => element.getAttribute('aria-hidden') !== 'true');
    const frame = window.requestAnimationFrame(() => (focusables()[0] ?? dialog).focus());
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      window.requestAnimationFrame(() => {
        const fallbackFocus = document.querySelector<HTMLElement>('[data-testid="button-open-cart"]');
        const returnTarget = previousFocus?.isConnected ? previousFocus : fallbackFocus;
        returnTarget?.focus({ preventScroll: true });
      });
    };
  }, [dialogRef]);
}

function DishCard({ dish, categoryName, onSelect }: { dish: MenuDish; categoryName: string; onSelect: (dish: MenuDish) => void }) {
  return (
    <button className="menu-dish" type="button" onClick={() => onSelect(dish)} aria-label={`تفاصيل ${dish.name}، ${formatPrice(dish.price)}`} data-testid={`card-dish-${dish.id}`}>
      <img className="dish-photo" src={dish.image} alt={dish.name} loading="lazy" />
      <span className="dish-copy">
        <span>
          <span className="dish-titleline"><span role="heading" aria-level={3}>{dish.name}</span><span className="dish-price" dir="ltr">{formatPrice(dish.price)}</span></span>
          <span className="dish-description">{dish.description}</span>
        </span>
        <span className="dish-foot"><span className="dish-badges"><span className="dish-badge">{categoryName}</span>{dish.badges?.map((badge) => <span className="dish-badge" key={badge}>{badge}</span>)}</span><span className="dish-open" aria-hidden="true"><Plus size={15} /></span></span>
      </span>
    </button>
  );
}

function DishDetails({ dish, onClose, onAdd }: { dish: MenuDish; onClose: () => void; onAdd: (dish: MenuDish, count: number, size?: MenuSize, addons?: MenuAddon[]) => void }) {
  const [quantity, setQuantity] = useState(1);
  const [selectedSizeId, setSelectedSizeId] = useState(dish.sizes?.find((option) => option.id === 'medium')?.id ?? dish.sizes?.[0]?.id ?? '');
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const dialogRef = useRef<HTMLElement | null>(null);
  useDialogAccessibility(dialogRef, onClose);
  const size = dish.sizes?.find((option) => option.id === selectedSizeId);
  const addons = (dish.addons ?? []).filter((addon) => selectedAddons.includes(addon.id));
  const unitPrice = (size?.price ?? dish.price) + addons.reduce((sum, addon) => sum + addon.price, 0);
  return (
    <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} data-testid="dialog-dish">
      <section className="sheet" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="dish-dialog-title" dir="rtl">
        <button className="sheet-close" type="button" onClick={onClose} aria-label="إغلاق تفاصيل الطبق" data-testid="button-close-dish"><X size={19} /></button>
        <img className="detail-image" src={dish.image} alt={dish.name} />
        <div className="detail-content">
          <span className="detail-kicker">من مطبخ أوريليا · {categories.find((category) => category.id === dish.categoryId)?.name}</span>
          <div className="detail-title-row"><h2 id="dish-dialog-title">{dish.name}</h2><span className="detail-price" dir="ltr">{formatPrice(unitPrice)}</span></div>
          <p className="detail-description">{dish.description}</p>
          <p className="detail-ingredients"><strong>المكوّنات:</strong> {dish.ingredients.join('، ')}<br /><strong>مسببات الحساسية:</strong> {dish.allergens.length ? dish.allergens.join('، ') : 'لا يحتوي على مسببات حساسية مدرجة'}</p>
          {!!dish.sizes?.length && <fieldset className="option-group" style={{ border: 0, padding: 0, marginInline: 0 }}>
            <legend className="option-heading">{dish.categoryId === 'pizza' ? 'الحجم' : 'حجم الحصة'} <small>اختيار واحد</small></legend>
            <div className="option-list">{dish.sizes.map((option) => <label className="option-row" key={option.id}><input type="radio" name={`size-${dish.id}`} checked={selectedSizeId === option.id} onChange={() => setSelectedSizeId(option.id)} data-testid={`radio-size-${dish.id}-${option.id}`} /><span>{option.name}</span><span className="option-extra" dir="ltr">{formatPrice(option.price)}</span></label>)}</div>
          </fieldset>}
          {!!dish.addons?.length && <fieldset className="option-group" style={{ border: 0, padding: 0, marginInline: 0 }}>
            <legend className="option-heading">{dish.categoryId === 'pizza' ? 'الإضافات' : 'إضافات للمائدة'} <small>اختياري</small></legend>
            <div className="option-list">{dish.addons.map((addon) => <label className="option-row" key={addon.id}><input type="checkbox" checked={selectedAddons.includes(addon.id)} onChange={() => setSelectedAddons((current) => current.includes(addon.id) ? current.filter((id) => id !== addon.id) : [...current, addon.id])} data-testid={`checkbox-addon-${dish.id}-${addon.id}`} /><span>{addon.name}</span><span className="option-extra" dir="ltr">+ {formatPrice(addon.price)}</span></label>)}</div>
          </fieldset>}
          <div className="detail-actions">
            <div className="quantity-control" aria-label="الكمية"><button type="button" aria-label="إنقاص الكمية" onClick={() => setQuantity((count) => Math.max(1, count - 1))} data-testid="button-detail-quantity-minus"><Minus size={15} /></button><output aria-live="polite" data-testid="text-detail-quantity">{quantity.toLocaleString('ar')}</output><button type="button" aria-label="زيادة الكمية" onClick={() => setQuantity((count) => count + 1)} data-testid="button-detail-quantity-plus"><Plus size={15} /></button></div>
            <div className="detail-submit"><span className="detail-total" dir="ltr">{formatPrice(unitPrice * quantity)}</span><button className="primary-action" type="button" onClick={() => { onAdd(dish, quantity, size, addons); onClose(); }} data-testid="button-add-to-cart">أضف إلى الطلب</button></div>
          </div>
        </div>
      </section>
    </div>
  );
}

function CartDrawer({ cart, onClose }: { cart: ReturnType<typeof useMenuCart>; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement | null>(null);
  useDialogAccessibility(dialogRef, onClose);
  return (
    <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} data-testid="drawer-cart">
      <section className="sheet cart-sheet" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="cart-title" dir="rtl">
        <header className="cart-head"><h2 id="cart-title">مائدتكم</h2><button className="icon-button" type="button" aria-label="إغلاق السلة" onClick={onClose} data-testid="button-close-cart"><X size={19} /></button></header>
        {cart.lines.length === 0 ? <><div className="cart-empty"><span className="menu-empty-mark"><ShoppingBag size={20} /></span><h3>المائدة ما زالت تنتظركم</h3><p>اختاروا طبقاً من القائمة، وسنحتفظ به هنا.</p></div><footer className="cart-summary"><div className="subtotal-row"><span>المجموع الفرعي</span><span dir="ltr" data-testid="text-cart-subtotal">{formatPrice(0)}</span></div><button className="checkout-disabled" type="button" disabled data-testid="button-checkout-disabled">إتمام الطلب · قريباً</button><p className="checkout-note">الطلب الإلكتروني قيد التجهيز — لا يتم إرسال طلب الآن.</p></footer></> : <>
          <div className="cart-items">{cart.lines.map((line) => {
            const lineUnit = (line.size?.price ?? line.basePrice) + line.addons.reduce((sum, addon) => sum + addon.price, 0);
            return <article className="cart-row" key={line.key} data-testid={`row-cart-item-${line.dishId}-${line.key.replaceAll(':', '-')}`}>
              <div className="cart-row-main"><h3>{line.name}</h3><p>{line.size?.name ? `${line.size.name} · ` : ''}{line.addons.length ? `إضافات: ${line.addons.map((addon) => addon.name).join('، ')}` : 'طبق من قائمة أوريليا'}</p><span className="cart-row-price" dir="ltr">{formatPrice(lineUnit * line.quantity)}</span></div>
              <div className="cart-row-controls"><div className="mini-quantity"><button type="button" aria-label={`تقليل كمية ${line.name}`} onClick={() => cart.changeQuantity(line.key, line.quantity - 1)} data-testid={`button-cart-minus-${line.dishId}`}><Minus size={13} /></button><span>{line.quantity.toLocaleString('ar')}</span><button type="button" aria-label={`زيادة كمية ${line.name}`} onClick={() => cart.changeQuantity(line.key, line.quantity + 1)} data-testid={`button-cart-plus-${line.dishId}`}><Plus size={13} /></button></div><button className="remove-line" type="button" onClick={() => cart.remove(line.key)} data-testid={`button-remove-${line.dishId}`}><Trash2 size={13} /> إزالة</button></div>
            </article>;
          })}</div>
          <footer className="cart-summary"><div className="subtotal-row"><span>المجموع الفرعي</span><span dir="ltr" data-testid="text-cart-subtotal">{formatPrice(cart.subtotal)}</span></div><button className="checkout-disabled" type="button" disabled data-testid="button-checkout-disabled">إتمام الطلب · قريباً</button><p className="checkout-note">الطلب الإلكتروني قيد التجهيز — لا يتم إرسال طلب الآن.</p></footer>
        </>}
      </section>
    </div>
  );
}

export default function MenuPage() {
  const cart = useMenuCart();
  const [search, setSearch] = useState('');
  const [selectedDish, setSelectedDish] = useState<MenuDish | null>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [activeCategory, setActiveCategory] = useState(categories[0].id);
  const [announcement, setAnnouncement] = useState('');
  const [openNow, setOpenNow] = useState(false);
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});
  const filteredDishes = useMemo(() => {
    const term = normalizeArabic(search);
    if (!term) return dishes;
    return dishes.filter((dish) => {
      const category = categories.find((entry) => entry.id === dish.categoryId)?.name ?? '';
      return normalizeArabic([dish.name, dish.description, category, ...dish.ingredients, ...dish.allergens].join(' ')).includes(term);
    });
  }, [search]);
  const filteredByCategory = useMemo(() => categories.map((category) => ({ ...category, dishes: filteredDishes.filter((dish) => dish.categoryId === category.id) })), [filteredDishes]);

  useEffect(() => {
    const root = document.documentElement;
    const previousLang = root.lang;
    const previousDir = root.dir;
    const previousTitle = document.title;
    const existingDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const description = existingDescription ?? document.createElement('meta');
    const previousDescription = existingDescription?.getAttribute('content') ?? null;
    root.lang = 'ar';
    root.dir = 'rtl';
    document.title = 'قائمة أوريليا — AURELIA';
    description.setAttribute('name', 'description');
    description.setAttribute('content', 'اكتشفوا قائمة أوريليا المتوسطية: أطباق موسمية، مكوّنات واضحة، ونكهات من ضفّتَي البحر.');
    if (!description.parentElement) document.head.appendChild(description);
    return () => {
      root.lang = previousLang;
      root.dir = previousDir;
      document.title = previousTitle;
      if (existingDescription) {
        if (previousDescription === null) existingDescription.removeAttribute('content');
        else existingDescription.setAttribute('content', previousDescription);
      } else {
        description.remove();
      }
    };
  }, []);

  useEffect(() => {
    const update = () => {
      const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Damascus', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
      const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
      const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
      setOpenNow(hour * 60 + minute >= 13 * 60);
    };
    update();
    const interval = window.setInterval(update, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (search) return;
    const nodes = categories.map((category) => categoryRefs.current[category.id]).filter((node): node is HTMLElement => Boolean(node));
    if (!nodes.length || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveCategory((visible.target as HTMLElement).dataset.category ?? categories[0].id);
    }, { rootMargin: '-23% 0px -65% 0px', threshold: [0, .15, .5] });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [search]);

  const goToCategory = (id: string) => {
    setActiveCategory(id);
    if (search) {
      setSearch('');
      requestAnimationFrame(() => requestAnimationFrame(() => categoryRefs.current[id]?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })));
      return;
    }
    categoryRefs.current[id]?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };
  const showCart = () => setDialogMode('cart');
  const addToCart = (dish: MenuDish, quantity: number, size?: MenuSize, addons?: MenuAddon[]) => {
    cart.add(dish, quantity, size, addons);
    setAnnouncement(`أضيف ${dish.name} إلى المائدة`);
  };

  return (
    <div className="menu-page" dir="rtl">
      <header className="menu-top">
        <div className="menu-top-inner">
          <div className="menu-brand-row"><BrandMark /><div className="menu-header-actions"><button className="menu-cart-trigger" type="button" onClick={showCart} aria-label={`فتح السلة، ${cart.count} أصناف`} data-testid="button-open-cart"><ShoppingBag size={16} aria-hidden="true" /><span>السلة</span><span className="menu-header-cart-count">{cart.count.toLocaleString('ar')}</span></button><Link href="/" className="menu-home-link" data-testid="link-home-menu">الرئيسية <ArrowLeft size={15} aria-hidden="true" /></Link></div></div>
           <div className="menu-heading"><div className="opening-status" role="status" aria-live="polite"><span className={`opening-light${openNow ? ' is-open' : ''}`} aria-hidden="true" /><strong>{openNow ? 'مفتوح الآن' : 'مغلق الآن'}</strong><span>ساعات تجريبية · يومياً ١:٠٠ ظهراً–١٢:٠٠ ليلاً</span></div><span className="menu-heading-kicker">مائدة من ضفّتَي المتوسط</span><h1>القائمة</h1><p>موسمٌ يُختار بعناية، ويُقدّم كما تحبّون.</p></div>
        </div>
      </header>
      <main className="menu-main">
        <div className="menu-tools">
          <div className="menu-search-wrap"><Search className="menu-search-icon" size={18} aria-hidden="true" /><input className="menu-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحثوا عن طبق، مكوّن أو فئة…" aria-label="ابحثوا في القائمة" data-testid="input-menu-search" />{search && <button className="menu-clear-search" type="button" onClick={() => setSearch('')} aria-label="مسح البحث" data-testid="button-clear-search"><X size={16} /></button>}</div>
          <nav className="category-rail" aria-label="فئات القائمة" data-testid="nav-menu-categories">{categories.map((category) => <button type="button" key={category.id} className={`category-pill${activeCategory === category.id ? ' active' : ''}`} onClick={() => goToCategory(category.id)} data-testid={`button-category-${category.id}`}>{category.name}</button>)}</nav>
        </div>
        <div className="menu-intro"><h2>{search ? 'نتائج من قائمتنا' : 'اختيرت لكم من المطبخ'}</h2><p>{filteredDishes.length.toLocaleString('ar')} طبقاً · تفاصيل ومكوّنات واضحة</p></div>
        {filteredDishes.length === 0 ? <div className="menu-empty" role="status" data-testid="empty-menu-results"><span className="menu-empty-mark"><Search size={19} /></span><h2>لم نعثر على هذا الطبق</h2><p>جرّبوا اسماً آخر أو مكوّناً مختلفاً، فربما خبّأته القائمة باسم آخر.</p><button type="button" onClick={() => setSearch('')} data-testid="button-reset-search">عرض القائمة كاملة</button></div> : filteredByCategory.filter((category) => category.dishes.length > 0).map((category) => <section className="menu-category" key={category.id} data-category={category.id} ref={(node) => { categoryRefs.current[category.id] = node; }} aria-labelledby={`category-${category.id}`}>
          <h2 className="category-title" id={`category-${category.id}`}>{category.name}<span>{category.dishes.length.toLocaleString('ar')} أطباق</span></h2>
          <div className="dish-list">{category.dishes.map((dish) => <DishCard key={dish.id} dish={dish} categoryName={category.name} onSelect={(selected) => { setSelectedDish(selected); setDialogMode('dish'); }} />)}</div>
        </section>)}
      </main>
      <footer className="menu-footer"><strong>AURELIA</strong><p>المائدة أجمل حين تجمعنا.</p></footer>
      <span className="sr-only" role="status" aria-live="polite">{announcement}</span>
      {cart.count > 0 && <button className="floating-cart" type="button" onClick={showCart} aria-label={`عرض المائدة، ${cart.count} أصناف`} data-testid="button-open-cart-floating"><span className="cart-count">{cart.count.toLocaleString('ar')}</span><span>عرض المائدة</span><span>{formatPrice(cart.subtotal)}</span><ChevronDown size={15} aria-hidden="true" /></button>}
      {dialogMode === 'dish' && selectedDish && <DishDetails key={selectedDish.id} dish={selectedDish} onClose={() => setDialogMode(null)} onAdd={addToCart} />}
      {dialogMode === 'cart' && <CartDrawer cart={cart} onClose={() => setDialogMode(null)} />}
    </div>
  );
}