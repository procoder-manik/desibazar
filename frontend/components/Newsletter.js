'use client';
import { useState } from 'react';
import { api } from '@/lib/api';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ busy: false, msg: '', ok: false });

  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true, msg: '', ok: false });
    try {
      await api('/newsletter', { method: 'POST', body: { email } });
      setEmail('');
      setState({ busy: false, msg: 'Subscribed. Use code WELCOME10 on your first order.', ok: true });
    } catch (err) { setState({ busy: false, msg: err.message, ok: false }); }
  };

  return (
    <form className="newsletter" onSubmit={submit}>
      <div className="nl-row">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email address" aria-label="Email address" />
        <button className="btn" disabled={state.busy}>{state.busy ? 'Joining...' : 'Subscribe'}</button>
      </div>
      {state.msg && <p className={state.ok ? 'ok' : 'err'}>{state.msg}</p>}
    </form>
  );
}
