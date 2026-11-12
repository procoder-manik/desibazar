'use client';
import Link from 'next/link';
import { useApp } from '@/components/Providers';
import CheckoutForm from '@/components/CheckoutForm';
import { CheckIcon } from '@/components/Icons';

export default function Checkout() {
  const { ready } = useApp();
  if (!ready) return null;
  return (
    <div className="checkout">
      <div className="crumbs"><Link href="/cart">Bag</Link><span>/</span><b>Checkout</b></div>
      <div className="steps"><span className="done"><CheckIcon size={13} /> Bag</span><i /><span className="on">2 Details & payment</span><i /><span>3 Confirmation</span></div>
      <CheckoutForm />
    </div>
  );
}
