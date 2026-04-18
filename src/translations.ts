
export type Language = 'en' | 'ar';

export interface Translations {
  nav: {
    products: string;
    brands: string;
    industries: string;
    about: string;
    contact: string;
    login: string;
    myAccount: string;
    adminDashboard: string;
    logout: string;
  };
  hero: {
    badge: string;
    title: string;
    titleAccent: string;
    subtitle: string;
    list1: string;
    list2: string;
    list3: string;
    ctaCatalog: string;
    ctaQuote: string;
    stock: string;
    shipping: string;
    oem: string;
    support: string;
    b2b: string;
  };
  quote: {
    title: string;
    subtitle: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    partDetails: string;
    quantity: string;
    urgency: string;
    urgencyStandard: string;
    urgencyUrgent: string;
    urgencyEmergency: string;
    uploadTitle: string;
    uploadDesc: string;
    send: string;
    sending: string;
    success: string;
    successDesc: string;
    newEnquiry: string;
    errorLargeFile: string;
    errorSubmit: string;
  };
  footer: {
    locations: string;
    industries: string;
    brands: string;
    service: string;
    rights: string;
    privacy: string;
    terms: string;
    phone: string;
    email: string;
    hours: string;
    address: string;
  };
  contact: {
    title: string;
    subtitle: string;
    addressTitle: string;
    emailTitle: string;
    phoneTitle: string;
    hoursTitle: string;
    company: string;
  };
  industriesSection: {
    title: string;
    titleAccent: string;
    ind1: string;
    ind1Desc: string;
    ind2: string;
    ind2Desc: string;
    ind3: string;
    ind3Desc: string;
    ind4: string;
    ind4Desc: string;
    ind5: string;
    ind5Desc: string;
    ind6: string;
    ind6Desc: string;
  };
  howItWorks: {
    title: string;
    titleAccent: string;
    step1: string;
    step1Desc: string;
    step2: string;
    step2Desc: string;
    step3: string;
    step3Desc: string;
    step4: string;
    step4Desc: string;
    logisticsTitle: string;
    logisticsAccent: string;
    logisticsDesc: string;
    shipping: string;
    logisticsBadge: string;
    helpTitle: string;
    helpDesc: string;
    whatsapp: string;
  };
  stats: {
    orders: string;
    delivery: string;
    accounts: string;
    years: string;
    t1: string;
    t2: string;
    t3: string;
  };
  categories: {
    title: string;
    titleAccent: string;
    viewParts: string;
    viewCatalogue: string;
    pumps: string;
    pumpsDesc: string;
    motors: string;
    motorsDesc: string;
    cylinders: string;
    cylindersDesc: string;
    valves: string;
    valvesDesc: string;
    seals: string;
    sealsDesc: string;
    hoses: string;
    hosesDesc: string;
    filters: string;
    filtersDesc: string;
    powerUnits: string;
    powerUnitsDesc: string;
  };
  featured: {
    title: string;
    titleAccent: string;
    allStock: string;
    requestQuote: string;
  };
  search: {
    title: string;
    placeholder: string;
    brand: string;
    industry: string;
    availability: string;
    allItems: string;
    inStockOnly: string;
    loading: string;
    noResults: string;
    adjustFilters: string;
    pn: string;
    inStock: string;
    outOfStock: string;
    requestQuote: string;
  };
  chat: {
    title: string;
    online: string;
    welcome: string;
    placeholder: string;
    systemInstruction: string;
  };
  dashboard: {
    title: string;
    welcome: string;
    orders: string;
    tracking: string;
    favorites: string;
    profile: string;
    quotes: string;
    noOrders: string;
    noTracking: string;
    noFavorites: string;
    noQuotes: string;
    orderId: string;
    carrier: string;
    estDelivery: string;
    pn: string;
    editProfile: string;
    partDetails: string;
    quantity: string;
    photo: string;
    individual: string;
    urgency: string;
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    nav: {
      products: 'Products',
      brands: 'Brands',
      industries: 'Industries',
      about: 'About Us',
      contact: 'Contact',
      login: 'Login',
      myAccount: 'My Account',
      adminDashboard: 'Admin Dashboard',
      logout: 'Logout',
    },
    hero: {
      badge: '#1 Hydraulic Spare Parts Supplier in Saudi Arabia',
      title: 'Premium Hydraulic Parts.',
      titleAccent: 'Distributing Across KSA.',
      subtitle: 'Trucks and Hydraulic Solutions, as a leader in hydraulic systems and components, offers high quality and reliable products. With our wide range of products, we provide the most suitable solutions for your industrial needs.',
      list1: 'We provide hydraulic solutions for agricultural, industrial, and mobile applications.',
      list2: 'We offer a variety of components used in numerous fluid power systems as complete sets.',
      list3: 'In response to market needs, we continue to supply new products in collaboration with leading manufacturers.',
      ctaCatalog: 'Browse Catalogue',
      ctaQuote: 'Request a Quote',
      stock: '10,000+ Parts in Stock',
      shipping: 'Fast Worldwide Shipping',
      oem: 'OEM & Aftermarket',
      support: 'Expert Technical Support',
      b2b: 'Secure B2B Ordering'
    },
    quote: {
      title: 'Request a Fast Quote',
      subtitle: 'Need parts in a hurry? Fill out the form below or send us a photo of the nameplate/part via WhatsApp for instant identification.',
      name: 'Full Name',
      company: 'Company Name',
      email: 'Email Address',
      phone: 'Phone Number',
      partDetails: 'Part Details (Name, Part Number, or Description)',
      quantity: 'Quantity',
      urgency: 'Urgency Level',
      urgencyStandard: 'Standard',
      urgencyUrgent: 'Urgent',
      urgencyEmergency: 'Emergency (Downtime)',
      uploadTitle: 'Upload Nameplate/Photos (Optional)',
      uploadDesc: 'Click to upload or drag and drop. Max 1MB.',
      send: 'Send Enquiry',
      sending: 'Sending...',
      success: 'Enquiry Sent Successfully!',
      successDesc: 'We have received your quote request. Our expert team will review it and get back to you with pricing and availability as soon as possible.',
      newEnquiry: 'Send New Enquiry',
      errorLargeFile: 'The photo is too large. Please use a smaller image or a screenshot.',
      errorSubmit: 'There was an error submitting your request.'
    },
    footer: {
      locations: 'Locations Served',
      industries: 'Industries',
      brands: 'Manufacturer Support',
      service: 'Service Area',
      rights: 'All rights reserved.',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
      phone: 'Phone Support',
      email: 'Email Enquiry',
      hours: 'Business Hours',
      address: 'Industrial Area, Saudi Arabia'
    },
    contact: {
      title: 'Get in Touch',
      subtitle: 'Our technical team is ready to assist you with part identification, cross-referencing, and urgent sourcing requirements.',
      addressTitle: 'Registered Address',
      emailTitle: 'Contact Email',
      phoneTitle: 'Phone Number',
      hoursTitle: 'Business Hours',
      company: 'Company Name'
    },
    industriesSection: {
      title: 'Built for the Industries That',
      titleAccent: "Can't Afford Downtime",
      ind1: "Construction & Excavation",
      ind1Desc: "Heavy-duty pumps and motors for earthmoving equipment.",
      ind2: "Agriculture & Farming",
      ind2Desc: "Reliable components for tractors, harvesters, and irrigation.",
      ind3: "Industrial Manufacturing",
      ind3Desc: "Precision hydraulics for factory automation and presses.",
      ind4: "Marine & Offshore",
      ind4Desc: "Corrosion-resistant parts for winches and steering systems.",
      ind5: "Mining & Quarrying",
      ind5Desc: "Rugged solutions for extreme environments and high loads.",
      ind6: "Forestry & Logging",
      ind6Desc: "Specialized components for feller bunchers and forwarders."
    },
    howItWorks: {
      title: 'Simple Ordering.',
      titleAccent: 'Fast Delivery.',
      step1: "Search Part Number",
      step1Desc: "Use our search tool or browse by category to find your specific component.",
      step2: "Get Quote in 2 Hours",
      step2Desc: "Our experts verify stock and provide a competitive quote within 120 minutes.",
      step3: "Confirm & Pay",
      step3Desc: "Secure B2B payment options including bank transfer and major cards.",
      step4: "Dispatched Same Day",
      step4Desc: "Orders confirmed before 2pm are shipped the same business day.",
      logisticsTitle: "Worldwide",
      logisticsAccent: "Logistics Network",
      logisticsDesc: "Our strategic location and partnership with global carriers and manufacturers allow us to dispatch critical hydraulic components to any industrial hub. We also handle all customs documentation for a hassle-free experience in Saudi Arabia and Jordan.",
      shipping: "Express Air Freight Available",
      logisticsBadge: "Global Shipping",
      helpTitle: "Need help identifying a part?",
      helpDesc: "Send us photos of the nameplate or the component via WhatsApp.",
      whatsapp: "Chat on WhatsApp"
    },
    stats: {
      orders: "Orders Shipped",
      delivery: "On-Time Delivery",
      accounts: "Active B2B Accounts",
      years: "Years in Industry",
      t1: "TRUCKS & HYDRAULICS SOLUTIONS saved us from a week of downtime. They had a rare Rexroth pump in stock and shipped it within hours.",
      t2: "The technical support is unmatched. They helped us identify an obsolete part and suggested a perfect OEM-compatible alternative.",
      t3: "Reliable, fast, and professional. Our primary supplier for all hydraulic needs across our maintenance operations."
    },
    categories: {
      title: "Browse by",
      titleAccent: "Category",
      viewParts: "View Parts",
      viewCatalogue: "View Full Catalogue",
      pumps: "Hydraulic Pumps",
      pumpsDesc: "Piston, Vane, and Gear pumps for all applications.",
      motors: "Hydraulic Motors",
      motorsDesc: "High-torque, low-speed and high-speed options.",
      cylinders: "Cylinders & Rams",
      cylindersDesc: "Standard and custom-built hydraulic cylinders.",
      valves: "Control Valves",
      valvesDesc: "Directional, pressure, and flow control solutions.",
      seals: "Seals & O-Rings",
      sealsDesc: "High-performance sealing kits for all brands.",
      hoses: "Hoses & Fittings",
      hosesDesc: "Custom hose assemblies and industrial fittings.",
      filters: "Hydraulic Filters",
      filtersDesc: "Suction, pressure, and return line filtration.",
      powerUnits: "Power Units",
      powerUnitsDesc: "Complete hydraulic power pack systems."
    },
    featured: {
      title: "In-Stock &",
      titleAccent: "Ready to Ship",
      allStock: "See all available stock",
      requestQuote: "Request Quote"
    },
    search: {
      title: "Advanced Part Search",
      placeholder: "Search by Part Number, Name, or Brand...",
      brand: "Brand",
      industry: "Industry",
      availability: "Availability",
      allItems: "All Items",
      inStockOnly: "In Stock Only",
      loading: "Accessing Inventory...",
      noResults: "No matching parts found",
      adjustFilters: "Try adjusting your filters or search terms",
      pn: "PN",
      inStock: "In Stock",
      outOfStock: "Out of Stock",
      requestQuote: "Request Quote"
    },
    chat: {
      title: "AI Specialist",
      online: "Online",
      welcome: "Hello! I'm the TRUCKS & HYDRAULICS SOLUTIONS AI Expert. How can I help you find the right hydraulic components today?",
      placeholder: "Ask about parts, brands, or technical specs...",
      systemInstruction: `You are the TRUCKS & HYDRAULICS SOLUTIONS Expert Assistant. Your goal is to help users find hydraulic spare parts, identify components from descriptions, check stock (simulated), and provide technical support. 
          You are professional, authoritative, and helpful. 
          You know about brands like Rexroth, Danfoss, Parker, Vickers, and Eaton. 
          If a user asks for a part you don't know, ask for the part number or a photo. 
          Always encourage them to 'Request a Quote' for official pricing and availability.
          Keep responses concise and focused on industrial hydraulic solutions.`
    },
    dashboard: {
      title: "B2B Account Dashboard",
      welcome: "Welcome back",
      orders: "Orders",
      tracking: "Tracking",
      favorites: "Favorites",
      profile: "Company Profile",
      quotes: "Quote Requests",
      noOrders: "No orders found.",
      noTracking: "No active shipments.",
      noFavorites: "No favorite parts saved.",
      noQuotes: "No quote requests found.",
      orderId: "Order #",
      carrier: "Carrier",
      estDelivery: "Estimated Delivery",
      pn: "PN",
      editProfile: "Edit Company Details",
      partDetails: "Part Details",
      quantity: "Quantity",
      photo: "Attached Photo",
      individual: "Individual",
      urgency: "Urgency"
    }
  },
  ar: {
    nav: {
      products: 'المنتجات',
      brands: 'العلامات التجارية',
      industries: 'الصناعات',
      about: 'من نحن',
      contact: 'اتصل بنا',
      login: 'تسجيل الدخول',
      myAccount: 'حسابي',
      adminDashboard: 'لوحة التحكم',
      logout: 'تسجيل الخروج',
    },
    hero: {
      badge: 'المورد الأول لقطع غيار الهيدروليك في المملكة العربية السعودية',
      title: 'قطع غيار هيدروليك ممتازة.',
      titleAccent: 'توزيع في جميع أنحاء المملكة.',
      subtitle: 'تقدم شركة تركس آند هيدروليك سوليوشنز، كشركة رائدة في الأنظمة والمكونات الهيدروليكية، منتجات عالية الجودة وموثوقة. مع مجموعتنا الواسعة من المنتجات، نقدم الحلول الأكثر ملاءمة لاحتياجاتك الصناعية.',
      list1: 'نقدم حلولاً هيدروليكية للتطبيقات الزراعية والصناعية والمتنقلة.',
      list2: 'نقدم مجموعة متنوعة من المكونات المستخدمة في العديد من أنظمة طاقة السوائل كمجموعات كاملة.',
      list3: 'استجابة لاحتياجات السوق، نواصل توريد منتجات جديدة بالتعاون مع الشركات المصنعة الرائدة.',
      ctaCatalog: 'تصفح الكتالوج',
      ctaQuote: 'اطلب عرض سعر',
      stock: 'أكثر من 10,000 قطعة في المخزون',
      shipping: 'شحن سريع لجميع أنحاء العالم',
      oem: 'قطع أصلية وبديلة',
      support: 'دعم فني خبير',
      b2b: 'إجراء طلبات B2B آمنة'
    },
    quote: {
      title: 'اطلب عرض سعر سريع',
      subtitle: 'هل تحتاج إلى قطع غيار بسرعة؟ املأ النموذج أدناه أو أرسل لنا صورة للوحة الاسم/القطعة عبر الواتساب للتعرف عليها فوراً.',
      name: 'الاسم الكامل',
      company: 'اسم الشركة',
      email: 'البريد الإلكتروني',
      phone: 'رقم الهاتف',
      partDetails: 'تفاصيل القطعة (الاسم، رقم القطعة، أو الوصف)',
      quantity: 'الكمية',
      urgency: 'مستوى الاستعجال',
      urgencyStandard: 'عادي',
      urgencyUrgent: 'عاجل',
      urgencyEmergency: 'حالة طوارئ (توقف العمل)',
      uploadTitle: 'رفع لوحة الاسم/الصور (اختياري)',
      uploadDesc: 'انقر للرفع أو اسحب وأفلت. الحد الأقصى 1 ميجابايت.',
      send: 'إرسال الطلب',
      sending: 'جاري الإرسال...',
      success: 'تم إرسال الطلب بنجاح!',
      successDesc: 'لقد استلمنا طلب عرض السعر الخاص بك. سيقوم فريق الخبراء لدينا بمراجعته والرد عليك بالأسعار والتوافر في أقرب وقت ممكن.',
      newEnquiry: 'إرسال طلب جديد',
      errorLargeFile: 'الصورة كبيرة جداً. يرجى استخدام صورة أصغر أو لقطة شاشة.',
      errorSubmit: 'حدث خطأ أثناء إرسال طلبك.'
    },
    footer: {
      locations: 'المواقع التي نخدمها',
      industries: 'الصناعات',
      brands: 'دعم الشركات المصنعة',
      service: 'منطقة الخدمة',
      rights: 'جميع الحقوق محفوظة.',
      privacy: 'سياسة الخصوصية',
      terms: 'شروط الخدمة',
      phone: 'دعم الهاتف',
      email: 'استفسار عبر البريد',
      hours: 'ساعات العمل',
      address: 'المنطقة الصناعية، المملكة العربية السعودية'
    },
    contact: {
      title: 'تواصل معنا',
      subtitle: 'فريقنا الفني جاهز لمساعدتكم في تحديد القطع ومطابقتها وتلبية احتياجات التوريد العاجلة.',
      addressTitle: 'العنوان المسجل',
      emailTitle: 'البريد الإلكتروني',
      phoneTitle: 'رقم الهاتف',
      hoursTitle: 'ساعات العمل',
      company: 'اسم الشركة'
    },
    industriesSection: {
      title: 'بنيت للصناعات التي',
      titleAccent: "لا تتحمل التوقف عن العمل",
      ind1: "البناء والحفر",
      ind1Desc: "مضخات ومحركات شديدة التحمل لمعدات تحريك التربة.",
      ind2: "الزراعة والمزارع",
      ind2Desc: "مكونات موثوقة للجرارات والحصادات والري.",
      ind3: "التصنيع الصناعي",
      ind3Desc: "هيدروليك دقيق لأتمتة المصانع والمكابس.",
      ind4: "البحرية والأوفشور",
      ind4Desc: "قطع مقاومة للتآكل للروافع وأنظمة التوجيه.",
      ind5: "التعدين والمحاجر",
      ind5Desc: "حلول قوية للبيئات القاسية والأحمال العالية.",
      ind6: "الحراجة وقطع الأخشاب",
      ind6Desc: "مكونات متخصصة لآلات قطع وتجميع الأشجار."
    },
    howItWorks: {
      title: 'طلب بسيط.',
      titleAccent: 'تسليم سريع.',
      step1: "ابحث عن رقم القطعة",
      step1Desc: "استخدم أداة البحث الخاصة بنا أو تصفح حسب الفئة للعثور على قطعتك المحددة.",
      step2: "احصل على سعر خلال ساعتين",
      step2Desc: "خبراؤنا يتأكدون من المخزون ويقدمون سعراً تنافسياً خلال 120 دقيقة.",
      step3: "أكد وادفع",
      step3Desc: "خيارات دفع B2B آمنة تشمل التحويل البنكي والبطاقات الرئيسية.",
      step4: "شحن في نفس اليوم",
      step4Desc: "الطلبات المؤكدة قبل الساعة 2 ظهراً يتم شحنها في نفس يوم العمل.",
      logisticsTitle: "شبكة لوجستية",
      logisticsAccent: "عالمية",
      logisticsDesc: "موقعنا الاستراتيجي وشراكتنا مع شركات النقل والمصنعين العالميين تتيح لنا إرسال المكونات الهيدروليكية الهامة إلى أي مركز صناعي. كما نتعامل مع جميع وثائق الجمارك لتجربة خالية من المتاعب في السعودية والأردن.",
      shipping: "يتوفر شحن جوي سريع",
      logisticsBadge: "شحن عالمي",
      helpTitle: "هل تحتاج مساعدة في تحديد القطعة؟",
      helpDesc: "أرسل لنا صوراً للوحة الاسم أو المكون عبر الواتساب.",
      whatsapp: "تحدث عبر الواتساب"
    },
    stats: {
      orders: "طلبات شحنت",
      delivery: "تسليم في الوقت",
      accounts: "حسابات B2B نشطة",
      years: "سنوات في الصناعة",
      t1: "شركة تركس آند هيدروليك سوليوشنز أنقذتنا من أسبوع من التوقف. كان لديهم مضخة ريكسروث نادرة في المخزون وقاموا بشحنها خلال ساعات.",
      t2: "الدعم الفني لا يعلى عليه. ساعدونا في تحديد قطعة قديمة واقترحوا بديلاً ممتازاً متوافقاً.",
      t3: "موثوق، سريع، ومحترف. موردنا الأساسي لجميع احتياجات الهيدروليك في عمليات الصيانة لدينا."
    },
    categories: {
      title: "تصفح حسب",
      titleAccent: "الفئة",
      viewParts: "عرض القطع",
      viewCatalogue: "عرض الكتالوج الكامل",
      pumps: "مضخات هيدروليكية",
      pumpsDesc: "مضخات كباسية، ريشية، وترسية لجميع التطبيقات.",
      motors: "محركات هيدروليكية",
      motorsDesc: "خيارات عزم دوران عالي وسرعة منخفضة وسرعة عالية.",
      cylinders: "أسطوانات وكباشات",
      cylindersDesc: "أسطوانات هيدروليكية قياسية ومصنعة حسب الطلب.",
      valves: "صمامات التحكم",
      valvesDesc: "حلول التحكم في الاتجاه والضغط والتدفق.",
      seals: "موانع التسرب وحلقات O",
      sealsDesc: "أطقم سد عالية الأداء لجميع العلامات التجارية.",
      hoses: "خراطيم وتوصيلات",
      hosesDesc: "تجميع خراطيم مخصصة وتوصيلات صناعية.",
      filters: "فلاتر هيدروليكية",
      filtersDesc: "فلترة خطوط السحب والضغط والراجع.",
      powerUnits: "وحدات طاقة",
      powerUnitsDesc: "أنظمة وحدات الطاقة الهيدروليكية الكاملة."
    },
    featured: {
      title: "متوفر في المخزون و",
      titleAccent: "جاهز للشحن",
      allStock: "شاهد جميع المخزون المتاح",
      requestQuote: "اطلب عرض سعر"
    },
    search: {
      title: "بحث متقدم عن القطع",
      placeholder: "ابحث برقم القطعة، الاسم، أو العلامة التجارية...",
      brand: "العلامة التجارية",
      industry: "الصناعة",
      availability: "التوفر",
      allItems: "جميع القطع",
      inStockOnly: "متوفر فقط",
      loading: "جاري الوصول إلى المخزون...",
      noResults: "لم يتم العثور على قطع مطابقة",
      adjustFilters: "حاول تغيير عوامل التصفية أو مصطلحات البحث",
      pn: "رقم القطعة",
      inStock: "متوفر",
      outOfStock: "غير متوفر",
      requestQuote: "اطلب عرض سعر"
    },
    chat: {
      title: "خبير الذكاء الاصطناعي",
      online: "متصل",
      welcome: "مرحباً! أنا الخبير الافتراضي لشركة تركس آند هيدروليك سوليوشنز. كيف يمكنني مساعدتك في العثور على المكونات الهيدروليكية الصحيحة اليوم؟",
      placeholder: "اسأل عن القطع، العلامات التجارية، أو المواصفات الفنية...",
      systemInstruction: `أنت المساعد الخبير لشركة TRUCKS & HYDRAULICS SOLUTIONS. هدفك هو مساعدة المستخدمين في العثور على قطع غيار الهيدروليك، وتحديد المكونات من الأوصاف، والتحقق من المخزون (محاكاة)، وتقديم الدعم الفني.
          أنت محترف وموثوق ومتعاون.
          أنت تعرف عن علامات تجارية مثل Rexroth و Danfoss و Parker و Vickers و Eaton.
          إذا سأل مستخدم عن قطعة لا تعرفها، اطلب رقم القطعة أو صورة.
          شجعهم دائماً على 'طلب عرض سعر' للحصول على الأسعار والتوافر الرسمي.
          اجعل الردود موجزة ومركزة على الحلول الهيدروليكية الصناعية.
          أجب باللغة العربية.`
    },
    dashboard: {
      title: "لوحة تحكم حساب B2B",
      welcome: "مرحباً بعودتك",
      orders: "الطلبات",
      tracking: "التتبع",
      favorites: "المفضلة",
      profile: "ملف الشركة",
      quotes: "طلبات عروض الأسعار",
      noOrders: "لم يتم العثور على طلبات.",
      noTracking: "لا توجد شحنات نشطة.",
      noFavorites: "لا توجد قطع محفوظة في المفضلة.",
      noQuotes: "لم يتم العثور على طلبات عروض أسعار.",
      orderId: "طلب رقم #",
      carrier: "الناقل",
      estDelivery: "موعد التسليم المتوقع",
      pn: "رقم القطعة",
      editProfile: "تعديل تفاصيل الشركة",
      partDetails: "تفاصيل القطعة",
      quantity: "الكمية",
      photo: "الصورة المرفقة",
      individual: "فرد",
      urgency: "الأهمية"
    }
  }
};
