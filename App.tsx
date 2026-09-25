
import React, { useState, useEffect } from 'react';
import { Plane, LayoutDashboard, PieChart, Menu, X, Sparkles, Home, Search as SearchIcon, Map, User, LogOut, Mail, Lock, ChevronRight, Loader2, CheckCircle, Ticket, CalendarClock, History, Settings, Globe, Bell, Shield, CircleHelp, Smartphone, Moon, Sun, CreditCard, LifeBuoy, Calculator, Languages, MapPin, Coffee, ArrowRightLeft, FileText, ChevronLeft, ClipboardList, Plus, Trash2 } from 'lucide-react';
import { AppView, Flight } from './types';
import { FlightSearch, AirlineLogo } from './components/FlightSearch';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ChatAssistant } from './components/ChatAssistant';
import { getVisaRequirements, generatePackingList } from './services/geminiService';

// -- Types for Auth --
interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

type LegalDocument = 'terms' | 'privacy' | 'data';

// -- Translations --
const TRANSLATIONS = {
  en: {
    home: "Home",
    flights: "Flights",
    aiPlanner: "AI Planner",
    login: "Login",
    signup: "Sign Up",
    heroTitlePrefix: "Explore the World with",
    heroTitleSuffix: "Intelligent Travel",
    heroDesc: "Search flights, compare routes, and create personalized travel plans in one place.",
    findFlights: "Find Flights",
    aiTravelPlanner: "AI Travel Planner",
    welcomeBack: "Welcome Back",
    createAccount: "Create Account",
    signInGoogle: "Sign in with Google",
    signUpGoogle: "Sign up with Google",
    orEmail: "Or continue with email",
    fullName: "Full Name",
    emailAddr: "Email Address",
    password: "Password",
    signIn: "Sign In",
    noAccount: "Don't have an account?",
    hasAccount: "Already have an account?",
    preferences: "Preferences",
    language: "Language",
    support: "Support",
    travelTools: "Travel Tools",
    generalSettings: "General Settings",
    notifications: "Notifications",
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    helpCenter: "Help Center",
    contactSupport: "Contact Support",
    currency: "Currency Converter",
    flightTracker: "Flight Tracker",
    visa: "Visa Requirements",
    packingList: "Smart Packing List",
    menu: "Menu"
  },
  ar: {
    home: "الرئيسية",
    flights: "رحلات طيران",
    aiPlanner: "مخطط الذكاء الاصطناعي",
    login: "تسجيل دخول",
    signup: "إنشاء حساب",
    heroTitlePrefix: "استكشف العالم مع",
    heroTitleSuffix: "السفر الذكي",
    heroDesc: "ابحث عن الرحلات وقارن المسارات وأنشئ خطط سفر مخصصة في مكان واحد.",
    findFlights: "بحث عن رحلات",
    aiTravelPlanner: "مخطط السفر الذكي",
    welcomeBack: "مرحباً بعودتك",
    createAccount: "إنشاء حساب جديد",
    signInGoogle: "تسجيل الدخول عبر جوجل",
    signUpGoogle: "التسجيل عبر جوجل",
    orEmail: "أو المتابعة عبر البريد الإلكتروني",
    fullName: "الاسم الكامل",
    emailAddr: "البريد الإلكتروني",
    password: "كلمة المرور",
    signIn: "تسجيل الدخول",
    noAccount: "ليس لديك حساب؟",
    hasAccount: "لديك حساب بالفعل؟",
    preferences: "التفضيلات",
    language: "اللغة",
    support: "الدعم",
    travelTools: "أدوات السفر",
    generalSettings: "الإعدادات العامة",
    notifications: "الإشعارات",
    darkMode: "الوضع الداكن",
    lightMode: "الوضع الفاتح",
    helpCenter: "مركز المساعدة",
    contactSupport: "تواصل مع الدعم",
    currency: "محول العملات",
    flightTracker: "تتبع الرحلات",
    visa: "متطلبات التأشيرة",
    packingList: "قائمة الأمتعة الذكية",
    menu: "القائمة"
  }
};

interface LegalDocumentModalProps {
  document: LegalDocument;
  onClose: () => void;
}

const LegalDocumentModal: React.FC<LegalDocumentModalProps> = ({ document, onClose }) => {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const title = document === 'terms'
    ? 'Terms of Use'
    : document === 'privacy'
      ? 'Privacy Policy'
      : 'Data & Disclaimers';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="legal-document-title">
      <button className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} aria-label={`Close ${title}`} />
      <article className="relative w-full max-w-2xl max-h-[88vh] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <h2 id="legal-document-title" className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition" aria-label={`Close ${title}`}>
            <X size={20} />
          </button>
        </header>
        <div className="max-h-[calc(88vh-69px)] overflow-y-auto px-6 py-6 text-sm leading-7 text-slate-600 dark:text-slate-300">
          {document === 'terms' && (
            <div className="space-y-5">
              <p>SkyWings AI is currently a travel-search and planning application. Use the information it provides as a starting point and verify important details with the relevant airline, provider, or official authority.</p>
              <section>
                <h3 className="font-bold text-slate-900 dark:text-white">Flight search</h3>
                <p>Flight availability, schedules, and prices come from third-party data and may change. A displayed result is not a reservation, ticket, or guarantee of availability.</p>
              </section>
              <section>
                <h3 className="font-bold text-slate-900 dark:text-white">Planning tools</h3>
                <p>AI and analytical tools provide informational planning assistance. You remain responsible for checking travel, entry, safety, health, price, and availability information before relying on it.</p>
              </section>
              <section>
                <h3 className="font-bold text-slate-900 dark:text-white">Demo functionality</h3>
                <p>Features labeled as demos do not create real accounts, bookings, payments, or tickets. Do not enter real payment details or reuse a sensitive password in a demo feature.</p>
              </section>
            </div>
          )}

          {document === 'privacy' && (
            <div className="space-y-5">
              <p>This policy describes the data behavior of the current SkyWings AI application.</p>
              <section>
                <h3 className="font-bold text-slate-900 dark:text-white">Browser storage</h3>
                <p>Theme preferences, the demo account profile, and demo booking history may be stored locally in your browser. Clearing site data removes this local information.</p>
              </section>
              <section>
                <h3 className="font-bold text-slate-900 dark:text-white">Provider requests</h3>
                <p>Flight-search criteria are sent to the SkyWings server and then to SerpApi for Google Flights results. AI prompts are sent to the SkyWings server and then to the configured AI provider. Provider credentials remain server-side and are not sent to the browser.</p>
              </section>
              <section>
                <h3 className="font-bold text-slate-900 dark:text-white">Payments</h3>
                <p>The current booking demonstration does not collect or process payment-card information.</p>
              </section>
            </div>
          )}

          {document === 'data' && (
            <div className="space-y-4">
              <p>The following limitations apply to the current version of SkyWings AI:</p>
              <ul className="list-disc space-y-3 pl-5 marker:text-brand-500">
                <li><strong className="text-slate-900 dark:text-white">Flight search:</strong> Search results use third-party Google Flights data through SerpApi. Prices, schedules, and availability can change and must be confirmed before purchase.</li>
                <li><strong className="text-slate-900 dark:text-white">Currency Converter:</strong> Conversions use fixed sample rates, not live financial or foreign-exchange rates.</li>
                <li><strong className="text-slate-900 dark:text-white">AI travel content:</strong> Itineraries, visa guidance, packing lists, and chat responses are informational AI-generated content. Verify practical details and consult official government or immigration sources where appropriate.</li>
                <li><strong className="text-slate-900 dark:text-white">Price Analysis and Flight Highlights:</strong> These are deterministic comparisons based only on the flight offers currently displayed, not historical or market-wide intelligence.</li>
                <li><strong className="text-slate-900 dark:text-white">ML price prediction:</strong> The prediction is experimental, uses synthetic training data, and does not guarantee future fares or price movements.</li>
                <li><strong className="text-slate-900 dark:text-white">Booking and payment:</strong> The current flow is a demo. It does not reserve a flight, process payment, or issue a ticket.</li>
              </ul>
            </div>
          )}
        </div>
      </article>
    </div>
  );
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Auth State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Booking History State - User-specific
  const [bookedFlights, setBookedFlights] = useState<Flight[]>([]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Load user-specific bookings from localStorage when user logs in
  useEffect(() => {
    if (user?.email) {
      const userBookingsKey = `bookings_${user.email}`;
      const savedBookings = localStorage.getItem(userBookingsKey);
      if (savedBookings) {
        try {
          setBookedFlights(JSON.parse(savedBookings));
        } catch (e) {
          console.error('Failed to parse saved bookings:', e);
          localStorage.removeItem(userBookingsKey);
        }
      } else {
        setBookedFlights([]);
      }
    }
  }, [user]);

  // Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Feature Modal State
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [activeLegalDocument, setActiveLegalDocument] = useState<LegalDocument | null>(null);

  // Theme & Language State
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [language, setLanguage] = useState<'en' | 'ar'>('en');

  // Helper Translation Function
  const t = (key: keyof typeof TRANSLATIONS['en']) => {
    return TRANSLATIONS[language][key] || key;
  };

  // Load user session from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('skywings-user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (e) {
        console.error('Failed to parse saved user:', e);
        localStorage.removeItem('skywings-user');
      }
    }
  }, []);

  useEffect(() => {
    // Check local storage or system preference on mount
    const savedTheme = localStorage.getItem('skywings-theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('skywings-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('skywings-theme', 'light');
    }
  }, [isDarkMode]);

  // Handle Directionality for Arabic
  useEffect(() => {
    document.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const openAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('skywings-user');
    setCurrentView(AppView.HOME);
    setIsProfileModalOpen(false);
  };

  const handleBookingComplete = (flight: Flight) => {
    // Generate a clearly labeled local demo reference (not a provider booking).
    const bookingRef = `DEMO-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const flightWithRef = { ...flight, bookingReference: bookingRef, bookingDate: new Date() } as any;

    // Save to user-specific localStorage
    if (user?.email) {
      const userBookingsKey = `bookings_${user.email}`;
      const updatedBookings = [flightWithRef, ...bookedFlights];
      setBookedFlights(updatedBookings);
      localStorage.setItem(userBookingsKey, JSON.stringify(updatedBookings));
    }
  };

  // Helper to open a specific feature from sidebar
  const handleFeatureSelect = (feature: string) => {
    setActiveFeature(feature);
    setIsSidebarOpen(false); // Close sidebar on selection
  };

  return (
    <div className={`min-h-screen bg-slate-200 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-sky-200 dark:selection:bg-sky-900 transition-colors duration-300 ${language === 'ar' ? 'font-arabic' : ''}`}>

      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-50 border-b border-slate-100 dark:border-slate-800 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">

            {/* Left Section: Sidebar Menu + Logo */}
            <div className="flex items-center gap-4">
              {/* Hamburger Menu */}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-brand-600 dark:hover:text-brand-400 rounded-xl transition-all duration-200"
                aria-label="Open Menu"
              >
                <Menu size={26} />
              </button>

              {/* Logo */}
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView(AppView.HOME)}>
                <div className="w-10 h-10 bg-sky-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-brand-600 dark:text-brand-400 shadow-sm border border-sky-100 dark:border-slate-700 hidden sm:flex">
                  <Plane size={24} className="transform -rotate-45 rtl:rotate-45" />
                </div>
                <span className="font-bold text-2xl tracking-tight text-slate-900 dark:text-white">
                  SkyWings<span className="text-brand-600 dark:text-brand-400">.ai</span>
                </span>
              </div>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <button
                onClick={() => setCurrentView(AppView.HOME)}
                className={`flex items-center gap-2 font-medium transition hover:text-brand-600 dark:hover:text-brand-400 ${currentView === AppView.HOME ? 'text-brand-600 dark:text-brand-400' : 'text-slate-600 dark:text-slate-400'}`}
              >
                <Home size={18} />
                {t('home')}
              </button>
              <button
                onClick={() => setCurrentView(AppView.SEARCH)}
                className={`flex items-center gap-2 font-medium transition hover:text-brand-600 dark:hover:text-brand-400 ${currentView === AppView.SEARCH ? 'text-brand-600 dark:text-brand-400' : 'text-slate-600 dark:text-slate-400'}`}
              >
                <SearchIcon size={18} />
                {t('flights')}
              </button>
              <button
                onClick={() => setCurrentView(AppView.ANALYTICS)}
                className={`flex items-center gap-2 font-medium transition hover:text-brand-600 dark:hover:text-brand-400 ${currentView === AppView.ANALYTICS ? 'text-brand-600 dark:text-brand-400' : 'text-slate-600 dark:text-slate-400'}`}
              >
                <Sparkles size={18} className="text-sky-500" />
                {t('aiPlanner')}
              </button>
            </div>

            {/* Auth Buttons / User Profile */}
            <div className="hidden md:flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-4">
                  <div
                    className="flex items-center gap-3 ps-4 border-s border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded-xl transition"
                    onClick={() => setIsProfileModalOpen(true)}
                  >
                    <div className="text-right hidden lg:block">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{user.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900 border border-brand-200 dark:border-brand-800 flex items-center justify-center overflow-hidden">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="text-brand-600 dark:text-brand-400" size={20} />
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                    title="Sign Out"
                  >
                    <LogOut size={20} className="rtl:rotate-180" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => openAuth('login')}
                    className="px-6 py-2.5 text-brand-600 dark:text-brand-400 font-semibold rounded-xl hover:bg-brand-50 dark:hover:bg-brand-900/30 transition border border-brand-200 dark:border-brand-800"
                  >
                    {t('login')}
                  </button>
                  <button
                    onClick={() => openAuth('signup')}
                    className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition shadow-lg shadow-brand-500/30"
                  >
                    {t('signup')}
                  </button>
                </>
              )}
            </div>

            {/* Mobile Menu Button (Right Side - Standard) */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 space-y-4 animate-in slide-in-from-top-2 shadow-xl">
            <button
              onClick={() => { setCurrentView(AppView.HOME); setIsMobileMenuOpen(false); }}
              className="block w-full text-start px-4 py-2 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg"
            >
              {t('home')}
            </button>
            <button
              onClick={() => { setCurrentView(AppView.SEARCH); setIsMobileMenuOpen(false); }}
              className="block w-full text-start px-4 py-2 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg"
            >
              {t('flights')}
            </button>
            <button
              onClick={() => { setCurrentView(AppView.ANALYTICS); setIsMobileMenuOpen(false); }}
              className="block w-full text-start px-4 py-2 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2"
            >
              <Sparkles size={16} /> {t('aiPlanner')}
            </button>
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex flex-col gap-3">
              {user ? (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3" onClick={() => { setIsProfileModalOpen(true); setIsMobileMenuOpen(false); }}>
                    <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-600 dark:text-brand-400">
                      {user.avatar ? <img src={user.avatar} className="w-full h-full rounded-full" /> : <User size={20} />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{user.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                    </div>
                  </div>
                  <button onClick={handleLogout} className="w-full py-2 text-sm text-red-600 font-medium border border-red-100 dark:border-red-900/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-2">
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              ) : (
                <>
                  <button onClick={() => openAuth('login')} className="w-full py-2.5 text-brand-600 dark:text-brand-400 font-semibold rounded-xl border border-brand-200 dark:border-brand-800">{t('login')}</button>
                  <button onClick={() => openAuth('signup')} className="w-full py-2.5 bg-brand-600 text-white font-semibold rounded-xl">{t('signup')}</button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main className="pt-20 min-h-screen">

        {/* HOME PAGE VIEW */}
        {currentView === AppView.HOME && (
          <div className="relative h-[calc(100vh-80px)] min-h-[600px] flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 z-0">
              {/* Background Image */}
              <img
                src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2074&auto=format&fit=crop"
                alt="Airplane wing in sky"
                className="w-full h-full object-cover scale-105 animate-in fade-in duration-1000 opacity-90 dark:opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-sky-50/80 via-sky-200/20 to-sky-900/90 dark:from-slate-950/80 dark:via-slate-900/40 dark:to-slate-950"></div>
            </div>

            <div className="relative z-10 text-center max-w-5xl mx-auto px-4 -mt-10 animate-in slide-in-from-bottom-10 fade-in duration-700">
              <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight leading-tight">
                <span className="text-slate-900 dark:text-white block mb-2">{t('heroTitlePrefix')}</span>
                <span className="text-sky-300 dark:text-sky-400 drop-shadow-sm font-black">{t('heroTitleSuffix')}</span>
              </h1>
              <p className="text-lg md:text-xl text-white font-medium max-w-2xl mx-auto leading-relaxed drop-shadow-md mb-10">
                {t('heroDesc')}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => setCurrentView(AppView.SEARCH)}
                  className="w-full sm:w-auto px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white text-lg font-bold rounded-2xl shadow-xl hover:shadow-brand-500/40 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Plane size={20} className="transform -rotate-45 rtl:rotate-45" />
                  {t('findFlights')}
                </button>
                <button
                  onClick={() => setCurrentView(AppView.ANALYTICS)}
                  className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-lg font-bold rounded-2xl shadow-xl hover:shadow-slate-200/40 dark:hover:shadow-black/40 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Sparkles size={20} className="text-purple-500" />
                  {t('aiTravelPlanner')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FLIGHTS PAGE VIEW */}
        {currentView === AppView.SEARCH && (
          <div className="relative min-h-screen">
            {/* Background Gradients */}
            <div className="fixed inset-0 pointer-events-none -z-10 bg-slate-50 dark:bg-slate-950">
              <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-sky-50 dark:from-slate-900 to-transparent opacity-80"></div>
              <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-sky-100/40 dark:bg-slate-800/20 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-lighten"></div>
              <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-100/40 dark:bg-slate-800/20 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-lighten"></div>
            </div>

            {/* Attractive Hero Section */}
            <div className="relative h-[420px] mx-4 md:mx-6 mt-4 rounded-3xl overflow-hidden shadow-2xl z-10 group">
              <img
                src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop"
                alt="Scenic Mountain Lake"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[20s] group-hover:scale-105 opacity-90 dark:opacity-70"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/20 to-slate-900/60"></div>

              {/* Hero Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sky-100 text-xs font-bold uppercase tracking-widest mb-6 animate-in fade-in slide-in-from-top-4 duration-700">
                  <Plane size={14} className="text-sky-300 rtl:flip-x" />
                  <span>Server-Backed Flight Search</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight drop-shadow-2xl mb-4 animate-in fade-in zoom-in-95 duration-700 delay-100">
                  {language === 'ar' ? 'اعثر على مغامرتك القادمة' : 'Find Your Next Adventure'}
                </h2>
                <p className="text-lg md:text-xl text-slate-200 font-medium max-w-2xl mx-auto drop-shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                  {language === 'ar' ? 'ابحث عن الرحلات وقارن المسارات والأسعار لرحلتك القادمة.' : 'Search flights and compare routes and prices for your next trip.'}
                </p>
              </div>
            </div>

            {/* Search Component with overlap */}
            <div className="relative z-20 -mt-24 pb-20 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-300">
              <FlightSearch
                isLoggedIn={!!user}
                onAuthRequest={() => openAuth('login')}
                onBookingComplete={handleBookingComplete}
                language={language}
              />
            </div>
          </div>
        )}

        {/* ANALYTICS / PLANNER VIEW */}
        <div className={currentView === AppView.ANALYTICS ? "" : (currentView === AppView.SEARCH ? "" : "mt-0")}>
          {currentView === AppView.ANALYTICS && <AnalyticsDashboard language={language} />}
          {currentView === AppView.DASHBOARD && (
            <div className="max-w-4xl mx-auto px-4 py-12 text-center mt-12">
              <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="bg-slate-50 dark:bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <LayoutDashboard size={32} className="text-slate-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">User Dashboard</h2>
                <p className="text-slate-500 dark:text-slate-400">
                  Your upcoming trips and historical data will appear here. <br />
                  (Simulated for this demo)
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-5 text-center">
          <nav aria-label="Legal and information" className="flex flex-col sm:flex-row items-center justify-center gap-x-2 gap-y-2 text-sm">
            <button onClick={() => setActiveLegalDocument('terms')} className="text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 transition">Terms of Use</button>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700" aria-hidden="true">|</span>
            <button onClick={() => setActiveLegalDocument('privacy')} className="text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 transition">Privacy Policy</button>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700" aria-hidden="true">|</span>
            <button onClick={() => setActiveLegalDocument('data')} className="text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 transition">Data &amp; Disclaimers</button>
          </nav>
          <p className="text-sm text-slate-400 dark:text-slate-500">&copy; 2026 SkyWings AI</p>
        </div>
      </footer>

      {/* Floating Chat Assistant */}
      <ChatAssistant />

      {/* Authentication Modal */}
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          initialMode={authMode}
          onClose={() => setIsAuthModalOpen(false)}
          onLogin={(user) => {
            setUser(user);
            setIsAuthModalOpen(false);
          }}
          t={t}
        />
      )}

      {/* Profile & History Modal */}
      {isProfileModalOpen && user && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          user={user}
          bookings={bookedFlights}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}

      {/* Feature Modal (Interactive Tools) */}
      {activeFeature && (
        <FeatureModal
          feature={activeFeature}
          onClose={() => setActiveFeature(null)}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          language={language}
          setLanguage={setLanguage}
          t={t}
        />
      )}

      {activeLegalDocument && (
        <LegalDocumentModal
          document={activeLegalDocument}
          onClose={() => setActiveLegalDocument(null)}
        />
      )}

      {/* Sidebar Drawer */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={user}
        onSelectFeature={handleFeatureSelect}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        t={t}
        language={language}
      />

    </div>
  );
};

// --- Feature Modal (Universal Tool Modal) ---
interface FeatureModalProps {
  feature: string;
  onClose: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  language: 'en' | 'ar';
  setLanguage: (lang: 'en' | 'ar') => void;
  t: (key: any) => string;
}

const FeatureModal: React.FC<FeatureModalProps> = ({ feature, onClose, isDarkMode, toggleTheme, language, setLanguage, t }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [toolError, setToolError] = useState<string | null>(null);

  // Settings State
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(false);

  // Currency Converter State
  const [amount, setAmount] = useState('100');
  const [fromCurr, setFromCurr] = useState('USD');
  const [toCurr, setToCurr] = useState('EUR');

  // Visa Check State
  const [citizenship, setCitizenship] = useState('');
  const [destination, setDestination] = useState('');

  // Packing List State
  const [packDest, setPackDest] = useState('');
  const [packDuration, setPackDuration] = useState('7 days');
  const [packingList, setPackingList] = useState<string[]>([]);

  const getTitle = () => {
    switch (feature) {
      case 'currency': return t('currency');
      case 'visa': return t('visa');
      case 'packing-list': return t('packingList');
      case 'settings': return t('generalSettings');
      case 'help': return t('helpCenter');
      case 'language': return t('language');
      default: return 'Tool';
    }
  };

  // Actions
  const convertCurrency = () => {
    // Mock conversion
    const rates: Record<string, number> = { 'USD': 1, 'EUR': 0.92, 'GBP': 0.79, 'JPY': 150 };
    const rate = (rates[toCurr] || 1) / (rates[fromCurr] || 1);
    setResult((parseFloat(amount) * rate).toFixed(2));
  };

  const checkVisa = async () => {
    if (!citizenship || !destination) return;
    setLoading(true);
    setToolError(null);
    setResult(null);
    try {
      const res = await getVisaRequirements(citizenship, destination);
      setResult(res);
    } catch (error) {
      setToolError(error instanceof Error ? error.message : 'Visa guidance is unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePackingList = async () => {
    if (!packDest || !packDuration) return;
    setLoading(true);
    setToolError(null);
    setPackingList([]);
    try {
      const items = await generatePackingList(packDest, packDuration);
      setPackingList(items);
    } catch (error) {
      setToolError(error instanceof Error ? error.message : 'Packing-list generation is unavailable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900 shrink-0">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
            {feature === 'currency' && <Calculator size={20} className="text-brand-600 dark:text-brand-400" />}
            {feature === 'visa' && <FileText size={20} className="text-brand-600 dark:text-brand-400" />}
            {feature === 'language' && <Languages size={20} className="text-brand-600 dark:text-brand-400" />}
            {feature === 'packing-list' && <ClipboardList size={20} className="text-brand-600 dark:text-brand-400" />}
            {getTitle()}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition text-slate-500 dark:text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {/* Language Settings UI */}
          {feature === 'language' && (
            <div className="space-y-4">
              <button
                onClick={() => setLanguage('en')}
                className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${language === 'en' ? 'bg-brand-50 dark:bg-brand-900/30 border-2 border-brand-500' : 'bg-slate-50 dark:bg-slate-800 border-2 border-transparent'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇺🇸</span>
                  <span className={`font-bold ${language === 'en' ? 'text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-300'}`}>English</span>
                </div>
                {language === 'en' && <CheckCircle className="text-brand-500" size={20} />}
              </button>
              <button
                onClick={() => setLanguage('ar')}
                className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${language === 'ar' ? 'bg-brand-50 dark:bg-brand-900/30 border-2 border-brand-500' : 'bg-slate-50 dark:bg-slate-800 border-2 border-transparent'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇸🇦</span>
                  <span className={`font-bold ${language === 'ar' ? 'text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-300'}`}>العربية</span>
                </div>
                {language === 'ar' && <CheckCircle className="text-brand-500" size={20} />}
              </button>
              <p className="text-xs text-center text-slate-400 mt-4">Changing the language will reload the interface.</p>
            </div>
          )}

          {/* Currency Converter UI */}
          {feature === 'currency' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Sample rates · not live market data</p>
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Amount</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-3 border dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-xl font-bold text-slate-900 dark:text-white focus:outline-brand-500" />
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">From</label>
                  <select value={fromCurr} onChange={e => setFromCurr(e.target.value)} className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium">
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>
                <div className="p-3 text-slate-400"><ArrowRightLeft size={20} className="rtl:rotate-180" /></div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">To</label>
                  <select value={toCurr} onChange={e => setToCurr(e.target.value)} className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium">
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>
              </div>
              <button onClick={convertCurrency} className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition">Convert</button>
              {result && (
                <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl text-center">
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Sample Conversion</p>
                  <p className="text-3xl font-bold text-emerald-800 dark:text-emerald-300">{result} {toCurr}</p>
                </div>
              )}
            </div>
          )}

          {/* Visa Checker UI */}
          {feature === 'visa' && (
            <div className="space-y-4">
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">AI-generated guidance · verify current entry rules with an official government or immigration source.</p>
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Passport Country</label>
                <input type="text" placeholder="e.g. United States" value={citizenship} onChange={e => setCitizenship(e.target.value)} className="w-full p-3 border dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-brand-500 placeholder-slate-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Destination</label>
                <input type="text" placeholder="e.g. Vietnam" value={destination} onChange={e => setDestination(e.target.value)} className="w-full p-3 border dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-brand-500 placeholder-slate-400" />
              </div>
              <button onClick={checkVisa} disabled={loading} className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition disabled:opacity-50 flex justify-center">
                {loading ? <Loader2 className="animate-spin" /> : 'Check Requirements'}
              </button>
              {toolError && (
                <div className="p-3 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-sm text-red-700 dark:text-red-300">{toolError}</div>
              )}
              {result && (
                <div className="mt-4 p-4 bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800/40 rounded-xl text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                  {result}
                </div>
              )}
            </div>
          )}

          {/* Packing List UI */}
          {feature === 'packing-list' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">AI-generated packing aid · check weather and activity requirements before packing.</p>
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Destination</label>
                <input type="text" placeholder="e.g. Iceland" value={packDest} onChange={e => setPackDest(e.target.value)} className="w-full p-3 border dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-brand-500 placeholder-slate-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Duration</label>
                <input type="text" placeholder="e.g. 5 days" value={packDuration} onChange={e => setPackDuration(e.target.value)} className="w-full p-3 border dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-brand-500 placeholder-slate-400" />
              </div>
              <button onClick={handleGeneratePackingList} disabled={loading} className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition disabled:opacity-50 flex justify-center">
                {loading ? <Loader2 className="animate-spin" /> : 'Generate Packing List'}
              </button>
              {toolError && (
                <div className="p-3 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-sm text-red-700 dark:text-red-300">{toolError}</div>
              )}
              {packingList.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-bold text-slate-800 dark:text-white mb-2 text-sm">Essentials for {packDest}</h4>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {packingList.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition cursor-pointer group">
                        <div className="w-5 h-5 rounded border border-slate-300 dark:border-slate-500 flex items-center justify-center group-hover:border-brand-500">
                          <div className="w-2.5 h-2.5 rounded-[1px] bg-transparent group-hover:bg-brand-500 transition-colors"></div>
                        </div>
                        <span className="text-sm text-slate-700 dark:text-slate-300">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Settings UI */}
          {feature === 'settings' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer" onClick={() => setPushNotifications(!pushNotifications)}>
                <span className="font-medium text-slate-700 dark:text-slate-200">Push Notifications</span>
                <div className={`w-10 h-6 rounded-full relative transition-colors ${pushNotifications ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${pushNotifications ? 'left-5 rtl:left-1 rtl:right-5' : 'left-1 rtl:right-1 rtl:left-auto'}`}></div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer" onClick={() => setEmailUpdates(!emailUpdates)}>
                <span className="font-medium text-slate-700 dark:text-slate-200">Email Updates</span>
                <div className={`w-10 h-6 rounded-full relative transition-colors ${emailUpdates ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${emailUpdates ? 'left-5 rtl:left-1 rtl:right-5' : 'left-1 rtl:right-1 rtl:left-auto'}`}></div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer" onClick={toggleTheme}>
                <span className="font-medium text-slate-700 dark:text-slate-200">{isDarkMode ? t('lightMode') : t('darkMode')}</span>
                <div className={`w-10 h-6 rounded-full relative transition-colors ${isDarkMode ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isDarkMode ? 'left-5 rtl:left-1 rtl:right-5' : 'left-1 rtl:right-1 rtl:left-auto'}`}></div>
                </div>
              </div>
              <p className="text-xs text-center text-slate-400 mt-4">Version 1.2.0 (Build 4521)</p>
            </div>
          )}

          {/* Support / Help UI */}
          {(feature === 'help' || feature === 'support') && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/30 rounded-full flex items-center justify-center mx-auto text-brand-600 dark:text-brand-400 mb-2">
                <LifeBuoy size={32} />
              </div>
              <h4 className="text-lg font-bold text-slate-800 dark:text-white">How can we help?</h4>
              <p className="text-sm text-amber-700 dark:text-amber-400 mb-6">Demo help content only. Customer support and booking assistance are not currently active.</p>

              {/* Contact Options */}
              <div className="space-y-3">
                <div className="w-full py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold rounded-xl flex items-center justify-center gap-2">
                  <Mail size={18} /> Email support unavailable
                </div>
                <div className="w-full py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold rounded-xl flex items-center justify-center gap-2">
                  <Smartphone size={18} /> Phone support unavailable
                </div>
              </div>

              {/* FAQ Section */}
              <div className="mt-6 text-left">
                <h5 className="font-bold text-slate-800 dark:text-white mb-3">Frequently Asked Questions</h5>
                <div className="space-y-2 text-sm">
                  <details className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 cursor-pointer">
                    <summary className="font-semibold text-slate-700 dark:text-slate-200">How do I book a flight?</summary>
                    <p className="text-slate-600 dark:text-slate-400 mt-2">Real booking is not available. The current flow only saves a labeled demo record in this browser and does not collect payment information.</p>
                  </details>
                  <details className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 cursor-pointer">
                    <summary className="font-semibold text-slate-700 dark:text-slate-200">Can I cancel or change my booking?</summary>
                    <p className="text-slate-600 dark:text-slate-400 mt-2">SkyWings does not currently issue tickets or provider bookings, so there is nothing to cancel or change through this demo.</p>
                  </details>
                  <details className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 cursor-pointer">
                    <summary className="font-semibold text-slate-700 dark:text-slate-200">What is AI Price Prediction?</summary>
                    <p className="text-slate-600 dark:text-slate-400 mt-2">The current ML output is an experimental demonstration trained on synthetic data, not a validated live fare forecast.</p>
                  </details>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Sidebar Component ---
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onSelectFeature?: (feature: string) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  t: (key: any) => string;
  language: 'en' | 'ar';
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, user, onSelectFeature, isDarkMode, toggleTheme, t, language }) => {
  return (
    <div className={`fixed inset-0 z-[100] ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className={`absolute top-0 bottom-0 left-0 rtl:left-auto rtl:right-0 w-80 bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-300 ease-out transform flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'}`}>

        {/* Sidebar Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white">
              <Plane size={18} className="transform -rotate-45 rtl:rotate-45" />
            </div>
            <span className="font-bold text-xl text-slate-900 dark:text-white">{t('menu')}</span>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition">
            <X size={20} />
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">

          {/* User Section (Mobile/Quick Access) */}
          {user && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center overflow-hidden">
                {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <User size={24} className="text-slate-400" />}
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{user.name}</p>
                <p className="text-xs text-brand-600 dark:text-brand-400 font-medium">Frequent Flyer</p>
              </div>
            </div>
          )}

          {/* Feature Group: Travel Tools */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">{t('travelTools')}</h3>
            <div className="space-y-1">
              <SidebarItem icon={<Calculator size={18} />} label={t('currency')} onClick={() => onSelectFeature?.('currency')} />
              <SidebarItem icon={<FileText size={18} />} label={t('visa')} onClick={() => onSelectFeature?.('visa')} />
              <SidebarItem icon={<ClipboardList size={18} />} label={t('packingList')} onClick={() => onSelectFeature?.('packing-list')} />
            </div>
          </div>

          {/* Feature Group: Settings */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">{t('preferences')}</h3>
            <div className="space-y-1">
              <SidebarItem icon={<Settings size={18} />} label={t('generalSettings')} onClick={() => onSelectFeature?.('settings')} />

              <SidebarItem
                icon={isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                label={isDarkMode ? t('lightMode') : t('darkMode')}
                onClick={toggleTheme}
              />
              {/* Language Settings */}
              <SidebarItem
                icon={<Languages size={18} />}
                label={t('language')}
                subLabel={language === 'en' ? 'English' : 'العربية'}
                onClick={() => onSelectFeature?.('language')}
              />
            </div>
          </div>

          {/* Feature Group: Support */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">{t('support')}</h3>
            <div className="space-y-1">
              <SidebarItem icon={<LifeBuoy size={18} />} label={t('helpCenter')} onClick={() => onSelectFeature?.('help')} />
            </div>
          </div>

          {/* App Version Info */}
          <div className="px-2 pt-4">
            <div className="text-xs text-slate-400 text-center">
              <p>SkyWings.ai v1.2.0</p>
              <p className="mt-1">Made with ❤️ for travelers</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SidebarItem: React.FC<{ icon: React.ReactNode; label: string; subLabel?: string; onClick?: () => void }> = ({ icon, label, subLabel, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors group"
  >
    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 group-hover:text-brand-600 dark:group-hover:text-brand-400">
      {icon}
      <div className="text-start">
        <span className="font-medium text-sm block">{label}</span>
        {subLabel && <span className="text-xs text-slate-400 font-normal">{subLabel}</span>}
      </div>
    </div>
    <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 group-hover:text-brand-300 rtl:rotate-180" />
  </button>
);

// --- Auth Modal Component ---
interface AuthModalProps {
  isOpen: boolean;
  initialMode: 'login' | 'signup';
  onClose: () => void;
  onLogin: (user: UserProfile) => void;
  t: (key: any) => string;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, initialMode, onClose, onLogin, t }) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setValidationError(null);
  }, [initialMode]);

  // Email validation regex
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate email format
    if (!isValidEmail(email)) {
      setValidationError('Please enter a valid email address');
      return;
    }

    // Validate password length (minimum 6 characters)
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return;
    }

    // For signup, validate name
    if (mode === 'signup' && name.trim().length < 2) {
      setValidationError('Please enter your full name (at least 2 characters)');
      return;
    }

    setIsLoading(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Get users database from localStorage
    const usersDB = localStorage.getItem('skywings-users-db');
    const users = usersDB ? JSON.parse(usersDB) : {};

    if (mode === 'signup') {
      // Check if email already exists
      if (users[email]) {
        setValidationError('An account with this email already exists. Please login instead.');
        setIsLoading(false);
        return;
      }

      // Create new user account
      const newUser: UserProfile = {
        id: `email_${Date.now()}`,
        name: name,
        email: email,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0ea5e9&color=fff`
      };

      // Save user credentials (email -> password mapping)
      users[email] = {
        id: newUser.id,
        password: password, // In production, this should be hashed
        name: name,
        email: email
      };

      // Save to localStorage
      localStorage.setItem('skywings-users-db', JSON.stringify(users));
      localStorage.setItem('skywings-user', JSON.stringify(newUser));

      onLogin(newUser);
    } else {
      // Login mode - validate credentials
      const userData = users[email];

      if (!userData) {
        // Email doesn't exist
        setValidationError('No account found with this email. Please sign up first.');
        setIsLoading(false);
        return;
      }

      if (userData.password !== password) {
        // Password doesn't match
        setValidationError('Invalid email or password. Please try again.');
        setIsLoading(false);
        return;
      }

      // Successful login - create user profile
      const loggedInUser: UserProfile = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=0ea5e9&color=fff`
      };

      // Save session to localStorage
      localStorage.setItem('skywings-user', JSON.stringify(loggedInUser));
      onLogin(loggedInUser);
    }

    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 rtl:right-auto rtl:left-4 p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition z-10">
          <X size={20} />
        </button>

        {/* Header Graphic */}
        <div className="h-32 bg-gradient-to-br from-brand-600 to-sky-400 dark:from-brand-800 dark:to-brand-600 relative overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
          <div className="relative z-10 text-center text-white">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-2 backdrop-blur-md border border-white/30">
              <Plane size={24} className="transform -rotate-45 rtl:rotate-45" />
            </div>
            <h2 className="font-bold text-xl tracking-tight">SkyWings.ai</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Validation Error Banner */}
          {validationError && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex-shrink-0 w-8 h-8 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-600 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">{validationError}</p>
              </div>
              <button
                onClick={() => setValidationError(null)}
                className="flex-shrink-0 text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}

          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
              {mode === 'login' ? t('welcomeBack') : t('createAccount')}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {mode === 'login' ? 'Enter your email and password to sign in.' : 'Enter your details to create an account.'}
            </p>
          </div>

          <div className="mb-6 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
            Demo-only browser account. Credentials are stored locally in this browser without production-grade protection. Do not use a real or reused password.
          </div>

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">{t('fullName')}</label>
                <div className="relative">
                  <User className="absolute left-3 rtl:left-auto rtl:right-3 top-3.5 text-slate-400" size={18} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 rtl:pl-4 rtl:pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all font-medium text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">{t('emailAddr')}</label>
              <div className="relative">
                <Mail className="absolute left-3 rtl:left-auto rtl:right-3 top-3.5 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 rtl:pl-4 rtl:pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all font-medium text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">{t('password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 rtl:left-auto rtl:right-3 top-3.5 text-slate-400" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 rtl:pl-4 rtl:pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all font-medium text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3.5 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-lg flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? t('signIn') : t('createAccount')}
                  <ChevronRight size={18} className="rtl:rotate-180" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center text-sm">
            <span className="text-slate-500 dark:text-slate-400">
              {mode === 'login' ? t('noAccount') : t('hasAccount')}
            </span>
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="ml-1 font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 hover:underline"
            >
              {mode === 'login' ? t('signup') : t('login')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Profile Modal Component ---
interface ProfileModalProps {
  isOpen: boolean;
  user: UserProfile;
  bookings: Flight[];
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, user, bookings, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Drawer Panel */}
      <div className="relative h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">

        {/* Header */}
        <div className="h-40 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 relative p-6 flex flex-col justify-end">
          <button onClick={onClose} className="absolute top-4 right-4 rtl:right-auto rtl:left-4 p-2 bg-white/10 text-white hover:bg-white/20 rounded-full transition">
            <X size={20} />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 border-2 border-white dark:border-slate-700 flex items-center justify-center overflow-hidden shadow-lg">
              {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <User size={32} className="text-slate-400" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{user.name}</h2>
              <p className="text-slate-300 text-sm">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Booking History List */}
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6">
          <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <History size={20} className="text-brand-600 dark:text-brand-400" /> Local Demo Booking History
          </h3>

          {bookings.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Ticket size={24} className="text-slate-400" />
              </div>
              <p className="text-slate-600 dark:text-slate-400 font-medium mb-1">No demo records yet</p>
              <p className="text-slate-400 dark:text-slate-500 text-sm">No real bookings or tickets are created here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      {/* Minimalist Airline Logo/Icon */}
                      <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-700">
                        <AirlineLogo airline={booking.airline} className="w-full h-full" />
                      </div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{booking.airline}</span>
                    </div>
                    <span className="text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded font-medium border border-amber-100 dark:border-amber-900/50">Demo only · not booked</span>
                  </div>

                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <div className="text-xl font-bold text-slate-900 dark:text-white">{booking.origin.substring(0, 3).toUpperCase()}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{new Date(booking.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <div className="flex-1 flex flex-col items-center px-2">
                      <span className="text-[10px] text-slate-400">{booking.duration}</span>
                      <div className="w-full h-px bg-slate-200 dark:bg-slate-700 relative my-1">
                        <div className="absolute right-0 rtl:right-auto rtl:left-0 top-1/2 -translate-y-1/2">
                          <Plane size={12} className="text-slate-300 dark:text-slate-600 rotate-90 rtl:-rotate-90" />
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-end">
                      <div className="text-xl font-bold text-slate-900 dark:text-white">{booking.destination.substring(0, 3).toUpperCase()}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{new Date(booking.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Reference</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{(booking as any).bookingReference || 'DEMO-REF'}</span>
                    </div>
                    <div className="text-right text-end">
                      <span className="text-slate-400 block mb-0.5">Date</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{new Date(booking.departureTime).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
