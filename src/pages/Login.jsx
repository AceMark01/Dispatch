import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import botivateLogoB from '../Assets/logo.png';
import Footer from '../components/Footer';

const Login = () => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (!id || !password) {
        toast.error('Please enter ID and Password');
        setSubmitting(false);
        return;
      }

      const { fetchSheetData } = await import('../utils/api');
      
      // Fetch users from the 'Login' sheet
      const data = await fetchSheetData('Login');
      
      // Map sheet data (assuming row 0 is headers)
      // Index mapping based on your sheet: 
      // 0: Timestamp, 1: Serial No, 2: Full Name, 3: Contact No, 4: Email, 
      // 5: Designation, 6: User ID, 7: Password, 8: Role, 9: Page access
      const users = data.slice(1).map(row => ({
        id: row[6],
        pass: row[7],
        name: row[2],
        designation: row[5],
        role: row[8] ? row[8].toUpperCase() : 'USER',
        pageAccess: row[9] || ''
      }));

      const matchedUser = users.find(u => u.id === id && u.pass === password);

      if (!matchedUser) {
        toast.error('Invalid credentials');
        setSubmitting(false);
        return;
      }

      toast.success('Login successful!');
      login({
        name: matchedUser.name,
        username: matchedUser.id,
        role: matchedUser.role,
        designation: matchedUser.designation,
        pageAccess: matchedUser.pageAccess
      });
      navigate("/", { replace: true });
    } catch (err) {
      console.error(err);
      toast.error('Login error or network issue');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Demo credentials removed

  return (
    <div className="h-[100dvh] overflow-hidden w-full flex flex-col bg-gradient-to-br from-indigo-100 via-sky-50 to-violet-100">
      {/* Center Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md glass-strong rounded-3xl shadow-2xl p-8 space-y-6">

          <div className="flex flex-col items-center space-y-2">
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-semibold text-gray-900">Dispatch</h1>
              <p className="text-gray-600 text-base font-medium">Management System</p>
            </div>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* User ID Input */}
            <div className="space-y-2">
              <label htmlFor="id" className="text-sm font-medium text-gray-700">
                User ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="id"
                  name="id"
                  type="text"
                  required
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                  placeholder="Enter user ID"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3 px-4 text-base font-semibold bg-gradient-to-r from-sky-500 to-indigo-600 text-white rounded-lg hover:from-sky-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-600 transition-all ${submitting ? 'opacity-70 cursor-not-allowed' : ''
                }`}
            >
              {submitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Login;

