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
  AlertCircle,
  Instagram,
  Youtube,
  Facebook,
  Twitter,
  Send,
  Users
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './lib/firebase';
import { signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
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
  setDoc,
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Welcome back!');
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
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
          <p className="text-slate-400">Admin & User Portal Login</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-300">Email / Username</label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-300">Password</label>
            <div className="relative">
              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input 
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 mt-4"
          >
            {loading ? 'Logging in...' : (
              <>
                Login to Dashboard
                <TrendingUp className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-800 text-center">
          <p className="text-slate-500 text-sm">
            Contact administrator to create an account.
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
            { label: 'Instagram', icon: <Instagram className="w-8 h-8 text-pink-500" />, color: 'from-pink-500 to-rose-500' },
            { label: 'YouTube', icon: <Youtube className="w-8 h-8 text-red-500" />, color: 'from-red-500 to-orange-500' },
            { label: 'Facebook', icon: <Facebook className="w-8 h-8 text-blue-600" />, color: 'from-blue-600 to-indigo-600' },
            { label: 'Twitter', icon: <Twitter className="w-8 h-8 text-sky-400" />, color: 'from-sky-400 to-blue-400' },
          ].map((item) => (
            <Link 
              key={item.label}
              to="/new-order"
              className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-slate-800/50 hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700 group"
            >
              <div className="p-3 rounded-2xl bg-slate-900 group-hover:scale-110 transition-transform shadow-lg">
                {item.icon}
              </div>
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
    const q = query(collection(db, 'services'), orderBy('category', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setServices(data);
      const cats = Array.from(new Set(data.map((s: any) => s.category))) as string[];
      setCategories(cats);
    });
    return () => unsubscribe();
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
  const [services, setServices] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'payments' | 'users' | 'services'>('payments');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    password: '',
    displayName: '',
    username: '',
    balance: 0,
    role: 'user' as 'user' | 'admin'
  });
  const [newBalance, setNewBalance] = useState<number>(0);
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');

  // Service editing state
  const [editingService, setEditingService] = useState<any>(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    category: '',
    rate: 0,
    min: 10,
    max: 10000,
    description: ''
  });

  useEffect(() => {
    const qPayments = query(collection(db, 'payments'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
    const unsubPayments = onSnapshot(qPayments, (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qServices = query(collection(db, 'services'), orderBy('category', 'asc'));
    const unsubServices = onSnapshot(qServices, (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubPayments();
      unsubUsers();
      unsubServices();
    };
  }, []);

  const handleCreateUser = async () => {
    if (!newUserForm.email || !newUserForm.password || !newUserForm.username) {
      toast.error('Please fill required fields');
      return;
    }
    try {
      // Note: Admin creating user via Firebase Auth requires Admin SDK or a backend endpoint.
      // Since we are in a sandbox, we'll simulate account creation by adding to Firestore.
      // In a real app, you'd use a Cloud Function or Admin SDK.
      // For this demo, we'll use a mock approach or assume the admin can use the signup logic if enabled.
      // BUT the user asked for ONLY portal saving.
      
      // We'll use a dedicated API route for this to handle Auth creation on the server side.
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserForm)
      });
      
      if (res.ok) {
        toast.success('User created successfully!');
        setIsCreatingUser(false);
        setNewUserForm({ email: '', password: '', displayName: '', username: '', balance: 0, role: 'user' });
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create user');
      }
    } catch (error) {
      toast.error('Error creating user');
    }
  };

  const approvePayment = async (payment: any) => {
    try {
      const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', payment.userId)));
      if (!userDoc.empty) {
        const userData = userDoc.docs[0].data();
        await updateDoc(doc(db, 'users', userDoc.docs[0].id), {
          balance: (userData.balance || 0) + payment.amount
        });
      }

      await updateDoc(doc(db, 'payments', payment.id), {
        status: 'approved'
      });
      toast.success('Payment approved!');
    } catch (error) {
      toast.error('Approval failed');
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      await updateDoc(doc(db, 'users', editingUser.id), {
        balance: newBalance,
        role: newRole
      });
      toast.success('User updated successfully!');
      setEditingUser(null);
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const handleSaveService = async () => {
    try {
      if (editingService?.id) {
        await updateDoc(doc(db, 'services', editingService.id), serviceForm);
        toast.success('Service updated!');
      } else {
        await addDoc(collection(db, 'services'), serviceForm);
        toast.success('Service added!');
      }
      setEditingService(null);
      setServiceForm({ name: '', category: '', rate: 0, min: 10, max: 10000, description: '' });
    } catch (error) {
      toast.error('Failed to save service');
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-white">Admin Panel</h2>
        <p className="text-slate-400">Manage your SMM empire.</p>
      </div>

      <div className="flex gap-4 border-b border-slate-800 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('payments')}
          className={cn(
            "pb-4 px-2 font-bold transition-all border-b-2 whitespace-nowrap",
            activeTab === 'payments' ? "border-blue-500 text-blue-500" : "border-transparent text-slate-500 hover:text-slate-300"
          )}
        >
          Payments ({payments.length})
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={cn(
            "pb-4 px-2 font-bold transition-all border-b-2 whitespace-nowrap",
            activeTab === 'users' ? "border-blue-500 text-blue-500" : "border-transparent text-slate-500 hover:text-slate-300"
          )}
        >
          Users ({users.length})
        </button>
        <button 
          onClick={() => setActiveTab('services')}
          className={cn(
            "pb-4 px-2 font-bold transition-all border-b-2 whitespace-nowrap",
            activeTab === 'services' ? "border-blue-500 text-blue-500" : "border-transparent text-slate-500 hover:text-slate-300"
          )}
        >
          Services ({services.length})
        </button>
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl"
          >
            <h3 className="text-xl font-bold text-white mb-6">Edit User: {editingUser.displayName}</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-300">Balance (INR)</label>
                <input 
                  type="number"
                  value={newBalance}
                  onChange={(e) => setNewBalance(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-300">Role</label>
                <select 
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'user' | 'admin')}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setEditingUser(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpdateUser}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-500" /> Pending Payments
          </h3>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
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
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
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
      )}

      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-indigo-500" /> Registered Users
            </h3>
            <button 
              onClick={() => setIsCreatingUser(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" /> Create User
            </button>
          </div>

          {isCreatingUser && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl"
              >
                <h3 className="text-xl font-bold text-white mb-6">Create New User</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-300">Full Name</label>
                    <input 
                      type="text"
                      value={newUserForm.displayName}
                      onChange={(e) => setNewUserForm({...newUserForm, displayName: e.target.value})}
                      placeholder="John Doe"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-300">Username</label>
                    <input 
                      type="text"
                      value={newUserForm.username}
                      onChange={(e) => setNewUserForm({...newUserForm, username: e.target.value})}
                      placeholder="johndoe"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-300">Email</label>
                    <input 
                      type="email"
                      value={newUserForm.email}
                      onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})}
                      placeholder="email@example.com"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-300">Password</label>
                    <input 
                      type="password"
                      value={newUserForm.password}
                      onChange={(e) => setNewUserForm({...newUserForm, password: e.target.value})}
                      placeholder="••••••••"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={() => setIsCreatingUser(false)}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleCreateUser}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/20"
                    >
                      Create
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-800/50 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Username</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Email</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Balance</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Role</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-white">{u.displayName || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-slate-300 font-mono">@{u.username || 'n/a'}</td>
                      <td className="px-6 py-4 text-sm text-slate-400">{u.email}</td>
                      <td className="px-6 py-4 text-sm font-bold text-blue-400">{formatCurrency(u.balance)}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                          u.role === 'admin' ? "bg-purple-500/10 text-purple-500 border border-purple-500/20" : "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                        )}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => {
                            setEditingUser(u);
                            setNewBalance(u.balance);
                            setNewRole(u.role);
                          }}
                          className="text-blue-400 hover:text-blue-300 text-xs font-bold"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'services' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-500" /> Services List
            </h3>
            <button 
              onClick={() => {
                setEditingService({});
                setServiceForm({ name: '', category: '', rate: 0, min: 10, max: 10000, description: '' });
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" /> Add Service
            </button>
          </div>

          {editingService && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]"
              >
                <h3 className="text-xl font-bold text-white mb-6">{editingService.id ? 'Edit Service' : 'Add New Service'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <label className="text-sm font-bold text-slate-300">Service Name</label>
                    <input 
                      type="text"
                      value={serviceForm.name}
                      onChange={(e) => setServiceForm({...serviceForm, name: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="e.g. Instagram Followers [Real]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-300">Category</label>
                    <input 
                      type="text"
                      value={serviceForm.category}
                      onChange={(e) => setServiceForm({...serviceForm, category: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="e.g. Instagram"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-300">Rate (per 1000)</label>
                    <input 
                      type="number"
                      value={serviceForm.rate}
                      onChange={(e) => setServiceForm({...serviceForm, rate: Number(e.target.value)})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-300">Min Quantity</label>
                    <input 
                      type="number"
                      value={serviceForm.min}
                      onChange={(e) => setServiceForm({...serviceForm, min: Number(e.target.value)})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-300">Max Quantity</label>
                    <input 
                      type="number"
                      value={serviceForm.max}
                      onChange={(e) => setServiceForm({...serviceForm, max: Number(e.target.value)})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <label className="text-sm font-bold text-slate-300">Description</label>
                    <textarea 
                      value={serviceForm.description}
                      onChange={(e) => setServiceForm({...serviceForm, description: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none h-24"
                      placeholder="Service details..."
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-6">
                  <button 
                    onClick={() => setEditingService(null)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveService}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20"
                  >
                    Save Service
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-800/50 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Service</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Category</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Rate</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Min/Max</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {services.map(s => (
                    <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-white max-w-[200px] truncate">{s.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-400">{s.category}</td>
                      <td className="px-6 py-4 text-sm font-bold text-amber-400">{formatCurrency(s.rate)}</td>
                      <td className="px-6 py-4 text-xs text-slate-500">{s.min} / {s.max}</td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => {
                            setEditingService(s);
                            setServiceForm({
                              name: s.name,
                              category: s.category,
                              rate: s.rate,
                              min: s.min,
                              max: s.max,
                              description: s.description || ''
                            });
                          }}
                          className="text-blue-400 hover:text-blue-300 text-xs font-bold"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {services.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No services found. Add your first service!</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
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
