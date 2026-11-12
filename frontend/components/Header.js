'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useApp } from './Providers';
import AnnouncementBar from './AnnouncementBar';
import { api, taka } from '@/lib/api';
import { BagIcon, CompareIcon, GridIcon, HeartIcon, HomeIcon, LogoMark, SearchIcon, UserIcon } from './Icons';

export function Logo({ name = 'Ghorer Bazar', tagline = 'Pure food, honestly sourced' }) {
  return (
    <Link href="/" className="logo" aria-label={`${name} home`}>
      <span className="logo-mark"><LogoMark /></span>
      <span className="logo-word">{name}<small>{tagline}</small></span>
    </Link>
  );
}

function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState([]);
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(() => api('/products?limit=5&q=' + encodeURIComponent(q.trim())).then((r) => setHits(r.items)).catch(() => {}), 220);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    const close = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const go = () => { setOpen(false); router.push('/shop?q=' + encodeURIComponent(q.trim())); };

  return (
    <div className="search-wrap" ref={box}>
      <form className="search" role="search" onSubmit={(e) => { e.preventDefault(); go(); }}>
        <SearchIcon size={18} />
        <input value={q} onFocus={() => setOpen(true)} onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          placeholder="Search honey, dates, ghee..." aria-label="Search products" />
        {q && <kbd>Enter</kbd>}
      </form>
      {open && hits.length > 0 && (
        <div className="suggest">
          {hits.map((p) => (
            <Link key={p._id} href={`/product/${p.slug}`} onClick={() => { setOpen(false); setQ(''); }}>
              <img src={p.image} alt="" />
              <span>{p.name}<small>{p.unit}</small></span>
              <b>{taka(p.salePrice || p.price)}</b>
            </Link>
          ))}
          <button onClick={go}>See all results for &quot;{q}&quot;</button>
        </div>
      )}
    </div>
  );
}

function Bar() {
  const { cart, wish, compare, user, setDrawer, settings } = useApp();
  const freeOver = settings.shipping.freeOver;
  const path = usePathname();
  const sp = useSearchParams();
  const active = sp.get('category') || '';
  const [cats, setCats] = useState([]);
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const [bump, setBump] = useState(false);
  const first = useRef(true);

  useEffect(() => { api('/categories').then(setCats).catch(() => {}); }, []);
  // little bounce on the bag whenever the count changes
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setBump(true);
    const t = setTimeout(() => setBump(false), 450);
    return () => clearTimeout(t);
  }, [count]);

  const [menu, setMenu] = useState(false);
  const isAdmin = path.startsWith('/admin');
  useEffect(() => { setMenu(false); }, [path, active]);

  return (
    <header className="header">
      <AnnouncementBar />
      <div className="wrap">
        <div className="hdr-shell">
          <div className="nav">
            <Logo name={settings.store?.name} tagline={settings.store?.tagline} />
            <SearchBox />
            <nav className="navright" aria-label="Account">
              <Link href={user ? '/account' : '/login'} className="navlink">
                <UserIcon size={19} /><span>{user ? user.name.split(' ')[0] : 'Sign in'}</span>
              </Link>
              {user?.role === 'admin' && <Link href="/admin" className="navlink"><GridIcon size={18} /><span>Dashboard</span></Link>}
              <Link href="/compare" className="iconbtn hide-sm" aria-label={`Compare, ${compare.length} items`}><CompareIcon size={19} />{compare.length > 0 && <em>{compare.length}</em>}</Link>
              <Link href="/wishlist" className="iconbtn" aria-label={`Wishlist, ${wish.length} items`}>
                <HeartIcon size={20} />{wish.length > 0 && <em>{wish.length}</em>}
              </Link>
              <button className={'iconbtn bagbtn' + (bump ? ' bump' : '')} onClick={() => setDrawer(true)} aria-label={`Bag, ${count} items`}>
                <BagIcon size={20} />{count > 0 && <em>{count > 99 ? '99+' : count}</em>}
              </button>
            </nav>
          </div>
          {!isAdmin && cats.length > 0 && (
            <nav className="catnav" aria-label="Categories">
              <div className="megawrap">
                <button className={'megabtn' + (menu ? ' on' : '')} onClick={() => setMenu(!menu)} aria-expanded={menu}><GridIcon size={16} /> Categories</button>
                {menu && (
                  <>
                    <div className="mega-scrim" onClick={() => setMenu(false)} />
                    <div className="mega">
                      {cats.map((c) => <Link key={c._id} href={`/shop?category=${c.slug}`} className={active === c.slug ? 'on' : ''}>{c.name}</Link>)}
                      <Link href="/shop" className="all">All products →</Link>
                    </div>
                  </>
                )}
              </div>
              <div className="catlinks">
                <Link href="/" className={path === '/' ? 'on' : ''}>Home</Link>
                <Link href="/shop" className={path === '/shop' && !active && !sp.get('sale') ? 'on' : ''}>Shop all</Link>
                {cats.slice(0, 6).map((c) => <Link key={c._id} href={`/shop?category=${c.slug}`} className={active === c.slug ? 'on' : ''}>{c.name}</Link>)}
                <Link href="/shop?sale=true" className={'sale' + (sp.get('sale') ? ' on' : '')}>Offers</Link>
              </div>
            </nav>
          )}
        </div>
      </div>

      <nav className="mnav" aria-label="Main">
        <Link href="/" className={path === '/' ? 'on' : ''}><HomeIcon /><span>Home</span></Link>
        <Link href="/shop" className={path === '/shop' ? 'on' : ''}><GridIcon /><span>Shop</span></Link>
        <Link href="/wishlist" className={path === '/wishlist' ? 'on' : ''}><HeartIcon /><span>Saved</span></Link>
        <button onClick={() => setDrawer(true)} className="mbag"><BagIcon />{count > 0 && <em>{count}</em>}<span>Bag</span></button>
        <Link href={user ? '/account' : '/login'} className={['/account', '/login', '/orders'].includes(path) ? 'on' : ''}><UserIcon /><span>Account</span></Link>
      </nav>
    </header>
  );
}

export default function Header() {
  return <Suspense fallback={<header className="header" />}><Bar /></Suspense>;
}
