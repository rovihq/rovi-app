import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'
import { supabase } from '../lib/supabase'

const COLORS = {
  green: '#0F6E56', teal: '#5DCAA5', dark: '#1C1C1A',
  dark2: '#2C2C2A', bg: '#F7F5F0', bg2: '#F0EDE6',
  border: '#E2E0D8', text2: '#5F5E5A', text3: '#A8A8A2',
  amber: '#EF9F27', red: '#E24B4A', green3: '#E8F7F1',
}

const Badge = ({ v, color }) => (
  <span style={{ background: color + '22', color, fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>{v}</span>
)

export default function AdminDashboard() {
  const { signOut } = useAuth()
  const [activeSection, setActiveSection] = useState('overview')
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saveMsg, setSaveMsg] = useState('')
  const [auditLog, setAuditLog] = useState([])

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const [acc, audit] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(200)
    ])
    setAccounts(acc.data || [])
    setAuditLog(audit.data || [])
    setLoading(false)
  }

  const openEdit = (account) => {
    setSelectedAccount(account)
    setEditForm({
      full_name: account.full_name || '',
      company_name: account.company_name || '',
      email: account.email || '',
      phone: account.phone || '',
      role: account.role || '',
      account_tier: account.account_tier || 'starter',
      territory: account.territory || '',
      is_active: account.is_active !== false,
      included_rep_seats: account.included_rep_seats || 3,
      per_seat_price: account.per_seat_price || 25,
    })
    setSaveMsg('')
  }

  const saveEdit = async () => {
    if (!selectedAccount) return
    const { error } = await supabase.from('profiles').update({
      full_name: editForm.full_name,
      company_name: editForm.company_name,
      phone: editForm.phone,
      role: editForm.role,
      account_tier: editForm.account_tier,
      territory: editForm.territory,
      is_active: editForm.is_active,
      included_rep_seats: editForm.account_tier === 'enterprise' ? 999 : (editForm.included_rep_seats || 3),
      per_seat_price: editForm.per_seat_price || 25,
    }).eq('id', selectedAccount.id)
    if (error) {
      setSaveMsg('Error saving — ' + error.message)
    } else {
      setSaveMsg('✓ Saved successfully')
      fetchAll()
      setTimeout(() => setSaveMsg(''), 3000)
    }
  }

  const deleteAccount = async (id) => {
    if (!window.confirm('Delete this account? This cannot be undone.')) return
    await supabase.from('profiles').delete().eq('id', id)
    setSelectedAccount(null)
    fetchAll()
  }

  const suppliers = accounts.filter(a => a.role === 'supplier')
  const reps = accounts.filter(a => a.role === 'rep')
  const doctors = accounts.filter(a => a.role === 'doctor')
  const enterprise = accounts.filter(a => a.account_tier === 'enterprise')
  const mrr = suppliers.length * 299 + reps.length * 99 + enterprise.length * 700

  const sidebarItems = [
    { id: 'overview', label: '⊞ Overview' },
    { id: 'all', label: '👥 All Accounts' },
    { id: 'enterprise', label: '⭐ Enterprise', count: enterprise.length },
    { id: 'suppliers', label: '🏭 Suppliers', count: suppliers.length },
    { id: 'reps', label: '🤝 Reps', count: reps.length },
    { id: 'doctors', label: '👩‍⚕️ Doctors', count: doctors.length },
    { id: 'audit', label: '📋 Audit Log' },
  ]

  const filterAccounts = (list) => {
    if (!search) return list
    const q = search.toLowerCase()
    return list.filter(a => (a.full_name || '').toLowerCase().includes(q) || (a.company_name || '').toLowerCase().includes(q) || (a.email || '').toLowerCase().includes(q))
  }

  const AccountRow = ({ account }) => (
    <div onClick={() => openEdit(account)}
      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 0', borderBottom: `0.5px solid ${COLORS.border}`, cursor: 'pointer' }}>
      <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: account.role === 'supplier' ? COLORS.green3 : account.role === 'rep' ? '#EEEDFE' : '#FFF3E0', color: account.role === 'supplier' ? COLORS.green : '#3C3489', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>
        {(account.full_name || account.company_name || '?').charAt(0)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{account.full_name || account.company_name}</div>
        <div style={{ fontSize: '11px', color: COLORS.text3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{account.email}</div>
      </div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
        <Badge v={account.role} color={account.role === 'supplier' ? COLORS.green : account.role === 'rep' ? '#3C3489' : COLORS.amber} />
        {account.account_tier === 'enterprise' && <Badge v="Enterprise" color={COLORS.teal} />}
        {account.is_active === false && <Badge v="Inactive" color={COLORS.red} />}
      </div>
      <div style={{ fontSize: '11px', color: COLORS.text3, flexShrink: 0 }}>{new Date(account.created_at).toLocaleDateString()}</div>
    </div>
  )

  const inputStyle = { width: '100%', padding: '9px 11px', border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', fontSize: '13px', marginBottom: '8px', outline: 'none', fontFamily: 'DM Sans, sans-serif', background: 'white', boxSizing: 'border-box' }
  const labelStyle = { fontSize: '11px', color: COLORS.text3, fontWeight: '500', marginBottom: '3px', display: 'block', letterSpacing: '0.3px' }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'DM Sans, sans-serif', color: COLORS.green }}>Loading admin panel...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: COLORS.bg2, fontFamily: 'DM Sans, sans-serif' }}>

      {/* SIDEBAR */}
      <div style={{ width: '220px', background: COLORS.dark, borderRight: `0.5px solid ${COLORS.dark2}`, display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh' }}>
        <div style={{ padding: '16px 18px', borderBottom: `0.5px solid ${COLORS.dark2}` }}>
          <Logo variant="dark" height={26} />
          <div style={{ fontSize: '10px', color: '#5F5E5A', marginTop: '4px', letterSpacing: '1px', textTransform: 'uppercase' }}>Admin Panel</div>
        </div>
        <div style={{ padding: '12px 10px', flex: 1, overflowY: 'auto' }}>
          {sidebarItems.map(item => (
            <div key={item.id} onClick={() => setActiveSection(item.id)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '7px', cursor: 'pointer', marginBottom: '2px', background: activeSection === item.id ? COLORS.teal : 'transparent', color: activeSection === item.id ? COLORS.dark : '#888780', fontSize: '13px', fontWeight: activeSection === item.id ? '500' : '400' }}>
              <span>{item.label}</span>
              {item.count !== undefined && <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', color: activeSection === item.id ? COLORS.dark : '#5F5E5A', padding: '1px 7px', borderRadius: '20px' }}>{item.count}</span>}
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 18px', borderTop: `0.5px solid ${COLORS.dark2}` }}>
          <button onClick={signOut} style={{ width: '100%', padding: '9px', background: 'transparent', border: `0.5px solid #3D3D3A`, borderRadius: '7px', color: '#5F5E5A', fontSize: '13px', cursor: 'pointer' }}>Sign out</button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ marginLeft: '220px', flex: 1, padding: '24px' }}>

        {/* OVERVIEW */}
        {activeSection === 'overview' && (
          <>
            <div style={{ fontSize: '17px', fontWeight: '500', color: COLORS.dark, marginBottom: '4px' }}>Platform overview</div>
            <div style={{ fontSize: '12px', color: COLORS.text3, marginBottom: '20px' }}>Live account and revenue summary</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '20px' }}>
              {[
                { label: 'Total accounts', value: accounts.length },
                { label: 'Suppliers', value: suppliers.length },
                { label: 'Reps', value: reps.length },
                { label: 'Doctors', value: doctors.length },
              ].map((m, i) => (
                <div key={i} style={{ background: 'white', borderRadius: '9px', padding: '15px', border: `0.5px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '5px' }}>{m.label}</div>
                  <div style={{ fontSize: '28px', fontWeight: '500', color: COLORS.dark }}>{m.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '18px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '14px' }}>MRR breakdown</div>
                {[
                  { label: `Suppliers (${suppliers.length} × $299)`, value: suppliers.length * 299 },
                  { label: `Reps (${reps.length} × $99)`, value: reps.length * 99 },
                  { label: `Enterprise uplifts`, value: enterprise.length * 700 },
                ].map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `0.5px solid ${COLORS.border}` }}>
                    <span style={{ fontSize: '12px', color: COLORS.text2 }}>{m.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: '500', color: COLORS.dark }}>${m.value.toLocaleString()}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0' }}>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark }}>Total MRR</span>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: COLORS.green }}>${mrr.toLocaleString()}</span>
                </div>
              </div>

              <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '18px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '14px' }}>Enterprise accounts</div>
                {enterprise.length === 0 ? (
                  <div style={{ color: COLORS.text3, fontSize: '13px', padding: '20px', textAlign: 'center' }}>No enterprise accounts yet</div>
                ) : enterprise.map(a => (
                  <div key={a.id} onClick={() => openEdit(a)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: `0.5px solid ${COLORS.border}`, cursor: 'pointer' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark }}>{a.company_name || a.full_name}</div>
                      <div style={{ fontSize: '11px', color: COLORS.text3 }}>{a.role} · {a.email}</div>
                    </div>
                    <Badge v="⭐ Enterprise" color={COLORS.teal} />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '18px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '14px' }}>Recent sign-ups</div>
              {accounts.slice(0, 10).map(a => <AccountRow key={a.id} account={a} />)}
            </div>
          </>
        )}

        {/* ALL ACCOUNTS */}
        {activeSection === 'all' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '17px', fontWeight: '500', color: COLORS.dark }}>All accounts ({accounts.length})</div>
              <input placeholder="Search by name, company, or email..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ padding: '8px 14px', border: `0.5px solid ${COLORS.border}`, borderRadius: '8px', fontSize: '13px', width: '280px', outline: 'none' }} />
            </div>
            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px' }}>
              {filterAccounts(accounts).map(a => <AccountRow key={a.id} account={a} />)}
              {filterAccounts(accounts).length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: COLORS.text3 }}>No accounts match your search.</div>}
            </div>
          </>
        )}

        {/* ENTERPRISE */}
        {activeSection === 'enterprise' && (
          <>
            <div style={{ fontSize: '17px', fontWeight: '500', color: COLORS.dark, marginBottom: '16px' }}>Enterprise accounts ({enterprise.length})</div>
            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px' }}>
              {enterprise.map(a => <AccountRow key={a.id} account={a} />)}
              {enterprise.length === 0 && <div style={{ textAlign: 'center', padding: '60px', color: COLORS.text3 }}>No enterprise accounts yet.</div>}
            </div>
          </>
        )}

        {/* SUPPLIERS */}
        {activeSection === 'suppliers' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '17px', fontWeight: '500', color: COLORS.dark }}>Suppliers ({suppliers.length})</div>
              <input placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ padding: '8px 14px', border: `0.5px solid ${COLORS.border}`, borderRadius: '8px', fontSize: '13px', width: '240px', outline: 'none' }} />
            </div>
            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px' }}>
              {filterAccounts(suppliers).map(a => <AccountRow key={a.id} account={a} />)}
              {filterAccounts(suppliers).length === 0 && <div style={{ textAlign: 'center', padding: '60px', color: COLORS.text3 }}>No suppliers found.</div>}
            </div>
          </>
        )}

        {/* REPS */}
        {activeSection === 'reps' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '17px', fontWeight: '500', color: COLORS.dark }}>Reps ({reps.length})</div>
              <input placeholder="Search reps..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ padding: '8px 14px', border: `0.5px solid ${COLORS.border}`, borderRadius: '8px', fontSize: '13px', width: '240px', outline: 'none' }} />
            </div>
            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px' }}>
              {filterAccounts(reps).map(a => <AccountRow key={a.id} account={a} />)}
              {filterAccounts(reps).length === 0 && <div style={{ textAlign: 'center', padding: '60px', color: COLORS.text3 }}>No reps found.</div>}
            </div>
          </>
        )}

        {/* DOCTORS */}
        {activeSection === 'doctors' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '17px', fontWeight: '500', color: COLORS.dark }}>Doctors ({doctors.length})</div>
              <input placeholder="Search doctors..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ padding: '8px 14px', border: `0.5px solid ${COLORS.border}`, borderRadius: '8px', fontSize: '13px', width: '240px', outline: 'none' }} />
            </div>
            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px' }}>
              {filterAccounts(doctors).map(a => <AccountRow key={a.id} account={a} />)}
              {filterAccounts(doctors).length === 0 && <div style={{ textAlign: 'center', padding: '60px', color: COLORS.text3 }}>No doctors found.</div>}
            </div>
          </>
        )}

        {/* AUDIT LOG */}
        {activeSection === 'audit' && (
          <>
            <div style={{ fontSize: '17px', fontWeight: '500', color: COLORS.dark, marginBottom: '16px' }}>Audit Log</div>
            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px' }}>
              {auditLog.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: COLORS.text3 }}>No audit log entries found.</div>
              ) : auditLog.map((entry, i) => (
                <div key={i} style={{ display: 'flex', gap: '14px', padding: '10px 0', borderBottom: `0.5px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: '11px', color: COLORS.text3, whiteSpace: 'nowrap', minWidth: '130px' }}>{new Date(entry.created_at).toLocaleString()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: COLORS.dark }}>{entry.action}</div>
                    <div style={{ fontSize: '11px', color: COLORS.text3 }}>{entry.actor_email || entry.actor_id} · {entry.target_type}</div>
                  </div>
                  {entry.details && <div style={{ fontSize: '11px', color: COLORS.text2, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{JSON.stringify(entry.details)}</div>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* EDIT MODAL */}
      {selectedAccount && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,26,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600, padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '520px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '500', color: COLORS.dark }}>Edit account</div>
                <div style={{ fontSize: '12px', color: COLORS.text3, marginTop: '2px' }}>{selectedAccount.email}</div>
              </div>
              <button onClick={() => setSelectedAccount(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: COLORS.text3, lineHeight: 1 }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '2px' }}>
              <div>
                <label style={labelStyle}>Full name</label>
                <input style={inputStyle} value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>Company name</label>
                <input style={inputStyle} value={editForm.company_name} onChange={e => setEditForm({...editForm, company_name: e.target.value})} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '2px' }}>
              <div>
                <label style={labelStyle}>Role</label>
                <select style={inputStyle} value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})}>
                  {['supplier', 'rep', 'doctor', 'admin'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Account tier</label>
                <select style={inputStyle} value={editForm.account_tier} onChange={e => setEditForm({...editForm, account_tier: e.target.value})}>
                  {['starter', 'growth', 'enterprise'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '2px' }}>
              <div>
                <label style={labelStyle}>Phone</label>
                <input style={inputStyle} value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>Territory</label>
                <input style={inputStyle} value={editForm.territory} onChange={e => setEditForm({...editForm, territory: e.target.value})} />
              </div>
            </div>

            {(editForm.role === 'supplier' || selectedAccount.role === 'supplier') && editForm.account_tier !== 'enterprise' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '2px' }}>
                <div>
                  <label style={labelStyle}>Included rep seats</label>
                  <input type="number" style={inputStyle} value={editForm.included_rep_seats || 3} onChange={e => setEditForm({...editForm, included_rep_seats: parseInt(e.target.value)})} min="0" max="100" />
                </div>
                <div>
                  <label style={labelStyle}>Per seat price ($/mo)</label>
                  <input type="number" style={inputStyle} value={editForm.per_seat_price || 25} onChange={e => setEditForm({...editForm, per_seat_price: parseFloat(e.target.value)})} min="0" />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: COLORS.bg2, borderRadius: '8px', marginTop: '4px', marginBottom: '16px' }}>
              <input type="checkbox" id="is_active" checked={editForm.is_active} onChange={e => setEditForm({...editForm, is_active: e.target.checked})} style={{ width: '16px', height: '16px', accentColor: COLORS.green }} />
              <label htmlFor="is_active" style={{ fontSize: '13px', color: COLORS.dark, cursor: 'pointer' }}>Account is active</label>
            </div>

            {saveMsg && (
              <div style={{ padding: '10px 12px', borderRadius: '7px', fontSize: '13px', marginBottom: '12px', background: saveMsg.startsWith('✓') ? COLORS.green3 : '#FCEBEB', color: saveMsg.startsWith('✓') ? '#085041' : '#791F1F' }}>
                {saveMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
              <button onClick={() => deleteAccount(selectedAccount.id)}
                style={{ padding: '10px 16px', background: '#FCEBEB', color: COLORS.red, border: `0.5px solid #F5B7B7`, borderRadius: '7px', fontSize: '13px', cursor: 'pointer' }}>
                Delete account
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setSelectedAccount(null)}
                  style={{ padding: '10px 18px', border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', background: 'white', cursor: 'pointer', fontSize: '13px' }}>
                  Cancel
                </button>
                <button onClick={saveEdit}
                  style={{ padding: '10px 20px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                  Save changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
