import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import ChatPanel from '../components/ChatPanel'
import Logo from '../components/Logo'

const COLORS = {
  green: '#0F6E56', teal: '#5DCAA5', dark: '#1C1C1A',
  dark2: '#2C2C2A', bg: '#F7F5F0', bg2: '#F0EDE6',
  border: '#E2E0D8', text2: '#5F5E5A', text3: '#A8A8A2',
  amber: '#EF9F27', amber2: '#FAEEDA', red: '#E24B4A',
  green3: '#E8F7F1', purple2: '#EEEDFE', purple3: '#3C3489'
}

const Badge = ({ label, color, bg }) => (
  <span style={{ background: bg, color, fontSize: '10px', fontWeight: '500', padding: '3px 8px', borderRadius: '20px', whiteSpace: 'nowrap' }}>{label}</span>
)

const DoctorStatus = ({ lastOrderDate }) => {
  if (!lastOrderDate) return <Badge label="Never ordered" color="#791F1F" bg="#FCEBEB" />
  const days = Math.floor((Date.now() - new Date(lastOrderDate)) / 86400000)
  if (days < 14) return <Badge label="Active" color="#085041" bg="#E8F7F1" />
  if (days < 21) return <Badge label="Follow up" color="#633806" bg="#FAEEDA" />
  return <Badge label="Overdue" color="#791F1F" bg="#FCEBEB" />
}

function CommissionStatus({ repId }) {
  const [approvals, setApprovals] = useState([])
  useEffect(() => {
    if (!repId) return
    supabase.from('commission_approvals')
      .select('*, supplier:profiles!commission_approvals_supplier_id_fkey(company_name)')
      .eq('rep_id', repId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setApprovals(data || []))
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repId])
  if (approvals.length === 0) return <div style={{ color: '#A8A8A2', fontSize: '13px', textAlign: 'center', padding: '20px' }}>No commission payment records yet — your supplier will generate these monthly.</div>
  return approvals.map(a => {
    const statusMap = {
      pending: { bg: '#FAEEDA', color: '#633806', label: '⏳ Pending approval' },
      approved: { bg: '#EEEDFE', color: '#3C3489', label: '✓ Approved — payment coming' },
      paid: { bg: '#E8F7F1', color: '#085041', label: `✓ Paid via ${a.payment_method || 'bank'}` }
    }
    const s = statusMap[a.status] || statusMap.pending
    return (
      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '0.5px solid #E2E0D8' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#1C1C1A' }}>{a.supplier?.company_name}</div>
          <div style={{ fontSize: '11px', color: '#A8A8A2' }}>{a.period_start} → {a.period_end} · {a.total_orders} orders</div>
          {a.payment_reference && <div style={{ fontSize: '11px', color: '#A8A8A2' }}>Ref: {a.payment_reference}</div>}
        </div>
        <div style={{ textAlign: 'right', marginRight: '10px' }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#EF9F27' }}>${Number(a.commission_amount).toFixed(2)}</div>
          <div style={{ fontSize: '10px', color: '#A8A8A2' }}>{a.commission_rate}% rate</div>
        </div>
        <span style={{ background: s.bg, color: s.color, fontSize: '10px', fontWeight: '600', padding: '3px 9px', borderRadius: '20px', whiteSpace: 'nowrap' }}>{s.label}</span>
      </div>
    )
  })
}

export default function RepDashboard() {
  const { profile, signOut } = useAuth()
  const [activeSection, setActiveSection] = useState('dashboard')
  const [orders, setOrders] = useState([])
  const [doctors, setDoctors] = useState([])
  const [notifications, setNotifications] = useState([])
  const [showNotif, setShowNotif] = useState(false)
  const [showAddDoctor, setShowAddDoctor] = useState(false)
  const [orderFilter, setOrderFilter] = useState('All')
  const [newDoctor, setNewDoctor] = useState({ full_name: '', company_name: '', email: '', phone: '', specialty: 'Hormone / GLP-1' })
  const [loading, setLoading] = useState(true)
  const [inviteMsg, setInviteMsg] = useState('')
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [orderQty, setOrderQty] = useState(1)
  const [orderDoctor, setOrderDoctor] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [orderPlacing, setOrderPlacing] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [orderError, setOrderError] = useState('')
  const [showChat, setShowChat] = useState(false)
  const [chatContacts, setChatContacts] = useState([])
  const [chatUnread, setChatUnread] = useState(0)
  // Supplier connections
  const [mySuppliers, setMySuppliers] = useState([])
  const [allSuppliers, setAllSuppliers] = useState([])
  const [connectingSupplier, setConnectingSupplier] = useState(null)

  useEffect(() => {
    if (profile?.id) { fetchAll(); fetchChatContacts(); fetchSupplierConnections() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  const fetchAll = async () => {
    const [o, d, n, p] = await Promise.all([
      supabase.from('orders').select('*, product:products(name,category), doctor:profiles!orders_doctor_id_fkey(full_name,company_name)').eq('credited_rep_id', profile.id).order('order_date', { ascending: false }),
      supabase.from('profiles').select('*').eq('assigned_rep_id', profile.id).eq('role', 'doctor'),
      supabase.from('notifications').select('*').eq('recipient_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('products').select('*, supplier:profiles!products_supplier_id_fkey(company_name)').eq('is_active', true)
    ])
    setOrders(o.data || [])
    setDoctors(d.data || [])
    setNotifications(n.data || [])
    setProducts(p.data || [])
    setLoading(false)
  }

  const fetchChatContacts = async () => {
    const [d, s] = await Promise.all([
      supabase.from('profiles').select('id, full_name, role, company_name').eq('role', 'doctor').eq('assigned_rep_id', profile.id),
      supabase.from('profiles').select('id, full_name, role, company_name').eq('role', 'supplier')
    ])
    setChatContacts([...(d.data || []), ...(s.data || [])])
  }

  const fetchSupplierConnections = async () => {
    const { data: connections } = await supabase
      .from('rep_supplier_connections')
      .select('*, supplier:profiles!rep_supplier_connections_supplier_id_fkey(id, full_name, company_name, phone)')
      .eq('rep_id', profile.id)
      .eq('status', 'active')

    const { data: suppliers } = await supabase
      .from('profiles')
      .select('id, full_name, company_name, phone')
      .eq('role', 'supplier')

    setMySuppliers(connections || [])
    setAllSuppliers(suppliers || [])
  }

  const connectToSupplier = async (supplierId) => {
    setConnectingSupplier(supplierId)
    const { error } = await supabase.from('rep_supplier_connections').upsert({
      rep_id: profile.id,
      supplier_id: supplierId,
      status: 'active',
      connected_at: new Date().toISOString()
    }, { onConflict: 'rep_id,supplier_id' })
    if (!error) fetchSupplierConnections()
    setConnectingSupplier(null)
  }

  const disconnectFromSupplier = async (connectionId) => {
    await supabase.from('rep_supplier_connections').update({
      status: 'removed', removed_at: new Date().toISOString()
    }).eq('id', connectionId)
    fetchSupplierConnections()
  }

  const startOrOpenConversation = () => setShowChat(true)

  const inviteDoctor = async () => {
    if (!newDoctor.email || !newDoctor.full_name) return
    setInviteMsg('')
    const { error } = await supabase.auth.signUp({
      email: newDoctor.email, password: 'TempPass123!',
      options: { data: { full_name: newDoctor.full_name, company_name: newDoctor.company_name, phone: newDoctor.phone, role: 'doctor' } }
    })
    if (error) { setInviteMsg('Error: ' + error.message); return }
    const { data: newUser } = await supabase.from('profiles').select('id').eq('full_name', newDoctor.full_name).single()
    if (newUser) await supabase.from('profiles').update({ assigned_rep_id: profile.id }).eq('id', newUser.id)
    setInviteMsg('Doctor invited successfully!')
    fetchAll()
    setTimeout(() => { setShowAddDoctor(false); setInviteMsg(''); setNewDoctor({ full_name: '', company_name: '', email: '', phone: '', specialty: 'Hormone / GLP-1' }) }, 2000)
  }

  const placeOrderForDoctor = async () => {
    if (!selectedProduct || !orderDoctor || orderQty < 1) return
    setOrderPlacing(true)
    const total = Number(selectedProduct.price_per_unit) * orderQty
    const { error } = await supabase.from('orders').insert({
      product_id: selectedProduct.id, quantity: orderQty, total_price: total,
      doctor_id: orderDoctor, credited_rep_id: profile.id, supplier_id: selectedProduct.supplier_id,
      is_direct_order: false, order_date: new Date().toISOString(), notes: orderNotes, status: 'New'
    })
    if (!error) {
      setOrderSuccess(true)
      fetchAll()
      setTimeout(() => { setShowOrderModal(false); setOrderSuccess(false); setOrderQty(1); setOrderNotes(''); setOrderDoctor(''); setSelectedProduct(null); setOrderPlacing(false) }, 2000)
    } else {
      setOrderError(error.message || 'Failed to place order.')
      setOrderPlacing(false)
    }
  }

  const markAllRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('recipient_id', profile.id)
    fetchAll()
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const mtdOrders = orders.filter(o => new Date(o.order_date) >= monthStart)
  const mtdCommission = mtdOrders.reduce((s, o) => s + Number(o.total_price) * 0.08, 0)
  const directOrders = orders.filter(o => o.is_direct_order)
  const unreadCount = notifications.filter(n => !n.is_read).length
  const filteredOrders = orderFilter === 'All' ? orders : orderFilter === 'Direct' ? orders.filter(o => o.is_direct_order) : orders.filter(o => !o.is_direct_order)
  const getLastOrderDate = (doctorId) => orders.filter(o => o.doctor_id === doctorId).sort((a, b) => new Date(b.order_date) - new Date(a.order_date))[0]?.order_date
  const connectedSupplierIds = mySuppliers.map(c => c.supplier_id)
  const unconnectedSuppliers = allSuppliers.filter(s => !connectedSupplierIds.includes(s.id))

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'doctors', label: 'My Doctors', badge: doctors.filter(d => { const l = getLastOrderDate(d.id); return !l || Math.floor((Date.now() - new Date(l)) / 86400000) >= 14 }).length },
    { id: 'suppliers', label: 'My Suppliers', badge: mySuppliers.length },
    { id: 'feed', label: 'Order Feed' },
    { id: 'catalog', label: 'Browse Catalog' },
    { id: 'attainment', label: 'Attainment' },
    { id: 'commission', label: 'Commission' },
    { id: 'admin', label: '⚙ Admin' },
  ]

  const inputStyle = { width: '100%', padding: '10px 12px', border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', fontSize: '13px', marginBottom: '10px', outline: 'none', background: 'white' }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: COLORS.dark, color: COLORS.teal, fontSize: '18px' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: COLORS.bg2, fontFamily: 'DM Sans, sans-serif' }}>

      {/* SIDEBAR */}
      <div style={{ width: '220px', background: COLORS.dark, display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh' }}>
        <div style={{ padding: '20px 18px 16px', borderBottom: `0.5px solid ${COLORS.dark2}` }}>
          <Logo variant="dark" height={28} />
        </div>
        <div style={{ padding: '14px 18px', borderBottom: `0.5px solid ${COLORS.dark2}` }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: COLORS.teal, color: COLORS.dark, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '12px', marginBottom: '6px' }}>
            {profile?.full_name?.charAt(0) || 'R'}
          </div>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#F0EDE6' }}>{profile?.full_name}</div>
          <div style={{ fontSize: '11px', color: '#5F5E5A' }}>Sales rep · {profile?.territory || 'Texas'}</div>
        </div>
        <div style={{ padding: '12px 10px', flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: '10px', fontWeight: '500', color: '#5F5E5A', letterSpacing: '1px', textTransform: 'uppercase', padding: '8px 8px 4px' }}>My Territory</div>
          {sidebarItems.map(item => (
            <div key={item.id} onClick={() => setActiveSection(item.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '7px', cursor: 'pointer', marginBottom: '2px', background: activeSection === item.id ? COLORS.teal : 'transparent', color: activeSection === item.id ? COLORS.dark : '#888780', fontSize: '13px', fontWeight: activeSection === item.id ? '500' : '400' }}>
              {item.label}
              {item.badge > 0 && <span style={{ marginLeft: 'auto', background: COLORS.amber, color: COLORS.dark, fontSize: '10px', fontWeight: '600', padding: '1px 6px', borderRadius: '20px' }}>{item.badge}</span>}
            </div>
          ))}
        </div>
        <div style={{ padding: '16px 18px', borderTop: `0.5px solid ${COLORS.dark2}` }}>
          <button onClick={() => setShowChat(!showChat)} style={{ width: '100%', padding: '9px', background: showChat ? COLORS.teal : 'transparent', border: `0.5px solid #3D3D3A`, borderRadius: '7px', color: showChat ? COLORS.dark : '#5F5E5A', fontSize: '13px', cursor: 'pointer', marginBottom: '8px' }}>
            💬 Messages {chatUnread > 0 && `(${chatUnread})`}
          </button>
          <button onClick={signOut} style={{ width: '100%', padding: '9px', background: 'transparent', border: `0.5px solid #3D3D3A`, borderRadius: '7px', color: '#5F5E5A', fontSize: '13px', cursor: 'pointer' }}>Sign out</button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ marginLeft: '220px', flex: 1, padding: '24px' }}>

        {/* TOPBAR */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '17px', fontWeight: '500', color: COLORS.dark }}>
              {activeSection === 'dashboard' && `${profile?.full_name}'s territory — ${profile?.territory || 'Texas'}`}
              {activeSection === 'doctors' && 'My Doctors'}
              {activeSection === 'suppliers' && 'My Suppliers'}
              {activeSection === 'feed' && 'Order Feed'}
              {activeSection === 'catalog' && 'Browse Catalog'}
              {activeSection === 'attainment' && 'Monthly Attainment'}
              {activeSection === 'commission' && 'Commission'}
              {activeSection === 'admin' && 'Admin Panel'}
            </div>
            <div style={{ fontSize: '12px', color: COLORS.text3, marginTop: '2px' }}>{mtdOrders.length} orders credited this month</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowNotif(!showNotif)} style={{ padding: '8px 14px', background: COLORS.dark2, border: 'none', borderRadius: '20px', color: '#888780', fontSize: '12px', cursor: 'pointer' }}>
              🔔 {unreadCount > 0 && <span style={{ background: COLORS.amber, color: COLORS.dark, fontSize: '9px', fontWeight: '600', padding: '1px 5px', borderRadius: '10px', marginLeft: '4px' }}>{unreadCount}</span>}
            </button>
            {activeSection === 'doctors' && (
              <button onClick={() => setShowAddDoctor(true)} style={{ padding: '8px 16px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>+ Add doctor</button>
            )}
          </div>
        </div>

        {/* NOTIFICATIONS */}
        {showNotif && (
          <div style={{ position: 'fixed', top: '60px', right: '24px', width: '320px', background: COLORS.dark, border: `0.5px solid ${COLORS.dark2}`, borderRadius: '12px', zIndex: 500, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            <div style={{ padding: '14px 16px', borderBottom: `0.5px solid ${COLORS.dark2}`, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#F0EDE6' }}>Alerts</span>
              <div style={{ display: 'flex', gap: '12px' }}>
                <span onClick={markAllRead} style={{ fontSize: '11px', color: COLORS.teal, cursor: 'pointer' }}>Mark all read</span>
                <span onClick={() => setShowNotif(false)} style={{ color: '#5F5E5A', cursor: 'pointer' }}>×</span>
              </div>
            </div>
            {notifications.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#5F5E5A', fontSize: '13px' }}>No alerts</div>
            ) : notifications.map(n => (
              <div key={n.id} style={{ padding: '12px 16px', borderBottom: `0.5px solid ${COLORS.dark2}`, background: n.is_read ? 'transparent' : '#1E1E1C' }}>
                <div style={{ fontSize: '12px', color: '#F0EDE6', marginBottom: '2px' }}>{n.message}</div>
                <div style={{ fontSize: '11px', color: '#5F5E5A' }}>{new Date(n.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}

        {/* DASHBOARD */}
        {activeSection === 'dashboard' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '16px' }}>
              {[
                { label: 'Orders credited (MTD)', value: mtdOrders.length, delta: 'This month' },
                { label: 'Commission earned', value: `$${mtdCommission.toFixed(2)}`, delta: '8% commission rate' },
                { label: 'Active doctors', value: doctors.length, delta: 'In your territory' },
                { label: 'Connected suppliers', value: mySuppliers.length, delta: 'Supplier relationships' },
              ].map((m, i) => (
                <div key={i} style={{ background: 'white', borderRadius: '9px', padding: '15px', border: `0.5px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '5px' }}>{m.label}</div>
                  <div style={{ fontSize: '24px', fontWeight: '500', color: COLORS.dark }}>{m.value}</div>
                  <div style={{ fontSize: '11px', color: COLORS.green, marginTop: '4px' }}>{m.delta}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
              <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '500' }}>Doctor order feed</span>
                  <span onClick={() => setActiveSection('feed')} style={{ fontSize: '12px', color: COLORS.green, cursor: 'pointer' }}>View all →</span>
                </div>
                {orders.slice(0, 5).map(o => (
                  <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: `0.5px solid ${COLORS.border}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: '500', color: COLORS.dark }}>{o.doctor?.full_name}</div>
                      <div style={{ fontSize: '11px', color: COLORS.text3 }}>{o.product?.name}</div>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '500' }}>${Number(o.total_price).toFixed(2)}</div>
                    <span style={{ background: COLORS.green3, color: '#085041', fontSize: '10px', fontWeight: '500', padding: '3px 8px', borderRadius: '20px' }}>✓ Credited</span>
                  </div>
                ))}
                {orders.length === 0 && <div style={{ color: COLORS.text3, fontSize: '13px', textAlign: 'center', padding: '20px' }}>No orders yet</div>}
              </div>
              <div>
                <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '12px' }}>Monthly attainment</div>
                  {['GLP-1', 'Hormone', 'Derm'].map(cat => {
                    const pct = Math.min(orders.filter(o => o.product?.category?.includes(cat)).length * 10, 100)
                    return (
                      <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ fontSize: '12px', color: COLORS.text2, width: '60px' }}>{cat}</div>
                        <div style={{ flex: 1, height: '6px', background: COLORS.bg2, borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: pct > 60 ? COLORS.green : COLORS.amber, borderRadius: '3px' }} />
                        </div>
                        <div style={{ fontSize: '11px', color: COLORS.dark, minWidth: '30px' }}>{pct}%</div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '12px' }}>AI follow-up alerts</div>
                  {doctors.filter(d => { const l = getLastOrderDate(d.id); return !l || Math.floor((Date.now() - new Date(l)) / 86400000) >= 14 }).slice(0, 3).map(d => (
                    <div key={d.id} style={{ display: 'flex', gap: '8px', padding: '8px 10px', background: COLORS.amber2, borderRadius: '7px', marginBottom: '6px' }}>
                      <div style={{ fontSize: '12px', color: '#633806' }}><strong>{d.full_name}</strong> needs follow up</div>
                    </div>
                  ))}
                  {doctors.filter(d => { const l = getLastOrderDate(d.id); return !l || Math.floor((Date.now() - new Date(l)) / 86400000) >= 14 }).length === 0 && (
                    <div style={{ fontSize: '12px', color: '#085041', background: COLORS.green3, padding: '8px 10px', borderRadius: '7px' }}>✓ All doctors are active</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* MY DOCTORS */}
        {activeSection === 'doctors' && (
          <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px' }}>
            {doctors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: COLORS.text3 }}>
                <div style={{ fontSize: '16px', marginBottom: '8px' }}>No doctors yet</div>
                <div style={{ fontSize: '13px' }}>Click "+ Add doctor" to invite your first doctor</div>
              </div>
            ) : doctors.map(d => {
              const lastOrder = getLastOrderDate(d.id)
              const daysSince = lastOrder ? Math.floor((Date.now() - new Date(lastOrder)) / 86400000) : null
              const doctorOrders = orders.filter(o => o.doctor_id === d.id)
              return (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: `0.5px solid ${COLORS.border}` }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: COLORS.purple2, color: COLORS.purple3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>
                    {d.full_name?.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark }}>{d.full_name}</div>
                    <div style={{ fontSize: '11px', color: COLORS.text3 }}>{d.company_name} · {doctorOrders.length} orders · Last: {lastOrder ? `${daysSince}d ago` : 'Never'}</div>
                  </div>
                  <DoctorStatus lastOrderDate={lastOrder} />
                </div>
              )
            })}
          </div>
        )}

        {/* MY SUPPLIERS */}
        {activeSection === 'suppliers' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '17px', fontWeight: '500', color: COLORS.dark }}>My Suppliers</div>
              <div style={{ fontSize: '12px', color: COLORS.text3, marginTop: '2px' }}>Manage your supplier relationships and connections</div>
            </div>

            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '16px' }}>
                Connected suppliers
                <span style={{ marginLeft: '8px', background: COLORS.green3, color: '#085041', fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>{mySuppliers.length} active</span>
              </div>
              {mySuppliers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: COLORS.text3, fontSize: '13px' }}>
                  No supplier connections yet — connect to a supplier below
                </div>
              ) : mySuppliers.map(conn => {
                const s = conn.supplier
                const supplierOrders = orders.filter(o => o.product?.supplier_id === conn.supplier_id)
                const supplierRevenue = supplierOrders.reduce((sum, o) => sum + Number(o.total_price), 0)
                return (
                  <div key={conn.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 0', borderBottom: `0.5px solid ${COLORS.border}` }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: COLORS.green3, color: COLORS.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '600', flexShrink: 0 }}>
                      {s?.company_name?.charAt(0) || s?.full_name?.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: COLORS.dark }}>{s?.company_name || s?.full_name}</div>
                        <span style={{ background: COLORS.green3, color: '#085041', fontSize: '10px', fontWeight: '600', padding: '2px 7px', borderRadius: '20px' }}>✓ Connected</span>
                      </div>
                      <div style={{ fontSize: '11px', color: COLORS.text3 }}>
                        {supplierOrders.length} orders · ${supplierRevenue.toFixed(2)} revenue · Connected {new Date(conn.connected_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => setShowChat(true)}
                        style={{ padding: '6px 12px', background: COLORS.green3, color: COLORS.green, border: `0.5px solid #9FE1CB`, borderRadius: '6px', fontSize: '11px', fontWeight: '500', cursor: 'pointer' }}>
                        💬 Message
                      </button>
                      <button onClick={() => disconnectFromSupplier(conn.id)}
                        style={{ padding: '6px 12px', background: '#FCEBEB', color: '#791F1F', border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>
                        Disconnect
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {unconnectedSuppliers.length > 0 && (
              <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>Available suppliers</div>
                <div style={{ fontSize: '12px', color: COLORS.text3, marginBottom: '16px' }}>Connect to suppliers you represent to appear in their rep network</div>
                {unconnectedSuppliers.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 0', borderBottom: `0.5px solid ${COLORS.border}` }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: COLORS.bg2, color: COLORS.text2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600', flexShrink: 0 }}>
                      {s.company_name?.charAt(0) || s.full_name?.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark }}>{s.company_name || s.full_name}</div>
                      <div style={{ fontSize: '11px', color: COLORS.text3 }}>503B Supplier</div>
                    </div>
                    <button onClick={() => connectToSupplier(s.id)} disabled={connectingSupplier === s.id}
                      style={{ padding: '7px 16px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', opacity: connectingSupplier === s.id ? 0.7 : 1 }}>
                      {connectingSupplier === s.id ? 'Connecting...' : '+ Connect'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {unconnectedSuppliers.length === 0 && mySuppliers.length > 0 && (
              <div style={{ background: COLORS.green3, border: `0.5px solid #9FE1CB`, borderRadius: '8px', padding: '14px 16px', fontSize: '13px', color: '#085041', fontWeight: '500' }}>
                ✓ You're connected to all available suppliers on Rovi
              </div>
            )}
          </>
        )}

        {/* ORDER FEED */}
        {activeSection === 'feed' && (
          <>
            <div style={{ background: COLORS.green3, border: `0.5px solid #9FE1CB`, borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#085041', fontWeight: '500' }}>
              Every order below — whether placed directly by a doctor or through you — is credited to your account automatically.
            </div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
              {['All', 'Direct', 'Via rep'].map(f => (
                <button key={f} onClick={() => setOrderFilter(f)} style={{ padding: '6px 14px', borderRadius: '20px', border: `0.5px solid ${COLORS.border}`, background: orderFilter === f ? COLORS.dark : 'white', color: orderFilter === f ? 'white' : COLORS.text2, fontSize: '12px', cursor: 'pointer' }}>{f}</button>
              ))}
            </div>
            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px' }}>
              {filteredOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: COLORS.text3 }}>No orders yet</div>
              ) : filteredOrders.map(o => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: `0.5px solid ${COLORS.border}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark }}>{o.doctor?.full_name}</div>
                    <div style={{ fontSize: '11px', color: COLORS.text3 }}>{o.product?.name} · Qty: {o.quantity} · {new Date(o.order_date).toLocaleDateString()}</div>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '500' }}>${Number(o.total_price).toFixed(2)}</div>
                  <span style={{ background: o.is_direct_order ? COLORS.purple2 : COLORS.green3, color: o.is_direct_order ? COLORS.purple3 : '#085041', fontSize: '10px', fontWeight: '500', padding: '3px 8px', borderRadius: '20px' }}>
                    {o.is_direct_order ? 'Direct' : 'Via rep'}
                  </span>
                  <span style={{ background: COLORS.green3, color: '#085041', fontSize: '10px', fontWeight: '500', padding: '3px 8px', borderRadius: '20px' }}>✓ Credited</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* CATALOG */}
        {activeSection === 'catalog' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '17px', fontWeight: '500', color: COLORS.dark }}>Browse Catalog</div>
              <div style={{ fontSize: '12px', color: COLORS.text3, marginTop: '2px' }}>Share these products with your doctors</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
              {products.map(p => (
                <div key={p.id} style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '18px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '500', color: COLORS.text3, letterSpacing: '0.5px', marginBottom: '6px' }}>{p.category}</div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: COLORS.dark, marginBottom: '4px' }}>{p.name}</div>
                  <div style={{ fontSize: '12px', color: COLORS.text2, marginBottom: '8px' }}>{p.description}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '500', color: COLORS.dark }}>${Number(p.price_per_unit).toFixed(2)}<span style={{ fontSize: '11px', color: COLORS.text3 }}>/unit</span></div>
                    <div style={{ fontSize: '11px', color: p.stock_quantity < 20 ? COLORS.red : p.stock_quantity < 50 ? COLORS.amber : COLORS.green, fontWeight: '500' }}>
                      {p.stock_quantity < 20 ? '⚠ Low stock' : p.stock_quantity < 50 ? '○ Limited' : '✓ In stock'}
                    </div>
                  </div>
                  <button onClick={() => { setSelectedProduct(p); setShowOrderModal(true) }}
                    style={{ width: '100%', marginTop: '12px', padding: '9px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>
                    Place order for doctor
                  </button>
                </div>
              ))}
              {products.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: COLORS.text3 }}>No products available yet</div>}
            </div>
          </>
        )}

        {/* ATTAINMENT */}
        {activeSection === 'attainment' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '16px' }}>
              {[
                { label: 'Overall attainment', value: `${Math.min(mtdOrders.length * 5, 100)}%` },
                { label: 'Orders this month', value: mtdOrders.length },
                { label: 'Commission MTD', value: `$${mtdCommission.toFixed(2)}` },
                { label: 'Active doctors', value: doctors.length },
              ].map((m, i) => (
                <div key={i} style={{ background: 'white', borderRadius: '9px', padding: '15px', border: `0.5px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '5px' }}>{m.label}</div>
                  <div style={{ fontSize: '24px', fontWeight: '500', color: COLORS.dark }}>{m.value}</div>
                </div>
              ))}
            </div>
            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '16px' }}>Attainment by category</div>
              {['GLP-1', 'Hormone', 'Dermatology', 'Other'].map(cat => {
                const pct = Math.min(orders.filter(o => o.product?.category === cat).length * 10, 100)
                return (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '13px', color: COLORS.text2, width: '100px' }}>{cat}</div>
                    <div style={{ flex: 1, height: '10px', background: COLORS.bg2, borderRadius: '5px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: pct > 60 ? COLORS.green : COLORS.amber, borderRadius: '5px' }} />
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark, minWidth: '40px' }}>{pct}%</div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* COMMISSION */}
        {activeSection === 'commission' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '16px' }}>
              {[
                { label: 'Earned this month', value: `$${mtdCommission.toFixed(2)}` },
                { label: 'From direct orders', value: `$${(directOrders.reduce((s, o) => s + Number(o.total_price), 0) * 0.08).toFixed(2)}` },
                { label: 'Total orders value', value: `$${orders.reduce((s, o) => s + Number(o.total_price), 0).toFixed(2)}` },
                { label: 'All time commission', value: `$${(orders.reduce((s, o) => s + Number(o.total_price), 0) * 0.08).toFixed(2)}` },
              ].map((m, i) => (
                <div key={i} style={{ background: 'white', borderRadius: '9px', padding: '15px', border: `0.5px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '5px' }}>{m.label}</div>
                  <div style={{ fontSize: '24px', fontWeight: '500', color: COLORS.dark }}>{m.value}</div>
                </div>
              ))}
            </div>
            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '14px' }}>Commission by order</div>
              {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: COLORS.text3 }}>No orders yet</div>
              ) : orders.map(o => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: `0.5px solid ${COLORS.border}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark }}>{o.doctor?.full_name} — {o.product?.name}</div>
                    <div style={{ fontSize: '11px', color: COLORS.text3 }}>{new Date(o.order_date).toLocaleDateString()}</div>
                  </div>
                  <div style={{ fontSize: '13px', color: COLORS.text2 }}>${Number(o.total_price).toFixed(2)}</div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.green }}>${(Number(o.total_price) * 0.08).toFixed(2)}</div>
                </div>
              ))}
            </div>

            {/* Commission approval status */}
            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px', marginTop: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '14px' }}>Payment status from supplier</div>
              <CommissionStatus repId={profile?.id} />
            </div>
          </>
        )}

        {/* ADMIN */}
        {activeSection === 'admin' && (
          <>
            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '20px', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '16px' }}>Territory settings</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Rep name', value: profile?.full_name },
                  { label: 'Territory', value: profile?.territory || 'Not set' },
                  { label: 'Company', value: profile?.company_name },
                  { label: 'Active doctors', value: doctors.length },
                  { label: 'Connected suppliers', value: mySuppliers.length },
                ].map((m, i) => (
                  <div key={i}>
                    <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '4px' }}>{m.label}</div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: COLORS.dark }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '20px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500' }}>Doctor management</div>
                <button onClick={() => setShowAddDoctor(true)} style={{ padding: '7px 14px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>+ Add doctor</button>
              </div>
              {doctors.map(d => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: `0.5px solid ${COLORS.border}` }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: COLORS.purple2, color: COLORS.purple3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600' }}>{d.full_name?.charAt(0)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark }}>{d.full_name}</div>
                    <div style={{ fontSize: '11px', color: COLORS.text3 }}>{d.company_name}</div>
                  </div>
                  <button onClick={() => startOrOpenConversation(d.id)} style={{ padding: '6px 12px', background: COLORS.green3, color: COLORS.green, border: `0.5px solid #9FE1CB`, borderRadius: '6px', fontSize: '11px', fontWeight: '500', cursor: 'pointer' }}>💬 Message</button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ORDER MODAL */}
        {showOrderModal && selectedProduct && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,26,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600 }}>
            <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '440px', maxWidth: '90vw' }}>
              {orderSuccess ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
                  <div style={{ fontSize: '16px', fontWeight: '500' }}>Order placed!</div>
                  <div style={{ fontSize: '13px', color: COLORS.text2, marginTop: '6px' }}>Credited to your account automatically.</div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>Place order for doctor</div>
                  <div style={{ fontSize: '13px', color: COLORS.text2, marginBottom: '20px' }}>Credited to your account automatically.</div>
                  <div style={{ background: COLORS.bg2, borderRadius: '8px', padding: '12px 14px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500' }}>{selectedProduct.name}</div>
                    <div style={{ fontSize: '12px', color: COLORS.text2, marginTop: '2px' }}>${Number(selectedProduct.price_per_unit).toFixed(2)}/unit</div>
                  </div>
                  <select value={orderDoctor} onChange={e => setOrderDoctor(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', fontSize: '13px', outline: 'none', background: 'white', marginBottom: '12px' }}>
                    <option value="">Choose a doctor...</option>
                    {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name} — {d.company_name}</option>)}
                  </select>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <button onClick={() => setOrderQty(Math.max(1, orderQty - 1))} style={{ width: '32px', height: '32px', border: `0.5px solid ${COLORS.border}`, borderRadius: '6px', background: 'white', cursor: 'pointer' }}>−</button>
                    <span style={{ fontSize: '18px', fontWeight: '500', minWidth: '30px', textAlign: 'center' }}>{orderQty}</span>
                    <button onClick={() => setOrderQty(orderQty + 1)} style={{ width: '32px', height: '32px', border: `0.5px solid ${COLORS.border}`, borderRadius: '6px', background: 'white', cursor: 'pointer' }}>+</button>
                    <div style={{ marginLeft: 'auto', fontSize: '16px', fontWeight: '500' }}>${(Number(selectedProduct.price_per_unit) * orderQty).toFixed(2)}</div>
                  </div>
                  <input placeholder="Notes (optional)" value={orderNotes} onChange={e => setOrderNotes(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', fontSize: '13px', marginBottom: '12px', outline: 'none' }} />
                  {orderError && <div style={{ background: '#FCEBEB', color: '#791F1F', borderRadius: '7px', padding: '10px 12px', fontSize: '12px', marginBottom: '12px' }}>{orderError}</div>}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => { setShowOrderModal(false); setOrderQty(1); setOrderDoctor(''); setOrderError('') }} style={{ flex: 1, padding: '11px', border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', background: 'white', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                    <button onClick={placeOrderForDoctor} disabled={!orderDoctor || orderPlacing} style={{ flex: 2, padding: '11px', background: !orderDoctor ? COLORS.border : COLORS.green, color: !orderDoctor ? COLORS.text3 : 'white', border: 'none', borderRadius: '7px', cursor: orderDoctor ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: '500' }}>
                      {orderPlacing ? 'Placing...' : 'Place order'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ADD DOCTOR MODAL */}
        {showAddDoctor && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,26,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600 }}>
            <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '420px', maxWidth: '90vw' }}>
              <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '6px' }}>Add doctor to territory</div>
              <div style={{ fontSize: '13px', color: COLORS.text2, marginBottom: '20px' }}>All their orders will be credited to you automatically.</div>
              {inviteMsg && <div style={{ padding: '10px 12px', background: inviteMsg.includes('Error') ? '#FCEBEB' : COLORS.green3, color: inviteMsg.includes('Error') ? '#791F1F' : '#085041', borderRadius: '7px', fontSize: '13px', marginBottom: '12px' }}>{inviteMsg}</div>}
              <input style={inputStyle} placeholder="Doctor name" value={newDoctor.full_name} onChange={e => setNewDoctor({ ...newDoctor, full_name: e.target.value })} />
              <input style={inputStyle} placeholder="Practice / clinic name" value={newDoctor.company_name} onChange={e => setNewDoctor({ ...newDoctor, company_name: e.target.value })} />
              <input style={inputStyle} type="email" placeholder="Email address" value={newDoctor.email} onChange={e => setNewDoctor({ ...newDoctor, email: e.target.value })} />
              <input style={inputStyle} type="tel" placeholder="Phone number" value={newDoctor.phone} onChange={e => setNewDoctor({ ...newDoctor, phone: e.target.value })} />
              <select style={inputStyle} value={newDoctor.specialty} onChange={e => setNewDoctor({ ...newDoctor, specialty: e.target.value })}>
                {['Hormone / GLP-1', 'Med spa', 'Dermatology', 'Primary care', 'Other'].map(s => <option key={s}>{s}</option>)}
              </select>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowAddDoctor(false)} style={{ padding: '10px 20px', border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', background: 'white', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                <button onClick={inviteDoctor} style={{ padding: '10px 20px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>Send invite</button>
              </div>
            </div>
          </div>
        )}

        <ChatPanel isOpen={showChat} onClose={() => setShowChat(false)} contacts={chatContacts} onUnreadCount={setChatUnread} />
      </div>
    </div>
  )
}
