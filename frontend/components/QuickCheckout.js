'use client';
import { useEffect } from 'react';
import { useApp } from './Providers';
import CheckoutForm from './CheckoutForm';
import { CloseIcon } from './Icons';

export default function QuickCheckout() {
  const { quick, setQuick } = useApp();

  useEffect(() => {
    if (!quick) return;
    const onKey = (e) => e.key === 'Escape' && setQuick(false);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [quick, setQuick]);

  if (!quick) return null;
  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Quick checkout">
      <div className="scrim on" onClick={() => setQuick(false)} />
      <div className="modal">
        <div className="modal-head">
          <div><span className="eyebrow">Quick checkout</span><h3>Complete your order</h3></div>
          <button className="iconbtn" onClick={() => setQuick(false)} aria-label="Close"><CloseIcon /></button>
        </div>
        <div className="modal-body"><CheckoutForm compact onDone={() => setQuick(false)} /></div>
      </div>
    </div>
  );
}
