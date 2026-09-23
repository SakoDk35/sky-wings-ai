import React, { useState, useEffect } from 'react';
import { Sparkles, MapPin, Calendar, Sun, Heart, Loader2, Clock, Globe, Map } from 'lucide-react';
import { generateTripItinerary } from '../services/geminiService';
import { TripItinerary } from '../types';

interface AnalyticsDashboardProps {
  language?: 'en' | 'ar';
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ language = 'en' }) => {
  const [loading, setLoading] = useState(false);
  const [tripPlan, setTripPlan] = useState<TripItinerary | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  // Form State
  const [destination, setDestination] = useState('');
  const [typeAndLength, setTypeAndLength] = useState('');
  const [season, setSeason] = useState('Spring');
  const [hobbies, setHobbies] = useState('');

  // Map Preview State
  const [debouncedDestination, setDebouncedDestination] = useState('');

  // Debounce the destination input to avoid refreshing the map on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDestination(destination);
    }, 1000); // 1 second delay

    return () => clearTimeout(timer);
  }, [destination]);

  const t = (en: string, ar: string) => language === 'ar' ? ar : en;

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination || !typeAndLength) return;

    setLoading(true);
    setTripPlan(null);
    setGenerationError(null);
    try {
      const plan = await generateTripItinerary(destination, typeAndLength, season, hobbies, language as 'en' | 'ar');
      setTripPlan(plan);
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : t('Itinerary generation failed.', 'فشل إنشاء مسار الرحلة.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-slate-50 dark:bg-slate-950 min-h-screen pb-20">
      
      {/* Immersive Hero Section */}
      <div className="relative h-[400px] w-full overflow-hidden bg-slate-900">
         {/* Background Image */}
         <img 
            src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2070&auto=format&fit=crop" 
            alt="Travel Planning Background" 
            className="absolute inset-0 w-full h-full object-cover opacity-60 dark:opacity-40"
         />
         {/* Gradient Overlay */}
         <div className="absolute inset-0 bg-gradient-to-b from-slate-900/30 via-slate-900/20 to-slate-50 dark:to-slate-950"></div>
         
         {/* Content */}
         <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4 pt-10">
             <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-4 drop-shadow-xl animate-in fade-in zoom-in-95 duration-700 delay-100">
               {t('Design Your Dream Journey', 'صمم رحلة أحلامك')}
             </h1>
              <p className="text-lg md:text-xl text-slate-100 max-w-2xl mx-auto font-medium drop-shadow-md animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                {t('Turn your travel style and interests into a personalized itinerary draft.', 'حوّل أسلوب سفرك واهتماماتك إلى مسودة مسار مخصصة.')}
             </p>
         </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 -mt-20 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input Form */}
          <div className="lg:col-span-4 animate-in slide-in-from-left-4 fade-in duration-700 delay-300">
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 dark:border-slate-700 p-6 h-full flex flex-col sticky top-24">
              <div className="mb-6 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="p-2.5 bg-brand-50 dark:bg-brand-900/30 rounded-xl text-brand-600 dark:text-brand-400">
                      <Map size={24} />
                  </div>
                  <div>
                      <h2 className="font-bold text-slate-800 dark:text-white text-lg">{t('Trip Details', 'تفاصيل الرحلة')}</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t('Customize your experience', 'تخصيص تجربتك')}</p>
                  </div>
              </div>

              <form onSubmit={handleGeneratePlan} className="space-y-5 flex-1">
                {generationError && (
                  <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-700 dark:text-red-300">
                    {generationError}
                  </div>
                )}
                
                {/* 1. Destination */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Destination', 'الوجهة')}</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-3 rtl:left-auto rtl:right-3 flex items-center pointer-events-none">
                      <Globe className="text-slate-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                    </div>
                    <input 
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder={t('e.g. Kyoto, Japan', 'مثال: كيوتو، اليابان')}
                      className="w-full pl-10 pr-4 rtl:pl-4 rtl:pr-10 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-brand-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all placeholder-slate-400 text-slate-800 dark:text-white text-sm font-medium"
                      required
                    />
                  </div>
                </div>

                {/* 2. Type and Length of Stay */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Duration & Vibe', 'المدة والأجواء')}</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-3 rtl:left-auto rtl:right-3 flex items-center pointer-events-none">
                      <Clock className="text-slate-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                    </div>
                    <input 
                      type="text"
                      value={typeAndLength}
                      onChange={(e) => setTypeAndLength(e.target.value)}
                      placeholder={t('e.g. 7 days, relaxing family trip', 'مثال: 7 أيام، رحلة عائلية مريحة')}
                      className="w-full pl-10 pr-4 rtl:pl-4 rtl:pr-10 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-brand-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all placeholder-slate-400 text-slate-800 dark:text-white text-sm font-medium"
                      required
                    />
                  </div>
                </div>

                {/* 3. Season */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Season', 'الموسم')}</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-3 rtl:left-auto rtl:right-3 flex items-center pointer-events-none">
                      <Sun className="text-slate-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                    </div>
                    <select 
                      value={season}
                      onChange={(e) => setSeason(e.target.value)}
                      className="w-full pl-10 pr-4 rtl:pl-4 rtl:pr-10 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-brand-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all text-slate-800 dark:text-white text-sm font-medium cursor-pointer appearance-none"
                    >
                      <option value="Spring">{t('Spring', 'الربيع')}</option>
                      <option value="Summer">{t('Summer', 'الصيف')}</option>
                      <option value="Autumn">{t('Autumn', 'الخريف')}</option>
                      <option value="Winter">{t('Winter', 'الشتاء')}</option>
                    </select>
                    {/* Custom Arrow */}
                    <div className="absolute inset-y-0 right-3 rtl:right-auto rtl:left-3 flex items-center pointer-events-none text-slate-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>

                {/* 4. Favorite Hobbies */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Interests & Hobbies', 'الاهتمامات والهوايات')}</label>
                  <div className="relative group">
                    <div className="absolute top-3.5 left-3 rtl:left-auto rtl:right-3 pointer-events-none">
                      <Heart className="text-slate-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                    </div>
                    <textarea 
                      value={hobbies}
                      onChange={(e) => setHobbies(e.target.value)}
                      placeholder={t('e.g. Photography, Hiking, Historical Sites, Food Tasting', 'مثال: التصوير، المشي لمسافات طويلة، المواقع التاريخية، تذوق الطعام')} 
                      rows={4}
                      className="w-full pl-10 pr-4 rtl:pl-4 rtl:pr-10 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-brand-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all placeholder-slate-400 text-slate-800 dark:text-white text-sm font-medium resize-none"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2 mt-auto">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className={`w-full font-bold py-4 px-6 rounded-xl text-white flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 ${
                        loading
                        ? 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-brand-600 to-sky-500 hover:from-brand-500 hover:to-sky-400'
                    }`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" /> {t('Curating Itinerary...', 'جارٍ تنظيم المسار...')}
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} className="fill-current" /> {t('Generate Itinerary', 'إنشاء مسار الرحلة')}
                      </>
                    )}
                  </button>
                  <p className="mt-2 text-center text-[11px] text-slate-400 dark:text-slate-500">{t('AI-generated planning draft', 'مسودة تخطيط مولدة بالذكاء الاصطناعي')}</p>
                </div>

              </form>
            </div>
          </div>

          {/* Right Column: Results / Map / Placeholder */}
          <div className="lg:col-span-8 min-h-[600px] animate-in slide-in-from-right-4 fade-in duration-700 delay-500">
             {tripPlan ? (
                /* Result View - Document Style */
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 md:p-12 border border-slate-100 dark:border-slate-800 relative overflow-hidden">
                    {/* Decorative background element for the card */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-sky-50 dark:from-slate-800 to-transparent rounded-bl-[100%] -z-0"></div>
                    
                    <div className="relative z-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-slate-100 dark:border-slate-800 pb-8">
                            <div>
                                <span className="inline-block px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 text-xs font-bold uppercase tracking-wide mb-3">
                                    {t('Your Custom Plan', 'خطتك المخصصة')}
                                </span>
                                <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white leading-tight">
                                    {tripPlan.title}
                                </h1>
                            </div>
                            <div className="flex-shrink-0">
                                <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/40 rounded-full flex items-center justify-center text-brand-600 dark:text-brand-400">
                                    <MapPin size={32} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-12">
                            {tripPlan.days.map((day, idx) => (
                                <div key={idx} className="relative pl-8 md:pl-0 rtl:pl-0 rtl:md:pl-0 rtl:pr-8 rtl:md:pr-0">
                                    {/* Timeline line for mobile */}
                                    <div className="absolute left-0 rtl:left-auto rtl:right-0 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700 md:hidden"></div>
                                    
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 md:p-8 border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-10 h-10 rounded-full bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center font-bold text-lg shadow-lg z-10 -ml-[42px] md:ml-0 rtl:-mr-[42px] rtl:md:mr-0">
                                                {idx + 1}
                                            </div>
                                            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
                                                {day.header.replace(/^Day \d+ [—|-] /, '')}
                                            </h2>
                                        </div>
                                        
                                        <div className="space-y-8 pl-2 md:pl-14 rtl:pl-0 rtl:pr-2 rtl:md:pr-14">
                                            {day.sections.map((section, sIdx) => (
                                                <div key={sIdx} className="group">
                                                    <h3 className="text-sm font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-brand-400"></div>
                                                        {section.title}
                                                    </h3>
                                                    <ul className="space-y-4">
                                                        {section.items.map((item, iIdx) => (
                                                            <li key={iIdx} className="flex items-start gap-4 text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0 group-hover:bg-brand-500 transition-colors" />
                                                                <span className="leading-relaxed">{item}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {tripPlan.practicalTips && tripPlan.practicalTips.length > 0 && (
                            <div className="mt-12 bg-amber-50 dark:bg-amber-950/30 rounded-2xl p-8 border border-amber-100 dark:border-amber-900/50">
                                <h2 className="text-xl font-bold text-amber-900 dark:text-amber-400 mb-6 flex items-center gap-2">
                                    <Sun size={24} className="text-amber-500" />
                                    {t('Practical Food & Culture Tips', 'نصائح عملية عن الطعام والثقافة')}
                                </h2>
                                 <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {tripPlan.practicalTips.map((tip, idx) => (
                                        <li key={idx} className="flex items-start gap-3 text-amber-800 dark:text-amber-300 leading-relaxed bg-white/50 dark:bg-slate-900/50 p-3 rounded-lg">
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                                            <span>{tip}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
             ) : (
               /* Map Preview Mode (Always visible if no trip plan) */
               <div className="h-full min-h-[600px] w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden relative border border-slate-200 dark:border-slate-700 group">
                   <div className="absolute inset-0 z-0">
                      {/* Using Google Maps Embed Iframe for interactive feel */}
                      <iframe 
                        width="100%" 
                        height="100%" 
                        frameBorder="0" 
                        style={{ border: 0, filter: 'grayscale(0.2) contrast(1.1)' }}
                        src={`https://www.google.com/maps?q=${encodeURIComponent(debouncedDestination || "London")}&output=embed&iwloc=near&z=${debouncedDestination ? 11 : 2}`}
                        allowFullScreen
                        title="Destination Map Preview"
                        className="w-full h-full opacity-90 hover:opacity-100 transition-opacity duration-500"
                      ></iframe>
                   </div>
                   
                   {/* Map Overlay Card */}
                   <div className="absolute bottom-6 left-6 right-6 md:right-auto md:left-auto md:w-80 md:mx-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-5 rounded-2xl shadow-2xl border border-white/50 dark:border-slate-700 animate-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center gap-3 mb-3">
                         <div className="p-2 bg-brand-100 dark:bg-brand-900/50 rounded-lg text-brand-600 dark:text-brand-400">
                            {debouncedDestination ? <MapPin size={20} /> : <Globe size={20} />}
                         </div>
                         <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                                {debouncedDestination ? t("Previewing", 'معاينة') : t("Interactive Map", 'خريطة تفاعلية')}
                            </p>
                            <h3 className="font-bold text-slate-900 dark:text-white truncate">
                                {debouncedDestination || t("Explore the World", 'استكشف العالم')}
                            </h3>
                         </div>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                         {debouncedDestination 
                           ? t(`Previewing ${debouncedDestination}. Complete the form to generate an AI planning draft here.`, `معاينة ${debouncedDestination}. أكمل النموذج لإنشاء مسودة تخطيط بالذكاء الاصطناعي هنا.`)
                           : t("Enter a destination to preview it on the map and create an AI planning draft.", "أدخل وجهة لمعاينتها على الخريطة وإنشاء مسودة تخطيط بالذكاء الاصطناعي.")}
                      </p>
                   </div>

                   {/* Loading Overlay if form is submitting */}
                   {loading && (
                      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-white">
                          <Loader2 size={48} className="animate-spin mb-4" />
                          <p className="font-bold text-lg">{t('Designing your trip...', 'جارٍ تصميم رحلتك...')}</p>
                      </div>
                   )}
               </div>
             )}
          </div>
          
        </div>
      </div>
    </div>
  );
};
