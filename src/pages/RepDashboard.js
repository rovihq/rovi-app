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

const Badge = ({ label, color, bg }) => (
  <span style={{ background: bg, color, fontSize: '10px', fontWeight: '500', padding: '3px 8px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
    {label}
  </span>
)

const DoctorStatus = ({ lastOrderDate }) => {
  if (!lastOrderDate) return <Badge label="Never ordered" color="#791F1F" bg="#FCEBEB" />
  const days = Math.floor((Date.now() - new Date(lastOrderDate)) / 86400000)
  if (days < 14) return <Badge label="Active" color="#085041" bg="#E8F7F1" />
  if (days < 21) return <Badge label="Follow up" color="#633806" bg="#FAEEDA" />
  return <Badge label="Overdue" color="#791F1F" bg="#FCEBEB" />
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

  useEffect(() => { 
  if (profile?.id) fetchAll() 
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

  const inviteDoctor = async () => {
    if (!newDoctor.email || !newDoctor.full_name) return
    setInviteMsg('')
    const { error } = await supabase.auth.signUp({
      email: newDoctor.email,
      password: 'TempPass123!',
      options: {
        data: {
          full_name: newDoctor.full_name,
          company_name: newDoctor.company_name,
          phone: newDoctor.phone,
          role: 'doctor'
        }
      }
    })
    if (error) { setInviteMsg('Error: ' + error.message); return }
    // Link doctor to this rep
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
      product_id: selectedProduct.id,
      quantity: orderQty,
      total_price: total,
      doctor_id: orderDoctor,
      credited_rep_id: profile.id,
      supplier_id: selectedProduct.supplier_id,
      is_direct_order: false,
      order_date: new Date().toISOString(),
      notes: orderNotes,
      status: 'New'
    })
    if (!error) {
      setOrderSuccess(true)
      fetchAll()
      setTimeout(() => {
        setShowOrderModal(false)
        setOrderSuccess(false)
        setOrderQty(1)
        setOrderNotes('')
        setOrderDoctor('')
        setSelectedProduct(null)
        setOrderPlacing(false)
      }, 2000)
    } else {
      setOrderError(error.message || 'Failed to place order. Please try again.')
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
  const getLastOrderDate = (doctorId) => orders
    .filter(o => o.doctor_id === doctorId)
    .sort((a, b) => new Date(b.order_date) - new Date(a.order_date))[0]?.order_date

const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'doctors', label: 'My Doctors', badge: doctors.filter(d => { const lastOrder = getLastOrderDate(d.id); if (!lastOrder) return true; return Math.floor((Date.now() - new Date(lastOrder)) / 86400000) >= 14 }).length },
    { id: 'feed', label: 'Order Feed' },
    { id: 'catalog', label: 'Browse Catalog' },
    { id: 'attainment', label: 'Attainment' },
    { id: 'commission', label: 'Commission' },
  ]

  const inputStyle = { width: '100%', padding: '10px 12px', border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', fontSize: '13px', marginBottom: '10px', outline: 'none', background: 'white' }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: COLORS.dark, color: COLORS.teal, fontSize: '18px' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: COLORS.bg2, fontFamily: 'DM Sans, sans-serif' }}>

      {/* DARK SIDEBAR */}
      <div style={{ width: '220px', background: COLORS.dark, display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh' }}>
        <div style={{ padding: '20px 18px 16px', borderBottom: `0.5px solid ${COLORS.dark2}`, fontSize: '20px', fontWeight: '700', color: '#F0EDE6' }}>
          Rovi<span style={{ color: COLORS.teal }}>.</span>
        </div>
        <div style={{ padding: '14px 18px', borderBottom: `0.5px solid ${COLORS.dark2}` }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: COLORS.teal, color: COLORS.dark, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '12px', marginBottom: '6px' }}>
            {profile?.full_name?.charAt(0) || 'R'}
          </div>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#F0EDE6' }}>{profile?.full_name}</div>
          <div style={{ fontSize: '11px', color: '#5F5E5A' }}>Sales rep · {profile?.territory || 'Texas'}</div>
        </div>
        <div style={{ padding: '12px 10px', flex: 1 }}>
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
              {activeSection === 'feed' && 'Order Feed'}
              {activeSection === 'attainment' && 'Monthly Attainment'}
              {activeSection === 'commission' && 'Commission'}
            </div>
            <div style={{ fontSize: '12px', color: COLORS.text3, marginTop: '2px' }}>
              {mtdOrders.length} orders credited this month
            </div>
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
                { label: 'Orders credited (MTD)', value: mtdOrders.length, delta: 'This month', color: COLORS.green },
                { label: 'Commission earned', value: `$${mtdCommission.toFixed(2)}`, delta: '8% commission rate', color: COLORS.green },
                { label: 'Active doctors', value: doctors.length, delta: 'In your territory', color: COLORS.green },
                { label: 'Direct orders credited', value: directOrders.length, delta: 'Doctor ordered direct', color: COLORS.amber },
              ].map((m, i) => (
                <div key={i} style={{ background: 'white', borderRadius: '9px', padding: '15px', border: `0.5px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '5px' }}>{m.label}</div>
                  <div style={{ fontSize: '24px', fontWeight: '500', color: COLORS.dark }}>{m.value}</div>
                  <div style={{ fontSize: '11px', color: m.color, marginTop: '4px' }}>{m.delta}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px', marginBottom: '12px' }}>
              {/* Order feed */}
              <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '500' }}>Doctor order feed</span>
                  <span onClick={() => setActiveSection('feed')} style={{ fontSize: '12px', color: COLORS.green, cursor: 'pointer', fontWeight: '500' }}>View all →</span>
                </div>
                {orders.slice(0, 5).map(o => (
                  <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: `0.5px solid ${COLORS.border}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: '500', color: COLORS.dark }}>{o.doctor?.full_name}</div>
                      <div style={{ fontSize: '11px', color: COLORS.text3 }}>{o.product?.name} · {o.is_direct_order ? 'Direct order' : 'Via rep'}</div>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '500' }}>${Number(o.total_price).toFixed(2)}</div>
                    <span style={{ background: COLORS.green3, color: '#085041', fontSize: '10px', fontWeight: '500', padding: '3px 8px', borderRadius: '20px' }}>✓ Credited</span>
                  </div>
                ))}
                {orders.length === 0 && <div style={{ color: COLORS.text3, fontSize: '13px', textAlign: 'center', padding: '20px' }}>No orders yet — invite doctors to get started</div>}
              </div>

              {/* Alerts */}
              <div>
                <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '12px' }}>Monthly attainment</div>
                  {[
                    { label: 'GLP-1', pct: Math.min(orders.filter(o => o.product?.category === 'GLP-1').length * 10, 100) },
                    { label: 'Hormone', pct: Math.min(orders.filter(o => o.product?.category === 'Hormone').length * 10, 100) },
                    { label: 'Derm', pct: Math.min(orders.filter(o => o.product?.category === 'Dermatology').length * 10, 100) },
                  ].map(a => (
                    <div key={a.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <div style={{ fontSize: '12px', color: COLORS.text2, width: '60px' }}>{a.label}</div>
                      <div style={{ flex: 1, height: '6px', background: COLORS.bg2, borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${a.pct}%`, height: '100%', background: a.pct > 60 ? COLORS.green2 : COLORS.amber, borderRadius: '3px' }} />
                      </div>
                      <div style={{ fontSize: '11px', color: COLORS.dark, minWidth: '30px' }}>{a.pct}%</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '12px' }}>AI follow-up alerts</div>
                  {doctors.filter(d => { const last = getLastOrderDate(d.id); return !last || Math.floor((Date.now() - new Date(last)) / 86400000) >= 14 }).slice(0, 3).map(d => (
                    <div key={d.id} style={{ display: 'flex', gap: '8px', padding: '8px 10px', background: COLORS.amber2, borderRadius: '7px', marginBottom: '6px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: COLORS.amber, marginTop: '4px', flexShrink: 0 }} />
                      <div style={{ fontSize: '12px', color: '#633806' }}><strong>{d.full_name}</strong> needs follow up</div>
                    </div>
                  ))}
                  {doctors.filter(d => { const last = getLastOrderDate(d.id); return !last || Math.floor((Date.now() - new Date(last)) / 86400000) >= 14 }).length === 0 && (
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
                    <div style={{ fontSize: '16px', fontWeight: '500', color: COLORS.dark }}>${Number(p.price_per_unit).toFixed(2)}<span style={{ fontSize: '11px', color: COLORS.text3, fontWeight: '400' }}>/unit</span></div>
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
              {products.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: COLORS.text3 }}>No products available yet</div>
              )}
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
                const catOrders = orders.filter(o => o.product?.category === cat)
                const pct = Math.min(catOrders.length * 10, 100)
                return (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '13px', color: COLORS.text2, width: '100px' }}>{cat}</div>
                    <div style={{ flex: 1, height: '10px', background: COLORS.bg2, borderRadius: '5px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: pct > 60 ? COLORS.green : COLORS.amber, borderRadius: '5px', transition: 'width 0.4s' }} />
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark, minWidth: '40px' }}>{pct}%</div>
                    <div style={{ fontSize: '12px', color: COLORS.text3, minWidth: '60px' }}>{catOrders.length} orders</div>
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
                    <div style={{ fontSize: '11px', color: COLORS.text3 }}>{new Date(o.order_date).toLocaleDateString()} · {o.is_direct_order ? 'Direct order' : 'Via rep'}</div>
                  </div>
                  <div style={{ fontSize: '13px', color: COLORS.text2 }}>${Number(o.total_price).toFixed(2)}</div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.green }}>${(Number(o.total_price) * 0.08).toFixed(2)}</div>
                  <span style={{ background: COLORS.green3, color: '#085041', fontSize: '10px', fontWeight: '500', padding: '3px 8px', borderRadius: '20px' }}>Credited</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ORDER FOR DOCTOR MODAL */}
      {showOrderModal && selectedProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,26,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600 }}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '440px', maxWidth: '90vw' }}>
            {orderSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
                <div style={{ fontSize: '16px', fontWeight: '500', color: COLORS.dark, marginBottom: '6px' }}>Order placed!</div>
                <div style={{ fontSize: '13px', color: COLORS.text2 }}>Credited to your account automatically.</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>Place order for doctor</div>
                <div style={{ fontSize: '13px', color: COLORS.text2, marginBottom: '20px' }}>This order will be credited to your account automatically.</div>
                <div style={{ background: COLORS.bg2, borderRadius: '8px', padding: '12px 14px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark }}>{selectedProduct.name}</div>
                  <div style={{ fontSize: '12px', color: COLORS.text2, marginTop: '2px' }}>${Number(selectedProduct.price_per_unit).toFixed(2)}/unit · {selectedProduct.category}</div>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '12px', color: COLORS.text2, display: 'block', marginBottom: '5px' }}>Select doctor</label>
                  <select value={orderDoctor} onChange={e => setOrderDoctor(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', fontSize: '13px', outline: 'none', background: 'white', marginBottom: '10px' }}>
                    <option value="">Choose a doctor...</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>{d.full_name} — {d.company_name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', color: COLORS.text2, display: 'block', marginBottom: '5px' }}>Quantity</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={() => setOrderQty(Math.max(1, orderQty - 1))} style={{ width: '32px', height: '32px', border: `0.5px solid ${COLORS.border}`, borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '16px' }}>−</button>
                    <span style={{ fontSize: '18px', fontWeight: '500', minWidth: '30px', textAlign: 'center' }}>{orderQty}</span>
                    <button onClick={() => setOrderQty(orderQty + 1)} style={{ width: '32px', height: '32px', border: `0.5px solid ${COLORS.border}`, borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '16px' }}>+</button>
                    <div style={{ marginLeft: 'auto', fontSize: '16px', fontWeight: '500', color: COLORS.dark }}>
                      ${(Number(selectedProduct.price_per_unit) * orderQty).toFixed(2)}
                    </div>
                  </div>
                </div>
                <input
                  placeholder="Notes (optional)"
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', fontSize: '13px', marginBottom: '14px', outline: 'none' }}
                />
                <div style={{ background: COLORS.green3, borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#085041', marginBottom: '16px' }}>
                  ✓ This order will be credited to your account — not marked as a direct order
                </div>
                {orderError && (
                  <div style={{ background: '#FCEBEB', color: '#791F1F', borderRadius: '7px', padding: '10px 12px', fontSize: '12px', marginBottom: '12px' }}>
                    {orderError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => { setShowOrderModal(false); setOrderQty(1); setOrderDoctor(''); setOrderError('') }}
                    style={{ flex: 1, padding: '11px', border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', background: 'white', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                  <button onClick={placeOrderForDoctor} disabled={!orderDoctor || orderPlacing}
                    style={{ flex: 2, padding: '11px', background: !orderDoctor ? COLORS.border : COLORS.green, color: !orderDoctor ? COLORS.text3 : 'white', border: 'none', borderRadius: '7px', cursor: orderDoctor ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: '500' }}>
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
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button onClick={() => setShowAddDoctor(false)} style={{ padding: '10px 20px', border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', background: 'white', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={inviteDoctor} style={{ padding: '10px 20px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>Send invite</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}