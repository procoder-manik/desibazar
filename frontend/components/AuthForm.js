'use client';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from './Providers';
import { Logo } from './Header';
import { api } from '@/lib/api';
import { CheckIcon, ShieldIcon, Stars } from './Icons';

function Form({ mode }) {
  const reg = mode === 'register';
  const { login, toast } = useApp();
  const router = useRouter();
  const raw = useSearchParams().get('next') || '/';
  const next = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/'; // only allow local redirects
  const [f, setF] = useState({ name: '', phone: '', email: '', password: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const r = await api(reg ? '/auth/register' : '/auth/login', { method: 'POST', body: f });
      login(r.token, r.user);
      toast(reg ? `Welcome, ${r.user.name.split(' ')[0]}!` : 'Signed in');
      router.push(next);
    } catch (err) { setError(err.message); setBusy(false); }
  };
  const on = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const q = next !== '/' ? `?next=${encodeURIComponent(next)}` : '';

  const strength = [f.password.length >= 8, /[A-Za-z]/.test(f.password) && /\d/.test(f.password), f.password.length >= 12 || /[^A-Za-z0-9]/.test(f.password)].filter(Boolean).length;

  return (
    <div className="auth">
      <aside className="auth-art" aria-hidden="true">
        <div className="art-orb a" /><div className="art-orb b" />
        <div className="art-copy">
          <span className="eyebrow">{reg ? 'Join the family' : 'Welcome back'}</span>
          <h2>{reg ? <>Pure food,<br /><em>delivered with care.</em></> : <>Good to see<br /><em>you again.</em></>}</h2>
          <ul>
            <li><span><CheckIcon size={14} /></span>Track every order in real time</li>
            <li><span><CheckIcon size={14} /></span>Saved addresses for one-tap checkout</li>
            <li><span><CheckIcon size={14} /></span>Members-only offers and early restocks</li>
          </ul>
        </div>
        <div className="art-quote glass">
          <Stars value={5} size={14} />
          <p>&ldquo;The honey tastes exactly like my grandmother&apos;s. Delivery to Sylhet took two days.&rdquo;</p>
          <small>Verified customer</small>
        </div>
      </aside>

      <form className="auth-card glass" onSubmit={submit}>
        <Logo />
        <div className="auth-tabs" role="tablist">
          <Link href={'/login' + q} className={!reg ? 'on' : ''} role="tab" aria-selected={!reg}>Sign in</Link>
          <Link href={'/register' + q} className={reg ? 'on' : ''} role="tab" aria-selected={reg}>Create account</Link>
        </div>
        <h2>{reg ? 'Create your account' : 'Sign in to your account'}</h2>
        <p className="muted">{reg ? 'It takes less than a minute.' : 'Use the mobile number you shop with.'}</p>
        <div className="fields one">
          {reg && <label>Full name<input required autoComplete="name" placeholder="Your name" value={f.name} onChange={on('name')} /></label>}
          <label>Mobile number<span className="phone-in"><i>+88</i><input required type="tel" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" value={f.phone} onChange={on('phone')} /></span></label>
          {reg && <label>Email<input type="email" autoComplete="email" placeholder="Optional, for order receipts" value={f.email || ''} onChange={on('email')} /></label>}
          <label>Password
            <span className="pw">
              <input required type={show ? 'text' : 'password'} minLength={reg ? 8 : 1} autoComplete={reg ? 'new-password' : 'current-password'} placeholder={reg ? '8+ characters, letters and numbers' : 'Your password'} value={f.password} onChange={on('password')} />
              <button type="button" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>
            </span>
            {reg && f.password && <span className={'pwmeter s' + strength}><i /><i /><i /><small>{['Too weak', 'Weak', 'Good', 'Strong'][strength]}</small></span>}
          </label>
        </div>
        {error && <p className="err boxed">{error}</p>}
        <button className="btn lg block" disabled={busy}>{busy ? 'Please wait...' : reg ? 'Create account' : 'Sign in'}</button>
        <p className="fine"><ShieldIcon size={13} /> Your details are encrypted and never shared.</p>
      </form>
    </div>
  );
}

export default function AuthForm(props) {
  return <Suspense fallback={null}><Form {...props} /></Suspense>;
}
