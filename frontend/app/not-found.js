import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="empty glass notfound">
      <span className="big404">404</span>
      <h3>This page wandered off</h3>
      <p>The page you are looking for does not exist or has moved.</p>
      <div className="btnrow"><Link href="/" className="btn">Go home</Link><Link href="/shop" className="btn ghost">Browse shop</Link></div>
    </div>
  );
}
