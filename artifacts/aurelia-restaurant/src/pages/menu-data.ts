export type MenuCategory = {
  id: string;
  name: string;
  description: string;
};

export type MenuAddon = { id: string; name: string; price: number };
export type MenuSize = { id: string; name: string; price: number };
export type MenuDish = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  ingredients: string[];
  allergens: string[];
  price: number;
  image: string;
  badges?: string[];
  sizes?: MenuSize[];
  addons?: MenuAddon[];
};

export const categories: MenuCategory[] = [
  { id: 'appetizers', name: 'المقبلات', description: 'لقيمات صغيرة تفتح الحكاية' },
  { id: 'salads', name: 'السلطات', description: 'خضرة الموسم بلمسة المتوسط' },
  { id: 'mains', name: 'الأطباق الرئيسية', description: 'أطباق تستحق أن نطيل الجلسة' },
  { id: 'grills', name: 'المشاوي', description: 'نكهة الفحم على أصولها' },
  { id: 'pizza', name: 'البيتزا', description: 'عجين مخمّر ومكوّنات الموسم' },
  { id: 'pasta', name: 'المعكرونة', description: 'عجين طازج وصلصات تُحضّر يومياً' },
  { id: 'desserts', name: 'الحلويات', description: 'خاتمة حلوة على مهل' },
  { id: 'drinks', name: 'المشروبات', description: 'ارتواء يليق بالموسم' },
];

export const dishes: MenuDish[] = [
  { id: 'hummus-aurelia', categoryId: 'appetizers', name: 'حمّص أوريليا', description: 'حمّص مخملي، زيت زيتون بكر، حمص مقرمش وخبز تنور دافئ.', ingredients: ['حمّص', 'طحينة', 'ليمون', 'زيت زيتون', 'سماق'], allergens: ['سمسم', 'قمح'], price: 12, image: '/images/menu/mezze.webp', badges: ['الأكثر طلباً'] },
  { id: 'crispy-halloumi', categoryId: 'appetizers', name: 'حلّوم مقرمش', description: 'أصابع حلّوم ذهبية، عسل زعتر، رمان طازج ونعناع.', ingredients: ['جبن حلّوم', 'عسل', 'زعتر', 'رمان', 'نعناع'], allergens: ['حليب'], price: 16, image: '/images/menu/halloumi.webp' },
  { id: 'garden-salad', categoryId: 'salads', name: 'سلطة الحديقة', description: 'طماطم ناضجة، خيار، أعشاب طازجة، زيتون وزيت زيتون ليموني.', ingredients: ['طماطم', 'خيار', 'بقدونس', 'نعناع', 'زيتون', 'ليمون'], allergens: [], price: 15, image: '/images/menu/salad.webp', badges: ['جديد'] },
  { id: 'beet-labneh', categoryId: 'salads', name: 'شمندر ولبنة', description: 'شمندر مشوي، لبنة مخفوقة، جوز محمّص ودبس رمان.', ingredients: ['شمندر', 'لبنة', 'جوز', 'دبس رمان', 'شبت'], allergens: ['حليب', 'مكسرات'], price: 17, image: '/images/menu/beet-salad.webp' },
  { id: 'slow-lamb-shoulder', categoryId: 'mains', name: 'كتف الغنم على مهل', description: 'كتف غنم مطهو لساعات، دبس رمان، فريكة محمّصة وأعشاب الحديقة.', ingredients: ['كتف غنم', 'دبس رمان', 'فريكة', 'زعتر بري', 'لبن'], allergens: ['قمح', 'حليب'], price: 38, image: '/images/menu/lamb.webp', badges: ['اختيار الشيف'] },
  { id: 'baked-sea-bass', categoryId: 'mains', name: 'قاروص الفرن بالأعشاب', description: 'قاروص كامل مشوي بالفرن، ليمون محفوظ، زيتون أخضر وبقدونس.', ingredients: ['قاروص', 'ليمون محفوظ', 'زيتون أخضر', 'بقدونس', 'زيت زيتون'], allergens: ['سمك'], price: 36, image: '/images/menu/seabass.webp', sizes: [{ id: 'regular', name: 'حصة فردية', price: 36 }, { id: 'sharing', name: 'حصة للمشاركة', price: 62 }] },
  { id: 'aurelia-grill', categoryId: 'grills', name: 'مشاوي أوريليا', description: 'كباب لحم متبّل، دجاج مشوي، خضار على الفحم وصلصة طحينة.', ingredients: ['لحم بقري', 'دجاج', 'فلفل مشوي', 'طحينة', 'سماق'], allergens: ['سمسم'], price: 34, image: '/images/menu/grill.webp', badges: ['الأكثر طلباً'] },
  { id: 'charcoal-octopus', categoryId: 'grills', name: 'أخطبوط على الفحم', description: 'أخطبوط طري، بطاطا صغيرة، ليمون محروق وزيت بقدونس.', ingredients: ['أخطبوط', 'بطاطا', 'ليمون', 'بقدونس', 'زيت زيتون'], allergens: ['رخويات'], price: 32, image: '/images/menu/octopus.webp' },
  { id: 'fig-ricotta-pizza', categoryId: 'pizza', name: 'بيتزا التين والريكوتا', description: 'عجين مخمّر، تين موسمي، ريكوتا كريمية، عسل وإكليل الجبل.', ingredients: ['عجين قمح', 'تين', 'ريكوتا', 'عسل', 'إكليل الجبل'], allergens: ['قمح', 'حليب'], price: 21, image: '/images/menu/pizza.webp', badges: ['جديد'], sizes: [{ id: 'small', name: 'صغير', price: 16 }, { id: 'medium', name: 'وسط', price: 21 }, { id: 'large', name: 'كبير', price: 27 }], addons: [{ id: 'extra-cheese', name: 'جبنة إضافية', price: 3 }, { id: 'sauce', name: 'صوص', price: 2 }, { id: 'extra-chicken', name: 'دجاج إضافي', price: 5 }] },
  { id: 'wild-mushroom-pizza', categoryId: 'pizza', name: 'بيتزا الفطر البري', description: 'فطر بري، موزاريلا، زعتر طازج وكريمة ثوم محمّص.', ingredients: ['عجين قمح', 'فطر بري', 'موزاريلا', 'ثوم', 'زعتر'], allergens: ['قمح', 'حليب'], price: 22, image: '/images/menu/mushroom-pizza.webp', sizes: [{ id: 'small', name: 'صغير', price: 17 }, { id: 'medium', name: 'وسط', price: 22 }, { id: 'large', name: 'كبير', price: 28 }], addons: [{ id: 'extra-cheese', name: 'جبنة إضافية', price: 3 }, { id: 'sauce', name: 'صوص', price: 2 }, { id: 'extra-chicken', name: 'دجاج إضافي', price: 5 }] },
  { id: 'saffron-prawn-tagliatelle', categoryId: 'pasta', name: 'تالياتيلي الروبيان والزعفران', description: 'معكرونة طازجة، روبيان، زعفران، طماطم كرزية ولمسة كريمة.', ingredients: ['تالياتيلي قمح', 'روبيان', 'زعفران', 'كريمة', 'طماطم'], allergens: ['قمح', 'قشريات', 'حليب'], price: 27, image: '/images/menu/pasta.webp', badges: ['اختيار الشيف'] },
  { id: 'wild-mushroom-tagliatelle', categoryId: 'pasta', name: 'تالياتيلي الفطر البري', description: 'معكرونة طازجة، فطر بري، مريمية مقرمشة وبارميزان معتّق.', ingredients: ['تالياتيلي قمح', 'فطر بري', 'مريمية', 'بارميزان', 'زبدة'], allergens: ['قمح', 'حليب'], price: 24, image: '/images/menu/mushroom-pasta.webp' },
  { id: 'pistachio-rose-mille-feuille', categoryId: 'desserts', name: 'ميل فوي الفستق والورد', description: 'رقائق مورّقة، كريمة ورد خفيفة، فستق حلبي وتوت أحمر.', ingredients: ['عجينة مورّقة', 'فستق', 'كريمة', 'ماء ورد', 'توت'], allergens: ['قمح', 'مكسرات', 'حليب'], price: 14, image: '/images/menu/dessert.webp', badges: ['الأكثر طلباً'] },
  { id: 'orange-blossom-cheesecake', categoryId: 'desserts', name: 'تشيزكيك زهر البرتقال', description: 'تشيزكيك مخبوز، زهر برتقال، قشرة بسكويت وكمبوت حمضيات.', ingredients: ['جبن كريمي', 'زهر البرتقال', 'بيض', 'بسكويت قمح', 'برتقال'], allergens: ['حليب', 'بيض', 'قمح'], price: 13, image: '/images/menu/cheesecake.webp' },
  { id: 'pomegranate-orange-spritz', categoryId: 'drinks', name: 'سبريتز الرمان والبرتقال', description: 'رمان حامض، برتقال طازج، ماء فوار وإكليل الجبل.', ingredients: ['رمان', 'برتقال', 'ماء فوار', 'إكليل الجبل'], allergens: [], price: 10, image: '/images/menu/drinks.webp' },
  { id: 'lavender-lemonade', categoryId: 'drinks', name: 'ليموناضة اللافندر', description: 'ليمون طازج، شراب لافندر عطري ونعناع محضّر يومياً.', ingredients: ['ليمون', 'لافندر', 'نعناع', 'ماء'], allergens: [], price: 8, image: '/images/menu/lemonade.webp' },
];

export const formatPrice = (price: number) => `${price.toLocaleString('ar', { maximumFractionDigits: 0 })} $`;
export const normalizeArabic = (value: string) => value.toLocaleLowerCase('ar').normalize('NFKD').replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').trim();