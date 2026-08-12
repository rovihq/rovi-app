import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const COLORS = {
  green: '#0F6E56', teal: '#5DCAA5', dark: '#1C1C1A',
  border: '#E2E0D8', text2: '#5F5E5A', text3: '#A8A8A2',
  amber: '#EF9F27', amber2: '#FAEEDA', green3: '#E8F7F1',
  bg2: '#F7F5F2', red: '#E24B4A', purple3: '#3C3489', purple2: '#EEEDFE'
}

const inputStyle = {
  padding: '8px 12px', border: `0.5px solid ${COLORS.border}`,
  borderRadius: '7px', fontSize: '13px', outline: 'none',
  background: 'white', fontFamily: 'DM Sans, sans-serif'
}

export function SupplierCommissionPanel({ supplierId }) {
  const [approvals, setApprovals] = useState([])
  const [reps, setReps] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ rep: 'all', status: 'all', dateFrom: '', dateTo: '' })
  const [editingId, setEditingId] = useState(null)
  const [editAmount, setEditAmount] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [showPayModal, setShowPayModal] = useState(null)
  const [payMethod, setPayMethod] = useState('ach')
  const [payReference, setPayReference] = useState('')
  const [generating, setGenerating] = useState(false)
  const [summary, setSummary] = useState({ pending: 0, approved: 0, paid: 0 })

  useEffect(() => { if (supplierId) fetchAll() }, [supplierId])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: approvalsData }, { data: repsData }] = await Promise.all([
      supabase.from('commission_approvals')
        .select('*, rep:profiles!commission_approvals_rep_id_fkey(id, full_name, company_name)')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false }),
      supabase.from('rep_supplier_connections')
        .select('rep:profiles!rep_supplier_connections_rep_id_fkey(id, full_name)')
        .eq('supplier_id', supplierId)
        .eq('status', 'active')
    ])
    setApprovals(approvalsData || [])
    setReps(repsData?.map(r => r.rep) || [])
    calcSummary(approvalsData || [])
    setLoading(false)
  }

  const calcSummary = (data) => {
    setSummary({
      pending: data.filter(a => a.status === 'pending').reduce((s, a) => s + Number(a.commission_amount), 0),
      approved: data.filter(a => a.status === 'approved').reduce((s, a) => s + Number(a.commission_amount), 0),
      paid: data.filter(a => a.status === 'paid').reduce((s, a) => s + Number(a.commission_amount), 0),
    })
  }

  const filtered = approvals.filter(a => {
    if (filters.rep !== 'all' && a.rep_id !== filters.rep) return false
    if (filters.status !== 'all' && a.status !== filters.status) return false
    if (filters.dateFrom && new Date(a.period_start) < new Date(filters.dateFrom)) return false
    if (filters.dateTo && new Date(a.period_end) > new Date(filters.dateTo)) return false
    return true
  })

  const generateMonthly = async () => {
    setGenerating(true)
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]

    for (const rep of reps) {
      const { data: existing } = await supabase.from('commission_approvals').select('id')
        .eq('supplier_id', supplierId).eq('rep_id', rep.id).eq('period_start', periodStart).single()
      if (existing) continue

      const { data: orders } = await supabase.from('orders')
        .select('total_price').eq('supplier_id', supplierId).eq('credited_rep_id', rep.id)
        .gte('order_date', periodStart).lte('order_date', periodEnd)

      const { data: repProfile } = await supabase.from('profiles')
        .select('commission_rate').eq('id', rep.id).single()

      const revenue = (orders || []).reduce((s, o) => s + Number(o.total_price), 0)
      const rate = repProfile?.commission_rate || 8

      await supabase.from('commission_approvals').insert({
        supplier_id: supplierId, rep_id: rep.id,
        period_start: periodStart, period_end: periodEnd,
        total_orders: orders?.length || 0, total_revenue: revenue,
        commission_rate: rate, commission_amount: revenue * (rate / 100),
        status: 'pending'
      })
    }
    fetchAll()
    setGenerating(false)
  }

  const saveEdit = async (id) => {
    await supabase.from('commission_approvals').update({
      commission_amount: parseFloat(editAmount),
      notes: editNotes
    }).eq('id', id)
    setEditingId(null)
    fetchAll()
  }

  const approve = async (id) => {
    await supabase.from('commission_approvals').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id)
    fetchAll()
  }

  const approveAll = async () => {
    const pendingIds = filtered.filter(a => a.status === 'pending').map(a => a.id)
    for (const id of pendingIds) {
      await supabase.from('commission_approvals').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id)
    }
    fetchAll()
  }

  const confirmPay = async () => {
    await supabase.from('commission_approvals').update({
      status: 'paid', paid_at: new Date().toISOString(),
      payment_method: payMethod, payment_reference: payReference
    }).eq('id', showPayModal)
    setShowPayModal(null)
    setPayMethod('ach')
    setPayReference('')
    fetchAll()
  }

  const exportCSV = () => {
    const headers = ['Rep', 'Period', 'Orders', 'Revenue', 'Rate', 'Commission', 'Status', 'Payment Method', 'Reference', 'Notes']
    const rows = filtered.map(a => [
      a.rep?.full_name, `${a.period_start} to ${a.period_end}`,
      a.total_orders, Number(a.total_revenue).toFixed(2),
      `${a.commission_rate}%`, Number(a.commission_amount).toFixed(2),
      a.status, a.payment_method || '', a.payment_reference || '', a.notes || ''
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rovi-commissions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const statusColors = {
    pending: { bg: COLORS.amber2, color: '#633806' },
    approved: { bg: COLORS.purple2, color: COLORS.purple3 },
    paid: { bg: COLORS.green3, color: '#085041' }
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: COLORS.text3 }}>Loading commissions...</div>

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>

      {/* SUMMARY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Pending approval', value: `$${summary.pending.toFixed(2)}`, color: COLORS.amber, bg: COLORS.amber2 },
          { label: 'Approved — to pay', value: `$${summary.approved.toFixed(2)}`, color: COLORS.purple3, bg: COLORS.purple2 },
          { label: 'Total paid all time', value: `$${summary.paid.toFixed(2)}`, color: COLORS.green, bg: COLORS.green3 },
        ].map((m, i) => (
          <div key={i} style={{ background: m.bg, border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: m.color, fontWeight: '500', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* FILTERS */}
      <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '4px' }}>Rep</div>
            <select style={inputStyle} value={filters.rep} onChange={e => setFilters({...filters, rep: e.target.value})}>
              <option value="all">All reps</option>
              {reps.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '4px' }}>Status</div>
            <select style={inputStyle} value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '4px' }}>Period from</div>
            <input style={{ ...inputStyle, minWidth: '130px' }} type="date" value={filters.dateFrom} onChange={e => setFilters({...filters, dateFrom: e.target.value})} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '4px' }}>Period to</div>
            <input style={{ ...inputStyle, minWidth: '130px' }} type="date" value={filters.dateTo} onChange={e => setFilters({...filters, dateTo: e.target.value})} />
          </div>
          <button onClick={() => setFilters({ rep: 'all', status: 'all', dateFrom: '', dateTo: '' })}
            style={{ ...inputStyle, cursor: 'pointer', color: COLORS.text2 }}>Clear</button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button onClick={exportCSV}
              style={{ padding: '8px 14px', background: COLORS.bg2, color: COLORS.text2, border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', fontSize: '12px', cursor: 'pointer' }}>
              ↓ Export CSV
            </button>
            <button onClick={approveAll} disabled={!filtered.some(a => a.status === 'pending')}
              style={{ padding: '8px 14px', background: COLORS.purple2, color: COLORS.purple3, border: `0.5px solid #C5C4F5`, borderRadius: '7px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>
              ✓ Approve all pending
            </button>
            <button onClick={generateMonthly} disabled={generating}
              style={{ padding: '8px 14px', background: COLORS.amber, color: 'white', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>
              {generating ? 'Generating...' : '⚡ Generate last month'}
            </button>
          </div>
        </div>
        <div style={{ marginTop: '10px', fontSize: '12px', color: COLORS.text3 }}>
          Showing {filtered.length} of {approvals.length} records · Total filtered: <strong style={{ color: COLORS.dark }}>${filtered.reduce((s, a) => s + Number(a.commission_amount), 0).toFixed(2)}</strong>
        </div>
      </div>

      {/* COMMISSION LIST */}
      {filtered.length === 0 ? (
        <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '60px', textAlign: 'center', color: COLORS.text3 }}>
          No commission records match your filters
        </div>
      ) : (
        <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', overflow: 'hidden' }}>
          {filtered.map(a => {
            const sc = statusColors[a.status] || statusColors.pending
            const isEditing = editingId === a.id
            return (
              <div key={a.id} style={{ padding: '16px', borderBottom: `0.5px solid ${COLORS.border}`, background: isEditing ? '#FAFAF7' : 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: COLORS.purple2, color: COLORS.purple3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600', flexShrink: 0 }}>
                    {a.rep?.full_name?.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark }}>{a.rep?.full_name}</div>
                    <div style={{ fontSize: '11px', color: COLORS.text3 }}>{a.period_start} — {a.period_end} · {a.total_orders} orders · ${Number(a.total_revenue).toFixed(2)} revenue · {a.commission_rate}% rate</div>
                    {a.notes && <div style={{ fontSize: '11px', color: COLORS.text2, marginTop: '2px', fontStyle: 'italic' }}>Note: {a.notes}</div>}
                    {a.payment_method && a.status === 'paid' && <div style={{ fontSize: '11px', color: '#085041', marginTop: '2px' }}>Paid via {a.payment_method}{a.payment_reference ? ` · Ref: ${a.payment_reference}` : ''}</div>}
                  </div>

                  {isEditing ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: COLORS.text3, marginBottom: '3px' }}>Amount ($)</div>
                        <input type="number" step="0.01" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                          style={{ ...inputStyle, width: '100px' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: COLORS.text3, marginBottom: '3px' }}>Notes</div>
                        <input value={editNotes} onChange={e => setEditNotes(e.target.value)}
                          placeholder="Reason for edit..." style={{ ...inputStyle, width: '180px' }} />
                      </div>
                      <button onClick={() => saveEdit(a.id)}
                        style={{ padding: '7px 14px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '500', marginTop: '14px' }}>Save</button>
                      <button onClick={() => setEditingId(null)}
                        style={{ padding: '7px 12px', background: COLORS.bg2, color: COLORS.text2, border: `0.5px solid ${COLORS.border}`, borderRadius: '6px', fontSize: '12px', cursor: 'pointer', marginTop: '14px' }}>Cancel</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div style={{ textAlign: 'right', marginRight: '8px' }}>
                        <div style={{ fontSize: '18px', fontWeight: '600', color: COLORS.amber }}>${Number(a.commission_amount).toFixed(2)}</div>
                        <div style={{ fontSize: '10px', color: COLORS.text3 }}>commission</div>
                      </div>
                      <span style={{ background: sc.bg, color: sc.color, fontSize: '10px', fontWeight: '600', padding: '3px 9px', borderRadius: '20px', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{a.status}</span>
                      {a.status !== 'paid' && (
                        <button onClick={() => { setEditingId(a.id); setEditAmount(Number(a.commission_amount).toFixed(2)); setEditNotes(a.notes || '') }}
                          style={{ padding: '6px 10px', background: COLORS.bg2, color: COLORS.text2, border: `0.5px solid ${COLORS.border}`, borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>Edit</button>
                      )}
                      {a.status === 'pending' && (
                        <button onClick={() => approve(a.id)}
                          style={{ padding: '6px 12px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '500', cursor: 'pointer' }}>✓ Approve</button>
                      )}
                      {a.status === 'approved' && (
                        <button onClick={() => setShowPayModal(a.id)}
                          style={{ padding: '6px 12px', background: COLORS.purple2, color: COLORS.purple3, border: `0.5px solid #C5C4F5`, borderRadius: '6px', fontSize: '11px', fontWeight: '500', cursor: 'pointer' }}>Mark paid</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* PAY MODAL */}
      {showPayModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,26,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 700 }}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '420px' }}>
            <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>Record payment</div>
            <div style={{ fontSize: '13px', color: COLORS.text2, marginBottom: '20px' }}>How was this commission paid?</div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', color: COLORS.text3, display: 'block', marginBottom: '4px' }}>Payment method</label>
              <select style={{ ...inputStyle, width: '100%' }} value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                <option value="ach">ACH / Bank transfer</option>
                <option value="check">Check</option>
                <option value="wire">Wire transfer</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '11px', color: COLORS.text3, display: 'block', marginBottom: '4px' }}>Reference number (optional)</label>
              <input style={{ ...inputStyle, width: '100%' }} placeholder="Check #, transaction ID..." value={payReference} onChange={e => setPayReference(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPayModal(null)} style={{ padding: '10px 20px', border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', background: 'white', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={confirmPay} style={{ padding: '10px 20px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>Confirm payment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function RepCommissionPanel({ repId, orders }) {
  const [approvals, setApprovals] = useState([])
  const [filters, setFilters] = useState({ status: 'all', dateFrom: '', dateTo: '', supplier: 'all' })
  const [disputeId, setDisputeId] = useState(null)
  const [disputeNote, setDisputeNote] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (repId) fetchApprovals() }, [repId])

  const fetchApprovals = async () => {
    const { data } = await supabase.from('commission_approvals')
      .select('*, supplier:profiles!commission_approvals_supplier_id_fkey(id, company_name, full_name)')
      .eq('rep_id', repId)
      .order('created_at', { ascending: false })
    setApprovals(data || [])
    setLoading(false)
  }

  const submitDispute = async (id) => {
    await supabase.from('commission_approvals').update({
      notes: `[DISPUTED by rep] ${disputeNote}`
    }).eq('id', id)
    setDisputeId(null)
    setDisputeNote('')
    fetchApprovals()
  }

  const suppliers = [...new Map(approvals.map(a => [a.supplier?.id, a.supplier])).values()].filter(Boolean)

  const filtered = approvals.filter(a => {
    if (filters.status !== 'all' && a.status !== filters.status) return false
    if (filters.supplier !== 'all' && a.supplier_id !== filters.supplier) return false
    if (filters.dateFrom && new Date(a.period_start) < new Date(filters.dateFrom)) return false
    if (filters.dateTo && new Date(a.period_end) > new Date(filters.dateTo)) return false
    return true
  })

  const totalEarned = orders?.reduce((s, o) => s + Number(o.total_price) * 0.08, 0) || 0
  const totalApproved = approvals.filter(a => a.status === 'approved').reduce((s, a) => s + Number(a.commission_amount), 0)
  const totalPaid = approvals.filter(a => a.status === 'paid').reduce((s, a) => s + Number(a.commission_amount), 0)
  const totalPending = approvals.filter(a => a.status === 'pending').reduce((s, a) => s + Number(a.commission_amount), 0)

  const statusColors = {
    pending: { bg: COLORS.amber2, color: '#633806', label: '⏳ Pending approval' },
    approved: { bg: COLORS.purple2, color: COLORS.purple3, label: '✓ Approved — payment coming' },
    paid: { bg: COLORS.green3, color: '#085041', label: '✓ Paid' }
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: COLORS.text3 }}>Loading commissions...</div>

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>

      {/* SUMMARY */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'Total earned (est.)', value: `$${totalEarned.toFixed(2)}`, color: COLORS.dark },
          { label: 'Pending approval', value: `$${totalPending.toFixed(2)}`, color: COLORS.amber },
          { label: 'Approved — incoming', value: `$${totalApproved.toFixed(2)}`, color: COLORS.purple3 },
          { label: 'Total received', value: `$${totalPaid.toFixed(2)}`, color: COLORS.green },
        ].map((m, i) => (
          <div key={i} style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '9px', padding: '14px' }}>
            <div style={{ fontSize: '10px', color: COLORS.text3, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</div>
            <div style={{ fontSize: '20px', fontWeight: '600', color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* FILTERS */}
      <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '14px 16px', marginBottom: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '4px' }}>Status</div>
          <select style={inputStyle} value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '4px' }}>Supplier</div>
          <select style={inputStyle} value={filters.supplier} onChange={e => setFilters({...filters, supplier: e.target.value})}>
            <option value="all">All suppliers</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.company_name || s.full_name}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '4px' }}>From</div>
          <input style={{ ...inputStyle, minWidth: '130px' }} type="date" value={filters.dateFrom} onChange={e => setFilters({...filters, dateFrom: e.target.value})} />
        </div>
        <div>
          <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '4px' }}>To</div>
          <input style={{ ...inputStyle, minWidth: '130px' }} type="date" value={filters.dateTo} onChange={e => setFilters({...filters, dateTo: e.target.value})} />
        </div>
        <button onClick={() => setFilters({ status: 'all', dateFrom: '', dateTo: '', supplier: 'all' })}
          style={{ ...inputStyle, cursor: 'pointer', color: COLORS.text2 }}>Clear</button>
        <div style={{ marginLeft: 'auto', fontSize: '12px', color: COLORS.text3 }}>
          {filtered.length} records · <strong style={{ color: COLORS.dark }}>${filtered.reduce((s, a) => s + Number(a.commission_amount), 0).toFixed(2)}</strong> total
        </div>
      </div>

      {/* COMMISSION LIST */}
      {filtered.length === 0 ? (
        <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '48px', textAlign: 'center', color: COLORS.text3 }}>
          No commission records yet — your supplier will generate these monthly
        </div>
      ) : filtered.map(a => {
        const sc = statusColors[a.status] || statusColors.pending
        const isDisputed = a.notes?.includes('[DISPUTED')
        return (
          <div key={a.id} style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '18px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: COLORS.green3, color: COLORS.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600', flexShrink: 0 }}>
                {(a.supplier?.company_name || a.supplier?.full_name)?.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: COLORS.dark }}>{a.supplier?.company_name || a.supplier?.full_name}</div>
                  <span style={{ background: sc.bg, color: sc.color, fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>{sc.label}</span>
                  {isDisputed && <span style={{ background: '#FCEBEB', color: '#791F1F', fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>⚠ Disputed</span>}
                </div>
                <div style={{ fontSize: '12px', color: COLORS.text3 }}>
                  {a.period_start} — {a.period_end} · {a.total_orders} orders · ${Number(a.total_revenue).toFixed(2)} revenue · {a.commission_rate}% rate
                </div>
                {a.status === 'paid' && a.payment_method && (
                  <div style={{ fontSize: '11px', color: '#085041', marginTop: '3px' }}>
                    ✓ Paid via {a.payment_method}{a.payment_reference ? ` · Ref: ${a.payment_reference}` : ''}
                    {a.paid_at ? ` · ${new Date(a.paid_at).toLocaleDateString()}` : ''}
                  </div>
                )}
                {a.notes && !isDisputed && <div style={{ fontSize: '11px', color: COLORS.text2, marginTop: '3px', fontStyle: 'italic' }}>Note: {a.notes}</div>}
                {isDisputed && <div style={{ fontSize: '11px', color: '#791F1F', marginTop: '3px' }}>{a.notes}</div>}

                {disputeId === a.id && (
                  <div style={{ marginTop: '12px', padding: '12px', background: '#FCEBEB', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: '#791F1F', marginBottom: '8px' }}>Flag a discrepancy</div>
                    <input value={disputeNote} onChange={e => setDisputeNote(e.target.value)}
                      placeholder="Describe the issue (e.g. missing 3 orders from Oct 15-20)..."
                      style={{ ...inputStyle, width: '100%', marginBottom: '8px' }} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => submitDispute(a.id)}
                        style={{ padding: '7px 14px', background: COLORS.red, color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>Submit dispute</button>
                      <button onClick={() => setDisputeId(null)}
                        style={{ padding: '7px 12px', background: 'white', color: COLORS.text2, border: `0.5px solid ${COLORS.border}`, borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '22px', fontWeight: '600', color: COLORS.amber }}>${Number(a.commission_amount).toFixed(2)}</div>
                <div style={{ fontSize: '10px', color: COLORS.text3, marginBottom: '8px' }}>commission</div>
                {a.status !== 'paid' && !isDisputed && disputeId !== a.id && (
                  <button onClick={() => setDisputeId(a.id)}
                    style={{ padding: '5px 10px', background: '#FCEBEB', color: '#791F1F', border: 'none', borderRadius: '5px', fontSize: '11px', cursor: 'pointer' }}>
                    ⚠ Flag issue
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
