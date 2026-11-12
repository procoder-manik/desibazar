'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from './Providers';
import { CloseIcon, CompareIcon } from './Icons';

export default function CompareBar() {
  const { compare, toggleCompare, setCompare } = useApp();
  const path = usePathname();
  if (!compare.length || path === '/compare' || path.startsWith('/admin')) return null;
  return (
    <div className="cmpbar">
      <CompareIcon size={18} />
      <div className="cmp-items">
        {compare.map((p) => (
          <span key={p._id} className="cmp-chip"><img src={p.image} alt="" /><button onClick={() => toggleCompare(p)} aria-label={`Remove ${p.name}`}><CloseIcon size={12} /></button></span>
        ))}
      </div>
      <Link href="/compare" className="btn sm">Compare {compare.length}</Link>
      <button className="textaction" onClick={() => setCompare([])}>Clear</button>
    </div>
  );
}
