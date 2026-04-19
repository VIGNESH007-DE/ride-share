import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Users, Car, Clock, Navigation, LogOut, Phone, Trash2 } from 'lucide-react';
import { TAMIL_NADU_DISTRICTS } from '../constants/districts';
import toast from 'react-hot-toast';
import { auth } from '../lib/firebase';

const PassengerDashboard = () => {
  const { userData } = useAuth();
  const [rides, setRides] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch passenger's bookings
    if (userData?.uid) {
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('passengerId', '==', userData.uid)
      );

      const unsubscribeBookings = onSnapshot(bookingsQuery, (snapshot) => {
        const bookingsData = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((data: any) => data.deletedByPassenger !== true);
        setMyBookings(bookingsData);
      });

      return () => {
        unsubscribeBookings();
      };
    }
  }, [userData?.uid]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!from || !to) return;
    
    setLoading(true);
    try {
      const q = query(
        collection(db, 'rides'),
        where('from', '==', from),
        where('to', '==', to),
        where('status', '==', 'active')
      );
      
      const querySnapshot = await getDocs(q);
      const results: any[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.availableSeats > 0) {
           results.push({ id: doc.id, ...data });
        }
      });
      
      setRides(results);
    } catch (error: any) {
      toast.error('Search failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (ride: any) => {
    if (ride.availableSeats <= 0) {
      toast.error('Vehicle is full');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'bookings'), {
        rideId: ride.id,
        passengerId: userData?.uid,
        passengerName: userData?.name,
        driverId: ride.driverId,
        driverName: ride.driverName,
        from: ride.from,
        to: ride.to,
        price: ride.price,
        seats: 1, // Defaulting to 1 for now
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      toast.success('Booking request sent!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (booking: any) => {
    try {
      // Re-add seats BEFORE marking cancelled to guarantee execution
      if (booking.status === 'accepted') {
        const rideRef = doc(db, 'rides', booking.rideId);
        const rideSnap = await getDoc(rideRef);
        if (rideSnap.exists()) {
           const currentSeats = Number(rideSnap.data().availableSeats) || 0;
           const bookedSeats = Number(booking.seats) || 1;
           await updateDoc(rideRef, { availableSeats: currentSeats + bookedSeats });
        }
      }
      
      await updateDoc(doc(db, 'bookings', booking.id), { status: 'cancelled' });

      toast.success('Booking cancelled successfully');
    } catch (error: any) {
      toast.error('Failed to cancel booking: ' + error.message);
    }
  };

  const handleClearHistory = async () => {
    if (!userData?.uid) return;
    try {
      const q = query(collection(db, 'bookings'), where('passengerId', '==', userData.uid));
      const snap = await getDocs(q);
      const promises: Promise<void>[] = [];
      snap.forEach((docSnap) => {
         const st = docSnap.data().status;
         if (st === 'cancelled' || st === 'driver_cancelled' || st === 'rejected' || st === 'finished') {
           promises.push(updateDoc(docSnap.ref, { deletedByPassenger: true }));
         }
      });
      await Promise.all(promises);
      toast.success('History cleared successfully');
    } catch (error: any) {
      toast.error('Failed to clear history: ' + error.message);
    }
  };

  // Filtered locally if needed, but we already query strictly for active, from, and to available
  const filteredRides = rides;

  return (
    <div className="min-h-screen bg-indigo-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-white/10 bg-indigo-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="text-indigo-400 rotate-45" />
            <span className="font-bold text-xl tracking-tight">Passenger Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{userData?.name}</p>
              <p className="text-xs text-indigo-300">Passenger</p>
            </div>
            <button 
              onClick={() => auth.signOut()}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-indigo-300 hover:text-white"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Search Header */}
        <section className="bg-indigo-900/40 border border-white/10 rounded-3xl p-8 mb-12 shadow-2xl backdrop-blur-sm">
          <h2 className="text-3xl font-bold mb-6 text-center">Where are you going?</h2>
          <form onSubmit={handleSearch} className="flex flex-col gap-6 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative group">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 group-focus-within:text-white transition-colors" size={20} />
                <select
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full bg-white/10 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-indigo-400 focus:outline-none transition-all appearance-none"
                >
                  <option value="" className="bg-indigo-950">Pick up from</option>
                  {TAMIL_NADU_DISTRICTS.map(d => <option key={d} value={d} className="bg-indigo-950">{d}</option>)}
                </select>
              </div>
              <div className="relative group">
                <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 group-focus-within:text-white transition-colors" size={20} />
                <select
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full bg-white/10 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-indigo-400 focus:outline-none transition-all appearance-none"
                >
                  <option value="" className="bg-indigo-950">Destination to</option>
                  {TAMIL_NADU_DISTRICTS.map(d => <option key={d} value={d} className="bg-indigo-950">{d}</option>)}
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !from || !to}
              className="w-full md:w-auto self-center bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02] text-white py-3 px-8 rounded-2xl font-bold transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
            >
              {loading ? 'Searching...' : 'Search Ride'}
            </button>
          </form>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Available Rides */}
          <div className="lg:col-span-2">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Search className="text-indigo-400" size={24} />
              Available Rides
            </h3>
            <div className="grid grid-cols-1 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredRides.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white/5 border border-white/5 rounded-3xl p-16 text-center text-indigo-300/50"
                  >
                    No rides found for your route. Try a different search.
                  </motion.div>
                ) : (
                  filteredRides.map(ride => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={ride.id}
                      className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/[0.08] transition-all group flex flex-col md:flex-row items-center gap-6"
                    >
                      <div className="bg-indigo-500/10 p-4 rounded-2xl group-hover:bg-indigo-500/20 transition-colors">
                        <Car className="text-indigo-400" size={32} />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-lg font-bold text-white">{ride.driverName}</h4>
                            <p className="text-sm text-indigo-300/70">{ride.vehicleNo} • {ride.vehicleType}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-emerald-400">₹{ride.price}</p>
                            <p className="text-xs text-indigo-300/50">per person</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-indigo-200">
                          <span className="flex items-center gap-1"><MapPin size={14} /> {ride.from}</span>
                          <span className="text-indigo-500">→</span>
                          <span className="flex items-center gap-1"><Navigation size={14} /> {ride.to}</span>
                        </div>
                        <p className="text-sm text-indigo-300/50">Route: {ride.route}</p>
                      </div>
                      <div className="flex flex-col items-center gap-2 min-w-[120px]">
                        <div className="flex items-center gap-1 text-indigo-300 text-sm">
                          <Users size={16} />
                          <span>{ride.availableSeats} seats left</span>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleBook(ride)}
                          disabled={loading}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                        >
                          Book Now
                        </motion.button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* My Bookings */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <Clock className="text-amber-400" size={24} />
                Your Bookings
              </h3>
              {myBookings.length > 0 && (
                <button onClick={handleClearHistory} className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-all" title="Clear History">
                  <Trash2 size={18} />
                </button>
              )}
            </div>
            <div className="space-y-4">
              {myBookings.length === 0 ? (
                <div className="bg-white/5 border border-white/5 rounded-3xl p-8 text-center text-indigo-300/50">
                  No bookings yet
                </div>
              ) : (
                myBookings.map(booking => (
                  <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    key={booking.id}
                    className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-lg border-l-4 border-l-indigo-500"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className={`text-[10px] uppercase font-black px-2 py-1 rounded-full ${
                        booking.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' :
                        booking.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                        booking.status === 'driver_cancelled' ? 'bg-red-500/40 text-red-100' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {booking.status === 'driver_cancelled' ? 'Driver Cancelled' : booking.status}
                      </span>
                      <div className="flex items-center gap-3">
                        <p className="text-xs text-indigo-300/50">₹{booking.price}</p>
                        {(booking.status === 'pending' || booking.status === 'accepted') && (
                          <button
                            onClick={() => handleCancelBooking(booking)}
                            className="bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1 rounded-full text-xs font-bold transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2 mb-4">
                      <p className="text-sm font-bold">{booking.from} to {booking.to}</p>
                      <p className="text-xs text-indigo-300/70">Driver: {booking.driverName}</p>
                    </div>
                    {booking.status === 'accepted' && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-xs text-indigo-300 mb-2">Driver Contact Information</p>
                        <div className="flex items-center gap-2 text-emerald-400 font-bold">
                          <Phone size={14} />
                          <span>{booking.driverContact}</span>
                        </div>
                      </div>
                    )}
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

export default PassengerDashboard;
