import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc, serverTimestamp, getDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Car, MapPin, Navigation, IndianRupee, Users, Check, X, LogOut, Clock, Trash2 } from 'lucide-react';
import { TAMIL_NADU_DISTRICTS } from '../constants/districts';
import toast from 'react-hot-toast';
import { auth } from '../lib/firebase';

const DriverDashboard = () => {
  const { userData } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [route, setRoute] = useState('');
  const [price, setPrice] = useState('');
  const [seats, setSeats] = useState('');
  const [myRides, setMyRides] = useState<any[]>([]);
  const [bookingRequests, setBookingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userData?.uid) return;

    // Fetch active rides by this driver
    const ridesQuery = query(
      collection(db, 'rides'),
      where('driverId', '==', userData.uid),
      where('status', '==', 'active')
    );

    const unsubscribeRides = onSnapshot(ridesQuery, (snapshot) => {
      const ridesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMyRides(ridesData);
    });

    // Fetch booking requests for this driver's rides
    const requestsQuery = query(
      collection(db, 'bookings'),
      where('driverId', '==', userData.uid)
    );

    const unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
      const requestsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookingRequests(requestsData);
    });

    return () => {
      unsubscribeRides();
      unsubscribeRequests();
    };
  }, [userData?.uid]);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'rides'), {
        driverId: userData?.uid,
        driverName: userData?.name,
        vehicleNo: userData?.vehicleNo,
        vehicleType: userData?.vehicleType,
        from,
        to,
        route,
        price: Number(price),
        availableSeats: Number(seats),
        totalSeats: Number(seats),
        status: 'active',
        createdAt: serverTimestamp(),
      });
      toast.success('Ride created successfully!');
      setShowForm(false);
      setFrom('');
      setTo('');
      setRoute('');
      setPrice('');
      setSeats('');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (requestId: string, action: 'accept' | 'reject', rideId: string, seatCount: number) => {
    try {
      const requestRef = doc(db, 'bookings', requestId);
      const rideRef = doc(db, 'rides', rideId);
      
      if (action === 'accept') {
        const rideSnap = await getDoc(rideRef);
        if (rideSnap.exists()) {
          const currentSeats = rideSnap.data().availableSeats;
          if (currentSeats < seatCount) {
            toast.error('Not enough seats available!');
            return;
          }
          await updateDoc(rideRef, {
            availableSeats: currentSeats - seatCount
          });
          await updateDoc(requestRef, { 
            status: 'accepted',
            driverContact: userData?.phone || 'Not available'
          });
          toast.success('Request accepted!');
        }
      } else {
        await updateDoc(requestRef, { status: 'rejected' });
        toast.error('Request rejected');
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleUpdateRideStatus = async (rideId: string, status: 'cancelled' | 'finished') => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'rides', rideId), { status });
      
      if (status === 'cancelled') {
         const bQuery = query(collection(db, 'bookings'), where('rideId', '==', rideId));
         const snap = await getDocs(bQuery);
         snap.forEach(async (docSnap) => {
            const data = docSnap.data();
            if (data.status === 'pending' || data.status === 'accepted') {
               await updateDoc(docSnap.ref, { status: 'driver_cancelled' });
            }
         });
      }

      toast.success(`Ride ${status} successfully!`);
    } catch (error: any) {
      toast.error(`Failed to update ride: ` + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!userData?.uid) return;
    try {
       const bQuery = query(collection(db, 'bookings'), where('driverId', '==', userData.uid));
       const bSnap = await getDocs(bQuery);
       bSnap.forEach(async (d) => {
          const st = d.data().status;
          if (st === 'cancelled' || st === 'driver_cancelled' || st === 'rejected' || st === 'finished') {
             await deleteDoc(d.ref);
          }
       });
       
       const rQuery = query(collection(db, 'rides'), where('driverId', '==', userData.uid));
       const rSnap = await getDocs(rQuery);
       rSnap.forEach(async (d) => {
          const st = d.data().status;
          if (st === 'cancelled' || st === 'finished') {
             await deleteDoc(d.ref);
          }
       });
       toast.success('History cleared successfully');
    } catch (error: any) {
       toast.error('Failed to clear history: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-white/10 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="text-indigo-500" />
            <span className="font-bold text-xl tracking-tight">Driver Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{userData?.name}</p>
              <p className="text-xs text-slate-400">{userData?.vehicleNo}</p>
            </div>
            <button 
              onClick={() => auth.signOut()}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">Manage Your Rides</h2>
          <div className="flex gap-4">
            <button
              onClick={handleClearHistory}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-full flex items-center gap-2 transition-all font-medium text-sm"
            >
              <Trash2 size={18} /> <span className="hidden sm:inline">Clear History</span>
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
            >
              {showForm ? <X size={20} /> : <Plus size={20} />}
              {showForm ? 'Cancel' : 'Create Ride'}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-8"
            >
              <form onSubmit={handlePublish} className="bg-slate-900 border border-white/10 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6 shadow-xl">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">From</label>
                    <select
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg py-2 px-4 focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">Select Origin</option>
                      {TAMIL_NADU_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">To</label>
                    <select
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg py-2 px-4 focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">Select Destination</option>
                      {TAMIL_NADU_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Route (e.g. Via OMR)</label>
                    <input
                      type="text"
                      value={route}
                      onChange={(e) => setRoute(e.target.value)}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg py-2 px-4 focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter major waypoints"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Price per Seat</label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-3 text-slate-500" size={16} />
                        <input
                          type="number"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          className="w-full bg-slate-800 border border-white/10 rounded-lg py-2 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500"
                          placeholder="0"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Total Seats</label>
                      <div className="relative">
                        <Users className="absolute left-3 top-3 text-slate-500" size={16} />
                        <input
                          type="number"
                          value={seats}
                          onChange={(e) => setSeats(e.target.value)}
                          className="w-full bg-slate-800 border border-white/10 rounded-lg py-2 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500"
                          placeholder="4"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <div className="h-full flex items-end">
                    <button
                      type="submit"
                      disabled={loading || !from || !to || !route || !price || !seats}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02] py-3 rounded-lg font-bold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Creating...' : 'Create Ride'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Rides List */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Navigation className="text-indigo-400" size={20} />
              Active Rides
            </h3>
            {myRides.length === 0 ? (
              <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-12 text-center text-slate-500">
                No active rides. Create one to start!
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myRides.map(ride => (
                  <motion.div
                    layout
                    key={ride.id}
                    className="bg-slate-900 border border-white/10 rounded-2xl p-5 hover:border-indigo-500/50 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-indigo-500/10 p-2 rounded-lg group-hover:bg-indigo-500/20 transition-colors">
                        <Car className="text-indigo-400" size={24} />
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-indigo-400 uppercase bg-indigo-500/10 px-2 py-1 rounded">
                          {ride.status}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-3">
                        <MapPin size={16} className="text-slate-500" />
                        <span className="font-medium">{ride.from} → {ride.to}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Navigation size={16} className="text-slate-500" />
                        <span className="text-sm text-slate-400">{ride.route}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1 text-emerald-400 font-bold">
                          <IndianRupee size={14} />
                          {ride.price}
                        </div>
                        <div className="flex items-center gap-1 text-slate-400 text-sm">
                          <Users size={14} />
                          {ride.availableSeats} seats left
                        </div>
                      </div>
                      <div className="flex gap-2 w-full pt-2">
                        <button
                          onClick={() => handleUpdateRideStatus(ride.id, 'cancelled')}
                          disabled={loading}
                          className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          <X size={14} /> Cancel Ride
                        </button>
                        <button
                          onClick={() => handleUpdateRideStatus(ride.id, 'finished')}
                          disabled={loading}
                          className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          <Check size={14} /> Finish Ride
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              {!showForm && (
                <button
                  onClick={() => {
                    setShowForm(true);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border-2 border-indigo-500/30 border-dashed hover:border-indigo-500 py-6 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-300 group mt-6"
                >
                  <div className="bg-indigo-500/20 p-3 rounded-full group-hover:scale-110 group-hover:bg-indigo-500/40 transition-all">
                    <Plus size={24} />
                  </div>
                  <span className="font-bold">Create Another Ride</span>
                </button>
              )}
              </>
            )}
          </div>

          {/* Booking Requests */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Clock className="text-amber-400" size={20} />
              Pending Requests
            </h3>
            <div className="space-y-4">
              {bookingRequests.length === 0 ? (
                <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-8 text-center text-slate-500">
                  No new requests
                </div>
              ) : (
                bookingRequests.map(request => (
                  <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    key={request.id}
                    className="bg-slate-900 border border-white/10 rounded-2xl p-4 shadow-lg"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className={`text-[10px] uppercase font-black px-2 py-1 rounded-full mb-2 inline-block ${
                          request.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' :
                          request.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {request.status}
                        </span>
                        <p className="font-bold">{request.passengerName}</p>
                        <p className="text-xs text-slate-400">Requesting {request.seats} seats</p>
                      </div>
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRequest(request.id, 'reject', request.rideId, request.seats)}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                          >
                            <X size={18} />
                          </button>
                          <button
                            onClick={() => handleRequest(request.id, 'accept', request.rideId, request.seats)}
                            className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-lg transition-colors"
                          >
                            <Check size={18} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-slate-300 bg-black/20 p-2 rounded">
                      <p>From: {request.from}</p>
                      <p>To: {request.to}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DriverDashboard;
