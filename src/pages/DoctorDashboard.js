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

export default function DoctorDashboard() {
  const { profile, signOut } = useAuth()
  const [activeSection, setActiveSection] = useState('reorder')
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [myNetwork, setMyNetwork] = useState([]) // [{rep, supplier, supplierProducts}]
  const [loading, setLoading] = useState(true)
  const [reorderSuccess, setReorderSuccess] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [chatContacts, setChatContacts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedRep, setSelectedRep] = useState(null)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [orderQty, setOrderQty] = useState(1)
  const [orderPlacing, setOrderPlacing] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)

  useEffect(() => {
    if (profile?.id) { fetchAll() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  const fetchAll = async () => {
    // Fetch orders
    const { data: orderData } = await supabase
      .from('orders')
      .select('*, product:products(id, name, category, price_per_unit, supplier_id)')
      .eq('doctor_id', profile.id)
      .order('order_date', { ascending: false })
    setOrders(orderData || [])

    // Fetch all products
    const { data: productData } = await supabase
      .from('products')
      .select('*, supplier:profiles!products_supplier_id_fkey(id, full_name, company_name)')
      .eq('is_active', true)
    setProducts(productData || [])

    // Fetch doctor's rep connections
    const { data: repConnections } = await supabase
      .from('doctor_rep_connections')
      .select('*, rep:profiles!doctor_rep_connections_rep_id_fkey(id, full_name, company_name, territory, phone)')
      .eq('doctor_id', profile.id)
      .eq('status', 'active')

    // For each rep, find their supplier connections
    const network = await Promise.all((repConnections || []).map(async (conn) => {
      const { data: supplierConns } = await supabase
        .from('rep_supplier_connections')
        .select('*, supplier:profiles!rep_supplier_connections_supplier_id_fkey(id, full_name, company_name, phone)')
        .eq('rep_id', conn.rep_id)
        .eq('status', 'active')

      // Get products for each supplier
      const suppliersWithProducts = await Promise.all((supplierConns || []).map(async (sc) => {
        const supplierProds = (productData || []).filter(p => p.supplier_id === sc.supplier_id)
        return { ...sc.supplier, products: supplierProds }
      }))

      return {
        connectionId: conn.id,
        rep: conn.rep,
        suppliers: suppliersWithProducts,
        connectedAt: conn.connected_at
      }
    }))

    setMyNetwork(network)

    // Build chat contacts — all reps and their suppliers
    const contacts = []
    network.forEach(n => {
      if (n.rep) contacts.push({ ...n.rep, role: 'rep' })
      n.suppliers.forEach(s => { if (s) contacts.push({ ...s, role: 'supplier' }) })
    })
    setChatContacts(contacts)

    setLoading(false)
  }

  const quickReorder = async () => {
    const lastOrder = orders[0]
    if (!lastOrder) return
    setOrderPlacing(true)
    const { error } = await supabase.from('orders').insert({
      product_id: lastOrder.product?.id,
      quantity: lastOrder.quantity,
      total_price: lastOrder.total_price,
      doctor_id: profile.id,
      credited_rep_id: profile.assigned_rep_id,
      supplier_id: lastOrder.product?.supplier_id,
      is_direct_order: true,
      order_date: new Date().toISOString(),
      status: 'New'
    })
    if (!error) { setReorderSuccess(true); fetchAll(); setTimeout(() => setReorderSuccess(false), 3000) }
    setOrderPlacing(false)
  }

  const placeOrder = async () => {
    if (!selectedProduct) return
    setOrderPlacing(true)
    const total = Number(selectedProduct.price_per_unit) * orderQty
    const repId = selectedRep?.id || profile.assigned_rep_id || (myNetwork[0]?.rep?.id)
    const { error } = await supabase.from('orders').insert({
      product_id: selectedProduct.id,
      quantity: orderQty,
      total_price: total,
      doctor_id: profile.id,
      credited_rep_id: repId,
      supplier_id: selectedProduct.supplier_id,
      is_direct_order: true,
      order_date: new Date().toISOString(),
      status: 'New'
    })
    if (!error) {
      setOrderSuccess(true)
      fetchAll()
      setTimeout(() => { setShowOrderModal(false); setOrderSuccess(false); setOrderQty(1); setSelectedProduct(null); setSelectedRep(null); setOrderPlacing(false) }, 2000)
    } else { setOrderPlacing(false) }
  }

  const lastOrder = orders[0]
  const ytdOrders = orders.filter(o => new Date(o.order_date).getFullYear() === new Date().getFullYear())
  const totalSpent = ytdOrders.reduce((s, o) => s + Number(o.total_price), 0)
  const myProducts = [...new Map(orders.map(o => [o.product?.name, o.product])).values()].filter(Boolean)

  const sidebarItems = [
    { id: 'reorder', label: '⚡ Quick Reorder' },
    { id: 'history', label: '≡ Order History' },
    { id: 'catalog', label: '⊞ Browse Catalog' },
    { id: 'network', label: '🔗 My Network', badge: myNetwork.length },
    { id: 'profile', label: '◎ My Profile' },
  ]

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: COLORS.dark, color: COLORS.teal, fontSize: '18px' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: COLORS.bg2, fontFamily: 'DM Sans, sans-serif' }}>

      {/* SIDEBAR */}
      <div style={{ width: '220px', background: COLORS.dark, display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh' }}>
        <div style={{ padding: '20px 18px 16px', borderBottom: `0.5px solid ${COLORS.dark2}` }}>
          <Logo variant="dark" height={28} />
        </div>
        <div style={{ padding: '14px 18px', borderBottom: `0.5px solid ${COLORS.dark2}` }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: COLORS.purple2, color: COLORS.purple3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '12px', marginBottom: '6px' }}>
            {profile?.full_name?.charAt(0) || 'D'}
          </div>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#F0EDE6' }}>{profile?.full_name}</div>
          <div style={{ fontSize: '11px', color: '#5F5E5A' }}>{profile?.company_name}</div>
        </div>

        {/* Rep badges in sidebar */}
        {myNetwork.map(n => (
          <div key={n.connectionId} style={{ margin: '8px 14px 0', background: '#1A2E28', border: `0.5px solid ${COLORS.green}`, borderRadius: '8px', padding: '10px 12px' }}>
            <div style={{ fontSize: '9px', fontWeight: '600', color: COLORS.teal, letterSpacing: '1px', marginBottom: '4px' }}>YOUR REP</div>
            <div style={{ fontSize: '12px', fontWeight: '500', color: '#F0EDE6' }}>{n.rep?.full_name}</div>
            <div style={{ fontSize: '10px', color: '#5F5E5A', marginTop: '1px' }}>{n.rep?.company_name}</div>
            {n.suppliers.map(s => (
              <div key={s.id} style={{ marginTop: '6px', paddingTop: '6px', borderTop: '0.5px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '9px', fontWeight: '600', color: '#8B8AE5', letterSpacing: '1px', marginBottom: '2px' }}>SUPPLIER</div>
                <div style={{ fontSize: '11px', color: '#C8C6BE' }}>{s.company_name || s.full_name}</div>
              </div>
            ))}
            <button onClick={() => setShowChat(true)}
              style={{ marginTop: '8px', width: '100%', padding: '5px', background: 'transparent', border: `0.5px solid ${COLORS.green}`, borderRadius: '5px', color: COLORS.teal, fontSize: '11px', cursor: 'pointer' }}>
              💬 Message
            </button>
          </div>
        ))}

        <div style={{ padding: '10px 10px', flex: 1, overflowY: 'auto', marginTop: '8px' }}>
          {sidebarItems.map(item => (
            <div key={item.id} onClick={() => setActiveSection(item.id)}
              style={{ display: 'flex', alignItems: 'center', padding: '9px 10px', borderRadius: '7px', cursor: 'pointer', marginBottom: '2px', background: activeSection === item.id ? COLORS.teal : 'transparent', color: activeSection === item.id ? COLORS.dark : '#888780', fontSize: '13px', fontWeight: activeSection === item.id ? '500' : '400' }}>
              {item.label}
              {item.badge > 0 && <span style={{ marginLeft: 'auto', background: COLORS.green, color: 'white', fontSize: '10px', fontWeight: '600', padding: '1px 6px', borderRadius: '20px' }}>{item.badge}</span>}
            </div>
          ))}
        </div>

        <div style={{ padding: '12px 14px', borderTop: `0.5px solid ${COLORS.dark2}` }}>
          <div style={{ fontSize: '10px', fontWeight: '500', color: '#5F5E5A', marginBottom: '4px' }}>FREE FOR DOCTORS</div>
          <div style={{ fontSize: '11px', color: '#5F5E5A', marginBottom: '10px' }}>Rovi is always free for doctors.</div>
          <button onClick={signOut} style={{ width: '100%', padding: '9px', background: 'transparent', border: `0.5px solid #3D3D3A`, borderRadius: '7px', color: '#5F5E5A', fontSize: '13px', cursor: 'pointer' }}>Sign out</button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ marginLeft: '220px', flex: 1, padding: '24px' }}>

        {/* TOPBAR */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '17px', fontWeight: '500', color: COLORS.dark }}>
              {activeSection === 'reorder' && `Good morning, ${profile?.full_name}`}
              {activeSection === 'history' && 'Order History'}
              {activeSection === 'catalog' && 'Browse Catalog'}
              {activeSection === 'network' && 'My Network'}
              {activeSection === 'profile' && 'My Profile'}
            </div>
            <div style={{ fontSize: '12px', color: COLORS.text3, marginTop: '2px' }}>
              {lastOrder ? `Your last order was ${Math.floor((Date.now() - new Date(lastOrder.order_date)) / 86400000)}d ago` : 'No orders yet — browse the catalog to get started'}
            </div>
          </div>
          <button onClick={() => setShowChat(!showChat)}
            style={{ padding: '8px 14px', background: showChat ? COLORS.teal : COLORS.dark2, border: 'none', borderRadius: '20px', color: showChat ? COLORS.dark : '#888780', fontSize: '12px', cursor: 'pointer' }}>
            💬 Messages
          </button>
        </div>

        {/* QUICK REORDER */}
        {activeSection === 'reorder' && (
          <>
            {lastOrder && (
              <div style={{ background: COLORS.dark, borderRadius: '12px', padding: '20px 24px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: '600', color: COLORS.teal, letterSpacing: '1.5px', marginBottom: '6px' }}>⚡ QUICK REORDER — 60 SECONDS</div>
                  <div style={{ fontSize: '18px', fontWeight: '500', color: '#F0EDE6', marginBottom: '4px' }}>{lastOrder.product?.name}</div>
                  <div style={{ fontSize: '12px', color: '#888780' }}>{lastOrder.quantity} units · ${Number(lastOrder.total_price).toFixed(2)} · Est. 1–2 days</div>
                </div>
                {reorderSuccess ? (
                  <div style={{ background: COLORS.green3, color: '#085041', padding: '12px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '500' }}>✓ Order placed!</div>
                ) : (
                  <button onClick={quickReorder} disabled={orderPlacing}
                    style={{ padding: '12px 24px', background: COLORS.teal, color: COLORS.dark, border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                    {orderPlacing ? 'Placing...' : 'Reorder now →'}
                  </button>
                )}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '16px' }}>
              {[
                { label: 'Orders this year', value: ytdOrders.length },
                { label: 'Total spent (YTD)', value: `$${totalSpent.toFixed(2)}` },
                { label: 'Avg delivery', value: '1.4 days' },
              ].map((m, i) => (
                <div key={i} style={{ background: 'white', borderRadius: '9px', padding: '15px', border: `0.5px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '5px' }}>{m.label}</div>
                  <div style={{ fontSize: '24px', fontWeight: '500', color: COLORS.dark }}>{m.value}</div>
                </div>
              ))}
            </div>
            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '14px' }}>Your products</div>
              {myProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: COLORS.text3, fontSize: '13px' }}>
                  No orders yet. <span onClick={() => setActiveSection('catalog')} style={{ color: COLORS.green, cursor: 'pointer', fontWeight: '500' }}>Browse the catalog →</span>
                </div>
              ) : myProducts.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: `0.5px solid ${COLORS.border}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark }}>{p?.name}</div>
                    <div style={{ fontSize: '11px', color: COLORS.text3 }}>${Number(p?.price_per_unit).toFixed(2)}/unit · {p?.category}</div>
                  </div>
                  <button onClick={() => { setSelectedProduct(products.find(prod => prod.name === p?.name)); setShowOrderModal(true) }}
                    style={{ padding: '7px 16px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>
                    Reorder
                  </button>
                </div>
              ))}
            </div>
            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontSize: '13px', fontWeight: '500' }}>Recent orders</span>
                <span onClick={() => setActiveSection('history')} style={{ fontSize: '12px', color: COLORS.green, cursor: 'pointer' }}>View all →</span>
              </div>
              {orders.slice(0, 5).map(o => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: `0.5px solid ${COLORS.border}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark }}>{o.product?.name}</div>
                    <div style={{ fontSize: '11px', color: COLORS.text3 }}>Qty: {o.quantity} · {new Date(o.order_date).toLocaleDateString()}</div>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '500' }}>${Number(o.total_price).toFixed(2)}</div>
                  <span style={{ background: o.status === 'Delivered' ? COLORS.green3 : COLORS.amber2, color: o.status === 'Delivered' ? '#085041' : '#633806', fontSize: '10px', fontWeight: '500', padding: '3px 8px', borderRadius: '20px' }}>{o.status || 'New'}</span>
                </div>
              ))}
              {orders.length === 0 && <div style={{ textAlign: 'center', padding: '30px', color: COLORS.text3 }}>No orders yet</div>}
            </div>
          </>
        )}

        {/* ORDER HISTORY */}
        {activeSection === 'history' && (
          <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px' }}>
            {orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: COLORS.text3 }}>No orders yet</div>
            ) : orders.map(o => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: `0.5px solid ${COLORS.border}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark }}>{o.product?.name}</div>
                  <div style={{ fontSize: '11px', color: COLORS.text3 }}>Qty: {o.quantity} · {new Date(o.order_date).toLocaleDateString()} · ${Number(o.total_price).toFixed(2)}</div>
                </div>
                <span style={{ background: o.status === 'Delivered' ? COLORS.green3 : o.status === 'Shipped' ? '#E6F1FB' : COLORS.amber2, color: o.status === 'Delivered' ? '#085041' : o.status === 'Shipped' ? '#0C447C' : '#633806', fontSize: '10px', fontWeight: '500', padding: '3px 8px', borderRadius: '20px' }}>
                  {o.status || 'New'}
                </span>
                <button onClick={() => { setSelectedProduct(products.find(p => p.name === o.product?.name)); setShowOrderModal(true) }}
                  style={{ padding: '6px 14px', background: COLORS.bg2, color: COLORS.text2, border: `0.5px solid ${COLORS.border}`, borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>
                  Reorder
                </button>
              </div>
            ))}
          </div>
        )}

        {/* BROWSE CATALOG */}
        {activeSection === 'catalog' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px' }}>
            {products.map(p => (
              <div key={p.id} style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '20px' }}>
                <div style={{ fontSize: '10px', fontWeight: '500', color: COLORS.text3, letterSpacing: '0.5px', marginBottom: '6px' }}>{p.category}</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: COLORS.dark, marginBottom: '4px' }}>{p.name}</div>
                <div style={{ fontSize: '12px', color: COLORS.text2, marginBottom: '4px' }}>{p.description}</div>
                <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '12px' }}>by {p.supplier?.company_name}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ fontSize: '16px', fontWeight: '500' }}>${Number(p.price_per_unit).toFixed(2)}<span style={{ fontSize: '11px', color: COLORS.text3 }}>/unit</span></div>
                  <span style={{ fontSize: '11px', fontWeight: '500', color: p.stock_quantity < 20 ? COLORS.red : p.stock_quantity < 50 ? COLORS.amber : COLORS.green }}>
                    {p.stock_quantity < 20 ? '⚠ Low' : p.stock_quantity < 50 ? '○ Limited' : '✓ In stock'}
                  </span>
                </div>
                <button onClick={() => { setSelectedProduct(p); setShowOrderModal(true) }}
                  style={{ width: '100%', padding: '9px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>
                  Order now
                </button>
              </div>
            ))}
            {products.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: COLORS.text3 }}>No products available yet</div>}
          </div>
        )}

        {/* MY NETWORK */}
        {activeSection === 'network' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '17px', fontWeight: '500', color: COLORS.dark }}>My Network</div>
              <div style={{ fontSize: '12px', color: COLORS.text3, marginTop: '2px' }}>Your reps and the suppliers they represent</div>
            </div>

            {myNetwork.length === 0 ? (
              <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '60px', textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: '500', color: COLORS.dark, marginBottom: '8px' }}>No rep connections yet</div>
                <div style={{ fontSize: '13px', color: COLORS.text3 }}>A sales rep will add you to their territory to get started</div>
              </div>
            ) : myNetwork.map(n => (
              <div key={n.connectionId} style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>

                {/* Rep header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', paddingBottom: '16px', borderBottom: `0.5px solid ${COLORS.border}` }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: COLORS.green3, color: COLORS.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '600', flexShrink: 0 }}>
                    {n.rep?.full_name?.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                      <div style={{ fontSize: '15px', fontWeight: '500', color: COLORS.dark }}>{n.rep?.full_name}</div>
                      <span style={{ background: COLORS.green3, color: '#085041', fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>Your rep</span>
                    </div>
                    <div style={{ fontSize: '12px', color: COLORS.text3 }}>{n.rep?.company_name} · Territory: {n.rep?.territory || 'Texas'}</div>
                  </div>
                  <button onClick={() => setShowChat(true)}
                    style={{ padding: '8px 16px', background: COLORS.green3, color: COLORS.green, border: `0.5px solid #9FE1CB`, borderRadius: '7px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>
                    💬 Message rep
                  </button>
                </div>

                {/* Suppliers under this rep */}
                {n.suppliers.length === 0 ? (
                  <div style={{ fontSize: '13px', color: COLORS.text3, textAlign: 'center', padding: '20px' }}>This rep hasn't connected to any suppliers yet</div>
                ) : n.suppliers.map(s => (
                  <div key={s.id} style={{ marginBottom: '16px' }}>
                    {/* Supplier header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: COLORS.bg2, borderRadius: '10px', marginBottom: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: COLORS.purple2, color: COLORS.purple3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600', flexShrink: 0 }}>
                        {s.company_name?.charAt(0) || s.full_name?.charAt(0)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <div style={{ fontSize: '14px', fontWeight: '500', color: COLORS.dark }}>{s.company_name || s.full_name}</div>
                          <span style={{ background: COLORS.purple2, color: COLORS.purple3, fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>503B Supplier</span>
                        </div>
                        <div style={{ fontSize: '11px', color: COLORS.text3 }}>{s.products?.length || 0} products available</div>
                      </div>
                      <button onClick={() => setShowChat(true)}
                        style={{ padding: '7px 14px', background: COLORS.purple2, color: COLORS.purple3, border: `0.5px solid #C5C4F5`, borderRadius: '7px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>
                        💬 Message supplier
                      </button>
                    </div>

                    {/* Supplier products */}
                    {s.products?.length > 0 && (
                      <div style={{ paddingLeft: '12px', borderLeft: `2px solid ${COLORS.purple2}` }}>
                        <div style={{ fontSize: '11px', fontWeight: '500', color: COLORS.text3, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '10px' }}>
                          Available products
                        </div>
                        {s.products.map(p => (
                          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: `0.5px solid ${COLORS.border}` }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark }}>{p.name}</div>
                              <div style={{ fontSize: '11px', color: COLORS.text3 }}>{p.category} · ${Number(p.price_per_unit).toFixed(2)}/unit</div>
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: '500', color: p.stock_quantity < 20 ? COLORS.red : p.stock_quantity < 50 ? COLORS.amber : COLORS.green }}>
                              {p.stock_quantity < 20 ? '⚠ Low' : p.stock_quantity < 50 ? '○ Limited' : '✓ In stock'}
                            </span>
                            <button onClick={() => { setSelectedProduct(p); setSelectedRep(n.rep); setShowOrderModal(true) }}
                              style={{ padding: '6px 14px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '500', cursor: 'pointer' }}>
                              Order
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}

            <div style={{ background: COLORS.green3, border: `0.5px solid #9FE1CB`, borderRadius: '8px', padding: '12px 16px', fontSize: '12px', color: '#085041' }}>
              Your network grows as reps add you to their territory. Each rep brings their supplier's full catalog with them.
            </div>
          </>
        )}

        {/* MY PROFILE */}
        {activeSection === 'profile' && (
          <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '16px' }}>Profile details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: 'Full name', value: profile?.full_name },
                { label: 'Practice / clinic', value: profile?.company_name },
                { label: 'Phone', value: profile?.phone || 'Not set' },
                { label: 'Account type', value: 'Doctor — Free forever' },
              ].map((m, i) => (
                <div key={i}>
                  <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '4px' }}>{m.label}</div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: COLORS.dark }}>{m.value}</div>
                </div>
              ))}
            </div>

            {myNetwork.map(n => (
              <div key={n.connectionId} style={{ marginBottom: '16px', paddingTop: '16px', borderTop: `0.5px solid ${COLORS.border}` }}>
                <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '12px' }}>Rep — {n.rep?.full_name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', background: COLORS.bg2, borderRadius: '10px', marginBottom: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: COLORS.green3, color: COLORS.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600' }}>{n.rep?.full_name?.charAt(0)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark }}>{n.rep?.full_name}</div>
                    <div style={{ fontSize: '11px', color: COLORS.text3 }}>{n.rep?.company_name} · {n.rep?.territory}</div>
                  </div>
                  <button onClick={() => setShowChat(true)} style={{ padding: '6px 12px', background: COLORS.green3, color: COLORS.green, border: `0.5px solid #9FE1CB`, borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>💬 Message</button>
                </div>
                {n.suppliers.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', background: COLORS.bg2, borderRadius: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: COLORS.purple2, color: COLORS.purple3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600' }}>{s.company_name?.charAt(0)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark }}>{s.company_name || s.full_name}</div>
                      <div style={{ fontSize: '11px', color: COLORS.text3 }}>503B Supplier via {n.rep?.full_name}</div>
                    </div>
                    <button onClick={() => setShowChat(true)} style={{ padding: '6px 12px', background: COLORS.purple2, color: COLORS.purple3, border: `0.5px solid #C5C4F5`, borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>💬 Message</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ORDER MODAL */}
        {showOrderModal && selectedProduct && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,26,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600 }}>
            <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '420px', maxWidth: '90vw' }}>
              {orderSuccess ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
                  <div style={{ fontSize: '16px', fontWeight: '500' }}>Order placed!</div>
                  <div style={{ fontSize: '13px', color: COLORS.text2, marginTop: '6px' }}>Your rep has been notified.</div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>Place order</div>
                  <div style={{ fontSize: '13px', color: COLORS.text2, marginBottom: '20px' }}>
                    {selectedRep ? `Via ${selectedRep.full_name} — credited automatically` : 'Your rep will be credited automatically'}
                  </div>
                  <div style={{ background: COLORS.bg2, borderRadius: '8px', padding: '12px 14px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500' }}>{selectedProduct.name}</div>
                    <div style={{ fontSize: '12px', color: COLORS.text2, marginTop: '2px' }}>${Number(selectedProduct.price_per_unit).toFixed(2)}/unit · {selectedProduct.category}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <button onClick={() => setOrderQty(Math.max(1, orderQty - 1))} style={{ width: '32px', height: '32px', border: `0.5px solid ${COLORS.border}`, borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '16px' }}>−</button>
                    <span style={{ fontSize: '18px', fontWeight: '500', minWidth: '30px', textAlign: 'center' }}>{orderQty}</span>
                    <button onClick={() => setOrderQty(orderQty + 1)} style={{ width: '32px', height: '32px', border: `0.5px solid ${COLORS.border}`, borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '16px' }}>+</button>
                    <div style={{ marginLeft: 'auto', fontSize: '16px', fontWeight: '500' }}>${(Number(selectedProduct.price_per_unit) * orderQty).toFixed(2)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => { setShowOrderModal(false); setOrderQty(1); setSelectedProduct(null); setSelectedRep(null) }}
                      style={{ flex: 1, padding: '11px', border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', background: 'white', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                    <button onClick={placeOrder} disabled={orderPlacing}
                      style={{ flex: 2, padding: '11px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                      {orderPlacing ? 'Placing...' : 'Place order'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <ChatPanel isOpen={showChat} onClose={() => setShowChat(false)} contacts={chatContacts} />
      </div>
    </div>
  )
}
