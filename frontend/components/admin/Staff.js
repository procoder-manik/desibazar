'use client';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../Providers';
import { CloseIcon, EditIcon, PlusIcon, TrashIcon } from '../Icons';
import { api } from '@/lib/api';
import { fmtDate } from '@/lib/format';

// Owner only: roles (which admin sections a person can open) and the staff accounts that use them.
function RoleEditor({ role, permissions, onClose, onSaved }) {
  const { token, toast } = useApp();
  const [r, setR] = useState({ name: '', description: '', permissions: [], ...role });
  const [err, setErr] = useState('');
  const toggle = (p) => setR({ ...r, permissions: r.permissions.includes(p) ? r.permissions.filter((x) => x !== p) : [...r.permissions, p] });
  const save = async () => {
    setErr('');
    try {
      await api(role?._id ? '/staff/roles/' + role._id : '/staff/roles', { method: role?._id ? 'PUT' : 'POST', token, body: r });
      toast('Role saved'); onSaved();
    } catch (e) { setErr(e.message); }
  };
  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Edit role">
      <div className="scrim on" onClick={onClose} />
      <div className="modal editor narrow">
        <div className="modal-head"><div><span className="eyebrow">{role?._id ? 'Edit role' : 'New role'}</span><h3>{r.name || 'Untitled role'}</h3></div><button className="iconbtn" onClick={onClose} aria-label="Close"><CloseIcon /></button></div>
        <div className="modal-body">
          {err && <p className="err boxed">{err}</p>}
          <div className="fields">
            <label>Role name<input value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} placeholder="e.g. Order manager" /></label>
            <label>Description<input value={r.description || ''} onChange={(e) => setR({ ...r, description: e.target.value })} placeholder="What this person does" /></label>
          </div>
          <h4 style={{ margin: '16px 0 8px' }}>Can open</h4>
          <div className="perm-grid">
            {Object.entries(permissions).map(([k, label]) => (
              <label key={k} className={'perm' + (r.permissions.includes(k) ? ' on' : '')}>
                <input type="checkbox" checked={r.permissions.includes(k)} onChange={() => toggle(k)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <p className="fine left">Staff can never manage other staff, restore backups or change the raw head code. Those stay with the owner.</p>
        </div>
        <div className="modal-foot"><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn" onClick={save}>Save role</button></div>
      </div>
    </div>
  );
}

export default function Staff() {
  const { token, toast } = useApp();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState(null);
  const [add, setAdd] = useState({ name: '', phone: '', password: '', roleId: '' });
  const load = useCallback(() => api('/staff', { token }).then(setD).catch((e) => setErr(e.message)), [token]);
  useEffect(() => { load(); }, [load]);

  const call = async (path, opts, msg) => {
    setErr('');
    try { await api(path, { token, ...opts }); toast(msg); load(); return true; } catch (e) { setErr(e.message); return false; }
  };
  const addStaff = async (e) => {
    e.preventDefault();
    if (await call('/staff/users', { method: 'POST', body: { ...add, roleId: add.roleId || d.roles[0]?._id } }, 'Staff member added')) setAdd({ name: '', phone: '', password: '', roleId: '' });
  };
  if (!d) return err ? <p className="err boxed">{err}</p> : <div className="skel glass" />;

  return (
    <>
      {err && <p className="err boxed">{err}</p>}
      <div className="glass co-card">
        <h3>Add a staff member</h3>
        <p className="muted">They sign in at <code>/login</code> with this phone number and password and only see the sections their role allows. If the number already has a customer account, that account becomes staff (password optional).</p>
        <form className="fields four" onSubmit={addStaff}>
          <label>Name<input value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} placeholder="Rahim" /></label>
          <label>Mobile number<input required inputMode="tel" value={add.phone} onChange={(e) => setAdd({ ...add, phone: e.target.value })} placeholder="01XXXXXXXXX" /></label>
          <label>Password<input type="text" autoComplete="new-password" value={add.password} onChange={(e) => setAdd({ ...add, password: e.target.value })} placeholder="8+ letters & numbers" /></label>
          <label>Role<select value={add.roleId || d.roles[0]?._id || ''} onChange={(e) => setAdd({ ...add, roleId: e.target.value })}>{d.roles.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}</select></label>
          <div className="full"><button className="btn"><PlusIcon size={16} /> Add staff</button></div>
        </form>
      </div>

      <div className="glass co-card" style={{ marginTop: 16 }}>
        <h3>Team</h3>
        <div className="tablewrap flat">
          <table>
            <thead><tr><th>Name</th><th>Role</th><th>Last sign-in</th><th>Status</th><th /></tr></thead>
            <tbody>
              {d.staff.map((u) => (
                <tr key={u._id}>
                  <td><b>{u.name}</b><br /><small className="muted">{u.phone}</small></td>
                  <td>{u.role === 'admin' ? <span className="pill-state ok">Owner (everything)</span> : (
                    <select className="statussel" value={u.staffRole?._id || ''} onChange={(e) => call('/staff/users/' + u._id, { method: 'PATCH', body: { roleId: e.target.value } }, 'Role changed')}>
                      {d.roles.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
                    </select>
                  )}</td>
                  <td><small>{u.lastLoginAt ? fmtDate(u.lastLoginAt) : 'never'}</small></td>
                  <td>{u.role === 'admin' ? '–' : (
                    <label className="switch" title={u.active ? 'Active' : 'Switched off'}><input type="checkbox" checked={u.active} onChange={(e) => call('/staff/users/' + u._id, { method: 'PATCH', body: { active: e.target.checked } }, e.target.checked ? 'Account switched on' : 'Account switched off')} /><span /></label>
                  )}</td>
                  <td className="nowrap">{u.role !== 'admin' && <>
                    <button className="btn ghost sm" onClick={() => { const p = prompt(`New password for ${u.name} (8+ letters and numbers):`); if (p) call('/staff/users/' + u._id, { method: 'PATCH', body: { password: p } }, 'Password changed'); }}>Reset password</button>
                    <button className="iconbtn" aria-label="Remove from staff" onClick={() => confirm(`Remove ${u.name} from staff? Their account stays as a normal customer.`) && call('/staff/users/' + u._id, { method: 'DELETE' }, 'Removed from staff')}><TrashIcon size={16} /></button>
                  </>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass co-card" style={{ marginTop: 16 }}>
        <div className="row-title"><h3>Roles</h3><button className="btn sm" onClick={() => setEditing({})}><PlusIcon size={16} /> New role</button></div>
        <div className="role-grid">
          {d.roles.map((r) => (
            <div key={r._id} className="role-card">
              <div className="row-title"><b>{r.name}</b><span className="muted">{r.members} {r.members === 1 ? 'person' : 'people'}</span></div>
              {r.description && <small className="muted">{r.description}</small>}
              <div className="tagrow">{r.permissions.map((p) => <span key={p} className="chip sm">{d.permissions[p] || p}</span>)}</div>
              <div className="btnrow">
                <button className="btn ghost sm" onClick={() => setEditing(r)}><EditIcon size={15} /> Edit</button>
                <button className="iconbtn" aria-label="Delete role" onClick={() => confirm(`Delete the role "${r.name}"?`) && call('/staff/roles/' + r._id, { method: 'DELETE' }, 'Role deleted')}><TrashIcon size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {editing && <RoleEditor role={editing._id ? editing : null} permissions={d.permissions} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}
