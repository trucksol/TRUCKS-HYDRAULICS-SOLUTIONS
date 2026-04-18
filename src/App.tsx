/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  Mail, 
  Clock, 
  Search, 
  Menu, 
  X, 
  ArrowRight, 
  CheckCircle2, 
  Truck, 
  ShieldCheck, 
  Wrench, 
  ShoppingCart, 
  MessageCircle, 
  Star, 
  ChevronUp, 
  Upload, 
  MapPin, 
  Instagram, 
  Linkedin, 
  Facebook, 
  Twitter,
  Settings,
  Zap,
  Layers,
  Filter,
  Droplets,
  Activity,
  Cpu,
  Send,
  Bot,
  MessageSquare,
  Loader2,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence, useScroll, useSpring, useInView } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc,
  serverTimestamp, 
  orderBy,
  getDocFromServer
} from 'firebase/firestore';
import { auth, db, storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Fuse from 'fuse.js';
import { Language, translations, Translations } from './translations';

// --- Language Context ---
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = React.createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: translations.en
});

const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const value = {
    language,
    setLanguage,
    t: translations[language]
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

const useTranslation = () => React.useContext(LanguageContext);

// --- Gemini Initialization ---
let aiInstance: GoogleGenAI | null = null;
declare const __GEMINI_API_KEY__: string;

const getAI = () => {
  if (!aiInstance) {
    // 1. Try the direct replacement from vite.config.ts (most reliable for Vercel)
    let apiKey = '';
    try {
      apiKey = (__GEMINI_API_KEY__ as any);
    } catch (e) {
      // __GEMINI_API_KEY__ not defined
    }
    
    // 2. Fallbacks
    if (!apiKey || apiKey === "undefined" || apiKey === "null" || apiKey === "") {
      apiKey = import.meta.env.VITE_GEMINI_API_KEY || (process as any).env.VITE_GEMINI_API_KEY || (process as any).env.GEMINI_API_KEY;
    }

    if (!apiKey || apiKey === "undefined" || apiKey === "null" || apiKey === "MY_GEMINI_API_KEY" || apiKey === "") {
      console.error("GEMINI_API_KEY is missing in the build. Please ensure VITE_GEMINI_API_KEY is set in Vercel.");
      throw new Error("MISSING_API_KEY");
    }

    if (apiKey.includes("VITE_GEMINI_API_KEY")) {
      console.error("GEMINI_API_KEY appears to be the variable NAME instead of the VALUE.");
      throw new Error("INVALID_KEY_VALUE");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return new Error(JSON.stringify(errInfo));
}

// --- Auth Context ---
interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  companyName?: string;
  taxId?: string;
  address?: string;
  phone?: string;
  role: 'client' | 'admin';
  createdAt: any;
}

const AuthContext = React.createContext<{
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}>({
  user: null,
  profile: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        } else {
          // Create initial profile
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            role: 'client',
            createdAt: serverTimestamp(),
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    return () => unsubscribe();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/unauthorized-domain') {
        alert("This domain is not authorized for Firebase Authentication. Please add it to the 'Authorized domains' list in your Firebase Console (Authentication > Settings).");
      } else {
        alert("Login failed: " + (error.message || "Unknown error"));
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- Components ---

// --- Logo Component ---
const Logo = () => (
  <div className="flex items-center gap-3">
    <img 
      src="/LOGO.png" 
      alt="Trucks & Hydraulics Solutions Logo" 
      className="h-14 md:h-16 w-auto object-contain" 
      referrerPolicy="no-referrer" 
    />
    <div className="flex flex-col leading-none">
      <span className="text-xl md:text-2xl font-display font-bold text-white uppercase tracking-tight">
        Trucks & Hydraulics
      </span>
      <span className="text-xl md:text-2xl font-display font-bold text-white uppercase tracking-tight">
        Solutions
      </span>
    </div>
  </div>
);

const AnnouncementBar = () => (
  <div className="bg-industrial-green text-deep-charcoal py-2 px-4 text-center text-sm font-medium z-50 relative">
    <div className="container mx-auto flex flex-col md:flex-row justify-center items-center gap-2 md:gap-8">
      <span>Same-day dispatch on in-stock items</span>
      <span className="hidden md:inline">·</span>
      <a href="tel:+966510760770" className="hover:underline">+966 510760770</a>
      <span className="hidden md:inline">·</span>
      <span>Sat–Thu 8am–6pm</span>
    </div>
  </div>
);

const Header = ({ 
  onOpenSearch, 
  onOpenDashboard 
}: { 
  onOpenSearch: () => void; 
  onOpenDashboard: () => void;
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, profile, login, logout } = React.useContext(AuthContext);
  const { language, setLanguage, t } = useTranslation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: t.nav.products, href: '#products' },
    { name: t.nav.brands, href: '#brands' },
    { name: t.nav.industries, href: '#industries' },
    { name: t.nav.about, href: '#home' },
    { name: t.nav.contact, href: '#contact' },
  ];

  return (
    <>
      <header className={`sticky top-0 z-40 transition-all duration-300 ${isScrolled ? 'bg-deep-charcoal/95 backdrop-blur-md shadow-xl py-3' : 'bg-transparent py-5'}`}>
        <div className="container mx-auto px-4 flex justify-between items-center">
          {/* Logo */}
          <a href="/" className="flex items-center group">
            <Logo />
          </a>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href} 
                className="text-sm font-medium uppercase tracking-widest hover:text-industrial-green transition-colors relative group"
              >
                {link.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-industrial-green transition-all group-hover:w-full"></span>
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Language Switcher */}
            <button 
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-sm border border-white/10 hover:border-industrial-green transition-all text-xs font-bold uppercase tracking-wider"
              title={language === 'en' ? 'Switch to Arabic' : 'تغيير إلى الإنجليزية'}
            >
              <Globe className="w-4 h-4 text-industrial-green" />
              <span>{language === 'en' ? 'العربية' : 'EN'}</span>
            </button>

            <button 
              onClick={onOpenSearch}
              className="p-2 hover:text-industrial-green transition-colors" 
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>
            
            {user ? (
              <div className="flex items-center gap-4">
                <button 
                  onClick={onOpenDashboard}
                  className={`hidden sm:flex items-center gap-2 text-sm font-bold uppercase tracking-widest transition-colors ${
                    profile?.role === 'admin' ? 'text-industrial-green border border-industrial-green/30 px-3 py-1.5 rounded-sm bg-industrial-green/5 hover:bg-industrial-green hover:text-deep-charcoal' : 'hover:text-industrial-green'
                  }`}
                >
                  {profile?.role === 'admin' ? <Settings className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  {profile?.role === 'admin' ? t.nav.adminDashboard : t.nav.myAccount}
                </button>
                <button 
                  onClick={logout}
                  className="hidden sm:block text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
                >
                  {t.nav.logout}
                </button>
              </div>
            ) : (
              <button 
                onClick={login}
                className="hidden sm:block bg-industrial-green text-deep-charcoal px-6 py-2.5 rounded-sm font-display font-bold uppercase tracking-wider hover:bg-white transition-all active:scale-95"
              >
                {t.nav.login}
              </button>
            )}

            <button 
              className="lg:hidden p-2 text-white" 
              onClick={() => setIsMenuOpen(true)}
              aria-label="Open Menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMenuOpen(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
              />
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 h-full w-80 bg-steel-gray z-50 p-8 shadow-2xl"
              >
                <div className="flex justify-between items-center mb-12">
                  <span className="text-xl font-display font-bold">MENU</span>
                  <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:text-industrial-green">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="flex flex-col gap-6">
                  {navLinks.map((link) => (
                    <a 
                      key={link.name} 
                      href={link.href} 
                      onClick={() => setIsMenuOpen(false)}
                      className="text-2xl font-display font-bold uppercase tracking-widest hover:text-industrial-green transition-colors"
                    >
                      {link.name}
                    </a>
                  ))}
                  
                  {user ? (
                    <>
                      <button 
                        onClick={() => { onOpenDashboard(); setIsMenuOpen(false); }}
                        className="text-2xl font-display font-bold uppercase tracking-widest hover:text-industrial-green text-left"
                      >
                        My Account
                      </button>
                      <button 
                        onClick={() => { logout(); setIsMenuOpen(false); }}
                        className="text-lg font-display font-bold uppercase tracking-widest text-gray-500 text-left"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => { login(); setIsMenuOpen(false); }}
                      className="mt-8 bg-industrial-green text-deep-charcoal text-center py-4 rounded-sm font-display font-bold uppercase tracking-wider"
                    >
                      Login
                    </button>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>
    </>
  );
};

const Hero = () => {
  const { t } = useTranslation();
  return (
    <section id="home" className="relative min-h-[90vh] flex flex-col overflow-hidden brushed-metal">
      <div className="container mx-auto px-4 py-20 relative z-10 flex-grow flex items-center">
        <div className="grid lg:grid-cols-2 gap-12 items-center w-full">
          {/* Left Content */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, staggerChildren: 0.2 }}
            viewport={{ once: true }}
          >
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="text-industrial-green font-display font-bold tracking-[0.3em] uppercase text-lg mb-4"
            >
              {t.hero.badge}
            </motion.div>
            <motion.h1 
              className="text-5xl md:text-6xl font-bold leading-tight mb-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {t.hero.title} <br />
              <span className="text-industrial-green">{t.hero.titleAccent}</span>
            </motion.h1>
            
            <div className="space-y-6 mb-12 max-w-2xl relative z-10">
              <motion.p 
                className="text-base md:text-lg text-gray-300 leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {t.hero.subtitle}
              </motion.p>
              
              <motion.ul 
                className="space-y-3 text-sm md:text-base text-gray-400"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <li className="flex items-start gap-3">
                  <span className="text-industrial-green mt-1">•</span>
                  <span>{t.hero.list1}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-industrial-green mt-1">•</span>
                  <span>{t.hero.list2}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-industrial-green mt-1">•</span>
                  <span>{t.hero.list3}</span>
                </li>
              </motion.ul>
            </div>

            <motion.div 
              className="flex flex-col sm:flex-row items-center gap-6 relative z-20"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <a href="#products" className="w-full sm:w-auto text-center bg-industrial-green text-deep-charcoal px-10 py-4 rounded-sm font-display font-bold uppercase tracking-widest hover:bg-white transition-all shadow-xl hover:shadow-industrial-green/40 active:scale-95 text-lg">
                {t.hero.ctaCatalog}
              </a>
              <a href="#quote" className="w-full sm:w-auto text-center border-2 border-white text-white px-10 py-4 rounded-sm font-display font-bold uppercase tracking-widest hover:bg-white hover:text-deep-charcoal transition-all active:scale-95 text-lg">
                {t.hero.ctaQuote}
              </a>
            </motion.div>
          </motion.div>

          {/* Right Images */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, type: 'spring' }}
            viewport={{ once: true }}
            className="relative hidden lg:flex flex-col gap-4 items-end"
          >
            <div className="relative z-10 bg-steel-gray p-4 rounded-lg green-glow border border-white/10 w-[90%] self-start">
              <img 
                src="/hydraulic.png" 
                alt="Hydraulic Component 1" 
                className="rounded shadow-2xl grayscale hover:grayscale-0 transition-all duration-500 w-full h-auto"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="relative z-10 bg-steel-gray p-4 rounded-lg green-glow border border-white/10 w-[90%] -mt-24">
              <img 
                src="/hydraulic3.png" 
                alt="Hydraulic Component 2" 
                className="rounded shadow-2xl grayscale hover:grayscale-0 transition-all duration-500 w-full h-auto"
                referrerPolicy="no-referrer"
              />
            </div>
            {/* Decorative elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-industrial-green/10 rounded-full blur-3xl"></div>
          </motion.div>
        </div>
      </div>

      {/* Trust Bar - Now Relative to avoid overlap */}
      <div className="w-full bg-deep-charcoal/80 backdrop-blur-sm border-t border-white/5 py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {[
              { icon: <Layers className="w-6 h-6" />, text: "10,000+ Parts in Stock" },
              { icon: <Truck className="w-6 h-6" />, text: "Fast Worldwide Shipping" },
              { icon: <ShieldCheck className="w-6 h-6" />, text: "OEM & Aftermarket" },
              { icon: <Wrench className="w-6 h-6" />, text: "Expert Technical Support" },
              { icon: <ShoppingCart className="w-6 h-6" />, text: "Secure B2B Ordering" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 group">
                <div className="text-industrial-green group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <span className="text-xs md:text-sm font-bold uppercase tracking-wider text-gray-300">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const Categories = ({ onOpenSearch }: { onOpenSearch: () => void }) => {
  const { t } = useTranslation();
  const categoriesList = [
    { name: t.categories.pumps, icon: <Zap />, desc: t.categories.pumpsDesc },
    { name: t.categories.motors, icon: <Activity />, desc: t.categories.motorsDesc },
    { name: t.categories.cylinders, icon: <Layers />, desc: t.categories.cylindersDesc },
    { name: t.categories.valves, icon: <Filter />, desc: t.categories.valvesDesc },
    { name: t.categories.seals, icon: <Droplets />, desc: t.categories.sealsDesc },
    { name: t.categories.hoses, icon: <Cpu />, desc: t.categories.hosesDesc },
    { name: t.categories.filters, icon: <Filter />, desc: t.categories.filtersDesc },
    { name: t.categories.powerUnits, icon: <Settings />, desc: t.categories.powerUnitsDesc },
  ];

  return (
    <section id="products" className="py-24 bg-steel-gray">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            {t.categories.title} <span className="text-industrial-green">{t.categories.titleAccent}</span>
          </motion.h2>
          <div className="w-20 h-1 bg-industrial-green mx-auto"></div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {categoriesList.map((cat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="group relative bg-deep-charcoal p-8 rounded-sm border border-white/5 hover:border-industrial-green/50 transition-all hover:-translate-y-2 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-industrial-green scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
              <div className="text-industrial-green mb-6 group-hover:scale-110 transition-transform inline-block">
                {React.cloneElement(cat.icon as React.ReactElement, { size: 40 })}
              </div>
              <h3 className="text-xl font-bold mb-3 group-hover:text-industrial-green transition-colors">{cat.name}</h3>
              <p className="text-sm text-gray-400 mb-6 leading-relaxed">{cat.desc}</p>
              <button 
                onClick={onOpenSearch}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-industrial-green group-hover:gap-4 transition-all"
              >
                {t.categories.viewParts} <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-16">
          <button 
            onClick={onOpenSearch}
            className="inline-flex items-center gap-2 text-lg font-display font-bold uppercase tracking-widest hover:text-industrial-green transition-colors group"
          >
            {t.categories.viewCatalogue} <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
};

// --- Logo Image Component with Fallback ---
const LogoImage = ({ brand }: { brand: any }) => {
  const [error, setError] = useState(false);

  if (!brand.logo || error) {
    return <span className="text-center px-2">{brand.name}</span>;
  }

  return (
    <img 
      src={brand.logo} 
      alt={`${brand.name} logo`} 
      className={`w-full h-full ${brand.fit || 'object-contain'} transition-transform ${brand.scale || ''}`}
      referrerPolicy="no-referrer"
      onError={() => setError(true)}
    />
  );
};

const BrandsTicker = () => {
  const brands = [
    { name: "Rexroth", logo: "/rexroth2.png", scale: "scale-[2.0]", bgColor: "bg-white", padding: "p-0" },
    { name: "Danfoss", logo: "/danfoss.png", scale: "scale-[0.8]", bgColor: "bg-white", padding: "p-0" },
    { name: "Sauer Danfoss", logo: "/sauer-danfoss.png", scale: "scale-[1.0] translate-x-2 -translate-y-1", bgColor: "bg-white", padding: "p-0" },
    { name: "Hydropack", logo: "/hydropack2.png", scale: "scale-[0.9]", bgColor: "bg-white", padding: "p-0" },
    { name: "Parker", logo: "/parker.png", scale: "scale-[1.0]", bgColor: "bg-black", padding: "p-0" },
    { name: "Eaton", logo: "/eaton.png", scale: "scale-[1.2]", bgColor: "bg-white", padding: "p-0" },
    { name: "Vickers", logo: "/vickers.png", scale: "scale-[1.0]", bgColor: "bg-white", padding: "p-0" },
    { name: "Kawasaki", logo: "/kawasaki.png", scale: "scale-[1.0]", bgColor: "bg-white", padding: "p-0" },
    { name: "Guarnitec seals", logo: "/guarnitec%20logo.png", scale: "scale-[1.2] translate-x-1", fit: "object-fill", bgColor: "bg-white", padding: "p-0" },
    { name: "ALP seals", logo: "/alp.png", scale: "scale-[0.8]", bgColor: "bg-white", padding: "p-0" },
    { name: "Casappa", logo: "/casappa.png", scale: "scale-[1.7]", bgColor: "bg-white", padding: "p-0" },
    { name: "SKS Hydraulics", logo: "/sks.png", scale: "scale-[1.3]", bgColor: "bg-white", padding: "p-0" },
    { name: "Yuken", logo: "/yuken.png", scale: "scale-[1.4]", bgColor: "bg-white", padding: "p-0" },
  ];

  return (
    <section id="brands" className="py-20 bg-deep-charcoal overflow-hidden">
      <div className="container mx-auto px-4 mb-12 text-center">
        <h2 className="text-3xl font-bold mb-4">Genuine, OEM & Aftermarket Parts from Leading Manufacturers</h2>
        <div className="w-16 h-1 bg-industrial-green mx-auto"></div>
      </div>

      <div className="relative flex overflow-x-hidden group">
        <div className="py-12 animate-marquee flex whitespace-nowrap gap-12 group-hover:pause">
          {[...brands, ...brands].map((brand, i) => (
            <div key={i} className={`w-[200px] h-[80px] ${brand.bgColor || 'bg-steel-gray/50'} border border-white/5 flex items-center justify-center text-gray-400 font-bold text-sm grayscale hover:grayscale-0 transition-all cursor-pointer ${brand.padding || 'p-1'} overflow-hidden`}>
              <LogoImage brand={brand} />
            </div>
          ))}
        </div>
      </div>

      <div className="text-center mt-12">
        <p className="text-gray-400">
          Can't find your brand? <a href="#contact" className="text-industrial-green font-bold hover:underline">Contact us with your part number.</a>
        </p>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        .pause {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
};

const Industries = () => {
  const { t } = useTranslation();
  const industries = [
    { name: t.industriesSection.ind1, desc: t.industriesSection.ind1Desc, img: "/construction.png" },
    { name: t.industriesSection.ind2, desc: t.industriesSection.ind2Desc, img: "/farming3.png" },
    { name: t.industriesSection.ind3, desc: t.industriesSection.ind3Desc, img: "/industrial.png" },
    { name: t.industriesSection.ind4, desc: t.industriesSection.ind4Desc, img: "/marine.png" },
    { name: t.industriesSection.ind5, desc: t.industriesSection.ind5Desc, img: "/mining2.png" },
    { name: t.industriesSection.ind6, desc: t.industriesSection.ind6Desc, img: "/forest.png" },
  ];

  return (
    <section id="industries" className="py-24 bg-steel-gray">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">{t.industriesSection.title} <span className="text-industrial-green">{t.industriesSection.titleAccent}</span></h2>
          <div className="w-20 h-1 bg-industrial-green mx-auto"></div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {industries.map((ind, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="group relative h-80 rounded-sm overflow-hidden cursor-pointer"
            >
              <img 
                src={ind.img} 
                alt={ind.name} 
                className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-deep-charcoal/70 group-hover:bg-industrial-green/40 transition-colors duration-500"></div>
              <div className="absolute inset-0 p-8 flex flex-col justify-end">
                <h3 className="text-2xl font-bold mb-2 group-hover:translate-x-2 transition-transform">{ind.name}</h3>
                <p className="text-sm text-gray-300 group-hover:text-white transition-colors">{ind.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const HowItWorks = () => {
  const { t } = useTranslation();
  const steps = [
    { title: t.howItWorks.step1, desc: t.howItWorks.step1Desc },
    { title: t.howItWorks.step2, desc: t.howItWorks.step2Desc },
    { title: t.howItWorks.step3, desc: t.howItWorks.step3Desc },
    { title: t.howItWorks.step4, desc: t.howItWorks.step4Desc },
  ];

  return (
    <section className="py-24 bg-deep-charcoal relative">
      <div className="container mx-auto px-4">
        {/* Global Shipping Badge Section */}
        <div className="mb-24 flex flex-col lg:flex-row items-center gap-12 bg-steel-gray/30 p-8 rounded-sm border border-white/5">
          <div className="lg:w-1/2">
            <h3 className="text-3xl font-bold mb-4">{t.howItWorks.logisticsTitle} <span className="text-industrial-green">{t.howItWorks.logisticsAccent}</span></h3>
            <p className="text-gray-400 mb-6 leading-relaxed">
              {t.howItWorks.logisticsDesc}
            </p>
            <div className="flex items-center gap-4 text-industrial-green font-bold uppercase tracking-widest text-sm">
              <Truck className="w-6 h-6" /> {t.howItWorks.shipping}
            </div>
          </div>
          <div className="lg:w-1/2 relative">
            <div className="relative z-10 bg-steel-gray p-4 rounded-lg green-glow border border-white/10 max-w-md mx-auto">
              <img 
                src="/global2.png" 
                alt="Global Logistics & Shipping" 
                className="rounded shadow-2xl grayscale hover:grayscale-0 transition-all duration-500 w-full"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-6 -right-6 bg-industrial-green text-deep-charcoal p-6 rounded-sm font-display font-bold shadow-2xl">
                <span className="block text-4xl">24H</span>
                <span className="text-sm uppercase tracking-tighter">{t.howItWorks.logisticsBadge}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mb-20">
          <h2 className="text-4xl font-bold mb-4">{t.howItWorks.title} <span className="text-industrial-green">{t.howItWorks.titleAccent}</span></h2>
          <div className="w-20 h-1 bg-industrial-green mx-auto"></div>
        </div>

        <div className="relative grid md:grid-cols-4 gap-12">
          {/* Connecting line for desktop */}
          <div className="hidden md:block absolute top-10 left-0 w-full h-0.5 border-t-2 border-dashed border-industrial-green/30 z-0"></div>
          
          {steps.map((step, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              viewport={{ once: true }}
              className="relative z-10 text-center"
            >
              <div className="w-20 h-20 bg-industrial-green text-deep-charcoal rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-8 shadow-xl border-4 border-deep-charcoal">
                {i + 1}
              </div>
              <h3 className="text-xl font-bold mb-4">{step.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-24 bg-steel-gray p-8 md:p-12 rounded-sm border border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h3 className="text-2xl font-bold mb-2">{t.howItWorks.helpTitle}</h3>
            <p className="text-gray-400">{t.howItWorks.helpDesc}</p>
          </div>
          <a 
            href="https://wa.me/966567423310" 
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-[#25D366] text-white px-8 py-4 rounded-sm font-bold uppercase tracking-widest hover:bg-[#128C7E] transition-all shadow-lg"
          >
            <MessageCircle className="w-6 h-6" />
            {t.howItWorks.whatsapp}
          </a>
        </div>
      </div>
    </section>
  );
};

const StatsAndTestimonials = () => {
  const { t } = useTranslation();
  const [hasStarted, setHasStarted] = useState(false);
  const statsRef = useRef(null);
  const isInView = useInView(statsRef, { once: true });

  const statsList = [
    { label: t.stats.orders, value: 4800, suffix: "+" },
    { label: t.stats.delivery, value: 98, suffix: "%" },
    { label: t.stats.accounts, value: 200, suffix: "+" },
    { label: t.stats.years, value: 9, suffix: "" },
  ];

  const testimonials = [
    { quote: t.stats.t1 },
    { quote: t.stats.t2 },
    { quote: t.stats.t3 },
  ];

  return (
    <section className="py-24 bg-steel-gray">
      <div className="container mx-auto px-4">
        {/* Stats Bar */}
        <div ref={statsRef} className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-24">
          {statsList.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-5xl md:text-6xl font-display font-bold text-industrial-green mb-2">
                {isInView ? (
                  <Counter from={0} to={stat.value} duration={2} suffix={stat.suffix} />
                ) : (
                  "0"
                )}
              </div>
              <div className="text-xs md:text-sm font-bold uppercase tracking-widest text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid lg:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              viewport={{ once: true }}
              className="bg-deep-charcoal p-10 rounded-sm border border-white/5 relative"
            >
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-industrial-green text-industrial-green" />)}
              </div>
              <p className="text-lg italic text-gray-300 leading-relaxed">"{t.quote}"</p>
              <div className="absolute top-10 right-10 opacity-10">
                <MessageCircle size={60} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Counter = ({ from, to, duration, suffix = "" }: { from: number, to: number, duration: number, suffix?: string }) => {
  const [count, setCount] = useState(from);
  
  useEffect(() => {
    let start = from;
    const end = to;
    const totalFrames = duration * 60;
    const increment = (end - start) / totalFrames;
    
    let currentFrame = 0;
    const timer = setInterval(() => {
      currentFrame++;
      start += increment;
      setCount(Math.floor(start));
      
      if (currentFrame >= totalFrames) {
        setCount(end);
        clearInterval(timer);
      }
    }, 1000 / 60);
    
    return () => clearInterval(timer);
  }, [from, to, duration]);
  
  return <>{count}{suffix}</>;
};

const FeaturedProducts = ({ onOpenSearch }: { onOpenSearch: () => void }) => {
  const { t } = useTranslation();
  const products = [
    { name: "A10VSO Piston Pump", pn: "R902401542", brand: "Rexroth", img: "/a10vso.png" },
    { name: "OMR & OMP Orbital Motors", pn: "151G0004", brand: "Danfoss", img: "/omr.png" },
    { name: "TG & TF Hydraulic Motors", pn: "3159112001", brand: "Parker", img: "/tg.png" },
    { name: "V10 & V20 Vane Pump", pn: "V20-1P13P-1C11", brand: "Vickers", img: "/v10.png" },
  ];

  return (
    <section className="py-24 bg-deep-charcoal">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div>
            <h2 className="text-4xl font-bold mb-4">{t.featured.title} <span className="text-industrial-green">{t.featured.titleAccent}</span></h2>
            <div className="w-20 h-1 bg-industrial-green"></div>
          </div>
          <button 
            onClick={onOpenSearch}
            className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-industrial-green hover:gap-4 transition-all"
          >
            {t.featured.allStock} <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex overflow-x-auto pb-8 gap-6 no-scrollbar snap-x">
          {products.map((p, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -10 }}
              className="min-w-[280px] md:min-w-[320px] bg-steel-gray rounded-sm border border-white/5 snap-start group"
            >
              <div className="h-48 bg-deep-charcoal overflow-hidden relative">
                <img 
                  src={p.img} 
                  alt={p.name} 
                  className="w-full h-full object-contain p-4 grayscale group-hover:grayscale-0 transition-all"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4 bg-green-500 text-white text-[10px] font-bold uppercase px-2 py-1 rounded-sm flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {t.search.inStock}
                </div>
              </div>
              <div className="p-6">
                <div className="text-xs text-industrial-green font-bold uppercase tracking-widest mb-2">{p.brand}</div>
                <h3 className="text-xl font-bold mb-6">{p.name}</h3>
                <a 
                   href="#quote"
                  className="block w-full bg-industrial-green text-deep-charcoal py-3 rounded-sm font-display font-bold uppercase tracking-widest hover:bg-white transition-all text-center"
                >
                  {t.featured.requestQuote}
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const QuoteForm = () => {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    email: '',
    phone: '',
    partDetails: '',
    quantity: 1,
    urgency: 'Standard'
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    console.log("Starting quote submission...", formData);
    
    try {
      let base64Image = '';
      
      // 1. Convert file to Base64 if exists (Free storage workaround)
      if (file) {
        console.log("Converting image to Base64...");
        const reader = new FileReader();
        base64Image = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        
        // Basic check for size (Firestore limit is 1MB per document)
        if (base64Image.length > 1000000) {
          throw new Error(t.quote.errorLargeFile);
        }
      }

      // 2. Save to Firestore (Database Backup - Including Image)
      try {
        await addDoc(collection(db, 'quotes'), {
          ...formData,
          imageData: base64Image, // Save image directly as text
          hasAttachment: !!file,
          createdAt: serverTimestamp()
        });
        console.log("Saved to Firestore successfully");
      } catch (fsError: any) {
        console.error("Firestore save failed:", fsError);
        throw new Error("Database error: " + fsError.message);
      }

      // 3. Send Email via Web3Forms (Text only to avoid Pro error)
      const accessKey = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY;
      if (accessKey) {
        console.log("Sending enquiry via Web3Forms...");
        try {
          const response = await fetch("https://api.web3forms.com/submit", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              access_key: accessKey,
              subject: `New Quote Request from ${formData.fullName}`,
              from_name: "Trucks & Hydraulics Website",
              ...formData,
              message: file ? "NOTE: This customer attached a photo. View it in your Admin Dashboard." : "No photo attached."
            }),
          });
          
          const result = await response.json();
          if (!result.success) {
            console.warn("Web3Forms warning:", result);
          }
        } catch (emailError: any) {
          console.error("Email service error:", emailError);
        }
      }

      setSubmitted(true);
      setFile(null);
      setFormData({
        fullName: '',
        companyName: '',
        email: '',
        phone: '',
        partDetails: '',
        quantity: 1,
        urgency: 'Standard'
      });
    } catch (error: any) {
      console.error("Submission error:", error);
      alert(error.message || t.quote.errorSubmit);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' ? parseInt(value) || 0 : value
    }));
  };

  return (
    <section id="quote" className="py-24 bg-steel-gray">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16">
          {/* Form */}
          <div className="bg-deep-charcoal p-8 md:p-12 rounded-sm border border-white/5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-industrial-green"></div>
            
            <h2 className="text-3xl font-bold mb-8">{t.quote.title}</h2>
            
            {submitted ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={40} />
                </div>
                <h3 className="text-2xl font-bold mb-4">{t.quote.success}</h3>
                <p className="text-gray-400 mb-8">{t.quote.successDesc}</p>
                <button 
                  onClick={() => setSubmitted(false)}
                  className="text-industrial-green font-bold uppercase tracking-widest hover:underline"
                >
                  {t.quote.newEnquiry}
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">{t.quote.name}</label>
                    <input 
                      required 
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      type="text" 
                      className="w-full bg-steel-gray border border-white/10 rounded-sm px-4 py-3 focus:border-industrial-green outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">{t.quote.company}</label>
                    <input 
                      required 
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      type="text" 
                      className="w-full bg-steel-gray border border-white/10 rounded-sm px-4 py-3 focus:border-industrial-green outline-none transition-all" 
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">{t.quote.email}</label>
                    <input 
                      required 
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      type="email" 
                      className="w-full bg-steel-gray border border-white/10 rounded-sm px-4 py-3 focus:border-industrial-green outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">{t.quote.phone}</label>
                    <input 
                      required 
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      type="tel" 
                      className="w-full bg-steel-gray border border-white/10 rounded-sm px-4 py-3 focus:border-industrial-green outline-none transition-all" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">{t.quote.partDetails}</label>
                  <textarea 
                    required 
                    name="partDetails"
                    value={formData.partDetails}
                    onChange={handleChange}
                    rows={4} 
                    className="w-full bg-steel-gray border border-white/10 rounded-sm px-4 py-3 focus:border-industrial-green outline-none transition-all resize-none"
                  ></textarea>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">{t.quote.quantity}</label>
                    <input 
                      required 
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleChange}
                      type="number" 
                      min="1" 
                      className="w-full bg-steel-gray border border-white/10 rounded-sm px-4 py-3 focus:border-industrial-green outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">{t.quote.urgency}</label>
                    <select 
                      name="urgency"
                      value={formData.urgency}
                      onChange={handleChange}
                      className="w-full bg-steel-gray border border-white/10 rounded-sm px-4 py-3 focus:border-industrial-green outline-none transition-all appearance-none"
                    >
                      <option value="Standard">{t.quote.urgencyStandard}</option>
                      <option value="Urgent">{t.quote.urgencyUrgent}</option>
                      <option value="Emergency (Downtime)">{t.quote.urgencyEmergency}</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">{t.quote.uploadTitle}</label>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden" 
                    accept="image/*,.pdf"
                  />
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-sm p-6 text-center transition-all cursor-pointer group ${
                      isDragging ? 'border-industrial-green bg-industrial-green/5' : 'border-white/10 hover:border-industrial-green'
                    }`}
                  >
                    <Upload className={`w-8 h-8 mx-auto mb-2 transition-colors ${
                      file || isDragging ? 'text-industrial-green' : 'text-gray-500 group-hover:text-industrial-green'
                    }`} />
                    <span className={`text-sm transition-colors ${
                      file || isDragging ? 'text-gray-200' : 'text-gray-500 group-hover:text-gray-300'
                    }`}>
                      {file ? `Selected: ${file.name}` : t.quote.uploadDesc}
                    </span>
                    {file && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        className="block mx-auto mt-2 text-xs text-red-500 hover:text-red-400 font-bold uppercase tracking-tighter"
                      >
                        Remove File
                      </button>
                    )}
                  </div>
                </div>
                <button 
                  disabled={isSubmitting}
                  className="w-full bg-industrial-green text-deep-charcoal py-4 rounded-sm font-display font-bold uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <div className="w-5 h-5 border-2 border-deep-charcoal border-t-transparent rounded-full animate-spin"></div> : t.quote.send}
                </button>
              </form>
            )}
          </div>

          {/* Contact Info */}
          <div id="contact" className="flex flex-col justify-center">
            <h2 className="text-4xl font-bold mb-8">{t.contact.title}</h2>
            <p className="text-gray-400 mb-12 text-lg leading-relaxed">
              {t.contact.subtitle}
            </p>
            
            <div className="space-y-8 mb-12">
              <div className="flex items-start gap-4">
                <div className="bg-industrial-green/10 p-3 rounded-sm text-industrial-green">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">{t.footer.phone}</div>
                  <a href="tel:+966510760770" className="text-xl font-bold hover:text-industrial-green transition-colors">+966 510760770</a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-industrial-green/10 p-3 rounded-sm text-industrial-green">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">WhatsApp</div>
                  <a 
                    href="https://wa.me/966567423310" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xl font-bold hover:text-industrial-green transition-colors"
                  >
                    +966 567423310
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-industrial-green/10 p-3 rounded-sm text-industrial-green">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">{t.footer.email}</div>
                  <a href="mailto:info@trucksol.com" className="text-xl font-bold hover:text-industrial-green transition-colors">info@trucksol.com</a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-industrial-green/10 p-3 rounded-sm text-industrial-green">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">{t.footer.hours}</div>
                  <div className="text-lg font-bold text-gray-300">Sat–Thu: 8:00 AM – 6:00 PM</div>
                </div>
              </div>
            </div>

            {/* Map Placeholder */}
            <div className="h-64 bg-deep-charcoal rounded-sm border border-white/5 overflow-hidden relative group">
              <div className="absolute inset-0 flex items-center justify-center bg-deep-charcoal z-10 group-hover:opacity-0 transition-opacity">
                <div className="text-center">
                  <MapPin className="w-10 h-10 text-industrial-green mx-auto mb-2" />
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-500">View on Google Maps</span>
                </div>
              </div>
              <iframe 
                title="Office Location"
                src="https://www.google.com/maps?q=AL+NIMER+CENTER+MUSA+BIN+NUSAIR+STREET+AL+OLAYA+DISTRICT+RIYADH+SAUDI+ARABIA&output=embed" 
                className="w-full h-full border-0 grayscale" 
                loading="lazy"
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const SearchOverlay = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation();
  const [queryText, setQueryText] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    brand: 'All',
    industry: 'All',
    availability: 'All'
  });
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { profile } = React.useContext(AuthContext);

  useEffect(() => {
    // Fetch all products for client-side fuzzy search
    const unsub = onSnapshot(collection(db, 'products'), (snapshot) => {
      const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllProducts(products);
      setLoading(false);
      
      // Seed data if empty (for demo purposes) - only if admin
      if (products.length === 0 && profile?.role === 'admin') {
        seedProducts();
      }
    }, (error) => {
      console.error("Firestore read error:", error);
      setLoading(false);
    });
    return () => unsub();
  }, [profile]);

  const seedProducts = async () => {
    const mockProducts = [
      { partNumber: "R902401542", name: "A10VSO Piston Pump", brand: "Rexroth", industry: "Construction", category: "Pumps", inStock: true, price: 1250 },
      { partNumber: "151G0004", name: "OMP 160 Orbital Motor", brand: "Danfoss", industry: "Agriculture", category: "Motors", inStock: true, price: 450 },
      { partNumber: "3159112001", name: "P315 Gear Pump", brand: "Parker", industry: "Industrial", category: "Pumps", inStock: false, price: 890 },
      { partNumber: "V20-1P13P-1C11", name: "V20 Vane Pump", brand: "Vickers", industry: "Mobile", category: "Pumps", inStock: true, price: 670 },
      { partNumber: "PV063R1K1T1NMMC", name: "PV Axial Piston Pump", brand: "Parker", industry: "Industrial", category: "Pumps", inStock: true, price: 2100 },
      { partNumber: "H1P045", name: "H1 Axial Piston Pump", brand: "Danfoss", industry: "Construction", category: "Pumps", inStock: true, price: 1850 },
    ];
    
    try {
      for (const p of mockProducts) {
        await setDoc(doc(collection(db, 'products')), {
          ...p,
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Seeding failed:", err);
    }
  };

  useEffect(() => {
    if (loading) return;

    const fuse = new Fuse(allProducts, {
      keys: ['partNumber', 'name', 'brand', 'industry', 'category'],
      threshold: 0.3,
      includeScore: true
    });

    let filtered = allProducts;

    if (queryText) {
      const fuzzyResults = fuse.search(queryText);
      filtered = fuzzyResults.map(r => r.item);
      
      // Suggestions based on part number prefix
      const suggs = allProducts
        .filter(p => p.partNumber && p.partNumber.toLowerCase().startsWith(queryText.toLowerCase()))
        .map(p => p.partNumber)
        .slice(0, 5);
      setSuggestions(suggs);
    } else {
      setSuggestions([]);
    }

    if (filters.brand !== 'All') {
      filtered = filtered.filter(p => p.brand === filters.brand);
    }
    if (filters.industry !== 'All') {
      filtered = filtered.filter(p => p.industry === filters.industry);
    }
    if (filters.availability === 'In Stock') {
      filtered = filtered.filter(p => p.inStock);
    }

    setResults(filtered);
  }, [queryText, allProducts, filters, loading]);

  const brands = ['All', ...new Set(allProducts.map(p => p.brand))];
  const industries = ['All', ...new Set(allProducts.map(p => p.industry))];

  return (
    <div className="fixed inset-0 z-[110] flex flex-col">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/95 backdrop-blur-xl"
      />
      
      <div className="relative z-10 container mx-auto px-4 pt-12 flex flex-col h-full max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-display font-bold uppercase tracking-widest text-industrial-green">{t.search.title}</h2>
          <button onClick={onClose} className="p-2 hover:text-industrial-green transition-colors">
            <X size={32} />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative mb-8">
          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={24} />
            <input 
              autoFocus
              type="text" 
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder={t.search.placeholder}
              className="w-full bg-steel-gray/50 border-2 border-white/10 rounded-sm py-6 pl-16 pr-6 text-2xl font-display focus:border-industrial-green outline-none transition-all green-glow"
            />
          </div>

          {/* Suggestions */}
          <AnimatePresence>
            {suggestions.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 w-full bg-deep-charcoal border border-white/10 mt-2 rounded-sm shadow-2xl z-20 overflow-hidden"
              >
                {suggestions.map((s, i) => (
                  <button 
                    key={i}
                    onClick={() => setQueryText(s)}
                    className="w-full text-left px-6 py-3 hover:bg-industrial-green hover:text-deep-charcoal transition-all text-sm font-mono flex items-center gap-3"
                  >
                    <Zap size={14} /> {s}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-12">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{t.search.brand}</label>
            <select 
              value={filters.brand}
              onChange={(e) => setFilters(prev => ({ ...prev, brand: e.target.value }))}
              className="bg-deep-charcoal border border-white/10 rounded-sm px-4 py-2 text-xs font-bold uppercase tracking-widest outline-none focus:border-industrial-green"
            >
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{t.search.industry}</label>
            <select 
              value={filters.industry}
              onChange={(e) => setFilters(prev => ({ ...prev, industry: e.target.value }))}
              className="bg-deep-charcoal border border-white/10 rounded-sm px-4 py-2 text-xs font-bold uppercase tracking-widest outline-none focus:border-industrial-green"
            >
              {industries.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{t.search.availability}</label>
            <select 
              value={filters.availability}
              onChange={(e) => setFilters(prev => ({ ...prev, availability: e.target.value }))}
              className="bg-deep-charcoal border border-white/10 rounded-sm px-4 py-2 text-xs font-bold uppercase tracking-widest outline-none focus:border-industrial-green"
            >
              <option value="All">{t.search.allItems}</option>
              <option value="In Stock">{t.search.inStockOnly}</option>
            </select>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto pb-12 space-y-4 no-scrollbar">
          {loading ? (
            <div className="text-center py-20">
              <Loader2 className="w-12 h-12 mx-auto mb-4 text-industrial-green animate-spin opacity-50" />
              <p className="text-sm uppercase tracking-widest text-gray-500">{t.search.loading}</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <Search size={64} className="mx-auto mb-4 opacity-10" />
              <p className="text-xl font-display uppercase tracking-widest">{t.search.noResults}</p>
              <p className="text-sm mt-2">{t.search.adjustFilters}</p>
            </div>
          ) : (
            results.map((p, i) => (
              <motion.div 
                key={p.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-deep-charcoal p-6 rounded-sm border border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 group hover:border-industrial-green/30 transition-all"
              >
                <div className="flex items-center gap-6 flex-1">
                  <div className="w-20 h-20 bg-steel-gray rounded-sm flex items-center justify-center overflow-hidden">
                    <img src={`https://picsum.photos/seed/${p.partNumber}/100/100`} alt={p.name} className="w-full h-full object-contain p-2 grayscale group-hover:grayscale-0 transition-all" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-industrial-green">{p.brand}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">·</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{p.industry}</span>
                    </div>
                    <h3 className="text-xl font-bold group-hover:text-industrial-green transition-colors">{p.name}</h3>
                    <div className="text-xs font-mono text-gray-400 mt-1">{t.search.pn}: {p.partNumber}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-4">
                  <div className={`px-3 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest ${
                    p.inStock ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                  }`}>
                    {p.inStock ? t.search.inStock : t.search.outOfStock}
                  </div>
                  <button className="bg-industrial-green text-deep-charcoal px-6 py-2 rounded-sm text-xs font-bold uppercase tracking-widest hover:bg-white transition-all">
                    {t.search.requestQuote}
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation();
  const { user, profile } = React.useContext(AuthContext);
  const [activeTab, setActiveTab] = useState<'orders' | 'profile' | 'favorites' | 'tracking' | 'quotes'>('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const ordersQuery = query(collection(db, 'orders'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    const favoritesQuery = query(collection(db, 'favorites'), where('userId', '==', user.uid), orderBy('addedAt', 'desc'));
    const shipmentsQuery = query(collection(db, 'shipments')); // Simplified for demo
    const quotesQuery = query(collection(db, 'quotes'), orderBy('createdAt', 'desc'));

    const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'orders'));

    const unsubFavorites = onSnapshot(favoritesQuery, (snapshot) => {
      setFavorites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'favorites'));

    const unsubShipments = onSnapshot(shipmentsQuery, (snapshot) => {
      setShipments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'shipments'));

    let unsubQuotes = () => {};
    if (profile?.role === 'admin') {
      unsubQuotes = onSnapshot(quotesQuery, (snapshot) => {
        setQuotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'quotes'));
    }

    setLoading(false);

    return () => {
      unsubOrders();
      unsubFavorites();
      unsubShipments();
      unsubQuotes();
    };
  }, [user, profile]);

  const tabs = [
    { id: 'orders', label: t.dashboard.orders, icon: <ShoppingCart size={18} /> },
    { id: 'tracking', label: t.dashboard.tracking, icon: <Truck size={18} /> },
    { id: 'favorites', label: t.dashboard.favorites, icon: <Star size={18} /> },
    { id: 'profile', label: t.dashboard.profile, icon: <Settings size={18} /> },
  ];

  if (profile?.role === 'admin') {
    tabs.push({ id: 'quotes', label: t.dashboard.quotes, icon: <Mail size={18} /> });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-steel-gray w-full max-w-5xl h-[80vh] rounded-sm border border-industrial-green/30 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="bg-deep-charcoal p-6 border-b border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-industrial-green p-2 rounded-sm">
              <Bot size={24} className="text-deep-charcoal" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold uppercase tracking-wider">{t.dashboard.title}</h2>
              <p className="text-xs text-gray-500 uppercase tracking-widest">{t.dashboard.welcome}, {profile?.displayName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={28} />
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-deep-charcoal px-6 flex border-b border-white/5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all relative ${
                activeTab === tab.id ? 'text-industrial-green' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.icon} {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-industrial-green" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 brushed-metal">
          {activeTab === 'orders' && (
            <div className="space-y-6">
              {orders.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="uppercase tracking-widest text-sm">{t.dashboard.noOrders}</p>
                </div>
              ) : (
                orders.map(order => (
                  <div key={order.id} className="bg-deep-charcoal p-6 rounded-sm border border-white/5 flex flex-col md:flex-row justify-between gap-6">
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">{t.dashboard.orderId}{order.orderId}</div>
                      <div className="text-lg font-bold mb-4">{new Date(order.createdAt?.toDate()).toLocaleDateString()}</div>
                      <div className="space-y-2">
                        {order.items.map((item: any, i: number) => (
                          <div key={i} className="text-sm text-gray-300">
                            {item.quantity}x {item.name} ({item.partNumber})
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <div className={`px-3 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest ${
                        order.status === 'delivered' ? 'bg-green-500/20 text-green-500' : 'bg-industrial-green/20 text-industrial-green'
                      }`}>
                        {order.status}
                      </div>
                      <div className="text-2xl font-display font-bold">${order.totalAmount.toLocaleString()}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'tracking' && (
            <div className="space-y-6">
              {shipments.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  <Truck size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="uppercase tracking-widest text-sm">{t.dashboard.noTracking}</p>
                </div>
              ) : (
                shipments.map(shipment => (
                  <div key={shipment.id} className="bg-deep-charcoal p-6 rounded-sm border border-white/5">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">{t.dashboard.carrier}: {shipment.carrier}</div>
                        <div className="text-xl font-bold">{shipment.trackingNumber}</div>
                      </div>
                      <div className="bg-industrial-green text-deep-charcoal px-3 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest">
                        {shipment.status}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <Clock size={16} className="text-industrial-green" />
                      <span>{t.dashboard.estDelivery}: {new Date(shipment.estimatedDelivery?.toDate()).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'favorites' && (
            <div className="grid md:grid-cols-2 gap-6">
              {favorites.length === 0 ? (
                <div className="col-span-full text-center py-20 text-gray-500">
                  <Star size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="uppercase tracking-widest text-sm">{t.dashboard.noFavorites}</p>
                </div>
              ) : (
                favorites.map(fav => (
                  <div key={fav.id} className="bg-deep-charcoal p-6 rounded-sm border border-white/5 flex justify-between items-center group">
                    <div>
                      <div className="text-xs text-industrial-green font-bold uppercase tracking-widest mb-1">{fav.brand}</div>
                      <div className="text-lg font-bold">{fav.name}</div>
                      <div className="text-xs text-gray-500 font-mono mt-1">{t.dashboard.pn}: {fav.partNumber}</div>
                    </div>
                    <button className="p-3 bg-steel-gray rounded-sm text-gray-500 hover:text-industrial-green transition-all">
                      <ShoppingCart size={20} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">{t.contact.company}</label>
                  <div className="bg-deep-charcoal p-4 rounded-sm border border-white/5 text-gray-300">{profile?.companyName || 'Not set'}</div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Tax ID / VAT</label>
                  <div className="bg-deep-charcoal p-4 rounded-sm border border-white/5 text-gray-300">{profile?.taxId || 'Not set'}</div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">{t.contact.addressTitle}</label>
                <div className="bg-deep-charcoal p-4 rounded-sm border border-white/5 text-gray-300">{profile?.address || 'Not set'}</div>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">{t.contact.emailTitle}</label>
                  <div className="bg-deep-charcoal p-4 rounded-sm border border-white/5 text-gray-300">{profile?.email}</div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">{t.contact.phoneTitle}</label>
                  <div className="bg-deep-charcoal p-4 rounded-sm border border-white/5 text-gray-300">{profile?.phone || 'Not set'}</div>
                </div>
              </div>
              <button className="w-full border border-industrial-green text-industrial-green py-4 rounded-sm font-display font-bold uppercase tracking-widest hover:bg-industrial-green hover:text-deep-charcoal transition-all">
                {t.dashboard.editProfile}
              </button>
            </div>
          )}

          {activeTab === 'quotes' && profile?.role === 'admin' && (
            <div className="space-y-6">
              {quotes.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  <Mail size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="uppercase tracking-widest text-sm">{t.dashboard.noQuotes}</p>
                </div>
              ) : (
                quotes.map(quote => (
                  <div key={quote.id} className="bg-deep-charcoal p-6 rounded-sm border border-white/5 flex flex-col gap-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs text-industrial-green font-bold uppercase tracking-widest mb-1">{quote.companyName || t.dashboard.individual}</div>
                        <div className="text-xl font-bold">{quote.fullName}</div>
                        <div className="text-sm text-gray-400">{quote.email} | {quote.phone}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">{new Date(quote.createdAt?.toDate()).toLocaleString()}</div>
                        <div className={`px-3 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest ${
                          quote.urgency === 'Emergency (Downtime)' ? 'bg-red-500 text-white' : 
                          quote.urgency === 'Urgent' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'
                        }`}>
                          {quote.urgency === 'Standard' ? t.quote.urgencyStandard : 
                           quote.urgency === 'Urgent' ? t.quote.urgencyUrgent : t.quote.urgencyEmergency}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-1">{t.dashboard.partDetails}</label>
                          <div className="text-gray-300 text-sm bg-steel-gray/30 p-4 rounded-sm border border-white/5 whitespace-pre-wrap">{quote.partDetails}</div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-1">{t.dashboard.quantity}</label>
                          <div className="text-xl font-bold">{quote.quantity}</div>
                        </div>
                      </div>
                      
                      {quote.imageData && (
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-1">{t.dashboard.photo}</label>
                          <div className="border border-white/10 rounded-sm overflow-hidden bg-black/20">
                            <img 
                              src={quote.imageData} 
                              alt="Nameplate/Part" 
                              className="w-full h-auto max-h-64 object-contain cursor-zoom-in"
                              onClick={() => window.open(quote.imageData)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const ChatWindow = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: t.chat.welcome }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const ai = getAI();
      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: t.chat.systemInstruction,
        },
        history: messages.length > 1 ? messages.map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        })) : []
      });

      // Add a placeholder message for the model response
      setMessages(prev => [...prev, { role: 'model', text: '' }]);
      
      const stream = await chat.sendMessageStream({
        message: userMessage
      });

      let fullResponse = "";
      for await (const chunk of stream) {
        const chunkText = chunk.text || "";
        fullResponse += chunkText;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { role: 'model', text: fullResponse };
          return newMessages;
        });
      }

      if (!fullResponse) {
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { role: 'model', text: "I'm sorry, I couldn't process that request. Please try again or contact our support team." };
          return newMessages;
        });
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      let errorMessage = "I'm experiencing some technical difficulties. Please use our contact form or WhatsApp for urgent enquiries.";
      
      if (error.message === "MISSING_API_KEY") {
        errorMessage = "Technical Error: API Key is missing. Please ensure VITE_GEMINI_API_KEY is set in Vercel and then REDEPLOY.";
      } else if (error.message === "INVALID_KEY_VALUE") {
        errorMessage = "Technical Error: It looks like you pasted the variable NAME (VITE_GEMINI_API_KEY) into Vercel instead of the actual API Key VALUE (the long string starting with AIza).";
      } else if (error.message?.includes("API_KEY_INVALID")) {
        errorMessage = "Technical Error: The provided API Key is invalid. Please check your Gemini API key.";
      }
      
      setMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-24 left-6 md:bottom-32 md:left-8 z-50 w-[calc(100vw-3rem)] md:w-96 h-[500px] bg-steel-gray rounded-sm border border-industrial-green/30 shadow-2xl flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="bg-deep-charcoal p-4 border-b border-white/10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-industrial-green p-1.5 rounded-full">
            <Bot size={18} className="text-deep-charcoal" />
          </div>
          <div>
            <div className="text-sm font-bold uppercase tracking-widest">{t.chat.title}</div>
            <div className="text-[10px] text-green-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> {t.chat.online}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 brushed-metal">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-sm text-sm leading-relaxed ${
              m.role === 'user' 
                ? 'bg-industrial-green text-deep-charcoal font-medium' 
                : 'bg-deep-charcoal border border-white/5 text-gray-200'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-deep-charcoal border border-white/5 p-3 rounded-sm">
              <Loader2 size={18} className="animate-spin text-industrial-green" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 bg-deep-charcoal border-t border-white/10 flex gap-2">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.chat.placeholder}
          className="flex-1 bg-steel-gray border border-white/10 rounded-sm px-4 py-2 text-sm focus:border-industrial-green outline-none transition-all"
        />
        <button 
          type="submit"
          disabled={!input.trim() || isLoading}
          className="bg-industrial-green text-deep-charcoal p-2 rounded-sm hover:bg-white transition-all disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </form>
    </motion.div>
  );
};

const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer className="bg-deep-charcoal pt-20 border-t border-white/5">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* About */}
          <div>
            <a href="/" className="flex items-center gap-3 mb-6">
              <Logo />
            </a>
            <p className="text-gray-400 text-sm leading-relaxed mb-8">
              {t.hero.subtitle}
            </p>
            <div className="flex gap-4">
              {[Linkedin, Facebook, Instagram, Twitter].map((Icon, i) => (
                <a 
                  key={i} 
                  href="#" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-steel-gray rounded-sm flex items-center justify-center text-gray-400 hover:bg-industrial-green hover:text-deep-charcoal transition-all"
                >
                  <Icon size={20} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-bold mb-6 text-white">{t.nav.products}</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              {['Home', 'About Us', 'Our Brands', 'Industries', 'Technical Support', 'Request a Quote'].map((link) => (
                <li key={link}><a href="#" className="hover:text-industrial-green transition-colors">{link}</a></li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-lg font-bold mb-6 text-white">{t.nav.industries}</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              {['Hydraulic Pumps', 'Hydraulic Motors', 'Control Valves', 'Hydraulic Cylinders', 'Pneumatic Seals', 'Maintenance Kits'].map((link) => (
                <li key={link}><a href="#" className="hover:text-industrial-green transition-colors">{link}</a></li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-bold mb-6 text-white">{t.nav.contact}</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-industrial-green shrink-0" />
                <span className="uppercase">AL NIMER CENTER, MUSA BIN NUSAIR STREET, AL OLAYA DISTRICT, RIYADH, SAUDI ARABIA</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-industrial-green shrink-0" />
                <a href="tel:+966510760770" className="hover:text-industrial-green transition-colors">+966 510760770</a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-industrial-green shrink-0" />
                <a href="mailto:info@trucksol.com" className="hover:text-industrial-green transition-colors">info@trucksol.com</a>
              </li>
              <li className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-industrial-green shrink-0" />
                <span>{t.footer.hours}: Sat–Thu: 8:00 – 18:00</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="py-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500 font-medium uppercase tracking-widest">
          <div>© 2026 TRUCKS & HYDRAULICS SOLUTIONS. {t.footer.rights}</div>
          <div className="flex gap-8">
            <a href="#" className="hover:text-white transition-colors">{t.footer.privacy}</a>
            <a href="#" className="hover:text-white transition-colors">{t.footer.terms}</a>
          </div>
        </div>

        {/* SEO Location Footer */}
        <div className="pt-12 pb-20 border-t border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">{t.footer.locations}</h5>
              <p className="text-[10px] text-gray-600 leading-relaxed uppercase tracking-widest">
                Hydraulic Spare Parts Riyadh • Hydraulic Solutions Jeddah • Components Supplier Dammam • Industrial Parts Al Khobar • Sourcing Jubail • Machinery Parts Yanbu • Manufacturing Tabuk.
              </p>
            </div>
            <div>
              <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">{t.footer.industries}</h5>
              <p className="text-[10px] text-gray-600 leading-relaxed uppercase tracking-widest">
                Oil & Gas Hydraulics • Construction Machinery KSA • Mining Equipment Spare Parts • Agricultural Hydraulic Systems • Marine Fluid Power • Waste Management Trucks.
              </p>
            </div>
            <div>
              <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">{t.footer.brands}</h5>
              <p className="text-[10px] text-gray-600 leading-relaxed uppercase tracking-widest">
                Rexroth Bosch Parts • Danfoss Power Solutions • Parker Hannifin Components • Vickers / Eaton Hydraulics • Kawasaki Pumps • Casappa Motors.
              </p>
            </div>
            <div>
              <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">{t.footer.service}</h5>
              <p className="text-[10px] text-gray-600 leading-relaxed uppercase tracking-widest">
                {t.hero.badge} {t.hero.subtitle}
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

const ConversionOverlays = () => {
  const [showExitIntent, setShowExitIntent] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !localStorage.getItem('exitIntentShown')) {
        setShowExitIntent(true);
        localStorage.setItem('exitIntentShown', 'true');
      }
    };
    
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <>
      {/* Back to Top */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-24 right-6 md:bottom-8 md:right-8 z-40 bg-industrial-green text-deep-charcoal p-3 rounded-sm shadow-2xl hover:bg-white transition-all active:scale-95"
            aria-label="Back to Top"
          >
            <ChevronUp size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* WhatsApp Bubble */}
      <a 
        href="https://wa.me/966567423310" 
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-24 left-6 md:bottom-8 md:left-8 z-40 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all group"
        aria-label="Chat on WhatsApp"
      >
        <MessageCircle size={28} />
        <span className="absolute left-full ml-4 bg-white text-deep-charcoal px-3 py-1 rounded-sm text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
          Need help? Chat now
        </span>
      </a>

      {/* Gemini Chatbot Toggle */}
      <button 
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-40 left-6 md:bottom-24 md:left-8 z-40 bg-industrial-green text-deep-charcoal p-4 rounded-full shadow-2xl hover:scale-110 transition-all group"
        aria-label="Open AI Assistant"
      >
        {isChatOpen ? <X size={28} /> : <Bot size={28} />}
        <span className="absolute left-full ml-4 bg-white text-deep-charcoal px-3 py-1 rounded-sm text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
          AI Parts Expert
        </span>
      </button>

      {/* Gemini Chatbot Window */}
      <AnimatePresence>
        {isChatOpen && (
          <ChatWindow onClose={() => setIsChatOpen(false)} />
        )}
      </AnimatePresence>

      {/* Mobile Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-deep-charcoal border-t border-white/10 grid grid-cols-2 z-40">
        <a href="tel:+966510760770" className="flex items-center justify-center gap-2 py-4 font-display font-bold uppercase tracking-widest border-r border-white/10">
          <Phone size={18} /> Call Now
        </a>
        <a href="#quote" className="flex items-center justify-center gap-2 py-4 font-display font-bold uppercase tracking-widest bg-industrial-green text-deep-charcoal">
          Request Quote
        </a>
      </div>

      {/* Exit Intent Popup */}
      <AnimatePresence>
        {showExitIntent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExitIntent(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-steel-gray max-w-lg w-full p-10 rounded-sm border border-industrial-green/30 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-industrial-green"></div>
              <button 
                onClick={() => setShowExitIntent(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white"
              >
                <X size={24} />
              </button>
              
              <div className="text-center">
                <div className="w-20 h-20 bg-industrial-green/10 text-industrial-green rounded-full flex items-center justify-center mx-auto mb-6">
                  <Zap size={40} />
                </div>
                <h3 className="text-3xl font-bold mb-4">Before you go...</h3>
                <p className="text-gray-400 mb-8">
                  Send us a part number and get a guaranteed quote in under 2 hours. Don't let downtime cost you more.
                </p>
                
                <form className="space-y-4">
                  <input type="email" placeholder="Your Email Address" className="w-full bg-deep-charcoal border border-white/10 rounded-sm px-4 py-3 focus:border-industrial-green outline-none" />
                  <input type="text" placeholder="Part Number (Optional)" className="w-full bg-deep-charcoal border border-white/10 rounded-sm px-4 py-3 focus:border-industrial-green outline-none" />
                  <button className="w-full bg-industrial-green text-deep-charcoal py-4 rounded-sm font-display font-bold uppercase tracking-widest hover:bg-white transition-all">
                    Get My Quote Now
                  </button>
                </form>
                
                <p className="mt-6 text-[10px] text-gray-600 uppercase tracking-widest">
                  No spam. Just fast industrial sourcing.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

// --- Main App Component ---

export default function App() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const { user } = React.useContext(AuthContext);

  useEffect(() => {
    // SEO & Meta Tags
    document.title = "#1 Hydraulic Spare Parts Supplier Saudi Arabia | Pumps, Valves, Motors KSA";
    
    // Add JSON-LD Schema
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WholesaleStore",
      "name": "TRUCKS & HYDRAULICS SOLUTIONS",
      "image": "https://trucksol.com/LOGO.png",
      "description": "Premium Hydraulic Spare Parts Supplier in Saudi Arabia. Leading distributor of Rexroth, Danfoss, Parker, and Vickers hydraulic components for industrial, construction, and marine sectors.",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Al Nimer Center, Musa Bin Nusair Street, Al Olaya District",
        "addressLocality": "Riyadh",
        "addressRegion": "Riyadh",
        "postalCode": "12214",
        "addressCountry": "SA"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 24.7136,
        "longitude": 46.6753
      },
      "url": "https://trucksol.com",
      "telephone": "+966510760770",
      "openingHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
          "opens": "08:00",
          "closes": "18:00"
        }
      ]
    });
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
    <LanguageProvider>
      <AuthProvider>
        <div className="min-h-screen selection:bg-industrial-green selection:text-deep-charcoal">
          <AnnouncementBar />
          <Header 
            onOpenSearch={() => setIsSearchOpen(true)} 
            onOpenDashboard={() => setIsDashboardOpen(true)} 
          />
          
          <main>
            <Hero />
            <Categories onOpenSearch={() => setIsSearchOpen(true)} />
            <BrandsTicker />
            <Industries />
            <HowItWorks />
            <StatsAndTestimonials />
            <FeaturedProducts onOpenSearch={() => setIsSearchOpen(true)} />
            <QuoteForm />
          </main>

          <Footer />
          <ConversionOverlays />

          <AnimatePresence>
            {isDashboardOpen && user && (
              <Dashboard onClose={() => setIsDashboardOpen(false)} />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isSearchOpen && (
              <SearchOverlay onClose={() => setIsSearchOpen(false)} />
            )}
          </AnimatePresence>
        </div>
      </AuthProvider>
    </LanguageProvider>
  );
}
