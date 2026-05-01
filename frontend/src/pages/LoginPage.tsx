import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAuth(data.token, data.refreshToken, data.user);
      navigate('/');
    } catch {
      toast.error('Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left panel — hidden on mobile */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12" style={{ background: '#0f172a' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/10">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white tracking-tight">Rakeb</span>
        </div>
        <div>
          <blockquote className="text-2xl font-semibold text-white leading-snug mb-4">
            "Full visibility into my children's online activity — finally."
          </blockquote>
          <p className="text-sm text-white/40">Parent of two, Rakeb user</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">

        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-10 lg:hidden">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#0f172a' }}>
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 tracking-tight">Rakeb</span>
        </div>

        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Sign in</h1>
          <p className="text-sm text-gray-400 mb-8">Enter your credentials to access the dashboard.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" required autoComplete="email" className="input"
                placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" required autoComplete="current-password" className="input"
                placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full mt-2 font-semibold text-sm text-white py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50"
              style={{ background: '#0f172a' }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            No account?{' '}
            <Link to="/register" className="text-gray-900 font-semibold hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
