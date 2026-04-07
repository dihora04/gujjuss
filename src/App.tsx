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
  DollarSign
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

const Navbar = ({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (tab: string) => void }) => {
  const { profile, logout, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('landing')}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Zap size={24} fill="currentColor" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
              Gujju SMM
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {user ? (
              <>
                <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <LayoutDashboard size={18} />
                  <span>Dashboard</span>
                </button>
                <button onClick={() => setActiveTab('new-order')} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${activeTab === 'new-order' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <Plus size={18} />
                  <span>New Order</span>
                </button>
                <button onClick={() => setActiveTab('orders')} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${activeTab === 'orders' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <History size={18} />
                  <span>Orders</span>
                </button>
                {profile?.role === 'admin' && (
                  <button onClick={() => setActiveTab('admin')} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${activeTab === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <ShieldCheck size={18} />
                    <span>Admin</span>
                  </button>
                )}
                <div className="h-6 w-px bg-gray-200 mx-2" />
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">${profile?.balance.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">Balance</p>
                  </div>
                  <button onClick={logout} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                    <LogOut size={20} />
                  </button>
                </div>
              </>
            ) : (
              <button 
                onClick={() => setActiveTab('landing')}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
              >
                Get Started
              </button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center gap-4">
            {user && (
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">${profile?.balance.toFixed(2)}</p>
              </div>
            )}
            <button onClick={() => setIsOpen(!isOpen)} className="text-gray-600">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-100 overflow-hidden"
          >
            <div className="px-4 py-6 space-y-4">
              {user ? (
                <>
                  <button onClick={() => { setActiveTab('dashboard'); setIsOpen(false); }} className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 text-gray-600">
                    <LayoutDashboard size={20} /> Dashboard
                  </button>
                  <button onClick={() => { setActiveTab('new-order'); setIsOpen(false); }} className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 text-gray-600">
                    <Plus size={20} /> New Order
                  </button>
                  <button onClick={() => { setActiveTab('orders'); setIsOpen(false); }} className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 text-gray-600">
                    <History size={20} /> Orders
                  </button>
                  {profile?.role === 'admin' && (
                    <button onClick={() => { setActiveTab('admin'); setIsOpen(false); }} className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 text-gray-600">
                      <ShieldCheck size={20} /> Admin
                    </button>
                  )}
                  <button onClick={logout} className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl hover:bg-red-50 text-red-600">
                    <LogOut size={20} /> Logout
                  </button>
                </>
              ) : (
                <button onClick={() => { setActiveTab('landing'); setIsOpen(false); }} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium">
                  Login / Sign Up
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Landing = () => {
  const { signIn, user } = useAuth();

  return (
    <div className="pt-24 pb-16">
      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-sm font-medium mb-8"
        >
          <Zap size={16} />
          <span>#1 Rated SMM Panel in Gujarat</span>
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight mb-6"
        >
          Boost Your Social <br />
          <span className="text-indigo-600">Presence Instantly</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-gray-600 max-w-2xl mx-auto mb-10"
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
          {!user && (
            <button 
              onClick={signIn}
              className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center gap-2"
            >
              Get Started Now <ChevronRight size={20} />
            </button>
          )}
          <button className="px-8 py-4 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all">
            View Services
          </button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20">
          {[
            { label: 'Happy Clients', value: '10K+', icon: Users },
            { label: 'Orders Completed', value: '500K+', icon: CheckCircle2 },
            { label: 'Services', value: '200+', icon: Zap },
            { label: 'Support', value: '24/7', icon: Clock },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm"
            >
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <stat.icon size={24} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {profile?.displayName?.split(' ')[0]}!</h1>
          <p className="text-gray-500">Here's what's happening with your account.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Balance</p>
              <p className="text-lg font-bold text-gray-900">${profile?.balance.toFixed(2)}</p>
            </div>
          </div>
          <button className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100">
            Add Funds
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <ShoppingCart size={24} />
            </div>
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">Total</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalOrders}</p>
          <p className="text-sm text-gray-500">Total Orders Placed</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <Clock size={24} />
            </div>
            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">Active</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.activeOrders}</p>
          <p className="text-sm text-gray-500">Orders in Progress</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Spent</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">${stats.totalSpent.toFixed(2)}</p>
          <p className="text-sm text-gray-500">Total Amount Spent</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Recent Orders</h2>
          <button className="text-indigo-600 text-sm font-medium hover:underline">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">ID</th>
                <th className="px-6 py-4 font-medium">Service</th>
                <th className="px-6 py-4 font-medium">Quantity</th>
                <th className="px-6 py-4 font-medium">Charge</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Mock or real data mapping here */}
              <tr className="hover:bg-gray-50 transition-colors">
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No recent orders found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const NewOrder = () => {
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
    } catch (error) {
      toast.error('Failed to place order');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 pt-24 pb-16">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Place New Order</h1>
        <p className="text-gray-500 mb-8">Select a service and enter your details to get started.</p>

        <form onSubmit={handlePlaceOrder} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select 
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedService(null);
              }}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            >
              <option value="">Select Category</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Service</label>
            <select 
              value={selectedService?.id || ''}
              onChange={(e) => {
                const svc = services.find(s => s.id === e.target.value);
                setSelectedService(svc || null);
              }}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            >
              <option value="">Select Service</option>
              {filteredServices.map(svc => (
                <option key={svc.id} value={svc.id}>{svc.name} - ${svc.price} per 1000</option>
              ))}
            </select>
          </div>

          {selectedService && (
            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
              <p className="text-sm text-indigo-700">
                <strong>Description:</strong> {selectedService.description || 'No description available.'}
              </p>
              <div className="flex gap-4 mt-2 text-xs text-indigo-600 font-medium">
                <span>Min: {selectedService.min}</span>
                <span>Max: {selectedService.max}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Link</label>
            <input 
              type="url"
              placeholder="https://instagram.com/p/..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
            <input 
              type="number"
              placeholder="0"
              value={quantity || ''}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              required
            />
          </div>

          {selectedService && quantity > 0 && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-gray-600">Total Charge:</span>
              <span className="text-xl font-bold text-gray-900">${((selectedService.price / 1000) * quantity).toFixed(2)}</span>
            </div>
          )}

          <button 
            type="submit"
            disabled={loading || !selectedService}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Place Order'}
          </button>
        </form>
      </div>
    </div>
  );
};

const OrderHistoryList = () => {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, 'orders'), where('userId', '==', profile.uid), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'orders'));
  }, [profile]);

  if (orders.length === 0) {
    return (
      <tr>
        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
          <History size={48} className="mx-auto mb-4 opacity-20" />
          <p>No orders found yet.</p>
        </td>
      </tr>
    );
  }

  return (
    <>
      {orders.map((order) => (
        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
          <td className="px-6 py-4 text-xs font-mono text-gray-400">#{order.id.slice(0, 8)}</td>
          <td className="px-6 py-4 font-medium text-gray-900">{order.serviceName}</td>
          <td className="px-6 py-4 text-sm text-indigo-600 truncate max-w-[200px]">
            <a href={order.link} target="_blank" rel="noopener noreferrer">{order.link}</a>
          </td>
          <td className="px-6 py-4 text-sm text-gray-600">{order.quantity.toLocaleString()}</td>
          <td className="px-6 py-4 text-sm font-bold text-gray-900">${order.charge.toFixed(2)}</td>
          <td className="px-6 py-4">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              order.status === 'completed' ? 'bg-green-50 text-green-600' :
              order.status === 'pending' ? 'bg-amber-50 text-amber-600' :
              order.status === 'processing' ? 'bg-indigo-50 text-indigo-600' :
              'bg-red-50 text-red-600'
            }`}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </td>
          <td className="px-6 py-4 text-sm text-gray-500">
            {new Date(order.createdAt).toLocaleDateString()}
          </td>
        </tr>
      ))}
    </>
  );
};

const AdminPanel = () => {
  const [category, setCategory] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [min, setMin] = useState<number>(0);
  const [max, setMax] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'services'), {
        category,
        name,
        price,
        min,
        max,
        description,
        active: true
      });
      toast.success('Service added successfully');
      setCategory('');
      setName('');
      setPrice(0);
      setMin(0);
      setMax(0);
      setDescription('');
    } catch (error) {
      toast.error('Failed to add service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 pt-24 pb-16">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Admin: Add Service</h1>
        <form onSubmit={handleAddService} className="space-y-4">
          <input type="text" placeholder="Category" value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200" required />
          <input type="text" placeholder="Service Name" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200" required />
          <div className="grid grid-cols-3 gap-4">
            <input type="number" placeholder="Price per 1000" value={price || ''} onChange={e => setPrice(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-gray-200" required />
            <input type="number" placeholder="Min" value={min || ''} onChange={e => setMin(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-gray-200" required />
            <input type="number" placeholder="Max" value={max || ''} onChange={e => setMax(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-gray-200" required />
          </div>
          <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 h-32" />
          <button type="submit" disabled={loading} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold">
            {loading ? 'Adding...' : 'Add Service'}
          </button>
        </form>
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
          setProfile(userDoc.data() as UserProfile);
        } else {
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            displayName: firebaseUser.displayName || 'User',
            photoURL: firebaseUser.photoURL || '',
            balance: 0,
            role: firebaseUser.email === 'dihora04@gmail.com' ? 'admin' : 'user',
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
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
          <Toaster position="top-right" />
          <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
          
          <main>
            <AnimatePresence mode="wait">
              {activeTab === 'landing' && (
                <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Landing />
                </motion.div>
              )}
              {activeTab === 'dashboard' && (
                <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Dashboard />
                </motion.div>
              )}
              {activeTab === 'new-order' && (
                <motion.div key="new-order" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <NewOrder />
                </motion.div>
              )}
              {activeTab === 'orders' && (
                <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="max-w-7xl mx-auto px-4 pt-24 pb-16">
                    <h1 className="text-3xl font-bold mb-8">Order History</h1>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                            <tr>
                              <th className="px-6 py-4 font-medium">ID</th>
                              <th className="px-6 py-4 font-medium">Service</th>
                              <th className="px-6 py-4 font-medium">Link</th>
                              <th className="px-6 py-4 font-medium">Quantity</th>
                              <th className="px-6 py-4 font-medium">Charge</th>
                              <th className="px-6 py-4 font-medium">Status</th>
                              <th className="px-6 py-4 font-medium">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            <OrderHistoryList />
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              {activeTab === 'admin' && (
                <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <AdminPanel />
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          {/* Footer */}
          <footer className="bg-white border-t border-gray-100 py-12">
            <div className="max-w-7xl mx-auto px-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                  <Zap size={18} fill="currentColor" />
                </div>
                <span className="text-lg font-bold text-gray-900">Gujju SMM</span>
              </div>
              <p className="text-gray-500 text-sm">© 2026 Gujju SMM Panel. All rights reserved.</p>
              <div className="flex justify-center gap-6 mt-6">
                <a href="#" className="text-gray-400 hover:text-indigo-600 transition-colors">Terms</a>
                <a href="#" className="text-gray-400 hover:text-indigo-600 transition-colors">Privacy</a>
                <a href="#" className="text-gray-400 hover:text-indigo-600 transition-colors">Support</a>
              </div>
            </div>
          </footer>
        </div>
      </AuthProvider>
    </ErrorBoundary>
  );
}
