import { useAuth } from '../contexts/AuthContext';
import PassengerDashboard from './PassengerDashboard';
import DriverDashboard from './DriverDashboard';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const { userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-indigo-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-4 border-indigo-500 border-t-white rounded-full"
        />
      </div>
    );
  }

  if (userData?.role === 'driver') {
    return <DriverDashboard />;
  }

  return <PassengerDashboard />;
};

export default Dashboard;
