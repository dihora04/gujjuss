import React, { useState, useEffect, createContext, useContext } from 'react';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, orderBy, addDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { UserProfile, Service, Order, Transaction, DepositRequest } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { OrderFlow } from './components/OrderFlow';
import { 
  LayoutDashboard, 
  Plus, 
  History, 
  Wallet, 
  Settings, 
  LogOut, 
  Zap, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Package,
  ArrowUpRight,
  ChevronRight,
  Search,
  Filter,
  CreditCard,
  User,
  Shield,
  Menu,
  X,
  Inbox,
  Smartphone
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';

// --- Context ---
interface AuthContextType {
  profile: UserProfile | null;
  loading: boolean;
  login: (username: string, pass: string) => Promise<void>;
  register: (username: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// --- Components ---

const Sidebar = ({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (tab: string) => void }) => {
  const { profile, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Overview' },
    { id: 'new-order', icon: <Plus size={20} />, label: 'New Order' },
    { id: 'orders', icon: <History size={20} />, label: 'History' },
    { id: 'wallet', icon: <Wallet size={20} />, label: 'Wallet' },
  ];

  if (profile?.role === 'admin') {
    navItems.push({ id: 'admin', icon: <Settings size={20} />, label: 'Admin' });
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="md:hidden fixed top-6 right-6 z-[100] w-12 h-12 glass-card flex items-center justify-center text-white"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div className={`fixed inset-y-0 left-0 w-72 bg-surface-900 border-r border-white/5 z-50 transform transition-transform duration-500 ease-out md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-primary/20">
              <Zap size={20} fill="currentColor" />
            </div>
            <span className="text-xl font-display font-bold text-white tracking-tight">GUJJU SMM</span>
          </div>

          <nav className="space-y-2">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setIsOpen(false); }}
                className={`nav-link w-full ${activeTab === item.id ? 'active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 w-full p-8 border-t border-white/5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-brand-primary font-bold">
              {profile?.displayName?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{profile?.displayName || 'User'}</p>
              <p className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">₹{profile?.balance.toFixed(2)}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <button onClick={logout} className="btn-modern btn-outline w-full justify-start text-gray-500 hover:text-white py-2.5">
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsOpen(false)} />
      )}
    </>
  );
};

const Dashboard = ({ setActiveTab }: { setActiveTab: (tab: string, serviceId?: string) => void }) => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ totalOrders: 0, activeOrders: 0, totalSpent: 0 });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, 'orders'), where('userId', '==', profile.uid), orderBy('createdAt', 'desc'));
    const unsubscribeOrders = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setRecentOrders(orders.slice(0, 5));
      setStats({
        totalOrders: orders.length,
        activeOrders: orders.filter(o => ['pending', 'processing'].includes(o.status)).length,
        totalSpent: orders.reduce((acc, o) => acc + o.charge, 0)
      });
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'orders'));

    const sq = query(collection(db, 'services'), where('active', '==', true));
    const unsubscribeServices = onSnapshot(sq, (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'services'));

    return () => {
      unsubscribeOrders();
      unsubscribeServices();
    };
  }, [profile]);

  const handleQuickBuy = (service: Service) => {
    setActiveTab('new-order', service.id);
  };

  const setupDefaultServices = async () => {
    setLoading(true);
    const defaultServices = [
      { category: 'Instagram', name: 'Instagram Followers [Indian - Real]', price: 80.00, min: 100, max: 10000, description: 'High quality Indian followers with profile pictures.' },
      { category: 'Instagram', name: 'Instagram Followers [USA - HQ]', price: 120.00, min: 100, max: 20000, description: 'High quality USA based followers.' },
      { category: 'Instagram', name: 'Instagram Followers [Global - Cheap]', price: 45.00, min: 500, max: 50000, description: 'Budget friendly global followers.' },
      { category: 'Instagram', name: 'Instagram Likes [Real - Fast]', price: 25.00, min: 50, max: 10000, description: 'Real likes from active accounts.' },
      { category: 'Instagram', name: 'Instagram Views [Instant]', price: 10.00, min: 100, max: 100000, description: 'Instant views for your reels and videos.' },
      { category: 'Instagram', name: 'Instagram Comments [Custom 320 Slow]', price: 22.99, min: 10, max: 1000, description: 'Slow delivery custom comments.' },
      { category: 'Instagram', name: 'Instagram Comments [Custom 318 Indian Mixed Profile]', price: 28.74, min: 10, max: 1000, description: 'Indian mixed profile custom comments.' },
      { category: 'Instagram', name: '319 - Instagram Indian Comments [Custom] [Non Drop] [SuperFast] [High Quality]', price: 34.49, min: 10, max: 1000, description: 'High quality non-drop Indian custom comments.' },
      { category: 'Instagram', name: '317 PREMIUM INDIAN Comments [Custom] [No Drop] [SuperFast] [Lifetime Refill]', price: 45.99, min: 10, max: 1000, description: 'Premium Indian custom comments with lifetime refill.' },
      { category: 'Instagram', name: '650 - Instagram Custom Comment [Indian] [High Quality] [Drop - No]', price: 43.20, min: 10, max: 1000, description: 'High quality Indian custom comments, no drop.' },
      { category: 'Demo', name: 'Free Demo Service', price: 0.00, min: 10, max: 100, description: 'Test our system with this free demo service.' },
      { category: 'YouTube', name: 'YouTube Views [Non-Drop]', price: 250.00, min: 500, max: 100000, description: 'High retention YouTube views.' },
      { category: 'YouTube', name: 'YouTube Subscribers [HQ]', price: 1500.00, min: 100, max: 5000, description: 'High quality YouTube subscribers.' },
      { category: 'YouTube', name: 'YouTube Watch Time [4000 Hours]', price: 4500.00, min: 1000, max: 4000, description: 'Monetization watch time package.' },
      { category: 'TikTok', name: 'TikTok Followers [Fast]', price: 180.00, min: 100, max: 50000, description: 'Fast delivery TikTok followers.' },
      { category: 'TikTok', name: 'TikTok Likes [Instant]', price: 60.00, min: 100, max: 20000, description: 'Instant TikTok likes.' },
      { category: 'Facebook', name: 'Facebook Page Likes [Global]', price: 120.00, min: 100, max: 10000, description: 'Global Facebook page likes.' },
      { category: 'Twitter', name: 'Twitter Followers [Real]', price: 350.00, min: 100, max: 5000, description: 'Real Twitter followers.' }
    ];
    try {
      for (const s of defaultServices) {
        await addDoc(collection(db, 'services'), { ...s, active: true });
      }
      toast.success('Services seeded successfully!');
    } catch (e) {
      toast.error('Seeding failed');
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    { label: 'Balance', value: `₹${profile?.balance.toFixed(2)}`, icon: <Wallet size={20} />, color: 'text-brand-primary' },
    { label: 'Total Spent', value: `₹${stats.totalSpent.toFixed(2)}`, icon: <TrendingUp size={20} />, color: 'text-brand-secondary' },
    { label: 'Active Orders', value: stats.activeOrders, icon: <Clock size={20} />, color: 'text-amber-500' },
    { label: 'Total Orders', value: stats.totalOrders, icon: <Package size={20} />, color: 'text-emerald-500' },
  ];

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-500">Welcome back, {profile?.displayName?.split(' ')[0] || 'User'}</p>
        </div>
        <button onClick={() => setActiveTab('new-order')} className="btn-modern btn-brand px-8 py-4">
          <Plus size={20} />
          <span>New Order</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {cards.map((card, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-8 glass-card-hover"
          >
            <div className={`w-12 h-12 rounded-2xl bg-white/[0.03] flex items-center justify-center mb-6 ${card.color}`}>
              {card.icon}
            </div>
            <div className="text-3xl font-bold text-white mb-1">{card.value}</div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{card.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {services.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <AlertCircle size={48} className="mx-auto mb-6 text-amber-500" />
              <h3 className="text-2xl font-bold mb-4">No Services Available</h3>
              <p className="text-gray-500 mb-8">Start your portal by setting up the default services.</p>
              <button 
                onClick={setupDefaultServices}
                disabled={loading}
                className="btn-modern btn-brand px-12 py-4"
              >
                {loading ? 'Setting up...' : 'Setup Default Services Now'}
              </button>
            </div>
          ) : (
            <div className="glass-card overflow-hidden">
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xl font-bold">Quick Buy Services</h3>
                <button onClick={() => setActiveTab('new-order')} className="text-xs font-bold text-brand-primary hover:text-white transition-colors">View All</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                {services.slice(0, 12).map(service => (
                  <div key={service.id} className="p-5 rounded-[2rem] bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
                        <Zap size={16} fill="currentColor" />
                      </div>
                      <span className="text-[10px] font-bold text-brand-secondary uppercase tracking-widest">₹{service.price}/1K</span>
                    </div>
                    <h4 className="text-sm font-bold text-white mb-2 group-hover:text-brand-primary transition-colors">{service.name}</h4>
                    <p className="text-[10px] text-gray-500 mb-4 line-clamp-1">{service.description}</p>
                    <button 
                      onClick={() => handleQuickBuy(service)}
                      className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest hover:bg-brand-primary hover:border-brand-primary hover:text-white transition-all"
                    >
                      Buy Now
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="glass-card overflow-hidden">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xl font-bold">Recent Activity</h3>
              <button onClick={() => setActiveTab('orders')} className="text-xs font-bold text-brand-primary hover:text-white transition-colors">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5">
                    <th className="px-8 py-4">Service</th>
                    <th className="px-8 py-4">Status</th>
                    <th className="px-8 py-4 text-right">Charge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-8 py-16 text-center">
                        <Inbox size={40} className="mx-auto mb-4 text-gray-700" />
                        <p className="text-sm text-gray-500">No orders found</p>
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map(order => (
                      <tr key={order.id} className="group hover:bg-white/[0.02] transition-colors">
                        <td className="px-8 py-5">
                          <div className="text-sm font-bold text-white mb-1">{order.serviceName}</div>
                          <div className="text-[10px] text-gray-500 font-mono truncate max-w-[200px]">{order.link}</div>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`badge-modern status-${order.status}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right font-mono text-sm text-white">
                          ₹{order.charge.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="glass-card p-8 bg-gradient-to-br from-brand-primary/20 to-transparent border-brand-primary/20">
            <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setActiveTab('new-order')} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-center group">
                <Zap size={24} className="mx-auto mb-3 text-brand-primary group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Order</span>
              </button>
              <button onClick={() => setActiveTab('wallet')} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-center group">
                <ArrowUpRight size={24} className="mx-auto mb-3 text-brand-secondary group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Deposit</span>
              </button>
              {profile?.role === 'admin' && (
                <button onClick={setupDefaultServices} disabled={loading} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-center group col-span-2">
                  <Plus size={24} className="mx-auto mb-3 text-emerald-500 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{loading ? 'Setting up...' : 'Setup Default Services'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="glass-card p-8">
            <h3 className="text-lg font-bold mb-6">System Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-500">All Systems Operational</span>
                </div>
                <Shield size={14} className="text-emerald-500" />
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Last Update</p>
                <p className="text-xs text-white">2 minutes ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NewOrder = ({ setActiveTab, preSelectedServiceId, onClearPreSelect }: { 
  setActiveTab: (tab: string) => void, 
  preSelectedServiceId?: string | null,
  onClearPreSelect?: () => void
}) => {
  const { profile } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [showOrderFlow, setShowOrderFlow] = useState(false);
  const [orderInfo, setOrderInfo] = useState<{ name: string, qty: number, user: string } | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'services'), where('active', '==', true));
    return onSnapshot(q, (snapshot) => {
      const svcs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
      setServices(svcs);
      const cats = Array.from(new Set(svcs.map(s => s.category)));
      setCategories(cats);
      if (cats.length > 0 && !selectedCategory) setSelectedCategory(cats[0]);

      // Handle pre-selection
      if (preSelectedServiceId) {
        const preSelected = svcs.find(s => s.id === preSelectedServiceId);
        if (preSelected) {
          setSelectedCategory(preSelected.category);
          setSelectedService(preSelected);
          if (onClearPreSelect) onClearPreSelect();
        }
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'services'));
  }, [preSelectedServiceId]);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedService || !link || quantity < selectedService.min || quantity > selectedService.max) {
      toast.error('Invalid order details');
      return;
    }

    const charge = (selectedService.price / 1000) * quantity;
    if (profile.balance < charge) {
      toast.error('Insufficient balance');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        userId: profile.uid,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        link,
        quantity,
        charge,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'orders'), orderData);
      await updateDoc(doc(db, 'users', profile.uid), {
        balance: increment(-charge)
      });

      setOrderInfo({ name: selectedService.name, qty: quantity, user: link });
      setShowOrderFlow(true);
    } catch (error) {
      toast.error('Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (showOrderFlow && orderInfo) {
    return (
      <OrderFlow 
        serviceName={orderInfo.name}
        quantity={orderInfo.qty}
        username={orderInfo.user}
        onComplete={() => {
          setShowOrderFlow(false);
          setActiveTab('orders');
        }}
      />
    );
  }

  if (services.length === 0) {
    return (
      <div className="p-12 flex items-center justify-center min-h-[80vh]">
        <div className="glass-card p-12 max-w-lg w-full text-center">
          <AlertCircle size={48} className="mx-auto mb-6 text-amber-500" />
          <h2 className="text-2xl font-bold mb-4">No Services Available</h2>
          <p className="text-gray-500 mb-8">The service catalog is empty. As an admin, you can set up the default services instantly.</p>
          <button 
            onClick={async () => {
              setLoading(true);
              const defaultServices = [
                { category: 'Instagram', name: 'Instagram Followers [Indian - Real]', price: 80.00, min: 100, max: 10000, description: 'High quality Indian followers with profile pictures.' },
                { category: 'Instagram', name: 'Instagram Followers [USA - HQ]', price: 120.00, min: 100, max: 20000, description: 'High quality USA based followers.' },
                { category: 'Instagram', name: 'Instagram Followers [Global - Cheap]', price: 45.00, min: 500, max: 50000, description: 'Budget friendly global followers.' },
                { category: 'Instagram', name: 'Instagram Likes [Real - Fast]', price: 25.00, min: 50, max: 10000, description: 'Real likes from active accounts.' },
                { category: 'Instagram', name: 'Instagram Views [Instant]', price: 10.00, min: 100, max: 100000, description: 'Instant views for your reels and videos.' },
                { category: 'Instagram', name: 'Instagram Comments [Custom 320 Slow]', price: 22.99, min: 10, max: 1000, description: 'Slow delivery custom comments.' },
                { category: 'Instagram', name: 'Instagram Comments [Custom 318 Indian Mixed Profile]', price: 28.74, min: 10, max: 1000, description: 'Indian mixed profile custom comments.' },
                { category: 'Instagram', name: '319 - Instagram Indian Comments [Custom] [Non Drop] [SuperFast] [High Quality]', price: 34.49, min: 10, max: 1000, description: 'High quality non-drop Indian custom comments.' },
                { category: 'Instagram', name: '317 PREMIUM INDIAN Comments [Custom] [No Drop] [SuperFast] [Lifetime Refill]', price: 45.99, min: 10, max: 1000, description: 'Premium Indian custom comments with lifetime refill.' },
                { category: 'Instagram', name: '650 - Instagram Custom Comment [Indian] [High Quality] [Drop - No]', price: 43.20, min: 10, max: 1000, description: 'High quality Indian custom comments, no drop.' },
                { category: 'Demo', name: 'Free Demo Service', price: 0.00, min: 10, max: 100, description: 'Test our system with this free demo service.' },
                { category: 'YouTube', name: 'YouTube Views [Non-Drop]', price: 250.00, min: 500, max: 100000, description: 'High retention YouTube views.' },
                { category: 'YouTube', name: 'YouTube Subscribers [HQ]', price: 1500.00, min: 100, max: 5000, description: 'High quality YouTube subscribers.' },
                { category: 'YouTube', name: 'YouTube Watch Time [4000 Hours]', price: 4500.00, min: 1000, max: 4000, description: 'Monetization watch time package.' },
                { category: 'TikTok', name: 'TikTok Followers [Fast]', price: 180.00, min: 100, max: 50000, description: 'Fast delivery TikTok followers.' },
                { category: 'TikTok', name: 'TikTok Likes [Instant]', price: 60.00, min: 100, max: 20000, description: 'Instant TikTok likes.' },
                { category: 'Facebook', name: 'Facebook Page Likes [Global]', price: 120.00, min: 100, max: 10000, description: 'Global Facebook page likes.' },
                { category: 'Twitter', name: 'Twitter Followers [Real]', price: 350.00, min: 100, max: 5000, description: 'Real Twitter followers.' }
              ];
              try {
                for (const s of defaultServices) {
                  await addDoc(collection(db, 'services'), { ...s, active: true });
                }
                toast.success('Services seeded successfully!');
              } catch (e) {
                toast.error('Seeding failed');
              } finally {
                setLoading(false);
              }
            }} 
            disabled={loading}
            className="btn-modern btn-brand w-full py-4"
          >
            {loading ? 'Setting up...' : 'Setup Default Services Now'}
          </button>
        </div>
      </div>
    );
  }

  const charge = selectedService && quantity > 0 ? ((quantity / 1000) * selectedService.price).toFixed(2) : '0.00';

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto">
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-2">New Order</h1>
        <p className="text-gray-500">Select a service and boost your social presence</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-card p-8 md:p-12">
            <form onSubmit={handlePlaceOrder} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="label-modern">Category</label>
                  <select 
                    className="input-modern appearance-none"
                    value={selectedCategory}
                    onChange={(e) => { setSelectedCategory(e.target.value); setSelectedService(null); }}
                  >
                    {categories.map(cat => <option key={cat} value={cat} className="bg-surface-800">{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-modern">Service</label>
                  <select 
                    className="input-modern appearance-none"
                    value={selectedService?.id || ''}
                    onChange={(e) => setSelectedService(services.find(s => s.id === e.target.value) || null)}
                  >
                    <option value="" className="bg-surface-800">Select a service</option>
                    {services.filter(s => s.category === selectedCategory).map(s => (
                      <option key={s.id} value={s.id} className="bg-surface-800">{s.name} — ₹{s.price}/1K</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedService && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-6 rounded-2xl bg-brand-primary/5 border border-brand-primary/10">
                  <div className="flex items-center gap-2 text-brand-primary font-bold text-sm mb-3">
                    <Zap size={14} fill="currentColor" />
                    <span>Service Details</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed mb-4">{selectedService.description}</p>
                  <div className="flex gap-4">
                    <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-gray-500">
                      MIN: {selectedService.min}
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-gray-500">
                      MAX: {selectedService.max}
                    </div>
                  </div>
                </motion.div>
              )}

              <div>
                <label className="label-modern">Target Link</label>
                <input 
                  type="url" 
                  placeholder="https://..." 
                  className="input-modern"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label-modern">Quantity</label>
                <input 
                  type="number" 
                  placeholder="0" 
                  className="input-modern"
                  value={quantity || ''}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  required
                />
              </div>

              <div className="p-8 rounded-3xl bg-brand-primary text-white flex justify-between items-center shadow-2xl shadow-brand-primary/30">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Total Charge</p>
                  <p className="text-3xl font-bold font-display">₹{charge}</p>
                </div>
                <button 
                  type="submit" 
                  disabled={loading || !selectedService || quantity < (selectedService?.min || 0)}
                  className="px-8 py-4 bg-white text-brand-primary rounded-2xl font-bold hover:bg-gray-100 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Place Order'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-8">
          <div className="glass-card p-8">
            <h3 className="text-lg font-bold mb-6">Your Balance</h3>
            <div className="text-4xl font-bold text-white mb-2">₹{profile?.balance.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mb-6">Available for immediate use</p>
            <button onClick={() => setActiveTab('wallet')} className="btn-modern btn-outline w-full">Add Funds</button>
          </div>

          <div className="glass-card p-8">
            <h3 className="text-lg font-bold mb-6">Why Choose Us?</h3>
            <div className="space-y-6">
              {[
                { icon: <Zap size={18} />, title: 'Instant Delivery', desc: 'Most services start within minutes.' },
                { icon: <Shield size={18} />, title: 'Secure Payments', desc: 'Your transactions are always safe.' },
                { icon: <CheckCircle2 size={18} />, title: 'Quality Guaranteed', desc: 'High retention and real looking.' }
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="text-brand-primary">{item.icon}</div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">{item.title}</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const OrderHistory = () => {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, 'orders'), where('userId', '==', profile.uid), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'orders'));
  }, [profile]);

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto">
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-2">Order History</h1>
        <p className="text-gray-500">Track and manage your social growth</p>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5">
                <th className="px-8 py-6">ID</th>
                <th className="px-8 py-6">Service</th>
                <th className="px-8 py-6">Quantity</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6">Charge</th>
                <th className="px-8 py-6">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-24 text-center">
                    <Inbox size={48} className="mx-auto mb-4 text-gray-700" />
                    <p className="text-gray-500">No orders found</p>
                  </td>
                </tr>
              ) : (
                orders.map(order => (
                  <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-8 py-6 font-mono text-[10px] text-gray-500">#{order.id.slice(0, 8)}</td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-bold text-white mb-1">{order.serviceName}</div>
                      <div className="text-[10px] text-gray-500 font-mono truncate max-w-[150px]">{order.link}</div>
                    </td>
                    <td className="px-8 py-6 text-sm text-gray-400">{order.quantity.toLocaleString()}</td>
                    <td className="px-8 py-6">
                      <span className={`badge-modern status-${order.status}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 font-mono text-sm text-white">₹{order.charge.toFixed(2)}</td>
                    <td className="px-8 py-6 text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const WalletPanel = () => {
  const { profile } = useAuth();
  const [amount, setAmount] = useState<number>(0);
  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDepositRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || amount <= 0 || !transactionId) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const request: Omit<DepositRequest, 'id'> = {
        userId: profile.uid,
        userEmail: profile.email,
        amount,
        transactionId,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'depositRequests'), request);
      toast.success('Deposit request submitted! Waiting for admin approval.');
      setAmount(0);
      setTransactionId('');
    } catch (error) {
      toast.error('Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto">
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-2">Wallet</h1>
        <p className="text-gray-500">Add funds to your account</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-1 space-y-8">
          <div className="glass-card p-10 bg-gradient-to-br from-brand-primary/10 to-transparent border-brand-primary/20">
            <p className="text-xs font-bold text-brand-primary uppercase tracking-[0.2em] mb-2">Current Balance</p>
            <h2 className="text-5xl font-bold text-white mb-2">₹{profile?.balance.toFixed(2)}</h2>
            <p className="text-gray-500 text-sm">Funds available for orders</p>
          </div>

          <div className="glass-card p-8">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Payment Methods</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-primary/20 flex items-center justify-center">
                    <Smartphone size={20} className="text-brand-primary" />
                  </div>
                  <span className="text-sm font-bold text-white">UPI / QR Code</span>
                </div>
                <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">Active</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="glass-card p-10 flex flex-col items-center text-center">
              <h3 className="text-xl font-bold mb-6">Scan to Pay</h3>
              <div className="w-48 h-48 bg-white p-4 rounded-2xl mb-6 shadow-2xl shadow-brand-primary/20">
                <img 
                  src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=BHARATPE.8Y0N1B2X7Z60042@fbpe&pn=GujjuSMM&am=0&cu=INR" 
                  alt="QR Code" 
                  className="w-full h-full"
                />
              </div>
              <p className="text-sm text-gray-400 mb-2">Scan this QR to pay via any UPI app</p>
              <p className="text-xs font-mono text-brand-primary">BHARATPE.8Y0N1B2X7Z60042@fbpe</p>
            </div>

            <div className="glass-card p-10">
              <h3 className="text-xl font-bold mb-8 text-white">Submit Payment Proof</h3>
              <form onSubmit={handleDepositRequest} className="space-y-6">
                <div>
                  <label className="label-modern">Amount Paid (₹)</label>
                  <input 
                    type="number" 
                    className="input-modern" 
                    placeholder="Enter amount"
                    value={amount || ''}
                    onChange={e => setAmount(Number(e.target.value))}
                    required 
                  />
                </div>
                <div>
                  <label className="label-modern">Transaction ID / Ref No.</label>
                  <input 
                    type="text" 
                    className="input-modern" 
                    placeholder="Enter transaction ID"
                    value={transactionId}
                    onChange={e => setTransactionId(e.target.value)}
                    required 
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn-modern btn-brand w-full py-4 font-bold"
                >
                  {loading ? 'Submitting...' : 'Submit for Approval'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminOrders = () => {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role !== 'admin') return;
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'orders'));
  }, [profile]);

  const updateStatus = async (orderId: string, status: Order['status']) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
      toast.success('Order status updated');
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-xl font-bold">All User Orders</h3>
        <Inbox size={20} className="text-gray-500" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.02]">
              <th className="px-8 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Order ID</th>
              <th className="px-8 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">User</th>
              <th className="px-8 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Service</th>
              <th className="px-8 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Status</th>
              <th className="px-8 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={5} className="px-8 py-12 text-center text-gray-500">Loading orders...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={5} className="px-8 py-12 text-center text-gray-500">No orders found</td></tr>
            ) : (
              orders.map(order => (
                <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-8 py-6 font-mono text-[10px] text-gray-400">#{order.id.slice(-6).toUpperCase()}</td>
                  <td className="px-8 py-6 text-sm text-white">{order.userId.slice(0, 8)}...</td>
                  <td className="px-8 py-6 text-sm text-white">{order.serviceName}</td>
                  <td className="px-8 py-6">
                    <span className={`badge-modern status-${order.status}`}>{order.status}</span>
                  </td>
                  <td className="px-8 py-6">
                    <select 
                      className="bg-surface-800 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none"
                      value={order.status}
                      onChange={(e) => updateStatus(order.id, e.target.value as Order['status'])}
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AdminDeposits = () => {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role !== 'admin') return;
    const q = query(collection(db, 'depositRequests'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DepositRequest)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'depositRequests'));
  }, [profile]);

  const handleApproval = async (request: DepositRequest, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'depositRequests', request.id), { status });
      if (status === 'approved') {
        await updateDoc(doc(db, 'users', request.userId), {
          balance: increment(request.amount)
        });
        toast.success(`Approved ₹${request.amount} for ${request.userEmail}`);
      } else {
        toast.error('Request rejected');
      }
    } catch (e) {
      toast.error('Failed to process request');
    }
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-xl font-bold">Deposit Requests</h3>
        <Wallet size={20} className="text-gray-500" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.02]">
              <th className="px-8 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">User</th>
              <th className="px-8 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Amount</th>
              <th className="px-8 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Transaction ID</th>
              <th className="px-8 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Status</th>
              <th className="px-8 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={5} className="px-8 py-12 text-center text-gray-500">Loading requests...</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={5} className="px-8 py-12 text-center text-gray-500">No requests found</td></tr>
            ) : (
              requests.map(req => (
                <tr key={req.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-8 py-6 text-sm text-white">{req.userEmail}</td>
                  <td className="px-8 py-6 text-sm font-bold text-brand-primary">₹{req.amount.toFixed(2)}</td>
                  <td className="px-8 py-6 font-mono text-xs text-gray-400">{req.transactionId}</td>
                  <td className="px-8 py-6">
                    <span className={`badge-modern status-${req.status}`}>{req.status}</span>
                  </td>
                  <td className="px-8 py-6">
                    {req.status === 'pending' && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleApproval(req, 'approved')}
                          className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white px-3 py-1 rounded-lg text-xs font-bold transition-all"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleApproval(req, 'rejected')}
                          className="bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white px-3 py-1 rounded-lg text-xs font-bold transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AdminPanel = () => {
  const [activeSubTab, setActiveSubTab] = useState<'services' | 'orders' | 'deposits'>('services');
  const [category, setCategory] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(0);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSeed = async () => {
    setLoading(true);
    const services = [
      { category: 'Instagram', name: 'Instagram Followers [Indian - Real]', price: 80.00, min: 100, max: 10000, description: 'High quality Indian followers with profile pictures.' },
      { category: 'Instagram', name: 'Instagram Followers [USA - HQ]', price: 120.00, min: 100, max: 20000, description: 'High quality USA based followers.' },
      { category: 'Instagram', name: 'Instagram Followers [Global - Cheap]', price: 45.00, min: 500, max: 50000, description: 'Budget friendly global followers.' },
      { category: 'Instagram', name: 'Instagram Likes [Real - Fast]', price: 25.00, min: 50, max: 10000, description: 'Real likes from active accounts.' },
      { category: 'Instagram', name: 'Instagram Views [Instant]', price: 10.00, min: 100, max: 100000, description: 'Instant views for your reels and videos.' },
      { category: 'Instagram', name: 'Instagram Comments [Custom 320 Slow]', price: 22.99, min: 10, max: 1000, description: 'Slow delivery custom comments.' },
      { category: 'Instagram', name: 'Instagram Comments [Custom 318 Indian Mixed Profile]', price: 28.74, min: 10, max: 1000, description: 'Indian mixed profile custom comments.' },
      { category: 'Instagram', name: '319 - Instagram Indian Comments [Custom] [Non Drop] [SuperFast] [High Quality]', price: 34.49, min: 10, max: 1000, description: 'High quality non-drop Indian custom comments.' },
      { category: 'Instagram', name: '317 PREMIUM INDIAN Comments [Custom] [No Drop] [SuperFast] [Lifetime Refill]', price: 45.99, min: 10, max: 1000, description: 'Premium Indian custom comments with lifetime refill.' },
      { category: 'Instagram', name: '650 - Instagram Custom Comment [Indian] [High Quality] [Drop - No]', price: 43.20, min: 10, max: 1000, description: 'High quality Indian custom comments, no drop.' },
      { category: 'Demo', name: 'Free Demo Service', price: 0.00, min: 10, max: 100, description: 'Test our system with this free demo service.' },
      { category: 'YouTube', name: 'YouTube Views [Non-Drop]', price: 250.00, min: 500, max: 100000, description: 'High retention YouTube views.' },
      { category: 'YouTube', name: 'YouTube Subscribers [HQ]', price: 1500.00, min: 100, max: 5000, description: 'High quality YouTube subscribers.' },
      { category: 'YouTube', name: 'YouTube Watch Time [4000 Hours]', price: 4500.00, min: 1000, max: 4000, description: 'Monetization watch time package.' },
      { category: 'TikTok', name: 'TikTok Followers [Fast]', price: 180.00, min: 100, max: 50000, description: 'Fast delivery TikTok followers.' },
      { category: 'TikTok', name: 'TikTok Likes [Instant]', price: 60.00, min: 100, max: 20000, description: 'Instant TikTok likes.' },
      { category: 'Facebook', name: 'Facebook Page Likes [Global]', price: 120.00, min: 100, max: 10000, description: 'Global Facebook page likes.' },
      { category: 'Twitter', name: 'Twitter Followers [Real]', price: 350.00, min: 100, max: 5000, description: 'Real Twitter followers.' }
    ];
    try {
      for (const s of services) {
        await addDoc(collection(db, 'services'), { ...s, active: true });
      }
      toast.success('Services seeded successfully!');
    } catch (e) {
      toast.error('Seeding failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'services'), { category, name, price, min, max, description, active: true });
      toast.success('Service added');
      setCategory(''); setName(''); setPrice(0); setMin(0); setMax(0); setDescription('');
    } catch (e) {
      toast.error('Failed to add');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold mb-2">Admin Panel</h1>
          <p className="text-gray-500">Master control for your SMM portal</p>
        </div>
        <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10">
          <button 
            onClick={() => setActiveSubTab('services')}
            className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'services' ? 'bg-brand-primary text-surface-950 shadow-lg shadow-brand-primary/20' : 'text-gray-400 hover:text-white'}`}
          >
            Services
          </button>
          <button 
            onClick={() => setActiveSubTab('orders')}
            className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'orders' ? 'bg-brand-primary text-surface-950 shadow-lg shadow-brand-primary/20' : 'text-gray-400 hover:text-white'}`}
          >
            Orders
          </button>
          <button 
            onClick={() => setActiveSubTab('deposits')}
            className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'deposits' ? 'bg-brand-primary text-surface-950 shadow-lg shadow-brand-primary/20' : 'text-gray-400 hover:text-white'}`}
          >
            Deposits
          </button>
        </div>
      </div>

      {activeSubTab === 'services' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="glass-card p-10">
            <h3 className="text-xl font-bold mb-8">Add New Service</h3>
            <form onSubmit={handleAdd} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="label-modern">Category</label>
                  <input type="text" className="input-modern" value={category} onChange={e => setCategory(e.target.value)} required />
                </div>
                <div>
                  <label className="label-modern">Name</label>
                  <input type="text" className="input-modern" value={name} onChange={e => setName(e.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="label-modern">Price/1K</label>
                  <input type="number" step="0.01" className="input-modern" value={price || ''} onChange={e => setPrice(Number(e.target.value))} required />
                </div>
                <div>
                  <label className="label-modern">Min</label>
                  <input type="number" className="input-modern" value={min || ''} onChange={e => setMin(Number(e.target.value))} required />
                </div>
                <div>
                  <label className="label-modern">Max</label>
                  <input type="number" className="input-modern" value={max || ''} onChange={e => setMax(Number(e.target.value))} required />
                </div>
              </div>
              <div>
                <label className="label-modern">Description</label>
                <textarea className="input-modern min-h-[100px]" value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <button type="submit" disabled={loading} className="btn-modern btn-brand w-full py-5">
                {loading ? 'Adding...' : 'Add Service'}
              </button>
            </form>
          </div>
          <div className="space-y-8">
            <div className="glass-card p-10 bg-brand-primary/10 border-brand-primary/20">
              <h3 className="text-xl font-bold mb-4">Quick Setup</h3>
              <p className="text-sm text-gray-400 mb-8 leading-relaxed">Populate your panel with standard social media services instantly.</p>
              <button onClick={handleSeed} disabled={loading} className="btn-modern btn-brand w-full py-5">Seed Default Services</button>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'orders' && <AdminOrders />}
      {activeSubTab === 'deposits' && <AdminDeposits />}
    </div>
  );
};

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedProfile = localStorage.getItem('gujju_smm_profile');
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    }
    setLoading(false);
  }, []);

  const login = async (username: string, pass: string) => {
    setLoading(true);
    try {
      // Master Admin Check
      if (username === 'Chirag' && pass === 'Chirag@789') {
        const adminProfile: UserProfile = {
          uid: 'admin_chirag',
          email: 'chirag@gujjusmm.com',
          displayName: 'Master Admin Chirag',
          balance: 999999,
          role: 'admin',
          createdAt: new Date().toISOString()
        };
        setProfile(adminProfile);
        localStorage.setItem('gujju_smm_profile', JSON.stringify(adminProfile));
        toast.success('Welcome back, Master Admin');
        return;
      }

      // Normal User Login
      const docRef = doc(db, 'users', username.toLowerCase());
      const snap = await getDoc(docRef);
      
      if (snap.exists()) {
        const data = snap.data() as any;
        if (data.password === pass) {
          const userProfile: UserProfile = {
            uid: username.toLowerCase(),
            email: data.email || `${username}@gujjusmm.com`,
            displayName: data.displayName || username,
            balance: data.balance || 0,
            role: (data.role as 'user' | 'admin') || 'user',
            createdAt: data.createdAt
          };
          setProfile(userProfile);
          localStorage.setItem('gujju_smm_profile', JSON.stringify(userProfile));
          toast.success(`Welcome back, ${username}`);
        } else {
          toast.error('Invalid password');
        }
      } else {
        toast.error('User not found. Please register.');
      }
    } catch (e) {
      toast.error('Login failed');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const register = async (username: string, pass: string) => {
    setLoading(true);
    try {
      const docRef = doc(db, 'users', username.toLowerCase());
      const snap = await getDoc(docRef);
      
      if (snap.exists()) {
        toast.error('Username already exists');
      } else {
        const newProfile = {
          uid: username.toLowerCase(),
          username: username.toLowerCase(),
          password: pass,
          email: `${username}@gujjusmm.com`,
          displayName: username,
          balance: 50.00, // Welcome bonus
          role: 'user',
          createdAt: new Date().toISOString()
        };
        await setDoc(docRef, newProfile);
        
        const userProfile: UserProfile = {
          uid: newProfile.uid,
          email: newProfile.email,
          displayName: newProfile.displayName,
          balance: newProfile.balance,
          role: newProfile.role as 'user' | 'admin',
          createdAt: newProfile.createdAt
        };
        
        setProfile(userProfile);
        localStorage.setItem('gujju_smm_profile', JSON.stringify(userProfile));
        toast.success('Registration successful! ₹50 bonus added.');
      }
    } catch (e) {
      toast.error('Registration failed');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setProfile(null);
    localStorage.removeItem('gujju_smm_profile');
    toast.success('Logged out');
  };

  return (
    <AuthContext.Provider value={{ profile, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const LoginScreen = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (isRegister) {
      await register(username, password);
    } else {
      await login(username, password);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-6">
      <div className="glow-mesh" />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-12 max-w-md w-full"
      >
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-brand-primary rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-brand-primary/20 mx-auto mb-8">
            <Zap size={40} fill="currentColor" />
          </div>
          <h1 className="text-4xl font-bold mb-4">GUJJU SMM</h1>
          <p className="text-gray-500">The ultimate social media growth portal</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="label-modern">Username</label>
            <input 
              type="text" 
              className="input-modern" 
              placeholder="Enter username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required 
            />
          </div>
          <div>
            <label className="label-modern">Password</label>
            <input 
              type="password" 
              className="input-modern" 
              placeholder="Enter password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="btn-modern btn-brand w-full py-5 flex items-center justify-center gap-3"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-surface-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>{isRegister ? 'Create Account' : 'Login to Portal'}</span>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsRegister(!isRegister)}
            className="text-sm font-bold text-gray-500 hover:text-brand-primary transition-colors"
          >
            {isRegister ? 'Already have an account? Login' : 'New to Gujju SMM? Register Now'}
          </button>
        </div>

        <p className="mt-12 text-center text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em]">
          Secure In-House Login System
        </p>
      </motion.div>
    </div>
  );
};

const AppContent = () => {
  const { loading, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [preSelectedServiceId, setPreSelectedServiceId] = useState<string | null>(null);

  const handleTabChange = (tab: string, serviceId?: string) => {
    setActiveTab(tab);
    if (serviceId) {
      setPreSelectedServiceId(serviceId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin shadow-2xl shadow-brand-primary/20" />
          <p className="text-gray-500 font-bold uppercase tracking-[0.3em] animate-pulse">Initializing Portal</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-surface-900 flex">
      <div className="glow-mesh" />
      <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />
      <main className="flex-1 md:ml-72 min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {activeTab === 'dashboard' && <Dashboard setActiveTab={handleTabChange} />}
            {activeTab === 'new-order' && <NewOrder setActiveTab={handleTabChange} preSelectedServiceId={preSelectedServiceId} onClearPreSelect={() => setPreSelectedServiceId(null)} />}
            {activeTab === 'orders' && <OrderHistory />}
            {activeTab === 'wallet' && <WalletPanel />}
            {activeTab === 'admin' && <AdminPanel />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Toaster 
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '1rem',
            padding: '1rem'
          }
        }}
      />
      <AppContent />
    </AuthProvider>
  );
}
