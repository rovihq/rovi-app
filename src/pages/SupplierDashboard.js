import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import ChatPanel from '../components/ChatPanel'
import Logo from '../components/Logo'
import EnterprisePanel from '../components/EnterprisePanel'

const COLORS = {
  green: '#0F6E56', teal: '#5DCAA5', dark: '#1C1C1A',
  dark2: '#2C2C2A', bg: '#F7F5F0', bg2: '#F0EDE6',
  border: '#E2E0D8', text2: '#5F5E5A', text3: '#A8A8A2',
  amber: '#EF9F27', amber2: '#FAEEDA', red: '#E24B4A',
  green3: '#E8F7F1', blue2: '#E6F1FB'
}

const Badge = ({ status }) => {
  const colors = {
    New: { bg: '#E8F7F1', color: '#085041' },
    Processing: { bg: '#FAEEDA', color: '#633806' },
    Shipped: { bg: '#E6F1FB', color: '#0C447C' },
    Delivered: { bg: '#E8E8E8', color: '#5F5E5A' },
  }
  const c = colors[status] || colors.New
  return <span style={{ background: c.bg, color: c.color, fontSize: '10px', fontWeight: '500', padding: '3px 8px', borderRadius: '20px' }}>{status}</span>
}

const StockBar = ({ quantity }) => {
  const pct = Math.min((quantity / 400) * 100, 100)
  const color = pct > 50 ? '#1D9E75' : pct > 20 ? '#EF9F27' : '#E24B4A'
  return (
    <div style={{ width: '80px', height: '5px', background: '#E2E0D8', borderRadius: '3px', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '3px' }} />
    </div>
  )
}

function ConnectedReps({ supplierId, onMessage }) {
  const [reps, setReps] = useState([])
  useEffect(() => {
    if (!supplierId) return
    supabase.from('profiles').select('id,full_name,company_name,territory')
      .eq('role', 'rep').then(({ data }) => setReps(data || []))
  }, [supplierId])
  if (reps.length === 0) return <div style={{ color: '#A8A8A2', fontSize: '13px', padding: '20px', textAlign: 'center' }}>No reps connected yet</div>
  return reps.map(r => (
    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '0.5px solid #E2E0D8' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#EEEDFE', color: '#3C3489', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600' }}>{r.full_name?.charAt(0)}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: '500', color: '#1C1C1A' }}>{r.full_name}</div>
        <div style={{ fontSize: '11px', color: '#A8A8A2' }}>{r.company_name} · {r.territory}</div>
      </div>
      <button onClick={onMessage} style={{ padding: '6px 12px', background: '#E8F7F1', color: '#0F6E56', border: '0.5px solid #9FE1CB', borderRadius: '6px', fontSize: '11px', fontWeight: '500', cursor: 'pointer' }}>💬 Message</button>
    </div>
  ))
}

export default function SupplierDashboard() {
  const { profile, signOut } = useAuth()
  const [activeSection, setActiveSection] = useState('overview')
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [notifications, setNotifications] = useState([])
  const [showNotif, setShowNotif] = useState(false)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [newProduct, setNewProduct] = useState({ name: '', category: 'GLP-1', description: '', price_per_unit: '', stock_quantity: '' })
  const [orderFilter, setOrderFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [showChat, setShowChat] = useState(false)
  const [chatContacts, setChatContacts] = useState([])
  const [repPerformance, setRepPerformance] = useState([])
  const [commissionRate, setCommissionRate] = useState(8)
  const [editingRate, setEditingRate] = useState(false)
  const [showAddRep, setShowAddRep] = useState(false)
  const [allRepsPool, setAllRepsPool] = useState([])
  const [showCreateRep, setShowCreateRep] = useState(false)
  const [newRep, setNewRep] = useState({ full_name: '', email: '', company_name: '', territory: '', commission_rate: 8 })
  const [creatingRep, setCreatingRep] = useState(false)
  const [repMsg, setRepMsg] = useState('')

  useEffect(() => {
    if (profile?.id) { fetchAll(); fetchChatContacts(); fetchRepPerformance() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  const fetchAll = async () => {
    if (!profile?.id) return
    const [p, o, n] = await Promise.all([
      supabase.from('products').select('*').eq('supplier_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('orders').select('*, product:products(name,category), doctor:profiles!orders_doctor_id_fkey(full_name,company_name)').eq('supplier_id', profile.id).order('order_date', { ascending: false }),
      supabase.from('notifications').select('*').eq('recipient_id', profile.id).order('created_at', { ascending: false })
    ])
    setProducts(p.data || [])
    setOrders(o.data || [])
    setNotifications(n.data || [])
    setLoading(false)
  }

  const fetchChatContacts = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, role, company_name').eq('role', 'rep')
    setChatContacts(data || [])
  }

  const fetchRepPerformance = async () => {
    if (!profile?.id) return
    const { data: reps } = await supabase.from('profiles').select('id, full_name, company_name, territory').eq('role', 'rep')
    if (!reps?.length) return
    const repData = await Promise.all(reps.map(async (rep) => {
      const { data: repOrders } = await supabase
        .from('orders')
        .select('total_price, is_direct_order, order_date, product:products(name, category)')
        .eq('credited_rep_id', rep.id)
        .eq('supplier_id', profile.id)
      const orders = repOrders || []
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const mtdOrders = orders.filter(o => new Date(o.order_date) >= monthStart)
      const prevMtdOrders = orders.filter(o => new Date(o.order_date) >= prevMonthStart && new Date(o.order_date) < monthStart)
      const totalRevenue = orders.reduce((s, o) => s + Number(o.total_price), 0)
      const mtdRevenue = mtdOrders.reduce((s, o) => s + Number(o.total_price), 0)
      const prevRevenue = prevMtdOrders.reduce((s, o) => s + Number(o.total_price), 0)
      return {
        ...rep,
        totalOrders: orders.length,
        totalRevenue,
        mtdRevenue,
        prevRevenue,
        commission: totalRevenue * (commissionRate / 100),
        mtdCommission: mtdRevenue * (commissionRate / 100),
        directOrders: orders.filter(o => o.is_direct_order).length,
        mtdOrders: mtdOrders.length,
        recentOrders: orders.slice(-3).reverse(),
        growth: prevRevenue > 0 ? (((mtdRevenue - prevRevenue) / prevRevenue) * 100).toFixed(0) : null
      }
    }))
    setRepPerformance(repData.sort((a, b) => b.totalRevenue - a.totalRevenue))
  }

  const fetchAllReps = async () => {
    const connectedIds = repPerformance.map(r => r.id)
    const { data } = await supabase.from('profiles').select('id, full_name, company_name, territory').eq('role', 'rep')
    setAllRepsPool((data || []).filter(r => !connectedIds.includes(r.id)))
  }

  const connectRep = async (repId) => {
    await supabase.from('rep_supplier_connections').upsert({
      rep_id: repId, supplier_id: profile.id, status: 'active', connected_at: new Date().toISOString()
    }, { onConflict: 'rep_id,supplier_id' })
    fetchRepPerformance()
    setShowAddRep(false)
  }

  const createAndConnectRep = async () => {
    if (!newRep.email || !newRep.full_name) return
    setCreatingRep(true)
    setRepMsg('')
    const { error } = await supabase.auth.signUp({
      email: newRep.email, password: 'TempPass123!',
      options: { data: { full_name: newRep.full_name, company_name: newRep.company_name, role: 'rep' } }
    })
    if (error) { setRepMsg('Error: ' + error.message); setCreatingRep(false); return }
    setTimeout(async () => {
      const { data: repProfile } = await supabase.from('profiles').select('id').eq('full_name', newRep.full_name).eq('role', 'rep').single()
      if (repProfile) {
        await supabase.from('profiles').update({ territory: newRep.territory, commission_rate: parseFloat(newRep.commission_rate), assigned_supplier_id: profile.id }).eq('id', repProfile.id)
        await supabase.from('rep_supplier_connections').upsert({ rep_id: repProfile.id, supplier_id: profile.id, status: 'active', connected_at: new Date().toISOString() }, { onConflict: 'rep_id,supplier_id' })
      }
      setRepMsg('Rep created!')
      fetchRepPerformance()
      setTimeout(() => { setShowCreateRep(false); setRepMsg(''); setNewRep({ full_name: '', email: '', company_name: '', territory: '', commission_rate: 8 }); setCreatingRep(false) }, 1500)
    }, 1500)
  }

  const addProduct = async () => {
    if (!newProduct.name || !newProduct.price_per_unit) return
    await supabase.from('products').insert({ ...newProduct, supplier_id: profile.id, price_per_unit: parseFloat(newProduct.price_per_unit), stock_quantity: parseInt(newProduct.stock_quantity) || 0 })
    setShowAddProduct(false)
    setNewProduct({ name: '', category: 'GLP-1', description: '', price_per_unit: '', stock_quantity: '' })
    fetchAll()
  }

  const updateOrderStatus = async (orderId, status) => {
    await supabase.from('orders').update({ status }).eq('id', orderId)
    fetchAll()
  }

  const markAllRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('recipient_id', profile.id)
    fetchAll()
  }

  const mtdOrders = orders.filter(o => new Date(o.order_date) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const mtdRevenue = mtdOrders.reduce((sum, o) => sum + Number(o.total_price), 0)
  const unreadCount = notifications.filter(n => !n.is_read).length
  const filteredOrders = orderFilter === 'All' ? orders : orders.filter(o => o.status === orderFilter)

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: '⊞' },
    { id: 'orders', label: 'Orders', icon: '≡', badge: orders.filter(o => o.status === 'New').length },
    { id: 'catalog', label: 'Catalog', icon: '+' },
    { id: 'reps', label: 'Rep Performance', icon: '📊' },
    { id: 'insights', label: 'Demand Insights', icon: '↗' },
    ...(profile?.account_tier === 'enterprise' ? [{ id: 'enterprise', label: 'Enterprise', icon: '⭐' }] : []),
    { id: 'addons', label: 'Add-ons', icon: '＋' },
    { id: 'admin', label: 'Admin', icon: '⚙' },
  ]

  const inputStyle = { width: '100%', padding: '10px 12px', border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', fontSize: '13px', marginBottom: '10px', outline: 'none', background: 'white' }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: COLORS.green, fontSize: '18px' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: COLORS.bg2, fontFamily: 'DM Sans, sans-serif' }}>

      {/* SIDEBAR */}
      <div style={{ width: '220px', background: COLORS.dark, borderRight: `0.5px solid ${COLORS.dark2}`, display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh' }}>
        <div style={{ padding: '16px 18px', borderBottom: `0.5px solid ${COLORS.dark2}` }}>
          <Logo variant="dark" height={28} />
        </div>
        <div style={{ padding: '14px 18px', borderBottom: `0.5px solid ${COLORS.dark2}` }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: COLORS.green3, color: COLORS.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '12px', marginBottom: '6px' }}>
            {profile?.company_name?.charAt(0) || 'S'}
          </div>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#F0EDE6' }}>{profile?.company_name}</div>
          <div style={{ fontSize: '11px', color: '#5F5E5A' }}>Supplier account</div>
          {profile?.account_tier === 'enterprise' && (
            <div style={{ marginTop: '4px', fontSize: '10px', color: COLORS.teal, fontWeight: '500' }}>⭐ Enterprise · Unlimited seats</div>
          )}
        </div>
        <div style={{ padding: '12px 10px', flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: '10px', fontWeight: '500', color: '#5F5E5A', letterSpacing: '1px', textTransform: 'uppercase', padding: '8px 8px 4px' }}>Main</div>
          {sidebarItems.map(item => (
            <div key={item.id} onClick={() => setActiveSection(item.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '7px', cursor: 'pointer', marginBottom: '2px', background: activeSection === item.id ? COLORS.teal : 'transparent', color: activeSection === item.id ? COLORS.dark : '#888780', fontSize: '13px', fontWeight: activeSection === item.id ? '500' : '400' }}>
              <span>{item.icon}</span>
              {item.label}
              {item.badge > 0 && <span style={{ marginLeft: 'auto', background: COLORS.amber2, color: COLORS.amber, fontSize: '10px', fontWeight: '600', padding: '1px 6px', borderRadius: '20px' }}>{item.badge}</span>}
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 18px', borderTop: `0.5px solid ${COLORS.dark2}` }}>
          <button onClick={() => setShowChat(!showChat)}
            style={{ width: '100%', padding: '9px', background: showChat ? COLORS.teal : 'transparent', border: `0.5px solid #3D3D3A`, borderRadius: '7px', color: showChat ? COLORS.dark : '#5F5E5A', fontSize: '13px', cursor: 'pointer', marginBottom: '8px' }}>
            💬 Messages
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
              {activeSection === 'overview' && `Good morning, ${profile?.company_name}`}
              {activeSection === 'orders' && 'Orders'}
              {activeSection === 'catalog' && 'Product Catalog'}
              {activeSection === 'insights' && 'Demand Insights'}
              {activeSection === 'reps' && 'Rep Performance'}
              {activeSection === 'enterprise' && 'Enterprise Management'}
              {activeSection === 'addons' && 'Add-ons'}
              {activeSection === 'admin' && 'Admin Panel'}
            </div>
            <div style={{ fontSize: '12px', color: COLORS.text3, marginTop: '2px' }}>
              {orders.filter(o => o.status === 'New').length} orders need attention
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={() => setShowNotif(!showNotif)} style={{ padding: '8px 14px', background: COLORS.dark2, border: 'none', borderRadius: '20px', color: '#888780', fontSize: '12px', cursor: 'pointer' }}>
              🔔 Alerts {unreadCount > 0 && <span style={{ background: COLORS.amber, color: COLORS.dark, fontSize: '9px', fontWeight: '600', padding: '1px 5px', borderRadius: '10px', marginLeft: '4px' }}>{unreadCount}</span>}
            </button>
            {activeSection === 'catalog' && (
              <button onClick={() => setShowAddProduct(true)} style={{ padding: '8px 16px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>+ Add product</button>
            )}
          </div>
        </div>

        {/* NOTIFICATIONS */}
        {showNotif && (
          <div style={{ position: 'fixed', top: '60px', right: '24px', width: '320px', background: COLORS.dark, border: `0.5px solid ${COLORS.dark2}`, borderRadius: '12px', zIndex: 500, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            <div style={{ padding: '14px 16px', borderBottom: `0.5px solid ${COLORS.dark2}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#F0EDE6' }}>Notifications</span>
              <div style={{ display: 'flex', gap: '12px' }}>
                <span onClick={markAllRead} style={{ fontSize: '11px', color: COLORS.teal, cursor: 'pointer' }}>Mark all read</span>
                <span onClick={() => setShowNotif(false)} style={{ color: '#5F5E5A', cursor: 'pointer' }}>×</span>
              </div>
            </div>
            {notifications.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#5F5E5A', fontSize: '13px' }}>No notifications</div>
            ) : notifications.map(n => (
              <div key={n.id} style={{ padding: '12px 16px', borderBottom: `0.5px solid ${COLORS.dark2}`, background: n.is_read ? 'transparent' : '#1E1E1C' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: n.type === 'low_stock' ? COLORS.red : n.type === 'new_order' ? COLORS.teal : COLORS.amber, marginTop: '4px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '12px', color: '#F0EDE6', marginBottom: '2px' }}>{n.message}</div>
                    <div style={{ fontSize: '11px', color: '#5F5E5A' }}>{new Date(n.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* OVERVIEW */}
        {activeSection === 'overview' && (
          <>
            {profile?.account_tier !== 'enterprise' && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '14px 18px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: COLORS.dark, marginBottom: '2px' }}>Rep seats</div>
                    <div style={{ fontSize: '11px', color: COLORS.text3 }}>
                      {repPerformance.length} of {profile?.included_rep_seats || 3} included seats used
                      {repPerformance.length > (profile?.included_rep_seats || 3) && (
                        <span style={{ color: COLORS.amber, fontWeight: '500' }}> · {repPerformance.length - (profile?.included_rep_seats || 3)} additional @ $25/mo each</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {Array.from({ length: Math.max(profile?.included_rep_seats || 3, repPerformance.length) }).map((_, i) => (
                        <div key={i} style={{ width: '20px', height: '6px', borderRadius: '3px', background: i < repPerformance.length ? (i < (profile?.included_rep_seats || 3) ? COLORS.green : COLORS.amber) : COLORS.border }} />
                      ))}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: repPerformance.length >= (profile?.included_rep_seats || 3) ? COLORS.amber : COLORS.green }}>
                      {repPerformance.length}/{profile?.included_rep_seats || 3}
                    </span>
                  </div>
                </div>
                <div style={{ background: 'linear-gradient(135deg, #1C1C1A, #2C2C2A)', border: `0.5px solid ${COLORS.teal}`, borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                      <span style={{ background: COLORS.teal, color: COLORS.dark, fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>⭐ Enterprise</span>
                      <div style={{ fontSize: '12px', fontWeight: '500', color: '#F0EDE6' }}>Unlimited reps + commission payroll + exports</div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#5F5E5A' }}>
                      {repPerformance.length >= (profile?.included_rep_seats || 3) ? `You're at your seat limit — upgrade for unlimited reps` : `$999/mo · Best value at 25+ reps · Dedicated account manager`}
                    </div>
                  </div>
                  <a href="/subscribe" style={{ padding: '8px 16px', background: COLORS.teal, color: COLORS.dark, border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap', marginLeft: '16px' }}>
                    Upgrade → $999/mo
                  </a>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '16px' }}>
              {[
                { label: 'Orders this month', value: mtdOrders.length, delta: 'This month' },
                { label: 'Revenue (MTD)', value: `$${mtdRevenue.toFixed(2)}`, delta: 'This month' },
                { label: 'Active products', value: products.filter(p => p.is_active).length, delta: 'In catalog' },
                { label: 'Total orders', value: orders.length, delta: 'All time' },
              ].map((m, i) => (
                <div key={i} style={{ background: 'white', borderRadius: '9px', padding: '15px', border: `0.5px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '5px' }}>{m.label}</div>
                  <div style={{ fontSize: '24px', fontWeight: '500', color: COLORS.dark }}>{m.value}</div>
                  <div style={{ fontSize: '11px', color: COLORS.green, marginTop: '4px' }}>{m.delta}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '500' }}>Recent orders</span>
                  <span onClick={() => setActiveSection('orders')} style={{ fontSize: '12px', color: COLORS.green, cursor: 'pointer' }}>View all →</span>
                </div>
                {orders.slice(0, 5).map(o => (
                  <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: `0.5px solid ${COLORS.border}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: '500', color: COLORS.dark }}>{o.doctor?.company_name || o.doctor?.full_name}</div>
                      <div style={{ fontSize: '11px', color: COLORS.text3 }}>{o.product?.name}</div>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '500' }}>${Number(o.total_price).toFixed(2)}</div>
                    <Badge status={o.status} />
                  </div>
                ))}
                {orders.length === 0 && <div style={{ color: COLORS.text3, fontSize: '13px', textAlign: 'center', padding: '20px' }}>No orders yet</div>}
              </div>
              <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '500' }}>Catalog inventory</span>
                  <span onClick={() => setActiveSection('catalog')} style={{ fontSize: '12px', color: COLORS.green, cursor: 'pointer' }}>Manage →</span>
                </div>
                {products.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: `0.5px solid ${COLORS.border}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: '500', color: COLORS.dark }}>{p.name}</div>
                      <div style={{ fontSize: '11px', color: COLORS.text3 }}>{p.stock_quantity} units</div>
                    </div>
                    <StockBar quantity={p.stock_quantity} />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '14px' }}>AI demand alerts</div>
              {products.filter(p => p.stock_quantity < 50).map(p => (
                <div key={p.id} style={{ display: 'flex', gap: '10px', padding: '10px 12px', background: p.stock_quantity < 20 ? '#FCEBEB' : COLORS.amber2, borderRadius: '8px', marginBottom: '6px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.stock_quantity < 20 ? COLORS.red : COLORS.amber, marginTop: '5px', flexShrink: 0 }} />
                  <div style={{ fontSize: '12px', color: p.stock_quantity < 20 ? '#791F1F' : '#633806' }}>
                    <strong>{p.name}</strong> is {p.stock_quantity < 20 ? 'critically' : 'running'} low ({p.stock_quantity} units). Consider restocking.
                  </div>
                </div>
              ))}
              {products.filter(p => p.stock_quantity < 50).length === 0 && (
                <div style={{ padding: '10px 12px', background: COLORS.green3, borderRadius: '8px', fontSize: '12px', color: '#085041' }}>✓ All products are well stocked</div>
              )}
            </div>
          </>
        )}

        {/* ORDERS */}
        {activeSection === 'orders' && (
          <>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
              {['All', 'New', 'Processing', 'Shipped', 'Delivered'].map(f => (
                <button key={f} onClick={() => setOrderFilter(f)}
                  style={{ padding: '6px 14px', borderRadius: '20px', border: `0.5px solid ${COLORS.border}`, background: orderFilter === f ? COLORS.dark : 'white', color: orderFilter === f ? 'white' : COLORS.text2, fontSize: '12px', cursor: 'pointer' }}>
                  {f}
                </button>
              ))}
            </div>
            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px' }}>
              {filteredOrders.length === 0 ? (
                <div style={{ textAlign: 'center', color: COLORS.text3, padding: '40px' }}>No orders found</div>
              ) : filteredOrders.map(o => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: `0.5px solid ${COLORS.border}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark }}>{o.doctor?.company_name || o.doctor?.full_name}</div>
                    <div style={{ fontSize: '11px', color: COLORS.text3 }}>{o.product?.name} · Qty: {o.quantity} · {new Date(o.order_date).toLocaleDateString()}</div>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '500' }}>${Number(o.total_price).toFixed(2)}</div>
                  <select value={o.status} onChange={e => updateOrderStatus(o.id, e.target.value)}
                    style={{ padding: '5px 8px', border: `0.5px solid ${COLORS.border}`, borderRadius: '6px', fontSize: '12px', cursor: 'pointer', background: 'white' }}>
                    {['New', 'Processing', 'Shipped', 'Delivered'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </>
        )}

        {/* CATALOG */}
        {activeSection === 'catalog' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px' }}>
            {products.map(p => (
              <div key={p.id} style={{ background: 'white', border: `0.5px solid ${p.stock_quantity < 20 ? COLORS.red : COLORS.border}`, borderRadius: '10px', padding: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark, marginBottom: '4px' }}>{p.name}</div>
                <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '10px' }}>{p.category} · ${Number(p.price_per_unit).toFixed(2)}/unit</div>
                <StockBar quantity={p.stock_quantity} />
                <div style={{ fontSize: '11px', color: p.stock_quantity < 20 ? COLORS.red : COLORS.text3, marginTop: '5px', marginBottom: '12px' }}>
                  {p.stock_quantity} units {p.stock_quantity < 20 ? '— CRITICAL' : p.stock_quantity < 50 ? '— Low' : ''}
                </div>
                <div style={{ fontSize: '12px', color: COLORS.text2, lineHeight: '1.5' }}>{p.description}</div>
              </div>
            ))}
            {products.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: COLORS.text3 }}>No products yet. Click "+ Add product" above.</div>}
          </div>
        )}

        {/* REP PERFORMANCE */}
        {activeSection === 'reps' && (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '17px', fontWeight: '500', color: COLORS.dark }}>Rep Performance</div>
                <div style={{ fontSize: '12px', color: COLORS.text3, marginTop: '2px' }}>Revenue, commissions, and order activity across your rep network</div>
                {profile?.account_tier !== 'enterprise' && (
                  <div style={{ marginTop: '6px', fontSize: '12px', color: repPerformance.length >= (profile?.included_rep_seats || 3) ? COLORS.amber : COLORS.text3, fontWeight: repPerformance.length >= (profile?.included_rep_seats || 3) ? '500' : '400' }}>
                    {repPerformance.length} of {profile?.included_rep_seats || 3} rep seats used
                    {repPerformance.length >= (profile?.included_rep_seats || 3) && ' · At seat limit'}
                  </div>
                )}
                {profile?.account_tier === 'enterprise' && (
                  <div style={{ marginTop: '6px', fontSize: '12px', color: COLORS.teal }}>⭐ Enterprise · {repPerformance.length} reps · Unlimited seats</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { fetchAllReps(); setShowAddRep(true) }}
                  style={{ padding: '8px 16px', background: COLORS.bg2, color: COLORS.text2, border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  + Connect existing rep
                </button>
                <button onClick={() => setShowCreateRep(true)}
                  style={{ padding: '8px 16px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  + Create new rep
                </button>
              </div>
            </div>

            <div style={{ background: '#FFF9F0', border: `0.5px solid #FAC775`, borderRadius: '10px', padding: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#633806', marginBottom: '2px' }}>Commission rate</div>
                <div style={{ fontSize: '12px', color: '#7A4506' }}>Applied to all orders credited to each rep</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {editingRate ? (
                  <>
                    <input type="number" value={commissionRate} onChange={e => setCommissionRate(Number(e.target.value))}
                      style={{ width: '60px', padding: '6px 10px', border: `0.5px solid #FAC775`, borderRadius: '6px', fontSize: '14px', fontWeight: '500', textAlign: 'center', outline: 'none' }} />
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#633806' }}>%</span>
                    <button onClick={() => { setEditingRate(false); fetchRepPerformance() }}
                      style={{ padding: '6px 14px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>Save</button>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '22px', fontWeight: '600', color: COLORS.amber }}>{commissionRate}%</span>
                    <button onClick={() => setEditingRate(true)}
                      style={{ padding: '6px 14px', background: COLORS.amber2, color: '#633806', border: `0.5px solid #FAC775`, borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Edit rate</button>
                  </>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '16px' }}>
              {[
                { label: 'Total reps', value: repPerformance.length },
                { label: 'Total rep-driven revenue', value: `$${repPerformance.reduce((s,r) => s+r.totalRevenue,0).toFixed(2)}` },
                { label: 'Total commissions owed', value: `$${repPerformance.reduce((s,r) => s+r.commission,0).toFixed(2)}`, highlight: true },
                { label: 'Orders this month', value: repPerformance.reduce((s,r) => s+r.mtdOrders,0) },
              ].map((m,i) => (
                <div key={i} style={{ background: 'white', borderRadius: '9px', padding: '15px', border: `0.5px solid ${m.highlight ? '#FAC775' : COLORS.border}` }}>
                  <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '5px' }}>{m.label}</div>
                  <div style={{ fontSize: '22px', fontWeight: '500', color: m.highlight ? COLORS.amber : COLORS.dark }}>{m.value}</div>
                </div>
              ))}
            </div>

            {repPerformance.length === 0 ? (
              <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '60px', textAlign: 'center', color: COLORS.text3 }}>
                No rep activity yet. Orders placed through reps will appear here.
              </div>
            ) : repPerformance.map((rep, idx) => (
              <div key={rep.id} style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '20px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#EEEDFE', color: '#3C3489', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '600', flexShrink: 0 }}>
                    {rep.full_name?.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <div style={{ fontSize: '15px', fontWeight: '500', color: COLORS.dark }}>{rep.full_name}</div>
                      {idx === 0 && rep.totalRevenue > 0 && <span style={{ background: '#FAEEDA', color: '#633806', fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>⭐ Top performer</span>}
                      {rep.growth !== null && Number(rep.growth) > 0 && <span style={{ background: COLORS.green3, color: '#085041', fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>↑ {rep.growth}% vs last month</span>}
                      {rep.growth !== null && Number(rep.growth) < 0 && <span style={{ background: '#FCEBEB', color: '#791F1F', fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>↓ {Math.abs(rep.growth)}% vs last month</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: COLORS.text3 }}>{rep.company_name} · Territory: {rep.territory || 'Not set'}</div>
                  </div>
                  <button onClick={() => setShowChat(true)}
                    style={{ padding: '7px 14px', background: COLORS.green3, color: COLORS.green, border: `0.5px solid #9FE1CB`, borderRadius: '7px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>
                    💬 Message
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '8px', marginBottom: '14px' }}>
                  {[
                    { label: 'Total orders', value: rep.totalOrders },
                    { label: 'Total revenue', value: `$${rep.totalRevenue.toFixed(2)}` },
                    { label: 'Commission owed', value: `$${rep.commission.toFixed(2)}`, amber: true },
                    { label: 'Revenue MTD', value: `$${rep.mtdRevenue.toFixed(2)}` },
                    { label: 'Direct orders', value: rep.directOrders },
                  ].map((m,i) => (
                    <div key={i} style={{ background: m.amber ? '#FFF9F0' : COLORS.bg2, borderRadius: '8px', padding: '10px 12px', border: m.amber ? `0.5px solid #FAC775` : 'none' }}>
                      <div style={{ fontSize: '10px', color: COLORS.text3, marginBottom: '4px' }}>{m.label}</div>
                      <div style={{ fontSize: '15px', fontWeight: '500', color: m.amber ? COLORS.amber : COLORS.dark }}>{m.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ background: '#FFF9F0', border: `0.5px solid #FAC775`, borderRadius: '8px', padding: '12px 14px', marginBottom: rep.recentOrders.length > 0 ? '14px' : '0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '500', color: '#633806' }}>Commission breakdown — {commissionRate}% rate</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: COLORS.amber }}>${rep.commission.toFixed(2)} total owed</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#7A4506' }}>MTD revenue: <strong>${rep.mtdRevenue.toFixed(2)}</strong> → Commission: <strong>${rep.mtdCommission.toFixed(2)}</strong></div>
                    <div style={{ fontSize: '12px', color: '#7A4506' }}>All-time revenue: <strong>${rep.totalRevenue.toFixed(2)}</strong> → Total commission: <strong>${rep.commission.toFixed(2)}</strong></div>
                  </div>
                  {rep.totalRevenue > 0 && (
                    <div style={{ marginTop: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#7A4506', marginBottom: '4px' }}>
                        <span>MTD progress</span>
                        <span>{rep.mtdRevenue > 0 ? Math.round((rep.mtdRevenue / rep.totalRevenue) * 100) : 0}% of all-time</span>
                      </div>
                      <div style={{ height: '6px', background: '#FAE0B3', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${rep.totalRevenue > 0 ? Math.min((rep.mtdRevenue / rep.totalRevenue) * 100, 100) : 0}%`, height: '100%', background: COLORS.amber, borderRadius: '3px' }} />
                      </div>
                    </div>
                  )}
                </div>

                {rep.recentOrders.length > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '500', color: COLORS.text3, letterSpacing: '0.5px', textTransform: 'uppercase', margin: '14px 0 8px' }}>Recent orders via this rep</div>
                    {rep.recentOrders.map((o, oi) => (
                      <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 0', borderBottom: `0.5px solid ${COLORS.border}` }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: o.is_direct_order ? COLORS.amber : COLORS.green, flexShrink: 0 }} />
                        <div style={{ flex: 1, fontSize: '12px', color: COLORS.dark }}>{o.product?.name}</div>
                        <div style={{ fontSize: '11px', color: COLORS.text3 }}>{new Date(o.order_date).toLocaleDateString()}</div>
                        <div style={{ fontSize: '12px', fontWeight: '500' }}>${Number(o.total_price).toFixed(2)}</div>
                        <div style={{ fontSize: '11px', fontWeight: '500', color: COLORS.green }}>${(Number(o.total_price) * commissionRate / 100).toFixed(2)} comm.</div>
                        <span style={{ fontSize: '10px', background: o.is_direct_order ? '#FAEEDA' : COLORS.green3, color: o.is_direct_order ? '#633806' : '#085041', padding: '2px 7px', borderRadius: '20px' }}>
                          {o.is_direct_order ? 'Direct' : 'Via rep'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {rep.totalOrders === 0 && <div style={{ fontSize: '12px', color: COLORS.text3, textAlign: 'center', padding: '16px 0 4px' }}>No orders yet from this rep's doctors</div>}
              </div>
            ))}

            <div style={{ background: COLORS.green3, border: `0.5px solid #9FE1CB`, borderRadius: '8px', padding: '12px 16px', fontSize: '12px', color: '#085041', lineHeight: '1.6' }}>
              <strong>Note:</strong> Commission rate is set at {commissionRate}% and applied to all orders credited to each rep — including direct orders placed by doctors. Use "Edit rate" above to adjust your commission structure.
            </div>
          </>
        )}

        {/* DEMAND INSIGHTS */}
        {activeSection === 'insights' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '16px' }}>
              {[
                { label: 'Total orders', value: orders.length },
                { label: 'Total revenue', value: `$${orders.reduce((s,o) => s+Number(o.total_price),0).toFixed(2)}` },
                { label: 'Products', value: products.length },
                { label: 'Low stock items', value: products.filter(p => p.stock_quantity < 50).length },
              ].map((m,i) => (
                <div key={i} style={{ background: 'white', borderRadius: '9px', padding: '15px', border: `0.5px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '5px' }}>{m.label}</div>
                  <div style={{ fontSize: '24px', fontWeight: '500', color: COLORS.dark }}>{m.value}</div>
                </div>
              ))}
            </div>
            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '14px' }}>Product performance</div>
              {products.map(p => {
                const productOrders = orders.filter(o => o.product_id === p.id)
                const revenue = productOrders.reduce((s,o) => s+Number(o.total_price),0)
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: `0.5px solid ${COLORS.border}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark }}>{p.name}</div>
                      <div style={{ fontSize: '11px', color: COLORS.text3 }}>{productOrders.length} orders · ${revenue.toFixed(2)} revenue</div>
                    </div>
                    <StockBar quantity={p.stock_quantity} />
                    <div style={{ fontSize: '12px', color: COLORS.text3, minWidth: '60px', textAlign: 'right' }}>{p.stock_quantity} left</div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ENTERPRISE */}
        {activeSection === 'enterprise' && profile?.account_tier === 'enterprise' && (
          <EnterprisePanel profile={profile} />
        )}

        {/* ADD-ONS */}
        {activeSection === 'addons' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', color: COLORS.text3 }}>Enhance your Rovi plan with additional features and seats</div>
            </div>

            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '14px' }}>Current plan</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: COLORS.dark }}>
                    {profile?.account_tier === 'enterprise' ? '⭐ Enterprise' : 'Supplier'} — ${profile?.account_tier === 'enterprise' ? '999' : '299'}/mo
                  </div>
                  <div style={{ fontSize: '12px', color: COLORS.text3, marginTop: '4px' }}>
                    {profile?.account_tier === 'enterprise'
                      ? 'Unlimited rep seats · Commission payroll · Priority support'
                      : `${profile?.included_rep_seats || 3} rep seats included · $${profile?.per_seat_price || 25}/mo per additional seat`}
                  </div>
                </div>
                {profile?.account_tier !== 'enterprise' && (
                  <a href="/subscribe" style={{ padding: '9px 18px', background: COLORS.green, color: 'white', borderRadius: '7px', fontSize: '13px', fontWeight: '500', textDecoration: 'none' }}>
                    Upgrade to Enterprise
                  </a>
                )}
              </div>
            </div>

            {profile?.account_tier !== 'enterprise' && (
              <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Additional rep seats</div>
                <div style={{ fontSize: '12px', color: COLORS.text3, marginBottom: '16px' }}>
                  You're using {repPerformance.length} of {profile?.included_rep_seats || 3} included seats.
                  Additional seats are billed at ${profile?.per_seat_price || 25}/mo each.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                  {[1, 3, 5].map(n => (
                    <div key={n} style={{ border: `0.5px solid ${COLORS.border}`, borderRadius: '9px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '22px', fontWeight: '600', color: COLORS.dark, marginBottom: '2px' }}>+{n} seat{n > 1 ? 's' : ''}</div>
                      <div style={{ fontSize: '13px', color: COLORS.text3, marginBottom: '12px' }}>+${n * (profile?.per_seat_price || 25)}/mo</div>
                      <a href="/subscribe" style={{ display: 'block', padding: '8px', background: COLORS.bg2, color: COLORS.green, border: `0.5px solid ${COLORS.border}`, borderRadius: '6px', fontSize: '12px', fontWeight: '500', textDecoration: 'none' }}>
                        Add seats →
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: 'linear-gradient(135deg, #1C1C1A, #2C2C2A)', border: `0.5px solid ${COLORS.teal}`, borderRadius: '10px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ background: COLORS.teal, color: COLORS.dark, fontSize: '10px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px' }}>⭐ Enterprise — $999/mo</span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: '500', color: '#F0EDE6', marginBottom: '6px' }}>Everything in Supplier, plus:</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '18px' }}>
                {['Unlimited rep seats', 'Commission payroll exports', 'Dedicated account manager', 'Priority support', 'Custom onboarding', 'Advanced analytics'].map(f => (
                  <div key={f} style={{ fontSize: '12px', color: '#A8A8A2' }}>✓ {f}</div>
                ))}
              </div>
              <a href="/subscribe" style={{ display: 'inline-block', padding: '10px 24px', background: COLORS.teal, color: COLORS.dark, borderRadius: '7px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
                Upgrade to Enterprise →
              </a>
            </div>
          </>
        )}

        {/* ADMIN */}
        {activeSection === 'admin' && (
          <>
            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '20px', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '16px' }}>Account details</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Company name', value: profile?.company_name },
                  { label: 'Account type', value: 'Supplier / 503B' },
                  { label: 'Active products', value: products.filter(p=>p.is_active).length },
                  { label: 'Total orders received', value: orders.length },
                ].map((m,i) => (
                  <div key={i}>
                    <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '4px' }}>{m.label}</div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: COLORS.dark }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '20px', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '16px' }}>Connected reps</div>
              <ConnectedReps supplierId={profile?.id} onMessage={() => setShowChat(true)} />
            </div>
            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500' }}>Product management</div>
                <button onClick={() => { setActiveSection('catalog'); setShowAddProduct(true) }}
                  style={{ padding: '7px 14px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>+ Add product</button>
              </div>
              {products.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: `0.5px solid ${COLORS.border}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark }}>{p.name}</div>
                    <div style={{ fontSize: '11px', color: COLORS.text3 }}>{p.category} · ${Number(p.price_per_unit).toFixed(2)}/unit · {p.stock_quantity} units</div>
                  </div>
                  <StockBar quantity={p.stock_quantity} />
                  <span style={{ fontSize: '11px', fontWeight: '500', color: p.is_active ? COLORS.green : COLORS.text3 }}>{p.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ADD PRODUCT MODAL */}
        {showAddProduct && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,26,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600 }}>
            <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '420px', maxWidth: '90vw' }}>
              <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '6px' }}>Add new product</div>
              <div style={{ fontSize: '13px', color: COLORS.text2, marginBottom: '20px' }}>This will appear in your catalog and be visible to connected doctors.</div>
              <input style={inputStyle} placeholder="Product name" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              <select style={inputStyle} value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                {['GLP-1','Hormone','Dermatology','Other'].map(c => <option key={c}>{c}</option>)}
              </select>
              <input style={inputStyle} placeholder="Description" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
              <input style={inputStyle} type="number" placeholder="Price per unit ($)" value={newProduct.price_per_unit} onChange={e => setNewProduct({...newProduct, price_per_unit: e.target.value})} />
              <input style={inputStyle} type="number" placeholder="Initial stock (units)" value={newProduct.stock_quantity} onChange={e => setNewProduct({...newProduct, stock_quantity: e.target.value})} />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button onClick={() => setShowAddProduct(false)} style={{ padding: '10px 20px', border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', background: 'white', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                <button onClick={addProduct} style={{ padding: '10px 20px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>Add product</button>
              </div>
            </div>
          </div>
        )}

        {/* CONNECT EXISTING REP MODAL */}
        {showAddRep && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,26,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600 }}>
            <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '460px', maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '16px', fontWeight: '500' }}>Connect existing rep</div>
                <button onClick={() => setShowAddRep(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: COLORS.text3 }}>×</button>
              </div>
              <div style={{ fontSize: '13px', color: COLORS.text2, marginBottom: '16px' }}>Select a rep from the Rovi network to connect to your account.</div>
              {allRepsPool.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: COLORS.text3, fontSize: '13px' }}>No unconnected reps found in the network.</div>
              ) : allRepsPool.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: `0.5px solid ${COLORS.border}` }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#EEEDFE', color: '#3C3489', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>
                    {r.full_name?.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark }}>{r.full_name}</div>
                    <div style={{ fontSize: '11px', color: COLORS.text3 }}>{r.company_name} · {r.territory}</div>
                  </div>
                  <button onClick={() => connectRep(r.id)}
                    style={{ padding: '6px 14px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>
                    Connect
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CREATE NEW REP MODAL */}
        {showCreateRep && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,26,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600 }}>
            <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '420px', maxWidth: '90vw' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ fontSize: '16px', fontWeight: '500' }}>Create new rep</div>
                <button onClick={() => { setShowCreateRep(false); setRepMsg('') }} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: COLORS.text3 }}>×</button>
              </div>
              <div style={{ fontSize: '13px', color: COLORS.text2, marginBottom: '20px' }}>We'll create their account and connect them to you automatically.</div>
              {repMsg && (
                <div style={{ padding: '10px 12px', borderRadius: '7px', fontSize: '13px', marginBottom: '12px', background: repMsg.startsWith('Error') ? '#FCEBEB' : COLORS.green3, color: repMsg.startsWith('Error') ? '#791F1F' : '#085041' }}>
                  {repMsg}
                </div>
              )}
              <input style={inputStyle} placeholder="Full name" value={newRep.full_name} onChange={e => setNewRep({...newRep, full_name: e.target.value})} />
              <input style={inputStyle} type="email" placeholder="Email address" value={newRep.email} onChange={e => setNewRep({...newRep, email: e.target.value})} />
              <input style={inputStyle} placeholder="Company name" value={newRep.company_name} onChange={e => setNewRep({...newRep, company_name: e.target.value})} />
              <input style={inputStyle} placeholder="Territory (e.g. Texas)" value={newRep.territory} onChange={e => setNewRep({...newRep, territory: e.target.value})} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <input style={{ ...inputStyle, marginBottom: 0, flex: 1 }} type="number" placeholder="Commission %" value={newRep.commission_rate} onChange={e => setNewRep({...newRep, commission_rate: e.target.value})} />
                <span style={{ fontSize: '13px', color: COLORS.text2, whiteSpace: 'nowrap' }}>% commission</span>
              </div>
              <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '16px' }}>They'll receive an email to set their password. Default temp password: TempPass123!</div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => { setShowCreateRep(false); setRepMsg('') }} style={{ padding: '10px 20px', border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', background: 'white', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                <button onClick={createAndConnectRep} disabled={creatingRep}
                  style={{ padding: '10px 20px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', opacity: creatingRep ? 0.6 : 1 }}>
                  {creatingRep ? 'Creating...' : 'Create rep'}
                </button>
              </div>
            </div>
          </div>
        )}

        <ChatPanel isOpen={showChat} onClose={() => setShowChat(false)} contacts={chatContacts} />
      </div>
    </div>
  )
}
