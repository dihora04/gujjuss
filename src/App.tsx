import React, { useState, useEffect } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  Link, 
  useLocation,
  useNavigate
} from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlusCircle, 
  History, 
  Wallet, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  ShieldCheck,
  MessageSquare,
  Home,
  User as UserIcon,
  TrendingUp,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './lib/firebase';
import { signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useAuth, UserProfile } from './hooks/useAuth';
import { cn, formatCurrency, formatDate } from './lib/utils';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  updateDoc,
  doc,
  getDocs,
  limit
} from 'firebase/firestore';

// --- Components ---

const LoadingScreen = () => (
  <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-50">
    <motion.div 
      animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"
    />
  </div>
);

const Navbar = ({ profile }: { profile: UserProfile | null }) => {
  const navigate = useNavigate();
  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 z-40">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
          <TrendingUp className="text-white w-6 h-6" />
        </div>
        <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
          Gujju SMM
        </span>
      </div>

      <div className="flex items-center gap-4">
        {profile && (
          <div className="hidden md:flex flex-col items-end">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Balance</span>
            <span className="text-blue-400 font-bold">{formatCurrency(profile.balance)}</span>
          </div>
        )}
        <button 
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
};

const Sidebar = ({ profile }: { profile: UserProfile | null }) => {
  const location = useLocation();
  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: PlusCircle, label: 'New Order', path: '/new-order' },
    { icon: History, label: 'Orders', path: '/orders' },
    { icon: Wallet, label: 'Add Balance', path: '/add-balance' },
    { icon: MessageSquare, label: 'Support', path: '/support' },
  ];

  if (profile?.role === 'admin') {
    menuItems.push({ icon: ShieldCheck, label: 'Admin Panel', path: '/admin' });
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 fixed left-0 top-16 bottom-0 bg-slate-900 border-r border-slate-800 p-4 gap-2 z-30">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              location.pathname === item.path 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            )}
          >
            <item.icon className={cn("w-5 h-5", location.pathname === item.path ? "text-white" : "group-hover:scale-110 transition-transform")} />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </aside>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-around px-2 z-40">
        {menuItems.slice(0, 5).map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors",
              location.pathname === item.path ? "text-blue-500" : "text-slate-500"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </>
  );
};

// --- Pages ---

const Login = () => {
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast.success('Welcome to Gujju SMM!');
    } catch (error) {
      toast.error('Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]" />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20 mb-4">
            <TrendingUp className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Gujju SMM</h1>
          <p className="text-slate-400">Boost your social presence instantly</p>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 py-4 rounded-2xl font-bold hover:bg-slate-100 transition-all active:scale-95 shadow-xl"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          Continue with Google
        </button>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const Dashboard = ({ profile }: { profile: UserProfile }) => {
  const [stats, setStats] = useState({ totalOrders: 0, pendingOrders: 0 });

  useEffect(() => {
    const q = query(collection(db, 'orders'), where('userId', '==', profile.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => doc.data());
      setStats({
        totalOrders: orders.length,
        pendingOrders: orders.filter(o => o.status === 'pending' || o.status === 'processing').length
      });
    });
    return () => unsubscribe();
  }, [profile.uid]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-white">Welcome back, {profile.displayName.split(' ')[0]}!</h2>
        <p className="text-slate-400">Here's what's happening with your account.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-slate-900 border border-slate-800 p-6 rounded-3xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet className="w-16 h-16 text-blue-500" />
          </div>
          <p className="text-slate-400 text-sm font-medium mb-1">Available Balance</p>
          <h3 className="text-3xl font-bold text-white mb-4">{formatCurrency(profile.balance)}</h3>
          <Link to="/add-balance" className="inline-flex items-center gap-2 text-blue-400 text-sm font-bold hover:text-blue-300">
            Add Funds <PlusCircle className="w-4 h-4" />
          </Link>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-slate-900 border border-slate-800 p-6 rounded-3xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Package className="w-16 h-16 text-indigo-500" />
          </div>
          <p className="text-slate-400 text-sm font-medium mb-1">Total Orders</p>
          <h3 className="text-3xl font-bold text-white mb-4">{stats.totalOrders}</h3>
          <Link to="/orders" className="inline-flex items-center gap-2 text-indigo-400 text-sm font-bold hover:text-indigo-300">
            View History <History className="w-4 h-4" />
          </Link>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-slate-900 border border-slate-800 p-6 rounded-3xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock className="w-16 h-16 text-amber-500" />
          </div>
          <p className="text-slate-400 text-sm font-medium mb-1">Active Orders</p>
          <h3 className="text-3xl font-bold text-white mb-4">{stats.pendingOrders}</h3>
          <Link to="/new-order" className="inline-flex items-center gap-2 text-amber-400 text-sm font-bold hover:text-amber-300">
            New Order <PlusCircle className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: '📸', label: 'Instagram', color: 'from-pink-500 to-rose-500' },
            { icon: '🎥', label: 'YouTube', color: 'from-red-500 to-orange-500' },
            { icon: '👥', label: 'Facebook', color: 'from-blue-600 to-indigo-600' },
            { icon: '🐦', label: 'Twitter', color: 'from-sky-400 to-blue-400' },
          ].map((item) => (
            <Link 
              key={item.label}
              to="/new-order"
              className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-slate-800/50 hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
            >
              <span className="text-3xl">{item.icon}</span>
              <span className="text-sm font-bold text-white">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

const NewOrder = ({ profile }: { profile: UserProfile }) => {
  const [categories, setCategories] = useState<string[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedService, setSelectedService] = useState<any>(null);
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchServices = async () => {
      const res = await fetch('/api/smm/services');
      const data = await res.json();
      setServices(data);
      const cats = Array.from(new Set(data.map((s: any) => s.category))) as string[];
      setCategories(cats);
    };
    fetchServices();
  }, []);

  const filteredServices = services.filter(s => s.category === selectedCategory);
  const charge = selectedService ? (selectedService.rate * quantity) / 1000 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !link || quantity <= 0) {
      toast.error('Please fill all fields correctly');
      return;
    }

    if (profile.balance < charge) {
      toast.error('Insufficient balance!');
      return;
    }

    setLoading(true);
    try {
      // 1. Place order on SMM API
      const apiRes = await fetch('/api/smm/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: selectedService.id, link, quantity })
      });
      const apiData = await apiRes.json();

      // 2. Save to Firestore
      await addDoc(collection(db, 'orders'), {
        userId: profile.uid,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        link,
        quantity,
        charge,
        status: 'pending',
        externalOrderId: apiData.order,
        createdAt: serverTimestamp()
      });

      // 3. Deduct balance
      await updateDoc(doc(db, 'users', profile.uid), {
        balance: profile.balance - charge
      });

      toast.success('Order placed successfully!');
      setLink('');
      setQuantity(0);
    } catch (error) {
      toast.error('Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-white">New Order</h2>
        <p className="text-slate-400">Select a service and boost your social media.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-xl">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-300">Category</label>
          <select 
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setSelectedService(null);
            }}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          >
            <option value="">Select Category</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-300">Service</label>
          <select 
            value={selectedService?.id || ''}
            onChange={(e) => setSelectedService(services.find(s => s.id === e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          >
            <option value="">Select Service</option>
            {filteredServices.map(s => <option key={s.id} value={s.id}>{s.name} - {formatCurrency(s.rate)}/1k</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-300">Link</label>
          <input 
            type="text"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://instagram.com/p/..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-300">Quantity</label>
            <input 
              type="number"
              value={quantity || ''}
              onChange={(e) => setQuantity(Number(e.target.value))}
              placeholder="Min: 100"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-300">Charge</label>
            <div className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-blue-400 font-bold">
              {formatCurrency(charge)}
            </div>
          </div>
        </div>

        {selectedService && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-xs text-blue-300 leading-relaxed">
            <p className="font-bold mb-1">Service Details:</p>
            <p>Min: {selectedService.min} | Max: {selectedService.max}</p>
            <p className="mt-1">{selectedService.description || 'Fast delivery, high quality profiles.'}</p>
          </div>
        )}

        <button 
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Place Order'}
        </button>
      </form>
    </div>
  );
};

const OrderHistory = ({ profile }: { profile: UserProfile }) => {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'orders'), 
      where('userId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [profile.uid]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'processing': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'canceled': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-white">Order History</h2>
        <p className="text-slate-400">Track all your social media boosts.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-800">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Service</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Charge</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-400 font-mono">#{order.id.slice(0, 6)}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{formatDate(order.createdAt)}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white">{order.serviceName}</span>
                      <span className="text-xs text-slate-500 truncate max-w-[200px]">{order.link}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-blue-400">{formatCurrency(order.charge)}</td>
                  <td className="px-6 py-4">
                    <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider", getStatusColor(order.status))}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No orders found. Start boosting now!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const AddBalance = ({ profile }: { profile: UserProfile }) => {
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState('UPI');
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (amount < 10) {
      toast.error('Minimum recharge is ₹10');
      return;
    }
    setLoading(true);
    try {
      // Simulate payment processing
      await addDoc(collection(db, 'payments'), {
        userId: profile.uid,
        amount,
        method,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast.success('Payment request submitted! Admin will approve soon.');
      setAmount(0);
    } catch (error) {
      toast.error('Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-white">Add Balance</h2>
        <p className="text-slate-400">Recharge your wallet to place orders.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-xl">
        <div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl text-white shadow-lg shadow-blue-500/20">
          <p className="text-sm opacity-80 mb-1">Current Balance</p>
          <h3 className="text-4xl font-bold">{formatCurrency(profile.balance)}</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-300">Amount (INR)</label>
            <input 
              type="number"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="Enter amount (Min ₹10)"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-300">Payment Method</label>
            <div className="grid grid-cols-2 gap-4">
              {['UPI', 'Razorpay'].map(m => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={cn(
                    "p-4 rounded-xl border font-bold transition-all",
                    method === m 
                      ? "bg-blue-600/10 border-blue-500 text-blue-400" 
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700 space-y-3">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Instant activation (Razorpay)
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Manual verification (UPI)
            </div>
          </div>

          <button 
            onClick={handlePayment}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Proceed to Pay'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminPanel = ({ profile }: { profile: UserProfile }) => {
  const [payments, setPayments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'payments'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const approvePayment = async (payment: any) => {
    try {
      // 1. Update user balance
      const userRef = doc(db, 'users', payment.userId);
      const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', payment.userId)));
      if (!userDoc.empty) {
        const userData = userDoc.docs[0].data();
        await updateDoc(doc(db, 'users', userDoc.docs[0].id), {
          balance: (userData.balance || 0) + payment.amount
        });
      }

      // 2. Update payment status
      await updateDoc(doc(db, 'payments', payment.id), {
        status: 'approved'
      });
      toast.success('Payment approved!');
    } catch (error) {
      toast.error('Approval failed');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-white">Admin Panel</h2>
        <p className="text-slate-400">Manage your SMM empire.</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Wallet className="w-5 h-5 text-blue-500" /> Pending Payments
        </h3>
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-800/50 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">User ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Method</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {payments.map(p => (
                <tr key={p.id}>
                  <td className="px-6 py-4 text-sm text-slate-400 font-mono">{p.userId.slice(0, 8)}...</td>
                  <td className="px-6 py-4 text-sm font-bold text-white">{formatCurrency(p.amount)}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{p.method}</td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => approvePayment(p)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                    >
                      Approve
                    </button>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No pending payments.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user) return <Login />;

  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
        <Toaster position="top-right" toastOptions={{
          style: { background: '#0f172a', color: '#fff', border: '1px solid #1e293b', borderRadius: '1rem' }
        }} />
        
        <Navbar profile={profile} />
        <Sidebar profile={profile} />

        <main className="pt-24 pb-24 md:pb-8 md:pl-72 px-4 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={profile ? <Dashboard profile={profile} /> : <LoadingScreen />} />
              <Route path="/new-order" element={profile ? <NewOrder profile={profile} /> : <LoadingScreen />} />
              <Route path="/orders" element={profile ? <OrderHistory profile={profile} /> : <LoadingScreen />} />
              <Route path="/add-balance" element={profile ? <AddBalance profile={profile} /> : <LoadingScreen />} />
              <Route path="/admin" element={profile?.role === 'admin' ? <AdminPanel profile={profile} /> : <Navigate to="/dashboard" />} />
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </Router>
  );
}
