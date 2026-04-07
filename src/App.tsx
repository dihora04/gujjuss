import React, { useState, useEffect, createContext, useContext } from 'react';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './lib/firebase';
import { signInWithPopup, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile, Service, Order, Transaction } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  History, 
  Settings, 
  LogOut, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Users,
  ShieldCheck,
  Zap,
  Menu,
  X,
  ChevronRight,
  CreditCard,
  DollarSign,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Package,
  Layers,
  Database,
  FileText,
  Inbox
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';

// --- Context ---
interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// --- Error Boundary ---
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; errorInfo: string | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    try {
      const parsed = JSON.parse(error.message);
      return { hasError: true, errorInfo: JSON.stringify(parsed, null, 2) };
    } catch {
      return { hasError: true, errorInfo: error.message };
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 border border-red-100">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle size={32} />
              <h1 className="text-xl font-bold">Something went wrong</h1>
            </div>
            <p className="text-gray-600 mb-4">The application encountered a critical error. Please check your configuration.</p>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-64">
              {this.state.errorInfo}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              className="mt-6 w-full py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Components ---

const Sidebar = ({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (tab: string) => void }) => {
  const { profile, logout, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user || !profile) return null;

  const navItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { id: 'new-order', icon: <Plus size={18} />, label: 'New Order' },
    { id: 'orders', icon: <History size={18} />, label: 'Order History' },
    { id: 'wallet', icon: <Wallet size={18} />, label: 'Wallet' },
  ];

  if (profile.role === 'admin') {
    navItems.push({ id: 'admin', icon: <Settings size={18} />, label: 'Admin Panel' });
  }

  const initials = profile.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <>
      {/* Mobile Toggle */}
      <div className="md:hidden fixed top-4 left-4 z-[110]">
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 bg-white rounded-lg shadow-md border border-gray-100">
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <div className={`sidebar ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300`}>
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('landing')}>
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Zap size={18} fill="currentColor" />
            </div>
            <span className="text-lg font-bold text-gray-900 font-display">Gujju SMM</span>
          </div>
        </div>
        
        <nav className="p-2 flex-1 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsOpen(false); }}
              className={`nav-item w-full ${activeTab === item.id ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl mb-2">
            <div className="avatar w-9 h-9 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{profile.displayName}</p>
              <p className="text-xs font-medium text-green-600">${profile.balance.toFixed(2)}</p>
            </div>
            {profile.role === 'admin' && (
              <span className="badge badge-purple text-[9px] px-1.5 py-0.5">Admin</span>
            )}
          </div>
          <button onClick={logout} className="btn btn-ghost btn-sm w-full justify-center gap-2">
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

const Landing = ({ setActiveTab }: { setActiveTab: (tab: string) => void }) => {
  const { signIn, user } = useAuth();

  const handleGetStarted = async () => {
    if (!user) {
      await signIn();
    }
    setActiveTab('new-order');
  };

  return (
    <div className="hero">
      <nav className="flex justify-between items-center px-6 md:px-10 py-4 border-b border-white/10">
        <div className="flex items-center gap-2 text-white font-display font-bold text-xl">
          <Zap size={22} className="text-indigo-400" fill="currentColor" />
          <span>Gujju SMM</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-slate-400 hover:text-white transition-colors text-sm font-medium" onClick={() => setActiveTab('landing')}>Sign In</button>
          <button className="btn btn-primary" onClick={handleGetStarted}>Get Started</button>
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="hero-badge flex items-center gap-2"
        >
          <TrendingUp size={12} className="text-indigo-300" />
          <span>#1 Rated SMM Panel in Gujarat</span>
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="hero-title"
        >
          Supercharge Your <br />
          <span className="text-indigo-400">Social Presence</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="hero-sub"
        >
          Premium quality services for Instagram, YouTube, TikTok, and more. 
          Fast delivery, secure payments, and 24/7 support.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button 
            onClick={handleGetStarted}
            className="btn btn-primary btn-lg gap-2"
          >
            <Zap size={16} fill="currentColor" />
            {user ? 'Place Order Now' : 'Start Growing Now'}
          </button>
          <button 
            onClick={() => setActiveTab(user ? 'new-order' : 'landing')}
            className="btn btn-lg bg-white/10 text-white border border-white/20 hover:bg-white/20"
          >
            View Services
          </button>
        </motion.div>

        <div className="hero-stats">
          <div className="hero-stat">
            <div className="hero-stat-num">10K+</div>
            <div className="hero-stat-label">Happy Clients</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-num">500K+</div>
            <div className="hero-stat-label">Orders Completed</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-num">24/7</div>
            <div className="hero-stat-label">Live Support</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-num">$0.15</div>
            <div className="hero-stat-label">Starting Price</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 bg-white/5 border-t border-white/10">
        {[
          { icon: <ShieldCheck size={18} />, title: 'Secure & Safe', desc: 'All orders are SSL-protected. No password required for any service.' },
          { icon: <Zap size={18} />, title: 'Instant Delivery', desc: 'Most orders start within 60 seconds of placement.' },
          { icon: <Clock size={18} />, title: 'Refill Guarantee', desc: '30-day refill guarantee on all follower services.' },
        ].map((f, i) => (
          <div key={i} className="p-8 border-b md:border-b-0 md:border-r border-white/10 last:border-0">
            <div className="w-10 h-10 bg-indigo-500/20 border border-indigo-500/30 rounded-xl flex items-center justify-center text-indigo-400 mb-4">
              {f.icon}
            </div>
            <h3 className="text-white font-bold mb-2">{f.title}</h3>
            <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const FreeDemoSection = () => {
  const { profile } = useAuth();
  const [instaId, setInstaId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClaimDemo = async () => {
    if (!profile || !instaId) {
      toast.error('Please enter your Instagram ID');
      return;
    }

    if (profile.freeDemoClaimed) {
      toast.error('You have already claimed your free demo');
      return;
    }

    setLoading(true);
    try {
      // 1. Create Free Order
      await addDoc(collection(db, 'orders'), {
        userId: profile.uid,
        serviceId: 'free-demo-100',
        serviceName: 'Free Demo - 100 Instagram Followers',
        link: `https://instagram.com/${instaId.replace('@', '')}`,
        quantity: 100,
        charge: 0,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      // 2. Update User Profile
      await setDoc(doc(db, 'users', profile.uid), {
        ...profile,
        freeDemoClaimed: true
      });

      toast.success('Free demo order placed! 100 followers coming soon.');
      setInstaId('');
    } catch (error) {
      toast.error('Failed to claim free demo');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (profile?.freeDemoClaimed) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 text-white shadow-xl shadow-indigo-200 mb-12 overflow-hidden relative"
    >
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
            <Zap size={24} className="text-yellow-300" fill="currentColor" />
          </div>
          <h2 className="text-2xl font-bold">Free Demo: 100 Followers</h2>
        </div>
        <p className="text-indigo-100 mb-6 max-w-md">
          Try our premium service for free! Enter your Instagram username below to get 100 high-quality followers instantly.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300 font-bold">@</span>
            <input 
              type="text" 
              placeholder="instagram_username"
              value={instaId}
              onChange={(e) => setInstaId(e.target.value)}
              className="w-full pl-10 pr-4 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl outline-none focus:bg-white/20 transition-all placeholder:text-indigo-200"
            />
          </div>
          <button 
            onClick={handleClaimDemo}
            disabled={loading}
            className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-bold hover:bg-indigo-50 transition-all shadow-lg disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Get Free Followers'}
          </button>
        </div>
      </div>
      {/* Decorative circles */}
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl" />
    </motion.div>
  );
};

const Dashboard = ({ setActiveTab }: { setActiveTab: (tab: string) => void }) => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ totalOrders: 0, activeOrders: 0, totalSpent: 0 });

  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, 'orders'), where('userId', '==', profile.uid));
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => doc.data() as Order);
      setStats({
        totalOrders: orders.length,
        activeOrders: orders.filter(o => o.status === 'pending' || o.status === 'processing').length,
        totalSpent: orders.reduce((acc, o) => acc + o.charge, 0)
      });
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'orders'));
  }, [profile]);

  if (!profile) return null;

  const statCards = [
    { label: 'Current Balance', value: `$${profile.balance.toFixed(2)}`, icon: <DollarSign size={20} />, color: '#4f46e5', bg: '#eef2ff', change: 'Available' },
    { label: 'Total Spent', value: `$${stats.totalSpent.toFixed(4)}`, icon: <ShoppingCart size={20} />, color: '#10b981', bg: '#ecfdf5', change: `${stats.totalOrders} orders` },
    { label: 'Active Orders', value: stats.activeOrders, icon: <Clock size={20} />, color: '#f59e0b', bg: '#fffbeb', change: 'Processing' },
    { label: 'Total Orders', value: stats.totalOrders, icon: <Package size={20} />, color: '#8b5cf6', bg: '#f5f3ff', change: 'All time' },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back, {profile.displayName.split(' ')[0]} — here's your overview</p>
        </div>
        <button 
          onClick={() => setActiveTab('new-order')}
          className="btn btn-primary px-6 py-3 shadow-lg shadow-indigo-100 gap-2"
        >
          <Plus size={18} />
          <span>New Order</span>
        </button>
      </div>

      <FreeDemoSection />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="flex justify-between items-start mb-3">
              <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.change}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 font-display">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Recent Orders</h3>
            <button onClick={() => setActiveTab('orders')} className="btn btn-secondary btn-sm">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="px-5 py-3">Service</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.totalOrders === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-12 text-center">
                      <div className="max-w-xs mx-auto">
                        <Inbox size={40} className="mx-auto mb-3 text-gray-200" />
                        <p className="text-sm text-gray-400 mb-4">No orders yet. Start growing today!</p>
                        <button onClick={() => setActiveTab('new-order')} className="btn btn-primary btn-sm">Place First Order</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <OrderHistoryList limit={5} compact />
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="wallet-card">
            <div className="flex justify-between items-center mb-4">
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-70">Wallet</div>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">Connected</span>
            </div>
            <div className="text-3xl font-bold font-display mb-1">${profile.balance.toFixed(2)}</div>
            <div className="text-[10px] font-mono opacity-60 truncate">{profile.uid}</div>
            <div className="mt-6 flex gap-2">
              <button onClick={() => setActiveTab('wallet')} className="btn btn-sm bg-white/20 text-white flex-1 justify-center border-0">
                <Plus size={12} /> Deposit
              </button>
              <button onClick={() => setActiveTab('orders')} className="btn btn-sm bg-white/10 text-white/70 flex-1 justify-center border-0">
                <History size={12} /> History
              </button>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setActiveTab('new-order')} className="p-3 bg-indigo-50 rounded-xl text-indigo-600 hover:bg-indigo-100 transition-colors text-center">
                <Zap size={20} className="mx-auto mb-2" />
                <span className="text-xs font-bold">New Order</span>
              </button>
              <button onClick={() => setActiveTab('wallet')} className="p-3 bg-emerald-50 rounded-xl text-emerald-600 hover:bg-emerald-100 transition-colors text-center">
                <DollarSign size={20} className="mx-auto mb-2" />
                <span className="text-xs font-bold">Add Funds</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NewOrder = ({ setActiveTab }: { setActiveTab: (tab: string) => void }) => {
  const { profile } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return onSnapshot(collection(db, 'services'), (snapshot) => {
      const svcs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
      setServices(svcs);
      const cats = Array.from(new Set(svcs.map(s => s.category)));
      setCategories(cats);
      if (cats.length > 0 && !selectedCategory) setSelectedCategory(cats[0]);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'services'));
  }, []);

  const filteredServices = services.filter(s => s.category === selectedCategory && s.active);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedService || !link || quantity < selectedService.min || quantity > selectedService.max) {
      toast.error('Please fill all fields correctly');
      return;
    }

    const charge = (selectedService.price / 1000) * quantity;
    if (profile.balance < charge) {
      toast.error('Insufficient balance');
      return;
    }

    setLoading(true);
    try {
      // 1. Create Order
      await addDoc(collection(db, 'orders'), {
        userId: profile.uid,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        link,
        quantity,
        charge,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      // 2. Update Balance
      await setDoc(doc(db, 'users', profile.uid), {
        ...profile,
        balance: profile.balance - charge
      });

      // 3. Log Transaction
      await addDoc(collection(db, 'transactions'), {
        userId: profile.uid,
        amount: -charge,
        type: 'order',
        description: `Order for ${selectedService.name}`,
        createdAt: new Date().toISOString()
      });

      toast.success('Order placed successfully!');
      setLink('');
      setQuantity(0);
      setActiveTab('orders');
    } catch (error) {
      toast.error('Failed to place order');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (services.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-24 pb-16 text-center">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-12">
          <div className="w-20 h-20 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <Zap size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Services Available</h2>
          <p className="text-gray-500 mb-8">We are currently updating our service list. Please check back soon!</p>
          {profile?.role === 'admin' && (
            <button 
              onClick={() => setActiveTab('admin')}
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
            >
              Go to Admin Panel to Add Services
            </button>
          )}
        </div>
      </div>
    );
  }

  const charge = selectedService && quantity > 0 ? ((quantity / 1000) * selectedService.price).toFixed(4) : null;
  const insufficient = charge && profile && profile.balance < parseFloat(charge);

  return (
    <div className="p-6 md:p-8">
      <div className="page-header">
        <h1 className="page-title">New Order</h1>
        <p className="page-subtitle">Select a service and configure your order</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card p-6 md:p-8">
          <form onSubmit={handlePlaceOrder} className="space-y-5">
            <div>
              <label className="label">Select Category</label>
              <select 
                className="input select"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedService(null);
                }}
                required
              >
                <option value="">— Choose platform —</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            {selectedCategory && (
              <div>
                <label className="label">Select Service</label>
                <select 
                  className="input select"
                  value={selectedService?.id || ''}
                  onChange={(e) => setSelectedService(services.find(s => s.id === e.target.value) || null)}
                  required
                >
                  <option value="">— Choose service —</option>
                  {services.filter(s => s.category === selectedCategory).map(s => (
                    <option key={s.id} value={s.id}>{s.name} — ${s.price}/1K</option>
                  ))}
                </select>
              </div>
            )}

            {selectedService && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="info-box">
                <div className="flex items-center gap-2 text-indigo-800 font-bold text-sm mb-2">
                  <AlertCircle size={14} />
                  <span>{selectedService.name}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">{selectedService.description}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/60 p-2 rounded-lg border border-indigo-100">
                    <p className="text-[9px] text-slate-400 uppercase font-bold">Min Order</p>
                    <p className="text-xs font-bold text-slate-800">{selectedService.min.toLocaleString()}</p>
                  </div>
                  <div className="bg-white/60 p-2 rounded-lg border border-indigo-100">
                    <p className="text-[9px] text-slate-400 uppercase font-bold">Max Order</p>
                    <p className="text-xs font-bold text-slate-800">{selectedService.max.toLocaleString()}</p>
                  </div>
                </div>
              </motion.div>
            )}

            <div>
              <label className="label">Link / URL</label>
              <input 
                type="url"
                placeholder="https://instagram.com/p/..."
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">Quantity {selectedService && <span className="text-slate-400">({selectedService.min.toLocaleString()} – {selectedService.max.toLocaleString()})</span>}</label>
              <input 
                type="number"
                placeholder="0"
                value={quantity || ''}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="input"
                required
              />
            </div>

            {charge && (
              <div className={`charge-box ${insufficient ? 'bg-red-500' : ''}`}>
                <div>
                  <p className="text-[10px] opacity-80 font-bold uppercase tracking-wider">Total Charge</p>
                  <p className="text-[10px] opacity-60">{quantity.toLocaleString()} × ${selectedService?.price}/1K</p>
                </div>
                <div className="text-2xl font-bold font-display">${charge}</div>
              </div>
            )}

            {insufficient && (
              <div className="flex items-center gap-2 text-red-500 text-xs font-bold">
                <AlertCircle size={14} />
                <span>Insufficient balance. Need ${(parseFloat(charge!) - (profile?.balance || 0)).toFixed(4)} more.</span>
              </div>
            )}

            <button 
              type="submit"
              disabled={loading || !selectedService || insufficient || quantity === 0}
              className="btn btn-primary w-full py-4 text-base font-bold shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Place Order'}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Available Services</h3>
            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {categories.map(cat => (
                <div key={cat}>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{cat}</h4>
                  <div className="space-y-2">
                    {services.filter(s => s.category === cat).map(s => (
                      <button
                        key={s.id}
                        onClick={() => { setSelectedCategory(cat); setSelectedService(s); }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all border ${selectedService?.id === s.id ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-gray-50 border-transparent hover:border-gray-200'}`}
                      >
                        <span className="text-xs font-bold text-gray-700">{s.name}</span>
                        <span className="text-xs font-bold text-indigo-600">${s.price}/K</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6 bg-indigo-900 text-white">
            <h3 className="text-xs font-bold opacity-70 uppercase tracking-widest mb-2">Your Balance</h3>
            <div className="text-3xl font-bold font-display mb-4">${profile?.balance.toFixed(2)}</div>
            <button onClick={() => setActiveTab('wallet')} className="btn bg-white/20 text-white hover:bg-white/30 border-0 w-full justify-center gap-2">
              <Plus size={16} /> Add Funds
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const OrderHistoryList = ({ limit, compact }: { limit?: number; compact?: boolean }) => {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, 'orders'), 
      where('userId', '==', profile.uid), 
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      let docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      if (limit) docs = docs.slice(0, limit);
      setOrders(docs);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'orders'));
  }, [profile, limit]);

  if (orders.length === 0) return null;

  return (
    <>
      {orders.map((order) => (
        <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
          <td className="px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Zap size={14} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate max-w-[150px]">{order.serviceName}</p>
                {!compact && <p className="text-[10px] text-gray-400 truncate max-w-[150px]">{order.link}</p>}
              </div>
            </div>
          </td>
          {!compact && (
            <td className="px-5 py-4">
              <span className="text-xs font-medium text-gray-600">{order.quantity.toLocaleString()}</span>
            </td>
          )}
          <td className="px-5 py-4">
            <span className={`badge ${
              order.status === 'completed' ? 'badge-green' : 
              order.status === 'pending' ? 'badge-amber' : 
              order.status === 'processing' ? 'badge-blue' : 'badge-red'
            }`}>
              {order.status}
            </span>
          </td>
          <td className="px-5 py-4">
            <span className="text-xs font-bold text-gray-900">${order.charge.toFixed(4)}</span>
          </td>
          {!compact && (
            <td className="px-5 py-4">
              <span className="text-[10px] font-medium text-gray-400">
                {new Date(order.createdAt).toLocaleDateString()}
              </span>
            </td>
          )}
        </tr>
      ))}
    </>
  );
};

const AdminPanel = () => {
  const [category, setCategory] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(0);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const handleSeedServices = async () => {
    setSeeding(true);
    const defaultServices = [
      { category: 'Instagram', name: 'Instagram Followers [Real]', price: 1.50, min: 100, max: 50000, description: 'High quality real looking followers.' },
      { category: 'Instagram', name: 'Instagram Likes [Instant]', price: 0.50, min: 50, max: 20000, description: 'Instant delivery likes for your posts.' },
      { category: 'YouTube', name: 'YouTube Views [Non-Drop]', price: 3.20, min: 500, max: 100000, description: 'High retention YouTube views.' },
      { category: 'TikTok', name: 'TikTok Followers [Fast]', price: 2.10, min: 100, max: 50000, description: 'Fast delivery TikTok followers.' },
      { category: 'TikTok', name: 'TikTok Likes [Instant]', price: 0.80, min: 100, max: 50000, description: 'Instant delivery TikTok likes.' },
      { category: 'Facebook', name: 'Facebook Page Likes + Followers', price: 4.50, min: 100, max: 50000, description: 'High quality page likes.' },
      { category: 'Twitter', name: 'Twitter Followers [Real]', price: 5.00, min: 100, max: 10000, description: 'Real looking Twitter followers.' }
    ];

    try {
      for (const svc of defaultServices) {
        await addDoc(collection(db, 'services'), { ...svc, active: true });
      }
      toast.success('Services seeded successfully!');
    } catch (error) {
      toast.error('Failed to seed services');
    } finally {
      setSeeding(false);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'services'), {
        category, name, price, min, max, description, active: true
      });
      toast.success('Service added successfully');
      setCategory(''); setName(''); setPrice(0); setMin(0); setMax(0); setDescription('');
    } catch (error) {
      toast.error('Failed to add service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="page-header">
        <h1 className="page-title">Admin Panel</h1>
        <p className="page-subtitle">Manage services and system configuration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card p-6 md:p-8">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Add New Service</h3>
          <form onSubmit={handleAddService} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Category</label>
                <input type="text" placeholder="e.g. Instagram" value={category} onChange={e => setCategory(e.target.value)} className="input" required />
              </div>
              <div>
                <label className="label">Service Name</label>
                <input type="text" placeholder="e.g. Real Followers" value={name} onChange={e => setName(e.target.value)} className="input" required />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Price/1K</label>
                <input type="number" step="0.01" placeholder="0.00" value={price || ''} onChange={e => setPrice(Number(e.target.value))} className="input" required />
              </div>
              <div>
                <label className="label">Min</label>
                <input type="number" placeholder="100" value={min || ''} onChange={e => setMin(Number(e.target.value))} className="input" required />
              </div>
              <div>
                <label className="label">Max</label>
                <input type="number" placeholder="10000" value={max || ''} onChange={e => setMax(Number(e.target.value))} className="input" required />
              </div>
            </div>

            <div>
              <label className="label">Description</label>
              <textarea placeholder="Service details..." value={description} onChange={e => setDescription(e.target.value)} className="input min-h-[100px]" />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full py-4 justify-center">
              {loading ? 'Adding...' : 'Add Service'}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="card p-6 md:p-8 bg-emerald-50 border-emerald-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                <Zap size={20} fill="currentColor" />
              </div>
              <h3 className="text-lg font-bold text-emerald-900">Quick Setup</h3>
            </div>
            <p className="text-sm text-emerald-700 mb-6 leading-relaxed">
              Populate your panel with a standard set of social media services (Instagram, YouTube, TikTok, etc.) to get started instantly.
            </p>
            <button 
              onClick={handleSeedServices}
              disabled={seeding}
              className="btn bg-emerald-600 text-white hover:bg-emerald-700 border-0 w-full justify-center py-4 shadow-lg shadow-emerald-100"
            >
              {seeding ? 'Seeding...' : 'Add All Standard Services'}
            </button>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">System Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total Users</p>
                <p className="text-xl font-bold text-gray-900">1,284</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total Orders</p>
                <p className="text-xl font-bold text-gray-900">15,492</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as UserProfile;
          if (data.freeDemoClaimed === undefined) {
            const updatedProfile = { ...data, freeDemoClaimed: false };
            await setDoc(doc(db, 'users', firebaseUser.uid), updatedProfile);
            setProfile(updatedProfile);
          } else {
            setProfile(data);
          }
        } else {
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            displayName: firebaseUser.displayName || 'User',
            photoURL: firebaseUser.photoURL || '',
            balance: 0,
            role: firebaseUser.email === 'dihora04@gmail.com' ? 'admin' : 'user',
            freeDemoClaimed: false,
            createdAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Logged in successfully!');
    } catch (error) {
      toast.error('Failed to sign in');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('landing');

  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent activeTab={activeTab} setActiveTab={setActiveTab} />
      </AuthProvider>
    </ErrorBoundary>
  );
}

const AppContent = ({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (tab: string) => void }) => {
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && activeTab === 'landing') {
      setActiveTab('dashboard');
    }
  }, [user, loading, activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium animate-pulse">Loading Gujju SMM...</p>
        </div>
      </div>
    );
  }

  if (activeTab === 'landing') {
    return <Landing setActiveTab={setActiveTab} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Toaster position="top-right" />
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 md:ml-64 min-h-screen relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="min-h-full"
          >
            {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
            {activeTab === 'new-order' && <NewOrder setActiveTab={setActiveTab} />}
            {activeTab === 'orders' && (
              <div className="p-6 md:p-8">
                <div className="page-header">
                  <h1 className="page-title">Order History</h1>
                  <p className="page-subtitle">Track and manage your social media growth</p>
                </div>
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr>
                          <th className="px-5 py-4">Service</th>
                          <th className="px-5 py-4">Quantity</th>
                          <th className="px-5 py-4">Status</th>
                          <th className="px-5 py-4">Charge</th>
                          <th className="px-5 py-4">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        <OrderHistoryList />
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'wallet' && (
              <div className="p-6 md:p-8">
                <div className="page-header">
                  <h1 className="page-title">Wallet</h1>
                  <p className="page-subtitle">Manage your funds and transaction history</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1">
                    <div className="wallet-card mb-6">
                      <p className="text-xs font-bold opacity-70 uppercase tracking-widest mb-1">Available Balance</p>
                      <p className="text-4xl font-bold font-display mb-6">${profile?.balance.toFixed(2)}</p>
                      <button className="btn bg-white text-indigo-600 w-full justify-center py-4 font-bold">
                        Add Funds
                      </button>
                    </div>
                    <div className="card p-6">
                      <h3 className="font-bold text-gray-900 mb-4">Payment Methods</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 opacity-50">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-gray-200">
                              <CreditCard size={16} />
                            </div>
                            <span className="text-xs font-bold">Credit Card</span>
                          </div>
                          <span className="text-[10px] font-bold text-gray-400">Soon</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-indigo-200 text-indigo-600">
                              <Wallet size={16} />
                            </div>
                            <span className="text-xs font-bold">Crypto / Wallet</span>
                          </div>
                          <span className="text-[10px] font-bold text-indigo-600">Active</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="lg:col-span-2">
                    <div className="card">
                      <div className="p-5 border-b border-gray-100">
                        <h3 className="font-bold text-gray-900">Transaction History</h3>
                      </div>
                      <div className="p-12 text-center">
                        <History size={48} className="mx-auto mb-4 text-gray-200" />
                        <p className="text-gray-400 text-sm">No transactions found yet.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'admin' && <AdminPanel />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
