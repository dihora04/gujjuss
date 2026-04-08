export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  balance: number;
  role: 'user' | 'admin';
  walletAddress?: string;
  freeDemoClaimed?: boolean;
  createdAt?: string;
}

export interface Service {
  id: string;
  category: string;
  name: string;
  price: number; // per 1000
  min: number;
  max: number;
  description?: string;
  active: boolean;
}

export interface Order {
  id: string;
  userId: string;
  serviceId: string;
  serviceName: string;
  link: string;
  quantity: number;
  charge: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'deposit' | 'order' | 'refund';
  description?: string;
  createdAt: string;
}
