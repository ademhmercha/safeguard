import { Link } from 'react-router-dom';
import { Shield, Eye, Lock, Bell, Globe, Smartphone, ChevronRight } from 'lucide-react';

const features = [
  { icon: Eye, title: 'Real-time monitoring', desc: 'See exactly what your child browses, searches, and uses — as it happens.' },
  { icon: Lock, title: 'Instant device lock', desc: 'Lock any paired device instantly from your dashboard, anywhere.' },
  { icon: Bell, title: 'Instant alerts', desc: 'Get notified the moment your child tries to access a blocked website.' },
  { icon: Globe, title: 'Website blocking', desc: 'Block any domain with one tap. Your rules, enforced in real time.' },
  { icon: Smartphone, title: 'Multi-device', desc: 'Manage all your children\'s devices from a single dashboard.' },
  { icon: Shield, title: 'Privacy first', desc: 'All data stays within your family. No third-party data sharing.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 tracking-tight">Rakeb</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2">
            Sign in
          </Link>
          <Link to="/register" className="text-sm font-semibold bg-gray-900 text-white px-4 py-2 rounded-xl hover:bg-gray-800 active:scale-95 transition-all">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Real-time parental control
        </div>
        <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 tracking-tight leading-tight mb-6">
          Keep your children<br />
          <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
            safe online
          </span>
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed">
          Rakeb gives parents full visibility and control over their children's digital activity — in real time, from any device.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/register"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-900 text-white font-semibold px-8 py-3.5 rounded-2xl hover:bg-gray-800 active:scale-95 transition-all text-sm shadow-lg">
            Start for free <ChevronRight className="w-4 h-4" />
          </Link>
          <Link to="/login"
            className="w-full sm:w-auto flex items-center justify-center gap-2 border border-gray-200 text-gray-700 font-semibold px-8 py-3.5 rounded-2xl hover:bg-gray-50 transition-all text-sm">
            Sign in
          </Link>
        </div>
      </section>

      {/* Dashboard preview placeholder */}
      <section className="max-w-5xl mx-auto px-6 mb-20">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden shadow-xl shadow-gray-200/50">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-200 bg-white">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-gray-200" />
              <div className="w-3 h-3 rounded-full bg-gray-200" />
              <div className="w-3 h-3 rounded-full bg-gray-200" />
            </div>
            <div className="flex-1 mx-4 bg-gray-100 rounded-lg h-6 max-w-xs" />
          </div>
          <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['Children', 'Devices', 'Screen Time', 'Alerts'].map((label, i) => (
              <div key={label} className="bg-white rounded-xl p-4 border border-gray-100">
                <div className={`w-8 h-8 rounded-lg mb-3 ${['bg-blue-100', 'bg-emerald-100', 'bg-amber-100', 'bg-red-100'][i]}`} />
                <div className="text-2xl font-bold text-gray-900">{['2', '3', '4h 20m', '0'][i]}</div>
                <div className="text-xs text-gray-400 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-3 tracking-tight">Everything you need</h2>
        <p className="text-gray-400 text-center text-sm mb-12">Built for parents who want real control, not just monitoring.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-5 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all bg-white">
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
                <Icon className="w-4.5 h-4.5 text-gray-700" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1.5 text-sm">{title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-950 py-20 px-6 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 tracking-tight">Ready to protect your family?</h2>
        <p className="text-gray-400 text-sm mb-8">Set up in minutes. No credit card required.</p>
        <Link to="/register"
          className="inline-flex items-center gap-2 bg-white text-gray-900 font-semibold px-8 py-3.5 rounded-2xl hover:bg-gray-100 active:scale-95 transition-all text-sm">
          Get started free <ChevronRight className="w-4 h-4" />
        </Link>
      </section>

      <footer className="border-t border-gray-100 py-6 text-center">
        <p className="text-xs text-gray-400">© 2026 Rakeb. All rights reserved.</p>
      </footer>
    </div>
  );
}
