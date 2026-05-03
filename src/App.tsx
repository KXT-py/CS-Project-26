import React from 'react';
import { Home, Compass, Archive, User, Search, Star, ExternalLink, Bookmark, CheckCircle2, ChevronRight, ChevronLeft, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Recommendation, UserProfile, Category } from './types';
import { cn } from './lib/utils';
import { getRecommendations, getDetailedExploration } from './services/geminiService';
import Markdown from 'react-markdown';

interface ReviewSectionProps {
  itemId: string;
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
}

function ReviewSection({ itemId, userProfile, setUserProfile }: ReviewSectionProps) {
  const [rating, setRating] = React.useState(userProfile.reviews?.[itemId]?.rating || 0);
  const [review, setReview] = React.useState(userProfile.reviews?.[itemId]?.comment || '');
  const [isEditing, setIsEditing] = React.useState(!userProfile.reviews?.[itemId]);

  const saveReview = () => {
    setUserProfile(prev => ({
      ...prev,
      reviews: {
        ...prev.reviews,
        [itemId]: {
          recommendationId: itemId,
          rating,
          comment: review,
          timestamp: Date.now()
        }
      }
    }));
    setIsEditing(false);
  };

  return (
    <div className="space-y-4 pt-6 border-t border-white/5">
      <div className="flex items-center justify-between">
        <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Your Curator Review</h5>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest">Edit Entry</button>
        )}
      </div>
      
      {isEditing ? (
        <div className="space-y-4">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} onClick={() => setRating(star)} className="text-2xl transition-transform hover:scale-125">
                <Star size={20} fill={star <= rating ? "currentColor" : "none"} className={star <= rating ? "text-orange-400" : "text-white/10"} />
              </button>
            ))}
          </div>
          <textarea 
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Log your thoughts on this curation..."
            className="w-full p-8 bg-white/5 border border-white/10 rounded-3xl text-sm focus:border-indigo-500/50 outline-none h-32 resize-none text-white placeholder:text-white/20 font-medium"
          />
          <button onClick={saveReview} className="px-8 py-3 bg-indigo-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-400 transition-all shadow-lg shadow-indigo-500/10">
            Confirm Review
          </button>
        </div>
      ) : (
        <div className="space-y-4 bg-white/2 p-6 rounded-3xl border border-white/5">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} size={12} fill={star <= rating ? "currentColor" : "none"} className={star <= rating ? "text-orange-400" : "text-white/10"} />
            ))}
          </div>
          <p className="text-sm text-white/60 italic font-medium">"{review || 'No log entry recorded yet.'}"</p>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = React.useState<'home' | 'discover' | 'archive' | 'profile'>('home');
  const [userProfile, setUserProfile] = React.useState<UserProfile>(() => {
    const saved = localStorage.getItem('lumina_profile');
    if (saved) return JSON.parse(saved);
    return {
      name: 'Explorer',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Explorer',
      favorites: [],
      archive: [],
      progress: {}
    };
  });

  const [interests, setInterests] = React.useState('');
  const [isDiscovering, setIsDiscovering] = React.useState(false);
  const [currentBatch, setCurrentBatch] = React.useState<Recommendation[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [activeCategory, setActiveCategory] = React.useState<Category | 'all'>('all');

  // Persistence
  React.useEffect(() => {
    localStorage.setItem('lumina_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  const handleDiscover = async () => {
    if (!interests.trim()) return;
    setIsDiscovering(true);
    setCurrentIndex(0);
    try {
      const results = await getRecommendations(interests, activeCategory === 'all' ? undefined : activeCategory);
      setCurrentBatch(results);
      
      // Save to archive
      setUserProfile(prev => ({
        ...prev,
        archive: [
          {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            query: interests,
            items: results
          },
          ...prev.archive
        ].slice(0, 50) // Keep last 50
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setIsDiscovering(false);
    }
  };

  const toggleFavorite = (id: string) => {
    setUserProfile(prev => {
      const isFav = prev.favorites.includes(id);
      return {
        ...prev,
        favorites: isFav ? prev.favorites.filter(fid => fid !== id) : [...prev.favorites, id]
      };
    });
  };

  const updateProgress = (id: string, status: 'not_started' | 'in_progress' | 'completed') => {
    setUserProfile(prev => ({
      ...prev,
      progress: { ...prev.progress, [id]: status }
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-rose-950 text-white font-sans selection:bg-indigo-500/30 flex overflow-hidden">
      {/* Desktop Sidebar Navigation */}
      <nav className="hidden md:flex w-72 h-screen bg-white/5 backdrop-blur-3xl border-r border-white/10 flex-col p-8 shrink-0">
        <div className="flex items-center gap-4 mb-16">
          <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="text-white" size={20} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Lumina</h1>
        </div>

        <div className="flex-1 flex flex-col gap-3">
          {(['home', 'discover', 'archive', 'profile'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group",
                activeTab === tab 
                  ? "bg-white/15 text-white shadow-xl shadow-black/10" 
                  : "text-white/50 hover:bg-white/5 hover:text-white/80"
              )}
            >
              <div className={cn(
                "p-2 rounded-lg transition-colors",
                activeTab === tab ? "text-indigo-400" : "text-white/30 group-hover:text-white/60"
              )}>
                {tab === 'home' && <Home size={20} />}
                {tab === 'discover' && <Compass size={20} />}
                {tab === 'archive' && <Archive size={20} />}
                {tab === 'profile' && <User size={20} />}
              </div>
              <span className="font-semibold capitalize tracking-wide">{tab}</span>
            </button>
          ))}
        </div>

        <div className="mt-auto">
          <button 
            onClick={() => setActiveTab('profile')}
            className="w-full p-4 bg-white/5 rounded-3xl border border-white/10 flex items-center gap-4 hover:bg-white/10 transition-all text-left"
          >
            <div className="relative">
              <img src={userProfile.avatar} alt="Avatar" className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 p-0.5" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-indigo-950 rounded-full" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold truncate">{userProfile.name}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-widest truncate">Level {Object.keys(userProfile.progress).length + 1} Explorer</p>
            </div>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto overflow-x-hidden relative flex flex-col pt-8 pb-32 md:pb-8 px-6 md:px-12">
        {/* Mobile Header */}
        <header className="md:hidden flex justify-between items-center mb-8 px-2">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
               <Sparkles className="text-white" size={16} />
             </div>
             <span className="font-bold text-lg">Lumina</span>
          </div>
          <button onClick={() => setActiveTab('profile')}>
            <img src={userProfile.avatar} alt="Profile" className="w-10 h-10 rounded-xl bg-white/10" />
          </button>
        </header>

        <div className="max-w-6xl w-full mx-auto flex-1 flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex-1 flex flex-col"
            >
              {activeTab === 'home' && <HomeView userProfile={userProfile} />}
              {activeTab === 'discover' && (
                <DiscoverView 
                  interests={interests}
                  setInterests={setInterests}
                  isDiscovering={isDiscovering}
                  handleDiscover={handleDiscover}
                  activeCategory={activeCategory}
                  setActiveCategory={setActiveCategory}
                  currentBatch={currentBatch}
                  currentIndex={currentIndex}
                  setCurrentIndex={setCurrentIndex}
                  setCurrentBatch={setCurrentBatch}
                  toggleFavorite={toggleFavorite}
                  userProfile={userProfile}
                  onExploreMore={async (id: string) => {
                    const item = currentBatch.find(i => i.id === id);
                    if (!item || item.longSummary) return;
                    const exploration = await getDetailedExploration(item);
                    setCurrentBatch(prev => prev.map(i => i.id === id ? { ...i, longSummary: exploration } : i));
                  }}
                />
              )}
              {activeTab === 'archive' && <ArchiveView userProfile={userProfile} toggleFavorite={toggleFavorite} />}
              {activeTab === 'profile' && (
                <ProfileView 
                  userProfile={userProfile} 
                  setUserProfile={setUserProfile} 
                  toggleFavorite={toggleFavorite}
                  updateProgress={updateProgress}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-6 left-6 right-6 h-20 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[32px] md:hidden flex items-center justify-around px-4 z-50 shadow-2xl">
        {(['home', 'discover', 'archive', 'profile'] as const).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)} 
            className={cn(
              "flex flex-col items-center gap-1 p-4 transition-all", 
              activeTab === tab ? "text-indigo-400 scale-110" : "text-white/40"
            )}
          >
            {tab === 'home' && <Home size={22} />}
            {tab === 'discover' && <Compass size={22} />}
            {tab === 'archive' && <Archive size={22} />}
            {tab === 'profile' && <User size={22} />}
          </button>
        ))}
      </nav>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=Plus+Jakarta+Sans:wght@200;300;400;500;600;700;800&display=swap');
        
        body {
          font-family: 'Plus Jakarta Sans', sans-serif;
          scrollbar-color: rgba(255,255,255,0.1) transparent;
          scrollbar-width: thin;
        }

        .serif {
          font-family: 'Cormorant Garamond', serif;
        }
        
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}} />
    </div>
  );
}

// Sub-components for better organization and cleaner theme application

function HomeView({ userProfile }: { userProfile: UserProfile }) {
  return (
    <div className="space-y-12">
      <header className="space-y-4">
        <p className="text-indigo-400 text-sm font-bold uppercase tracking-[0.3em] mb-2">Personalized Space</p>
        <h2 className="text-5xl font-extrabold tracking-tight">
          Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-rose-400">{userProfile.name}</span>
        </h2>
        <p className="text-lg text-white/50 max-w-2xl font-medium leading-relaxed">
          Your curation deck is ready. Dive back into your saved interests or spark a new discovery.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Saved Items', count: userProfile.favorites.length, icon: Bookmark, color: 'indigo' },
          { label: 'Archives', count: userProfile.archive.length, icon: Archive, color: 'rose' },
          { label: 'Mastery Points', count: Object.values(userProfile.progress).filter(p => p === 'completed').length, icon: CheckCircle2, color: 'emerald' }
        ].map((stat, i) => (
          <div key={i} className="p-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] group hover:bg-white/10 transition-all">
            <div className={`w-14 h-14 bg-${stat.color}-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
              <stat.icon className={`text-${stat.color}-400`} size={28} />
            </div>
            <p className="text-4xl font-bold mb-1 tracking-tight">{stat.count}</p>
            <p className="text-white/40 text-sm font-bold uppercase tracking-wider">{stat.label}</p>
          </div>
        ))}
      </div>

      {userProfile.favorites.length > 0 && (
        <section className="space-y-8">
          <h3 className="text-2xl font-bold flex items-center gap-3">
            <span className="w-8 h-1 bg-indigo-500 rounded-full" />
            Recently Saved
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {userProfile.favorites.slice(0, 4).map(id => {
              const item = userProfile.archive.flatMap(a => a.items).find(i => i.id === id);
              if (!item) return null;
              return (
                <div key={id} className="p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-[32px] flex gap-6 hover:border-white/20 transition-all">
                   <div className="w-20 h-20 bg-indigo-500/10 rounded-[20px] flex-shrink-0 flex items-center justify-center text-3xl border border-white/5">
                     {item.category === 'book' ? '📚' : item.category === 'hobby' ? '🎨' : item.category === 'skill' ? '🛠️' : '🧠'}
                   </div>
                   <div className="flex-1 overflow-hidden">
                     <h4 className="font-bold text-xl mb-1 truncate">{item.title}</h4>
                     <p className="text-sm text-white/40 line-clamp-2 leading-relaxed">{item.description}</p>
                   </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function DiscoverView({ 
  interests, setInterests, isDiscovering, handleDiscover, activeCategory, setActiveCategory, 
  currentBatch, currentIndex, setCurrentIndex, setCurrentBatch, toggleFavorite, userProfile, onExploreMore 
}: any) {
  const [isExploring, setIsExploring] = React.useState(false);

  const handleExploreMore = async () => {
    setIsExploring(true);
    await onExploreMore(currentBatch[currentIndex].id);
    setIsExploring(false);
  };

  return (
    <div className="flex flex-col h-full">
      {!currentBatch.length || isDiscovering ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-12 py-12 max-w-3xl mx-auto text-center">
          <div className="space-y-4">
            <p className="text-indigo-400 font-bold uppercase tracking-[0.4em] text-xs">Curator Interface v2.0</p>
            <h2 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
              What should we <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-rose-400 italic">curate today?</span>
            </h2>
          </div>

          <div className="w-full relative group">
             <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-rose-500 rounded-[42px] blur opacity-10 group-hover:opacity-25 transition-opacity" />
             <textarea
               value={interests}
               onChange={(e) => setInterests(e.target.value)}
               placeholder="Describe your interests, goals, or current mood..."
               className="relative w-full h-56 p-12 text-2xl bg-white/5 backdrop-blur-3xl border border-white/20 rounded-[48px] focus:border-indigo-500/50 outline-none transition-all placeholder:text-white/20 resize-none font-medium text-white shadow-2xl"
             />
             <div className="absolute right-6 bottom-6 flex flex-wrap gap-2 justify-end">
                {['all', 'book', 'podcast', 'article', 'hobby', 'skill', 'learning-field'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat as any)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all backdrop-blur-xl border",
                      activeCategory === cat 
                        ? "bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/20" 
                        : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                    )}
                  >
                    {cat.replace('-', ' ')}
                  </button>
                ))}
             </div>
          </div>

          <button
            onClick={handleDiscover}
            disabled={isDiscovering || !interests.trim()}
            className="group relative px-16 py-7 bg-indigo-500 text-white rounded-full text-xl font-bold tracking-widest overflow-hidden hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-indigo-500/20 disabled:opacity-30"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <div className="flex items-center gap-4">
              {isDiscovering ? <Loader2 className="animate-spin" /> : <Sparkles size={24} />}
              {isDiscovering ? 'Analyzing Architecture...' : 'ANALYZE & CURATE'}
            </div>
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex justify-between items-end">
            <header>
              <p className="text-indigo-400 text-xs font-bold uppercase tracking-[0.4em] mb-2">Discovery Result</p>
              <h2 className="text-4xl font-extrabold tracking-tight capitalize">{currentBatch[currentIndex].category} Selection</h2>
            </header>
            <button 
              onClick={() => setCurrentBatch([])}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-bold tracking-widest uppercase transition-all flex items-center gap-2"
            >
              <Search size={14} /> New Session
            </button>
          </div>

          <div className="flex-1 flex gap-8">
            <motion.div
              layoutId="recommendation-card"
              className="flex-1 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[48px] p-12 flex flex-col relative overflow-hidden shadow-2xl shadow-black/20"
            >
               {/* Decorative background blur */}
               <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 blur-[120px] pointer-events-none" />
               <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-rose-600/10 blur-[120px] pointer-events-none" />

              <div className="flex flex-col md:flex-row gap-10 relative z-10">
                <div className="w-56 h-72 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-[32px] shrink-0 border-4 border-white/10 shadow-2xl flex items-center justify-center text-8xl relative overflow-hidden group">
                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                     <span className="text-sm font-bold uppercase tracking-widest text-white/80">Ref: {currentBatch[currentIndex].id.slice(0, 8)}</span>
                   </div>
                   {currentBatch[currentIndex].category === 'book' ? '📚' : currentBatch[currentIndex].category === 'hobby' ? '🎨' : currentBatch[currentIndex].category === 'skill' ? '🛠️' : '🧠'}
                </div>

                <div className="flex-1 space-y-6 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-lg text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                        {currentBatch[currentIndex].category}
                      </span>
                      <span className="px-3 py-1 bg-rose-500/20 border border-rose-400/30 rounded-lg text-[10px] font-bold uppercase tracking-wider text-rose-300">
                        Personalized Match
                      </span>
                    </div>
                    <h3 className="text-4xl font-extrabold tracking-tight leading-tight">{currentBatch[currentIndex].title}</h3>
                    <p className="text-lg text-white/60 leading-relaxed font-medium">
                      {currentBatch[currentIndex].description}
                    </p>
                  </div>

                  {currentBatch[currentIndex].longSummary ? (
                    <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-3xl animate-in fade-in slide-in-from-top-4 prose prose-invert prose-sm max-w-none">
                      <h4 className="text-indigo-400 font-bold uppercase tracking-widest text-xs mb-4">Deep Curation Insights</h4>
                      <Markdown>{currentBatch[currentIndex].longSummary}</Markdown>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 bg-white/5 rounded-3xl border border-white/10">
                        <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-1">Source Impact</p>
                        <p className="font-bold text-white/80 italic">{currentBatch[currentIndex].reference}</p>
                      </div>
                      <div className="p-5 bg-white/5 rounded-3xl border border-white/10">
                        <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-1">Curation Date</p>
                        <p className="font-bold text-white/80">{new Date().toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-auto pt-10 border-t border-white/10 flex flex-col md:flex-row gap-6 items-center">
                 <div className="flex-1 flex gap-4 w-full">
                    {currentBatch[currentIndex].link && (
                      <a href={currentBatch[currentIndex].link} target="_blank" rel="noopener noreferrer" 
                        className="flex-1 h-16 bg-white text-indigo-950 rounded-2xl flex items-center justify-center gap-2 font-bold tracking-widest text-xs uppercase hover:bg-white/90 transition-all shadow-xl shadow-white/10"
                      >
                        <ExternalLink size={18} /> Deep Dive
                      </a>
                    )}
                    {!currentBatch[currentIndex].longSummary && (
                      <button 
                        onClick={handleExploreMore}
                        disabled={isExploring}
                        className="flex-1 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center gap-2 font-bold tracking-widest text-xs uppercase hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50"
                      >
                        {isExploring ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                        {isExploring ? 'Exploring...' : 'Expand Analysis'}
                      </button>
                    )}
                    <button 
                      onClick={() => toggleFavorite(currentBatch[currentIndex].id)}
                      className={cn(
                        "h-16 px-8 rounded-2xl border transition-all flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-xs",
                        userProfile.favorites.includes(currentBatch[currentIndex].id)
                          ? "bg-indigo-500 border-indigo-400 text-white" 
                          : "bg-white/5 border-white/20 text-white/60 hover:bg-white/10 hover:border-white/40"
                      )}
                    >
                      <Bookmark fill={userProfile.favorites.includes(currentBatch[currentIndex].id) ? "currentColor" : "none"} size={18} />
                      {userProfile.favorites.includes(currentBatch[currentIndex].id) ? "Saved" : "Save"}
                    </button>
                 </div>

                 <div className="flex items-center gap-6 w-full md:w-auto pt-6 md:pt-0 md:border-l md:border-white/10 md:pl-8">
                    <div className="text-sm font-bold text-white/30 tabular-nums">
                      {currentIndex + 1} / {currentBatch.length}
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setCurrentIndex((prev: number) => Math.max(0, prev - 1))}
                        disabled={currentIndex === 0}
                        className="w-14 h-14 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center hover:bg-white/10 disabled:opacity-20 transition-all"
                      >
                        <ChevronLeft size={24} />
                      </button>
                      <button 
                        onClick={() => setCurrentIndex((prev: number) => Math.min(currentBatch.length - 1, prev + 1))}
                        disabled={currentIndex === currentBatch.length - 1}
                        className="w-24 h-14 bg-indigo-500 text-white rounded-2xl flex items-center justify-center gap-2 font-bold tracking-widest text-[10px] uppercase hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-20"
                      >
                        Next <ChevronRight size={18} />
                      </button>
                    </div>
                 </div>
              </div>
            </motion.div>

            <aside className="hidden lg:flex w-72 flex-col gap-6">
               <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] p-6 space-y-6">
                 <h4 className="text-xs font-bold uppercase tracking-[0.3em] flex items-center gap-2 text-white/50">
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
                    Explorer Stats
                 </h4>
                 <div className="space-y-5">
                    <div>
                      <div className="flex justify-between text-[10px] uppercase font-bold text-white/30 mb-2">
                        <span>Archive Capacity</span>
                        <span>{userProfile.archive.length}%</span>
                      </div>
                      <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                        <div className="bg-indigo-400 h-full transition-all" style={{ width: `${Math.min(userProfile.archive.length, 100)}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] uppercase font-bold text-white/30 mb-2">
                        <span>Save Rate</span>
                        <span>{Math.round((userProfile.favorites.length / (userProfile.archive.length * 5 || 1)) * 100)}%</span>
                      </div>
                      <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                        <div className="bg-rose-400 h-full transition-all" style={{ width: `${Math.min(Math.round((userProfile.favorites.length / (userProfile.archive.length * 5 || 1)) * 100), 100)}%` }}></div>
                      </div>
                    </div>
                 </div>
               </div>

               <div className="bg-indigo-600/10 backdrop-blur-2xl border border-indigo-500/20 rounded-[32px] p-6 flex-1 flex flex-col items-center justify-center text-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-indigo-500/20 flex items-center justify-center mb-2 border border-indigo-400/20">
                    <Sparkles className="text-indigo-300" size={32} />
                  </div>
                  <p className="text-sm font-bold tracking-widest text-indigo-200">PRO TIP</p>
                  <p className="text-xs text-indigo-100/40 leading-relaxed font-medium">Use specific keywords like "intermediate" or "practical" in your query for higher fidelity curation.</p>
               </div>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}

function ArchiveView({ userProfile, toggleFavorite }: any) {
  return (
    <div className="space-y-12">
      <header className="space-y-4">
        <p className="text-rose-400 text-sm font-bold uppercase tracking-[0.3em] mb-2">History Core</p>
        <h2 className="text-5xl font-extrabold tracking-tight">Curation <span className="text-white/20 italic">Timeline</span></h2>
        <p className="text-lg text-white/50 max-w-2xl font-medium">Your historical knowledge map, preserved in the crystal archive.</p>
      </header>

      <div className="space-y-8">
        {userProfile.archive.map((session: any) => (
          <div key={session.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] overflow-hidden group hover:bg-white/10 transition-all shadow-2xl">
            <div className="p-10 border-b border-white/5 flex flex-col md:flex-row justify-between gap-6">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Curation Query</span>
                <p className="text-2xl font-bold italic tracking-tight leading-none text-indigo-300">"{session.query}"</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-widest text-white/30">{new Date(session.timestamp).toLocaleDateString()}</p>
                  <p className="text-sm font-bold text-rose-400 uppercase tracking-tighter">{session.items.length} RESULTS</p>
                </div>
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                  <ChevronRight className="text-white/30 group-hover:text-white transition-colors" />
                </div>
              </div>
            </div>
            <div className="p-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {session.items.map((item: any) => (
                <div key={item.id} className="space-y-4 group/item">
                  <div className="flex items-start justify-between gap-4">
                     <div className="space-y-1">
                       <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-400/60 block">{item.category}</span>
                       <h4 className="text-lg font-bold tracking-tight group-hover/item:text-indigo-300 transition-colors leading-tight">{item.title}</h4>
                     </div>
                     <button 
                      onClick={() => toggleFavorite(item.id)}
                      className={cn(
                        "p-3 rounded-xl transition-all",
                        userProfile.favorites.includes(item.id) 
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/20" 
                          : "text-white/10 hover:text-white/40 hover:bg-white/5"
                      )}
                     >
                       <Bookmark fill={userProfile.favorites.includes(item.id) ? "currentColor" : "none"} size={16} />
                     </button>
                  </div>
                  <p className="text-sm text-white/30 line-clamp-3 leading-relaxed font-medium">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {userProfile.archive.length === 0 && (
          <div className="py-32 text-center space-y-6 bg-white/5 border-2 border-dashed border-white/10 rounded-[48px]">
            <Archive className="mx-auto text-white/10" size={80} />
            <p className="text-white/30 text-xl font-bold uppercase tracking-widest">Archive Empty</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileView({ userProfile, setUserProfile, toggleFavorite, updateProgress }: any) {
  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[48px] p-12 flex flex-col md:flex-row items-center gap-12 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-8">
           <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all">Edit Identity</button>
        </div>
        
        <div className="relative shrink-0">
          <div className="absolute -inset-2 bg-gradient-to-tr from-indigo-500 to-rose-500 rounded-[52px] blur-lg opacity-30" />
          <img src={userProfile.avatar} alt="Avatar" className="relative w-40 h-40 rounded-[44px] bg-indigo-950 border-4 border-white/10 shadow-2xl" />
        </div>
        
        <div className="text-center md:text-left space-y-6 flex-1">
          <div className="space-y-1">
            <p className="text-indigo-400 text-xs font-bold uppercase tracking-[0.4em]">Knowledge Curator</p>
            <h2 className="text-5xl font-extrabold tracking-tight">{userProfile.name}</h2>
          </div>
          
          <div className="flex flex-wrap justify-center md:justify-start gap-3">
             <div className="px-5 py-3 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-3">
                <Bookmark size={16} className="text-indigo-400" />
                <span className="text-xs font-bold">{userProfile.favorites.length} Saved</span>
             </div>
             <div className="px-5 py-3 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-3">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span className="text-xs font-bold">{Object.values(userProfile.progress).filter(p => p === 'completed').length} Mastery Points</span>
             </div>
             <div className="px-5 py-3 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-3">
                <Star size={16} className="text-orange-400" />
                <span className="text-xs font-bold">{Object.keys(userProfile.reviews || {}).length} Reviews</span>
             </div>
          </div>
        </div>
      </div>

      <div className="space-y-10">
        <h3 className="text-3xl font-extrabold flex items-center gap-4">
          <div className="w-2 h-10 bg-indigo-500 rounded-full" />
          The Collection
        </h3>
        
        <div className="grid gap-8">
          {userProfile.favorites.map(id => {
            const item = userProfile.archive.flatMap(a => a.items).find(i => i.id === id);
            if (!item) return null;
            return (
              <div key={id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[48px] p-12 flex flex-col md:flex-row gap-10 group hover:bg-white/10 hover:border-white/20 transition-all shadow-xl">
                <div className="w-full md:w-64 bg-indigo-500/10 rounded-[40px] flex items-center justify-center text-7xl py-12 md:py-0 shrink-0 border border-white/5 shadow-inner">
                  {item.category === 'book' ? '📚' : item.category === 'hobby' ? '🎨' : item.category === 'skill' ? '🛠️' : '🧠'}
                </div>
                
                <div className="flex-1 flex flex-col">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">{item.category}</span>
                      <div className="flex items-center gap-1 text-orange-400/40">
                         {userProfile.reviews?.[item.id] ? (
                           [...Array(5)].map((_, i) => (
                             <Star key={i} size={14} fill={i < (userProfile.reviews?.[item.id].rating || 0) ? "currentColor" : "none"} className={i < (userProfile.reviews?.[item.id].rating || 0) ? "text-orange-400" : ""} />
                           ))
                         ) : (
                           <span className="text-[9px] uppercase tracking-widest font-bold">Unreviewed</span>
                         )}
                      </div>
                    </div>
                    <h4 className="text-3xl font-extrabold tracking-tight underline-offset-8 decoration-indigo-500/30 decoration-2 group-hover:underline">{item.title}</h4>
                    <p className="text-white/50 font-medium leading-relaxed max-w-2xl">{item.description}</p>
                  </div>

                  <ReviewSection itemId={item.id} userProfile={userProfile} setUserProfile={setUserProfile} />

                  <div className="flex flex-wrap gap-4 items-center justify-between pt-8 mt-8 border-t border-white/5">
                    <div className="flex gap-3">
                       <button 
                        onClick={() => updateProgress(item.id, 'completed' as any)}
                        className={cn(
                          "px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all border",
                          userProfile.progress[item.id] === 'completed' 
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-400/20" 
                            : "bg-white/5 text-white/30 border-white/10 hover:bg-emerald-500/10 hover:border-emerald-400/20 hover:text-emerald-300"
                        )}
                       >
                         {userProfile.progress[item.id] === 'completed' ? "✓ Mastered" : "Mark Mastered"}
                       </button>
                    </div>
                    <div className="flex gap-3">
                      {item.link && (
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl text-white/30 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center">
                          <ExternalLink size={20} />
                        </a>
                      )}
                      <button onClick={() => toggleFavorite(item.id)} className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 hover:scale-110 transition-all flex items-center justify-center">
                        <Bookmark fill="currentColor" size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {userProfile.favorites.length === 0 && (
            <div className="py-32 text-center border-2 border-dashed border-white/10 rounded-[56px] bg-white/2">
              <p className="text-white/20 font-bold uppercase tracking-widest">Curated Collection Empty</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
