export const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export const orderNo = (o) => '#' + String(o._id).slice(-6).toUpperCase();
