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
  LogOut, 
  ShieldCheck,
  TrendingUp,
  User as UserIcon,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth, UserProfile } from './hooks/useAuth';
import { cn, formatCurrency, formatDate } from './lib/utils';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  updateDoc,
  doc,
  getDoc,
  increment
} from 'firebase/firestore';

// --- Shared Components ---

const LoadingScreen = () => (
  <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-50">
    <motion.div 
      animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
    />
  </div>
);

const Navbar = ({ profile }: { profile: UserProfile | null }) => {
  const navigate = useNavigate();
  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-6 z-40">
      <div className="flex items-center gap-2">
        <TrendingUp className="text-blue-500 w-6 h-6" />
        <span className="font-bold text-xl tracking-tight text-white">Gujju SMM</span>
      </div>
      <div className="flex items-center gap-6">
        {profile && (
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Balance</span>
            <span className="text-blue-400 font-bold">{formatCurrency(profile.balance)}</span>
          </div>
        )}
        <button onClick={() => signOut(auth).then(() => navigate('/'))} className="p-2 text-slate-400 hover:text-white transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
};

const Sidebar = ({ profile }: { profile: UserProfile | null }) => {
  const location = useLocation();
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: PlusCircle, label: 'New Order', path: '/new-order' },
    { icon: History, label: 'Orders', path: '/orders' },
    { icon: Wallet, label: 'Add Balance', path: '/add-balance' },
  ];

  if (profile?.role === 'admin') {
    menuItems.push({ icon: ShieldCheck, label: 'Admin Panel', path: '/admin' });
  }

  return (
    <aside className="hidden md:flex flex-col w-64 fixed left-0 top-16 bottom-0 bg-slate-900 border-r border-slate-800 p-4 gap-2 z-30">
      {menuItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
            location.pathname === item.path ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-400 hover:text-white hover:bg-slate-800"
          )}
        >
          <item.icon className="w-5 h-5" />
          <span className="font-medium">{item.label}</span>
        </Link>
      ))}
    </aside>
  );
};

// --- Pages ---

const Login = () => {
  const [loading, setLoading] = useState(false);
  const handleLogin = async (email: string) => {
    setLoading(true);
    try {
      await signOut(auth);
      await signInWithEmailAndPassword(auth, email, email === 'dihora04@gmail.com' ? 'admin123456' : 'user123456');
      toast.success('Logged in successfully!');
    } catch (error) {
      toast.error('Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
        <div className="text-center mb-8">
          <TrendingUp className="text-blue-500 w-12 h-12 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white">Gujju SMM</h1>
          <p className="text-slate-400 mt-2">Simple Demo Portal</p>
        </div>
        <div className="space-y-4">
          <button onClick={() => handleLogin('dihora04@gmail.com')} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3">
            <ShieldCheck className="w-6 h-6" /> Login as Admin
          </button>
          <button onClick={() => handleLogin('user@example.com')} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3">
            <UserIcon className="w-6 h-6" /> Login as Demo User
          </button>
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({ profile }: { profile: UserProfile }) => {
  const [stats, setStats] = useState({ total: 0, active: 0 });

  useEffect(() => {
    const q = query(collection(db, 'orders'), where('userId', '==', profile.uid));
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(d => d.data());
      setStats({
        total: orders.length,
        active: orders.filter(o => ['pending', 'processing'].includes(o.status)).length
      });
    });
  }, [profile.uid]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Dashboard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Balance', value: formatCurrency(profile.balance), icon: Wallet, color: 'text-blue-400' },
          { label: 'Total Orders', value: stats.total, icon: Package, color: 'text-indigo-400' },
          { label: 'Active Orders', value: stats.active, icon: Clock, color: 'text-amber-400' },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
            <stat.icon className={cn("w-8 h-8 mb-4", stat.color)} />
            <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
            <h3 className="text-2xl font-bold text-white mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>
    </div>
  );
};

const NewOrder = ({ profile }: { profile: UserProfile }) => {
  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return onSnapshot(collection(db, 'services'), (snapshot) => {
      setServices(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !link || quantity < selectedService.min) {
      toast.error('Please fill all fields correctly');
      return;
    }
    const charge = (selectedService.rate / 1000) * quantity;
    if (profile.balance < charge) {
      toast.error('Insufficient balance');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'orders'), {
        userId: profile.uid,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        link,
        quantity,
        charge,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'users', profile.uid), {
        balance: increment(-charge)
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
    <div className="max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold text-white">New Order</h2>
      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-400">Service</label>
          <select 
            onChange={(e) => setSelectedService(services.find(s => s.id === e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a service</option>
            {services.map(s => <option key={s.id} value={s.id}>{s.name} - ₹{s.rate}/1k</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-400">Link</label>
          <input type="text" value={link} onChange={e => setLink(e.target.value)} placeholder="https://..." className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-400">Quantity</label>
            <input type="number" value={quantity || ''} onChange={e => setQuantity(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-400">Charge</label>
            <div className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-blue-400 font-bold">
              {formatCurrency(selectedService ? (selectedService.rate / 1000) * quantity : 0)}
            </div>
          </div>
        </div>
        <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all disabled:opacity-50">
          {loading ? 'Processing...' : 'Place Order'}
        </button>
      </form>
    </div>
  );
};

const OrderHistory = ({ profile }: { profile: UserProfile }) => {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'orders'), where('userId', '==', profile.uid));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setOrders(data);
    });
  }, [profile.uid]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Order History</h2>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-800/50 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Service</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Charge</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {orders.map(o => (
                <tr key={o.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-white">{o.serviceName}</td>
                  <td className="px-6 py-4 text-sm text-blue-400 font-bold">{formatCurrency(o.charge)}</td>
                  <td className="px-6 py-4">
                    <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase border", 
                      o.status === 'completed' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20")}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">{formatDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const AdminPanel = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [showAddService, setShowAddService] = useState(false);
  const [newService, setNewService] = useState({ name: '', category: '', rate: 0, min: 100, max: 10000 });

  useEffect(() => {
    const qP = query(collection(db, 'payments'), where('status', '==', 'pending'));
    const unsubP = onSnapshot(qP, (s) => setPayments(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubS = onSnapshot(collection(db, 'services'), (s) => setServices(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubP(); unsubS(); };
  }, []);

  const approvePayment = async (p: any) => {
    try {
      await updateDoc(doc(db, 'payments', p.id), { status: 'approved' });
      await updateDoc(doc(db, 'users', p.userId), { balance: increment(p.amount) });
      toast.success('Payment approved!');
    } catch (error) {
      toast.error('Approval failed');
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'services'), newService);
      toast.success('Service added!');
      setShowAddService(false);
      setNewService({ name: '', category: '', rate: 0, min: 100, max: 10000 });
    } catch (error) {
      toast.error('Failed to add service');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Admin Panel</h2>
        <button 
          onClick={() => setShowAddService(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" /> Add Service
        </button>
      </div>

      {showAddService && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6">Add New Service</h3>
            <form onSubmit={handleAddService} className="space-y-4">
              <input type="text" placeholder="Service Name" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none" required />
              <input type="text" placeholder="Category" value={newService.category} onChange={e => setNewService({...newService, category: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none" required />
              <input type="number" placeholder="Rate per 1000" value={newService.rate || ''} onChange={e => setNewService({...newService, rate: Number(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none" required />
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddService(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-all">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/20">Add Service</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2"><Wallet className="w-5 h-5 text-blue-500" /> Pending Payments</h3>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
            <table className="w-full text-left">
              <tbody className="divide-y divide-slate-800">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 text-sm text-white font-bold">{formatCurrency(p.amount)}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{p.method}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => approvePayment(p)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">Approve</button>
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && <tr><td className="px-6 py-8 text-center text-slate-500">No pending payments.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2"><PlusCircle className="w-5 h-5 text-indigo-500" /> Current Services</h3>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
            <table className="w-full text-left">
              <tbody className="divide-y divide-slate-800">
                {services.map(s => (
                  <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 text-sm text-white font-bold">{s.name}</td>
                    <td className="px-6 py-4 text-sm text-blue-400 font-bold">₹{s.rate}/1k</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const AddBalance = ({ profile }: { profile: UserProfile }) => {
  const [amount, setAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount < 10) return toast.error('Min ₹10');
    setLoading(true);
    try {
      await addDoc(collection(db, 'payments'), {
        userId: profile.uid,
        amount,
        method: 'UPI',
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast.success('Request submitted!');
      setAmount(0);
    } catch (error) {
      toast.error('Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md space-y-6">
      <h2 className="text-2xl font-bold text-white">Add Balance</h2>
      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-400">Amount (INR)</label>
          <input type="number" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} placeholder="Min ₹10" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all disabled:opacity-50">Submit Request</button>
      </form>
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
      <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-blue-500/30">
        <Toaster position="top-right" toastOptions={{ style: { background: '#0f172a', color: '#fff', border: '1px solid #1e293b', borderRadius: '1rem' } }} />
        <Navbar profile={profile} />
        <Sidebar profile={profile} />
        <main className="pt-24 pb-8 md:pl-72 px-6 max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={profile ? <Dashboard profile={profile} /> : <LoadingScreen />} />
            <Route path="/new-order" element={profile ? <NewOrder profile={profile} /> : <LoadingScreen />} />
            <Route path="/orders" element={profile ? <OrderHistory profile={profile} /> : <LoadingScreen />} />
            <Route path="/add-balance" element={profile ? <AddBalance profile={profile} /> : <LoadingScreen />} />
            <Route path="/admin" element={profile?.role === 'admin' ? <AdminPanel /> : <Navigate to="/dashboard" />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
