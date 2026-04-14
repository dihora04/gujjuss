import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Loader2, ShieldCheck, Smartphone, Zap } from 'lucide-react';

interface OrderFlowProps {
  onComplete: () => void;
  serviceName: string;
  quantity: number;
  username: string;
}

export const OrderFlow: React.FC<OrderFlowProps> = ({ onComplete, serviceName, quantity, username }) => {
  const [step, setStep] = useState<'generating' | 'verification'>('generating');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (step === 'generating') {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => setStep('verification'), 500);
            return 100;
          }
          return prev + Math.floor(Math.random() * 5) + 1;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [step]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-surface-950/90 backdrop-blur-xl p-6">
      <AnimatePresence mode="wait">
        {step === 'generating' ? (
          <motion.div
            key="generating"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="glass-card p-12 max-w-md w-full text-center relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
              <motion.div 
                className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>

            <h2 className="text-3xl font-bold mb-2 text-white">Generating...</h2>
            <p className="text-gray-400 mb-8 text-sm">Searching @{username}</p>

            <div className="relative w-full h-3 bg-white/5 rounded-full mb-4 overflow-hidden">
              <motion.div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>
            
            <p className="text-2xl font-mono font-bold text-brand-primary">{progress}%</p>
          </motion.div>
        ) : (
          <motion.div
            key="verification"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-10 max-w-md w-full relative overflow-hidden"
          >
            <div className="bg-brand-primary/20 text-brand-primary px-4 py-2 rounded-lg font-bold text-sm inline-block mb-6 uppercase tracking-widest mx-auto">
              Action Required
            </div>

            <h3 className="text-xl font-bold mb-4 text-white">
              Syncing <span className="text-brand-secondary">{quantity.toLocaleString()}</span> {serviceName} to <span className="text-brand-primary">@{username}</span>
            </h3>
            <p className="text-gray-400 text-sm mb-8">Proof of humanity is required to complete the sync.</p>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 text-left">
              <h4 className="text-brand-primary font-bold text-xs uppercase tracking-widest mb-6">Verification Protocol:</h4>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-brand-primary text-surface-950 flex items-center justify-center text-xs font-bold shrink-0">1</div>
                  <p className="text-sm text-gray-300">Click the Verify button below to open WhatsApp support.</p>
                </div>
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-brand-primary text-surface-950 flex items-center justify-center text-xs font-bold shrink-0">2</div>
                  <p className="text-sm text-gray-300">Send your Order ID to our team for instant release.</p>
                </div>
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-brand-primary text-surface-950 flex items-center justify-center text-xs font-bold shrink-0">3</div>
                  <p className="text-sm text-gray-300">Instant release upon validation of payment/task.</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => {
                // Open WhatsApp
                window.open('https://wa.me/919999999999?text=I%20need%20to%20verify%20my%20order%20for%20' + username, '_blank');
                onComplete();
              }}
              className="btn-modern btn-brand w-full py-5 text-lg font-bold shadow-2xl shadow-brand-primary/20"
            >
              VERIFY
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
