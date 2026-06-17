import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const COLORS = {
  green: '#0F6E56', teal: '#5DCAA5', dark: '#1C1C1A',
  dark2: '#2C2C2A', bg: '#F7F5F0', bg2: '#F0EDE6',
  border: '#E2E0D8', text2: '#5F5E5A', text3: '#A8A8A2',
  amber: '#EF9F27', amber2: '#FAEEDA', red: '#E24B4A',
  green3: '#E8F7F1', purple2: '#EEEDFE', purple3: '#3C3489'
}

const TierBadge = ({ tier }) => (
  <span style={{
    background: tier === 'enterprise' ? '#1C1C1A' : COLORS.green3,
    color: tier === 'enterprise' ? COLORS.teal : '#085041',
    fontSize: '10px', fontWeight: '600', padding: '3px 9px',
    borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.5px'
  }}>{tier === 'enterprise' ? '⭐ Enterprise' : 'Standard'}</span>
)

const RoleBadge = ({ role }) => {
  const map = {
    supplier: { bg: COLORS.green3, color: '#085041' },
    rep: { bg: COLORS.purple2, color: COLORS.purple3 },
    doctor: { bg: COLORS.amber2, color: '#633806' },
  }
  const c = map[role] || map.supplier
  return <span style={{ background: c.bg, color: c.color, fontSize: '10px', fontWeight: '500', padding: '2px 8px', borderRadius: '20px' }}>{role}</span>
}

export default function AdminDashboard() {
  const { signOut } = useAuth()
  const [activeSection, setActiveSection] = useState('overview')
  const [accounts, setAccounts] = useState([])
  const [auditLog, setAuditLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterTier, setFilterTier] = useState('all')
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [newAccount, setNewAccount] = useState({ email: '', password: '', full_name: '', company_name: '', role: 'supplier', account_tier: 'standard', territory: '', commission_rate: 8 })
  const [creating, setCreating] = useState(false)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const [a, al] = await Promise.all([
      supabase.from('profiles').select('*, user:id').order('created_at', { ascending: false }),
      supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(50)
    ])
    setAccounts(a.data || [])
    setAuditLog(al.data || [])
    setLoading(false)
  }

  const openEdit = (account) => {
    setSelectedAccount(account)
    setEditForm({
      full_name: account.full_name || '',
      company_name: account.company_name || '',
      role: account.role || 'supplier',
      account_tier: account.account_tier || 'standard',
      territory: account.territory || '',
      commission_rate: account.commission_rate || 8,
      notes: account.notes || '',
      is_active: account.is_active !== false,
    })
    setShowEditModal(true)
    setSaveMsg('')
  }

  const saveEdit = async () => {
    if (!selectedAccount) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      full_name: editForm.full_name,
      company_name: editForm.company_name,
      role: editForm.role,
      account_tier: editForm.account_tier,
      territory: editForm.territory,
      commission_rate: parseFloat(editForm.commission_rate),
      notes: editForm.notes,
      is_active: editForm.is_active,
      enterprise_since: editForm.account_tier === 'enterprise' && selectedAccount.account_tier !== 'enterprise' ? new Date().toISOString() : selectedAccount.enterprise_since,
    }).eq('id', selectedAccount.id)

    if (!error) {
      setSaveMsg('✓ Saved successfully')
      fetchAll()
      setTimeout(() => { setShowEditModal(false); setSaveMsg('') }, 1200)
    } else {
      setSaveMsg('Error saving · ' + error.message)
    }
    setSaving(false)
  }

  const upgradeToEnterprise = async (accountId) => {
    await supabase.from('profiles').update({ account_tier: 'enterprise', enterprise_since: new Date().toISOString() }).eq('id', accountId)
    fetchAll()
  }

  const downgradeToStandard = async (accountId) => {
    await supabase.from('profiles').update({ account_tier: 'standard' }).eq('id', accountId)
    fetchAll()
  }

  const toggleActive = async (accountId, currentStatus) => {
    await supabase.from('profiles').update({ is_active: !currentStatus }).eq('id', accountId)
    fetchAll()
  }

  const createAccount = async () => {
    if (!newAccount.email || !newAccount.password || !newAccount.full_name) return
    setCreating(true)
    const { error } = await supabase.auth.signUp({
      email: newAccount.email,
      password: newAccount.password,
      options: {
        data: {
          full_name: newAccount.full_name,
          company_name: newAccount.company_name,
          role: newAccount.role,
        }
      }
    })
    if (!error) {
      setTimeout(async () => {
        await supabase.from('profiles').update({
          account_tier: newAccount.account_tier,
          territory: newAccount.territory,
          commission_rate: parseFloat(newAccount.commission_rate),
          enterprise_since: newAccount.account_tier === 'enterprise' ? new Date().toISOString() : null
        }).eq('full_name', newAccount.full_name)
        fetchAll()
        setShowAddAccount(false)
        setNewAccount({ email: '', password: '', full_name: '', company_name: '', role: 'supplier', account_tier: 'standard', territory: '', commission_rate: 8 })
        setCreating(false)
      }, 1500)
    } else {
      setCreating(false)
      alert('Error: ' + error.message)
    }
  }

  const filtered = accounts.filter(a => {
    const matchSearch = !searchTerm || a.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || a.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchRole = filterRole === 'all' || a.role === filterRole
    const matchTier = filterTier === 'all' || a.account_tier === filterTier
    return matchSearch && matchRole && matchTier
  })

  const suppliers = accounts.filter(a => a.role === 'supplier')
  const reps = accounts.filter(a => a.role === 'rep')
  const doctors = accounts.filter(a => a.role === 'doctor')
  const enterprise = accounts.filter(a => a.account_tier === 'enterprise')

  const inputStyle = { width: '100%', padding: '10px 12px', border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', fontSize: '13px', marginBottom: '10px', outline: 'none', background: 'white', fontFamily: 'DM Sans, sans-serif' }

  const sidebarItems = [
    { id: 'overview', label: '⊞ Overview' },
    { id: 'accounts', label: '👥 All Accounts' },
    { id: 'enterprise', label: '⭐ Enterprise' },
    { id: 'suppliers', label: '🏭 Suppliers' },
    { id: 'reps', label: '🤝 Reps' },
    { id: 'doctors', label: '👩‍⚕️ Doctors' },
    { id: 'audit', label: '📋 Audit Log' },
  ]

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: COLORS.dark, color: COLORS.teal, fontSize: '18px' }}>Loading Rovi Admin...</div>

  const AccountTable = ({ data }) => (
    <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', overflow: 'hidden' }}>
      {data.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: COLORS.text3 }}>No accounts found</div>
      ) : data.map(a => (
        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', borderBottom: `0.5px solid ${COLORS.border}`, opacity: a.is_active === false ? 0.5 : 1 }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: a.role === 'supplier' ? COLORS.green3 : a.role === 'rep' ? COLORS.purple2 : COLORS.amber2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600', color: a.role === 'supplier' ? '#085041' : a.role === 'rep' ? COLORS.purple3 : '#633806', flexShrink: 0 }}>
            {a.full_name?.charAt(0) || '?'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark }}>{a.full_name || 'Unnamed'}</div>
              <RoleBadge role={a.role} />
              <TierBadge tier={a.account_tier || 'standard'} />
              {a.is_active === false && <span style={{ fontSize: '10px', background: '#FCEBEB', color: '#791F1F', padding: '2px 7px', borderRadius: '20px' }}>Inactive</span>}
            </div>
            <div style={{ fontSize: '11px', color: COLORS.text3 }}>
              {a.company_name}{a.territory ? ` · ${a.territory}` : ''} · Commission: {a.commission_rate || 8}%
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            {a.role === 'supplier' && a.account_tier !== 'enterprise' && (
              <button onClick={() => upgradeToEnterprise(a.id)}
                style={{ padding: '5px 11px', background: COLORS.dark, color: COLORS.teal, border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '500', cursor: 'pointer' }}>
                ⭐ Upgrade
              </button>
            )}
            {a.account_tier === 'enterprise' && (
              <button onClick={() => downgradeToStandard(a.id)}
                style={{ padding: '5px 11px', background: COLORS.bg2, color: COLORS.text2, border: `0.5px solid ${COLORS.border}`, borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>
                Downgrade
              </button>
            )}
            <button onClick={() => toggleActive(a.id, a.is_active !== false)}
              style={{ padding: '5px 11px', background: a.is_active === false ? COLORS.green3 : '#FCEBEB', color: a.is_active === false ? '#085041' : '#791F1F', border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>
              {a.is_active === false ? 'Activate' : 'Deactivate'}
            </button>
            <button onClick={() => openEdit(a)}
              style={{ padding: '5px 11px', background: COLORS.bg2, color: COLORS.text2, border: `0.5px solid ${COLORS.border}`, borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>
              Edit
            </button>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: COLORS.bg2, fontFamily: 'DM Sans, sans-serif' }}>

      {/* SIDEBAR */}
      <div style={{ width: '220px', background: COLORS.dark, display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh' }}>
        <div style={{ padding: '20px 18px', borderBottom: `0.5px solid ${COLORS.dark2}` }}>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#F0EDE6' }}>Rovi<span style={{ color: COLORS.teal }}>.</span></div>
          <div style={{ fontSize: '11px', color: '#5F5E5A', marginTop: '2px' }}>Admin Panel</div>
        </div>
        <div style={{ padding: '8px 10px', flex: 1 }}>
          {sidebarItems.map(item => (
            <div key={item.id} onClick={() => setActiveSection(item.id)}
              style={{ padding: '9px 10px', borderRadius: '7px', cursor: 'pointer', marginBottom: '2px', background: activeSection === item.id ? COLORS.teal : 'transparent', color: activeSection === item.id ? COLORS.dark : '#888780', fontSize: '13px', fontWeight: activeSection === item.id ? '500' : '400' }}>
              {item.label}
            </div>
          ))}
        </div>
        <div style={{ padding: '16px 18px', borderTop: `0.5px solid ${COLORS.dark2}` }}>
          <div style={{ fontSize: '11px', color: '#5F5E5A', marginBottom: '8px' }}>Rovi Internal Admin</div>
          <button onClick={signOut} style={{ width: '100%', padding: '9px', background: 'transparent', border: `0.5px solid #3D3D3A`, borderRadius: '7px', color: '#5F5E5A', fontSize: '13px', cursor: 'pointer' }}>Sign out</button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ marginLeft: '220px', flex: 1, padding: '24px' }}>

        {/* TOPBAR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '17px', fontWeight: '500', color: COLORS.dark }}>
              {activeSection === 'overview' && 'Platform Overview'}
              {activeSection === 'accounts' && 'All Accounts'}
              {activeSection === 'enterprise' && 'Enterprise Accounts'}
              {activeSection === 'suppliers' && 'Supplier Accounts'}
              {activeSection === 'reps' && 'Sales Rep Accounts'}
              {activeSection === 'doctors' && 'Doctor Accounts'}
              {activeSection === 'audit' && 'Audit Log'}
            </div>
            <div style={{ fontSize: '12px', color: COLORS.text3, marginTop: '2px' }}>{accounts.length} total accounts · {enterprise.length} enterprise</div>
          </div>
          <button onClick={() => setShowAddAccount(true)}
            style={{ padding: '9px 18px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
            + New account
          </button>
        </div>

        {/* OVERVIEW */}
        {activeSection === 'overview' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '20px' }}>
              {[
                { label: 'Total accounts', value: accounts.length, color: COLORS.dark },
                { label: 'Enterprise accounts', value: enterprise.length, color: COLORS.teal, dark: true },
                { label: 'Active suppliers', value: suppliers.filter(s => s.is_active !== false).length, color: COLORS.green },
                { label: 'Active reps', value: reps.filter(r => r.is_active !== false).length, color: '#3C3489' },
              ].map((m,i) => (
                <div key={i} style={{ background: i === 1 ? COLORS.dark : 'white', borderRadius: '9px', padding: '16px', border: `0.5px solid ${i === 1 ? COLORS.dark2 : COLORS.border}` }}>
                  <div style={{ fontSize: '11px', color: i === 1 ? '#5F5E5A' : COLORS.text3, marginBottom: '6px' }}>{m.label}</div>
                  <div style={{ fontSize: '28px', fontWeight: '500', color: m.color }}>{m.value}</div>
                </div>
              ))}
            </div>

            <div style={{ background: COLORS.dark, border: `0.5px solid ${COLORS.dark2}`, borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#F0EDE6', marginBottom: '16px' }}>Estimated MRR</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
                {[
                  { label: 'Standard suppliers', value: `$${suppliers.filter(s => s.account_tier !== 'enterprise' && s.is_active !== false).length * 299}/mo`, sub: `${suppliers.filter(s => s.account_tier !== 'enterprise' && s.is_active !== false).length} × $299` },
                  { label: 'Enterprise suppliers', value: `$${enterprise.length * 999}/mo`, sub: `${enterprise.length} × $999`, highlight: true },
                  { label: 'Rep seats', value: `$${reps.filter(r => r.is_active !== false).length * 75}/mo`, sub: `${reps.filter(r => r.is_active !== false).length} × $75` },
                  { label: 'Total MRR', value: `$${(suppliers.filter(s => s.account_tier !== 'enterprise' && s.is_active !== false).length * 299) + (enterprise.length * 999) + (reps.filter(r => r.is_active !== false).length * 75)}/mo`, sub: 'Combined', highlight: true },
                ].map((m,i) => (
                  <div key={i} style={{ background: m.highlight ? 'rgba(93,202,165,0.1)' : '#2C2C2A', borderRadius: '8px', padding: '14px', border: m.highlight ? `0.5px solid rgba(93,202,165,0.3)` : 'none' }}>
                    <div style={{ fontSize: '11px', color: '#5F5E5A', marginBottom: '5px' }}>{m.label}</div>
                    <div style={{ fontSize: '18px', fontWeight: '500', color: m.highlight ? COLORS.teal : '#F0EDE6' }}>{m.value}</div>
                    <div style={{ fontSize: '11px', color: '#5F5E5A', marginTop: '3px' }}>{m.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '14px' }}>Recent accounts</div>
              <AccountTable data={accounts.slice(0, 5)} />
            </div>
          </>
        )}

        {/* ACCOUNTS */}
        {(activeSection === 'accounts' || activeSection === 'suppliers' || activeSection === 'reps' || activeSection === 'doctors' || activeSection === 'enterprise') && (
          <>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <input placeholder="Search by name or company..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                style={{ flex: 1, minWidth: '200px', padding: '9px 14px', border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', fontSize: '13px', outline: 'none' }} />
              {activeSection === 'accounts' && (
                <>
                  <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
                    style={{ padding: '9px 14px', border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', fontSize: '13px', background: 'white', cursor: 'pointer', outline: 'none' }}>
                    <option value="all">All roles</option>
                    <option value="supplier">Suppliers</option>
                    <option value="rep">Reps</option>
                    <option value="doctor">Doctors</option>
                  </select>
                  <select value={filterTier} onChange={e => setFilterTier(e.target.value)}
                    style={{ padding: '9px 14px', border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', fontSize: '13px', background: 'white', cursor: 'pointer', outline: 'none' }}>
                    <option value="all">All tiers</option>
                    <option value="standard">Standard</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </>
              )}
            </div>
            <AccountTable data={
              activeSection === 'suppliers' ? filtered.filter(a => a.role === 'supplier') :
              activeSection === 'reps' ? filtered.filter(a => a.role === 'rep') :
              activeSection === 'doctors' ? filtered.filter(a => a.role === 'doctor') :
              activeSection === 'enterprise' ? filtered.filter(a => a.account_tier === 'enterprise') :
              filtered
            } />
          </>
        )}

        {/* AUDIT LOG */}
        {activeSection === 'audit' && (
          <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px' }}>
            {auditLog.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: COLORS.text3 }}>No audit entries yet. Account changes will appear here.</div>
            ) : auditLog.map(entry => (
              <div key={entry.id} style={{ display: 'flex', gap: '12px', padding: '12px 0', borderBottom: `0.5px solid ${COLORS.border}` }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: COLORS.teal, marginTop: '5px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark }}>{entry.action}</div>
                  <div style={{ fontSize: '11px', color: COLORS.text3 }}>{entry.notes} · {new Date(entry.created_at).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {showEditModal && selectedAccount && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,26,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 700 }}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '480px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>Edit account</div>
            <div style={{ fontSize: '13px', color: COLORS.text2, marginBottom: '20px' }}>{selectedAccount.full_name} · {selectedAccount.role}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: COLORS.text3, display: 'block', marginBottom: '4px' }}>Full name</label>
                <input style={inputStyle} value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: COLORS.text3, display: 'block', marginBottom: '4px' }}>Company name</label>
                <input style={inputStyle} value={editForm.company_name} onChange={e => setEditForm({...editForm, company_name: e.target.value})} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: COLORS.text3, display: 'block', marginBottom: '4px' }}>Role</label>
                <select style={inputStyle} value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})}>
                  <option value="supplier">Supplier</option>
                  <option value="rep">Sales Rep</option>
                  <option value="doctor">Doctor</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: COLORS.text3, display: 'block', marginBottom: '4px' }}>Account tier</label>
                <select style={{ ...inputStyle, background: editForm.account_tier === 'enterprise' ? COLORS.dark : 'white', color: editForm.account_tier === 'enterprise' ? COLORS.teal : COLORS.dark }}
                  value={editForm.account_tier} onChange={e => setEditForm({...editForm, account_tier: e.target.value})}>
                  <option value="standard">Standard</option>
                  <option value="enterprise">⭐ Enterprise</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: COLORS.text3, display: 'block', marginBottom: '4px' }}>Territory</label>
                <input style={inputStyle} value={editForm.territory} onChange={e => setEditForm({...editForm, territory: e.target.value})} placeholder="e.g. Dallas, Houston" />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: COLORS.text3, display: 'block', marginBottom: '4px' }}>Commission rate (%)</label>
                <input style={inputStyle} type="number" value={editForm.commission_rate} onChange={e => setEditForm({...editForm, commission_rate: e.target.value})} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: COLORS.text3, display: 'block', marginBottom: '4px' }}>Internal notes</label>
              <textarea style={{ ...inputStyle, height: '72px', resize: 'vertical' }} value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} placeholder="Onboarding notes, BD rep name, special terms..." />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <input type="checkbox" id="active" checked={editForm.is_active} onChange={e => setEditForm({...editForm, is_active: e.target.checked})} />
              <label htmlFor="active" style={{ fontSize: '13px', color: COLORS.dark, cursor: 'pointer' }}>Account is active</label>
            </div>
            {saveMsg && <div style={{ padding: '10px 12px', background: saveMsg.includes('Error') ? '#FCEBEB' : COLORS.green3, color: saveMsg.includes('Error') ? '#791F1F' : '#085041', borderRadius: '7px', fontSize: '13px', marginBottom: '12px' }}>{saveMsg}</div>}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowEditModal(false)} style={{ padding: '10px 20px', border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', background: 'white', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={saveEdit} disabled={saving} style={{ padding: '10px 20px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD ACCOUNT MODAL */}
      {showAddAccount && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,26,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 700 }}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '480px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>Create new account</div>
            <div style={{ fontSize: '13px', color: COLORS.text2, marginBottom: '20px' }}>Set up a new supplier, rep, or doctor account</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: COLORS.text3, display: 'block', marginBottom: '4px' }}>Full name *</label>
                <input style={inputStyle} value={newAccount.full_name} onChange={e => setNewAccount({...newAccount, full_name: e.target.value})} placeholder="Jake Martinez" />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: COLORS.text3, display: 'block', marginBottom: '4px' }}>Company name</label>
                <input style={inputStyle} value={newAccount.company_name} onChange={e => setNewAccount({...newAccount, company_name: e.target.value})} placeholder="Southwest Pharma Reps" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: COLORS.text3, display: 'block', marginBottom: '4px' }}>Email *</label>
                <input style={inputStyle} type="email" value={newAccount.email} onChange={e => setNewAccount({...newAccount, email: e.target.value})} placeholder="jake@example.com" />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: COLORS.text3, display: 'block', marginBottom: '4px' }}>Password *</label>
                <input style={inputStyle} type="password" value={newAccount.password} onChange={e => setNewAccount({...newAccount, password: e.target.value})} placeholder="Minimum 6 characters" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: COLORS.text3, display: 'block', marginBottom: '4px' }}>Role</label>
                <select style={inputStyle} value={newAccount.role} onChange={e => setNewAccount({...newAccount, role: e.target.value})}>
                  <option value="supplier">Supplier / 503B</option>
                  <option value="rep">Sales Rep</option>
                  <option value="doctor">Doctor / Clinic</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: COLORS.text3, display: 'block', marginBottom: '4px' }}>Account tier</label>
                <select style={{ ...inputStyle, background: newAccount.account_tier === 'enterprise' ? COLORS.dark : 'white', color: newAccount.account_tier === 'enterprise' ? COLORS.teal : COLORS.dark }}
                  value={newAccount.account_tier} onChange={e => setNewAccount({...newAccount, account_tier: e.target.value})}>
                  <option value="standard">Standard</option>
                  <option value="enterprise">⭐ Enterprise</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: COLORS.text3, display: 'block', marginBottom: '4px' }}>Territory</label>
                <input style={inputStyle} value={newAccount.territory} onChange={e => setNewAccount({...newAccount, territory: e.target.value})} placeholder="e.g. Dallas" />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: COLORS.text3, display: 'block', marginBottom: '4px' }}>Commission rate (%)</label>
                <input style={inputStyle} type="number" value={newAccount.commission_rate} onChange={e => setNewAccount({...newAccount, commission_rate: e.target.value})} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button onClick={() => setShowAddAccount(false)} style={{ padding: '10px 20px', border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', background: 'white', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={createAccount} disabled={creating || !newAccount.email || !newAccount.full_name}
                style={{ padding: '10px 20px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                {creating ? 'Creating...' : 'Create account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
