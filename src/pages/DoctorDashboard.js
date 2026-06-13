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

const StatusBadge = ({ status }) => {
  const map = {
    New: { bg: '#E8F7F1', color: '#085041' },
    Processing: { bg: '#FAEEDA', color: '#633806' },
    Shipped: { bg: '#E6F1FB', color: '#0C447C' },
    Delivered: { bg: '#E8E8E8', color: '#5F5E5A' },
  }
  const c = map[status] || map.New
  return <span style={{ background: c.bg, color: c.color, fontSize: '10px', fontWeight: '500', padding: '3px 8px', borderRadius: '20px' }}>{status}</span>
}

export default function DoctorDashboard() {
  const { profile, signOut } = useAuth()
  const [activeSection, setActiveSection] = useState('reorder')
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [rep, setRep] = useState(null)
  const [showReorder, setShowReorder] = useState(false)
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [orderQty, setOrderQty] = useState(1)
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)

  useEffect(() => { 
  if (profile?.id) fetchAll() 
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [profile?.id])

  const fetchAll = async () => {
    const [o, p, r] = await Promise.all([
      supabase.from('orders').select('*, product:products(name,category,price_per_unit)').eq('doctor_id', profile.id).order('order_date', { ascending: false }),
      supabase.from('products').select('*, supplier:profiles!products_supplier_id_fkey(company_name)').eq('is_active', true),
      profile.assigned_rep_id ? supabase.from('profiles').select('*').eq('id', profile.assigned_rep_id).single() : Promise.resolve({ data: null })
    ])
    setOrders(o.data || [])
    setProducts(p.data || [])
    setRep(r.data)
    setLoading(false)
  }

  const placeOrder = async (product, qty, isReorder = false) => {
    if (!product || qty < 1) return
    setPlacing(true)
    const total = Number(product.price_per_unit) * qty

    const { error } = await supabase.from('orders').insert({
      product_id: product.id,
      quantity: qty,
      total_price: total,
      doctor_id: profile.id,
      delivery_address: deliveryAddress || profile.company_name,
      notes: orderNotes,
      is_direct_order: true,
      order_date: new Date().toISOString(),
      status: 'New'
    })

    if (!error) {
      // Create notification for rep
      if (profile.assigned_rep_id) {
        await supabase.from('notifications').insert({
          recipient_id: profile.assigned_rep_id,
          type: 'new_order',
          message: `${profile.full_name} placed a direct order — ${product.name} (${qty} units) — credited to you automatically`,
          is_read: false
        })
      }
      setOrderSuccess(true)
      fetchAll()
      setTimeout(() => {
        setShowReorder(false)
        setShowNewOrder(false)
        setOrderSuccess(false)
        setOrderQty(1)
        setOrderNotes('')
        setDeliveryAddress('')
        setSelectedProduct(null)
        setPlacing(false)
      }, 2000)
    } else {
      setPlacing(false)
    }
  }

  const lastOrder = orders[0]
  const lastProduct = lastOrder ? products.find(p => p.id === lastOrder.product_id) || lastOrder.product : null
  const daysSinceLast = lastOrder ? Math.floor((Date.now() - new Date(lastOrder.order_date)) / 86400000) : null
  const yearOrders = orders.filter(o => new Date(o.order_date).getFullYear() === new Date().getFullYear())
  const totalSpent = yearOrders.reduce((s, o) => s + Number(o.total_price), 0)
  const filteredProducts = categoryFilter === 'All' ? products : products.filter(p => p.category === categoryFilter)

  const inputStyle = { width: '100%', padding: '10px 12px', border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', fontSize: '13px', marginBottom: '10px', outline: 'none', background: 'white' }

  const OrderModal = ({ product, isReorder, onClose }) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,26,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600 }}>
      <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '420px', maxWidth: '90vw' }}>
        {orderSuccess ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
            <div style={{ fontSize: '16px', fontWeight: '500', color: COLORS.dark, marginBottom: '6px' }}>Order placed!</div>
            <div style={{ fontSize: '13px', color: COLORS.text2 }}>Estimated delivery 1–2 business days.{rep ? ` ${rep.full_name} has been notified.` : ''}</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>{isReorder ? 'Confirm reorder' : 'Place order'}</div>
            <div style={{ fontSize: '13px', color: COLORS.text2, marginBottom: '20px' }}>
              {rep ? `Your rep ${rep.full_name} will be notified and credited automatically.` : 'Order will be placed directly.'}
            </div>
            <div style={{ background: COLORS.bg2, borderRadius: '8px', padding: '12px 14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark }}>{product?.name}</div>
              <div style={{ fontSize: '12px', color: COLORS.text2, marginTop: '2px' }}>{product?.supplier?.company_name} · ${Number(product?.price_per_unit).toFixed(2)}/unit</div>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', color: COLORS.text2, display: 'block', marginBottom: '5px' }}>Quantity</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button onClick={() => setOrderQty(Math.max(1, orderQty - 1))} style={{ width: '32px', height: '32px', border: `0.5px solid ${COLORS.border}`, borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '16px' }}>−</button>
                <span style={{ fontSize: '18px', fontWeight: '500', minWidth: '30px', textAlign: 'center' }}>{orderQty}</span>
                <button onClick={() => setOrderQty(orderQty + 1)} style={{ width: '32px', height: '32px', border: `0.5px solid ${COLORS.border}`, borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '16px' }}>+</button>
                <div style={{ marginLeft: 'auto', fontSize: '16px', fontWeight: '500', color: COLORS.dark }}>
                  ${(Number(product?.price_per_unit) * orderQty).toFixed(2)}
                </div>
              </div>
            </div>
            <input style={inputStyle} placeholder="Delivery address (optional)" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} />
            <input style={inputStyle} placeholder="Notes (optional)" value={orderNotes} onChange={e => setOrderNotes(e.target.value)} />
            {rep && (
              <div style={{ display: 'flex', gap: '8px', padding: '10px 12px', background: COLORS.green3, borderRadius: '8px', marginBottom: '14px', fontSize: '12px', color: '#085041' }}>
                <span>✓</span> {rep.full_name} will be credited for this order automatically
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={onClose} style={{ flex: 1, padding: '11px', border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', background: 'white', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={() => placeOrder(product, orderQty, isReorder)}
                disabled={placing}
                style={{ flex: 2, padding: '11px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                {placing ? 'Placing order...' : 'Place order'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: COLORS.green }}>Loading...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: COLORS.bg2, fontFamily: 'DM Sans, sans-serif' }}>

      {/* SIDEBAR */}
      <div style={{ width: '220px', background: 'white', borderRight: `0.5px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh' }}>
        <div style={{ padding: '20px 18px 16px', borderBottom: `0.5px solid ${COLORS.border}`, fontSize: '20px', fontWeight: '700', color: COLORS.dark }}>
          Rovi<span style={{ color: COLORS.green }}>.</span>
        </div>
        <div style={{ padding: '14px 18px', borderBottom: `0.5px solid ${COLORS.border}` }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: COLORS.purple2, color: COLORS.purple3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '12px', marginBottom: '6px' }}>
            {profile?.full_name?.charAt(0) || 'D'}
          </div>
          <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark }}>{profile?.full_name}</div>
          <div style={{ fontSize: '11px', color: COLORS.text3 }}>{profile?.company_name}</div>
        </div>

        {/* Rep connection */}
        {rep && (
          <div style={{ padding: '12px 18px', borderBottom: `0.5px solid ${COLORS.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: COLORS.green3, borderRadius: '8px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: COLORS.green, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '10px', fontWeight: '500', color: COLORS.green, letterSpacing: '0.5px' }}>YOUR REP</div>
                <div style={{ fontSize: '12px', color: '#085041', fontWeight: '500' }}>{rep.full_name}</div>
              </div>
            </div>
          </div>
        )}

        <div style={{ padding: '12px 10px', flex: 1 }}>
          {[
            { id: 'reorder', label: '⚡ Quick Reorder' },
            { id: 'history', label: '≡ Order History' },
            { id: 'catalog', label: '⊞ Browse Catalog' },
            { id: 'profile', label: '◎ My Profile' },
          ].map(item => (
            <div key={item.id} onClick={() => setActiveSection(item.id)}
              style={{ padding: '8px 10px', borderRadius: '7px', cursor: 'pointer', marginBottom: '2px', background: activeSection === item.id ? COLORS.green3 : 'transparent', color: activeSection === item.id ? COLORS.green : COLORS.text2, fontSize: '13px', fontWeight: activeSection === item.id ? '500' : '400' }}>
              {item.label}
            </div>
          ))}
        </div>

        <div style={{ padding: '16px 18px', borderBottom: `0.5px solid ${COLORS.border}` }}>
          <div style={{ fontSize: '10px', fontWeight: '500', color: COLORS.text3, marginBottom: '4px' }}>FREE FOR DOCTORS</div>
          <div style={{ fontSize: '11px', color: COLORS.text3 }}>Rovi is always free for doctors and clinics.</div>
        </div>

        <div style={{ padding: '16px 18px' }}>
          <button onClick={signOut} style={{ width: '100%', padding: '9px', background: 'transparent', border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', color: COLORS.text2, fontSize: '13px', cursor: 'pointer' }}>Sign out</button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ marginLeft: '220px', flex: 1, padding: '24px' }}>

        {/* QUICK REORDER */}
        {activeSection === 'reorder' && (
          <>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '17px', fontWeight: '500', color: COLORS.dark }}>Good morning, {profile?.full_name}</div>
              <div style={{ fontSize: '12px', color: COLORS.text3, marginTop: '2px' }}>
                {daysSinceLast !== null ? `Your last order was ${daysSinceLast} day${daysSinceLast !== 1 ? 's' : ''} ago` : 'No orders yet — browse the catalog to get started'}
              </div>
            </div>

            {/* Quick reorder banner */}
            {lastOrder && lastProduct && (
              <div style={{ background: COLORS.dark, borderRadius: '12px', padding: '20px 24px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '10px', fontWeight: '500', color: COLORS.teal, letterSpacing: '1px', marginBottom: '6px' }}>⚡ QUICK REORDER — 60 SECONDS</div>
                  <div style={{ fontSize: '16px', fontWeight: '500', color: '#F0EDE6', marginBottom: '4px' }}>{lastProduct.name}</div>
                  <div style={{ fontSize: '13px', color: '#888780' }}>
                    {lastOrder.quantity} units · ${Number(lastOrder.total_price).toFixed(2)} · Same supplier · Est. 1–2 days
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedProduct(lastProduct); setOrderQty(lastOrder.quantity); setShowReorder(true) }}
                  style={{ padding: '12px 24px', background: COLORS.teal, color: COLORS.dark, border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Reorder now →
                </button>
              </div>
            )}

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '16px' }}>
              {[
                { label: 'Orders this year', value: yearOrders.length },
                { label: 'Total spent (YTD)', value: `$${totalSpent.toFixed(2)}` },
                { label: 'Avg delivery', value: '1.4 days' },
              ].map((m, i) => (
                <div key={i} style={{ background: 'white', borderRadius: '9px', padding: '15px', border: `0.5px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '5px' }}>{m.label}</div>
                  <div style={{ fontSize: '22px', fontWeight: '500', color: COLORS.dark }}>{m.value}</div>
                </div>
              ))}
            </div>

            {/* Previously ordered */}
            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '14px' }}>Your products</div>
              {[...new Map(orders.map(o => [o.product_id, o])).values()].slice(0, 5).map(o => {
                const prod = products.find(p => p.id === o.product_id) || o.product
                if (!prod) return null
                return (
                  <div key={o.product_id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: `0.5px solid ${COLORS.border}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark }}>{prod.name}</div>
                      <div style={{ fontSize: '11px', color: COLORS.text3 }}>${Number(prod.price_per_unit).toFixed(2)}/unit · {prod.category}</div>
                    </div>
                    <button onClick={() => { setSelectedProduct(prod); setOrderQty(o.quantity); setShowReorder(true) }}
                      style={{ padding: '7px 16px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>
                      Reorder
                    </button>
                  </div>
                )
              })}
              {orders.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px', color: COLORS.text3, fontSize: '13px' }}>
                  No orders yet. <span onClick={() => setActiveSection('catalog')} style={{ color: COLORS.green, cursor: 'pointer', fontWeight: '500' }}>Browse the catalog →</span>
                </div>
              )}
            </div>

            {/* Recent orders */}
            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontSize: '13px', fontWeight: '500' }}>Recent orders</span>
                <span onClick={() => setActiveSection('history')} style={{ fontSize: '12px', color: COLORS.green, cursor: 'pointer', fontWeight: '500' }}>View all →</span>
              </div>
              {orders.slice(0, 4).map(o => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 0', borderBottom: `0.5px solid ${COLORS.border}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: COLORS.dark }}>{o.product?.name}</div>
                    <div style={{ fontSize: '11px', color: COLORS.text3 }}>Qty: {o.quantity} · {new Date(o.order_date).toLocaleDateString()}</div>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '500' }}>${Number(o.total_price).toFixed(2)}</div>
                  <StatusBadge status={o.status} />
                </div>
              ))}
              {orders.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: COLORS.text3, fontSize: '13px' }}>No orders yet</div>}
            </div>
          </>
        )}

        {/* ORDER HISTORY */}
        {activeSection === 'history' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '17px', fontWeight: '500', color: COLORS.dark }}>Order History</div>
              <div style={{ fontSize: '12px', color: COLORS.text3, marginTop: '2px' }}>{orders.length} total orders</div>
            </div>
            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px' }}>
              {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: COLORS.text3 }}>No orders yet</div>
              ) : orders.map(o => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: `0.5px solid ${COLORS.border}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark }}>{o.product?.name}</div>
                    <div style={{ fontSize: '11px', color: COLORS.text3 }}>
                      Qty: {o.quantity} · {new Date(o.order_date).toLocaleDateString()} · {o.is_direct_order ? 'Direct order' : 'Via rep'}
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '500' }}>${Number(o.total_price).toFixed(2)}</div>
                  <StatusBadge status={o.status} />
                  <button onClick={() => {
                    const prod = products.find(p => p.id === o.product_id) || o.product
                    setSelectedProduct(prod); setOrderQty(o.quantity); setShowReorder(true)
                  }} style={{ padding: '6px 14px', background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: COLORS.text2 }}>
                    Reorder
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* BROWSE CATALOG */}
        {activeSection === 'catalog' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '17px', fontWeight: '500', color: COLORS.dark }}>Browse Catalog</div>
              <div style={{ fontSize: '12px', color: COLORS.text3, marginTop: '2px' }}>{products.length} products available</div>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {['All', 'GLP-1', 'Hormone', 'Dermatology', 'Other'].map(c => (
                <button key={c} onClick={() => setCategoryFilter(c)}
                  style={{ padding: '6px 14px', borderRadius: '20px', border: `0.5px solid ${COLORS.border}`, background: categoryFilter === c ? COLORS.dark : 'white', color: categoryFilter === c ? 'white' : COLORS.text2, fontSize: '12px', cursor: 'pointer' }}>
                  {c}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
              {filteredProducts.map(p => (
                <div key={p.id} style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '18px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '500', color: COLORS.text3, letterSpacing: '0.5px', marginBottom: '6px' }}>{p.category}</div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: COLORS.dark, marginBottom: '4px' }}>{p.name}</div>
                  <div style={{ fontSize: '12px', color: COLORS.text2, marginBottom: '6px' }}>{p.supplier?.company_name}</div>
                  <div style={{ fontSize: '13px', color: COLORS.text2, lineHeight: '1.5', marginBottom: '14px' }}>{p.description}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '16px', fontWeight: '500', color: COLORS.dark }}>${Number(p.price_per_unit).toFixed(2)}<span style={{ fontSize: '11px', color: COLORS.text3, fontWeight: '400' }}>/unit</span></div>
                    <button onClick={() => { setSelectedProduct(p); setOrderQty(1); setShowNewOrder(true) }}
                      style={{ padding: '8px 16px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>
                      Order now
                    </button>
                  </div>
                </div>
              ))}
              {filteredProducts.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: COLORS.text3 }}>No products in this category</div>
              )}
            </div>
          </>
        )}

        {/* MY PROFILE */}
        {activeSection === 'profile' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '17px', fontWeight: '500', color: COLORS.dark }}>My Profile</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '16px' }}>Account details</div>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '3px' }}>Full name</div>
                  <div style={{ fontSize: '13px', color: COLORS.dark }}>{profile?.full_name}</div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '3px' }}>Practice / clinic</div>
                  <div style={{ fontSize: '13px', color: COLORS.dark }}>{profile?.company_name}</div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '3px' }}>Phone</div>
                  <div style={{ fontSize: '13px', color: COLORS.dark }}>{profile?.phone || 'Not set'}</div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '3px' }}>Account type</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: COLORS.amber2, color: '#633806', fontSize: '12px', fontWeight: '500', padding: '4px 10px', borderRadius: '20px' }}>
                    Doctor / Clinic — Always Free
                  </div>
                </div>
              </div>
              {rep && (
                <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '16px' }}>Your sales rep</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: COLORS.teal, color: COLORS.dark, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '16px' }}>
                      {rep.full_name?.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: COLORS.dark }}>{rep.full_name}</div>
                      <div style={{ fontSize: '12px', color: COLORS.text3 }}>{rep.company_name} · {rep.territory}</div>
                    </div>
                  </div>
                  <div style={{ padding: '12px', background: COLORS.green3, borderRadius: '8px', fontSize: '12px', color: '#085041' }}>
                    ✓ {rep.full_name} sees all your orders and is credited automatically — even when you order directly through Rovi.
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* REORDER MODAL */}
      {showReorder && selectedProduct && (
        <OrderModal product={selectedProduct} isReorder={true} onClose={() => { setShowReorder(false); setOrderQty(1) }} />
      )}

      {/* NEW ORDER MODAL */}
      {showNewOrder && selectedProduct && (
        <OrderModal product={selectedProduct} isReorder={false} onClose={() => { setShowNewOrder(false); setOrderQty(1) }} />
      )}
    </div>
  )
}