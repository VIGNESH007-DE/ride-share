import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { motion } from 'framer-motion';
import { User, Car, Mail, Lock, UserPlus, LogIn, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'passenger' | 'driver'>('passenger');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [phone, setPhone] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [vehicleType, setVehicleType] = useState('car');
  const [seatCapacity, setSeatCapacity] = useState('4');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Welcome back!');
      } else {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        const userData = {
          uid: user.uid,
          email,
          role,
          name,
          age,
          gender,
          ...(role === 'driver' && { phone, vehicleNo, vehicleType, seatCapacity }),
        };
        await setDoc(doc(db, 'users', user.uid), userData);
        toast.success('Account created successfully!');
      }
      navigate('/');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-black flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">RideShare</h1>
          <p className="text-indigo-200">Modern travel for everyone</p>
        </div>

        <div className="flex mb-8 bg-black/30 rounded-lg p-1">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 rounded-md transition-all ${isLogin ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-300'}`}
          >
            Login
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 rounded-md transition-all ${!isLogin ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-300'}`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div className="flex gap-4 mb-4">
              <button
                type="button"
                onClick={() => setRole('passenger')}
                className={`flex-1 p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${role === 'passenger' ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white/5 border-white/10 text-white/60'}`}
              >
                <User size={24} />
                <span>Passenger</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('driver')}
                className={`flex-1 p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${role === 'driver' ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white/5 border-white/10 text-white/60'}`}
              >
                <Car size={24} />
                <span>Driver</span>
              </button>
            </div>
          )}

          <div className="space-y-4">
            {!isLogin && (
              <>
                <div className="relative">
                  <User className="absolute left-3 top-3 text-indigo-300" size={18} />
                  <input
                    type="text"
                    placeholder="Full Name"
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex gap-4">
                  <input
                    type="number"
                    placeholder="Age"
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    required
                  />
                  <select
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="male" className="bg-indigo-900">Male</option>
                    <option value="female" className="bg-indigo-900">Female</option>
                    <option value="other" className="bg-indigo-900">Other</option>
                  </select>
                </div>
                {role === 'driver' && (
                  <>
                    <input
                      type="text"
                      placeholder="Phone Number"
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                    <input
                      type="text"
                      placeholder="Vehicle Number"
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={vehicleNo}
                      onChange={(e) => setVehicleNo(e.target.value)}
                      required
                    />
                    <div className="flex gap-4">
                      <select
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value)}
                      >
                        <option value="car" className="bg-indigo-900">Car</option>
                        <option value="bike" className="bg-indigo-900">Bike</option>
                      </select>
                      <input
                        type="number"
                        placeholder="Seats"
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={seatCapacity}
                        onChange={(e) => setSeatCapacity(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}
              </>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-3 text-indigo-300" size={18} />
              <input
                type="email"
                placeholder="Email Address"
                className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-indigo-300" size={18} />
              <input
                type="password"
                placeholder="Password"
                className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            disabled={loading}
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
                {isLogin ? 'Login' : 'Sign Up'}
                <ChevronRight size={20} />
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default Auth;
