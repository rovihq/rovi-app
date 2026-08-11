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
  const [filters, setFilters] = useState({ status: 'all', repId: 'all' })
  const [editingId, setEditingId] = useState(null)
  const [editAmount, setEditAmount] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [showPayModal, setShowPayModal] = useState(null)
  const [payMethod, setPayMethod] = useState('ach')
  const [payReference, setPayReference] = useState('')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (supplierId) fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId])

  const fetchData = async () => {
    const [{ data: approvalsData }, { data: connections }] = await Promise.all([
      supabase.from('commission_approvals')
        .select('*, rep:profiles!commission_approvals_rep_id_fkey(full_name, company_name)')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false }),
      supabase.from('rep_supplier_connections')
        .select('rep:profiles!rep_supplier_connections_rep_id_fkey(id, full_name, company_name)')
        .eq('supplier_id', supplierId)
        .eq('status', 'active')
    ])
    setApprovals(approvalsData || [])
    setReps((connections || []).map(c => c.rep).filter(Boolean))
    setLoading(false)
  }

  const generateLastMonth = async () => {
    setGenerating(true)
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]

    for (const rep of reps) {
      const { data: existing } = await supabase
        .from('commission_approvals').select('id')
        .eq('supplier_id', supplierId).eq('rep_id', rep.id)
        .eq('period_start', periodStart).single()

      if (!existing) {
        const { data: orders } = await supabase
          .from('orders').select('total_price')
          .eq('credited_rep_id', rep.id).eq('supplier_id', supplierId)
          .gte('order_date', periodStart).lte('order_date', periodEnd)

        const revenue = (orders || []).reduce((s, o) => s + Number(o.total_price), 0)
        const { data: repProfile } = await supabase
          .from('profiles').select('commission_rate').eq('id', rep.id).single()
        const rate = repProfile?.commission_rate || 8

        await supabase.from('commission_approvals').insert({
          supplier_id: supplierId, rep_id: rep.id,
          period_start: periodStart, period_end: periodEnd,
          total_orders: orders?.length || 0, total_revenue: revenue,
          commission_rate: rate, commission_amount: revenue * (rate / 100),
          status: 'pending'
        })
      }
    }

    fetchData()
    setGenerating(false)
  }

  const approveAll = async () => {
    const pending = approvals.filter(a => a.status === 'pending')
    for (const a of pending) {
      await supabase.from('commission_approvals').update({
        status: 'approved', approved_at: new Date().toISOString()
      }).eq('id', a.id)
    }
    fetchData()
  }

  const approve = async (id) => {
    await supabase.from('commission_approvals').update({
      status: 'approved', approved_at: new Date().toISOString()
    }).eq('id', id)
    fetchData()
  }

  const saveEdit = async (id) => {
    await supabase.from('commission_approvals').update({
      commission_amount: parseFloat(editAmount),
      notes: editNotes
    }).eq('id', id)
    setEditingId(null)
    fetchData()
  }

  const confirmPayment = async () => {
    await supabase.from('commission_approvals').update({
      status: 'paid', paid_at: new Date().toISOString(),
      payment_method: payMethod, payment_reference: payReference
    }).eq('id', showPayModal)
    setShowPayModal(null)
    setPayMethod('ach')
    setPayReference('')
    fetchData()
  }

  const exportCSV = () => {
    const headers = ['Rep Name', 'Period Start', 'Period End', 'Orders', 'Revenue', 'Rate', 'Commission', 'Status', 'Paid At']
    const rows = approvals.map(a => [
      a.rep?.full_name, a.period_start, a.period_end, a.total_orders,
      Number(a.total_revenue).toFixed(2), `${a.commission_rate}%`,
      Number(a.commission_amount).toFixed(2), a.status,
      a.paid_at ? new Date(a.paid_at).toLocaleDateString() : ''
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rovi-commissions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = approvals.filter(a => {
    if (filters.status !== 'all' && a.status !== filters.status) return false
    if (filters.repId !== 'all' && a.rep_id !== filters.repId) return false
    return true
  })

  const summary = {
    pending: approvals.filter(a => a.status === 'pending').reduce((s, a) => s + Number(a.commission_amount), 0),
    approved: approvals.filter(a => a.status === 'approved').reduce((s, a) => s + Number(a.commission_amount), 0),
    paid: approvals.filter(a => a.status === 'paid').reduce((s, a) => s + Number(a.commission_amount), 0)
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: COLORS.text3 }}>Loading commission data...</div>

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'Pending approval', value: `$${summary.pending.toFixed(2)}`, color: COLORS.amber, bg: COLORS.amber2 },
          { label: 'Approved — to pay', value: `$${summary.approved.toFixed(2)}`, color: COLORS.purple3, bg: COLORS.purple2 },
          { label: 'Total paid all time', value: `$${summary.paid.toFixed(2)}`, color: COLORS.green, bg: COLORS.green3 },
        ].map((m, i) => (
          <div key={i} style={{ background: m.bg, borderRadius: '9px', padding: '14px 16px', border: `0.5px solid ${COLORS.border}` }}>
            <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '5px' }}>{m.label}</div>
            <div style={{ fontSize: '20px', fontWeight: '600', color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          style={{ ...inputStyle }}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
        </select>
        <select value={filters.repId} onChange={e => setFilters(f => ({ ...f, repId: e.target.value }))}
          style={{ ...inputStyle }}>
          <option value="all">All reps</option>
          {reps.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button onClick={exportCSV}
          style={{ padding: '8px 14px', background: COLORS.bg2, border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
          ↓ Export CSV
        </button>
        {approvals.some(a => a.status === 'pending') && (
          <button onClick={approveAll}
            style={{ padding: '8px 14px', background: COLORS.green3, color: COLORS.green, border: `0.5px solid #9FE1CB`, borderRadius: '7px', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            ✓ Approve all pending
          </button>
        )}
        <button onClick={generateLastMonth} disabled={generating || reps.length === 0}
          style={{ padding: '8px 14px', background: COLORS.amber, color: 'white', border: 'none', borderRadius: '7px', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: reps.length === 0 ? 0.5 : 1 }}>
          {generating ? 'Generating...' : '⚡ Generate last month'}
        </button>
      </div>

      <div style={{ fontSize: '12px', color: COLORS.text3, marginBottom: '12px' }}>
        Showing {filtered.length} of {approvals.length} records · Total filtered: ${filtered.reduce((s, a) => s + Number(a.commission_amount), 0).toFixed(2)}
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '60px', textAlign: 'center', color: COLORS.text3 }}>
          No commission approvals yet. Click "⚡ Generate last month" to create records.
        </div>
      ) : (
        <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', overflow: 'hidden' }}>
          {filtered.map(a => {
            const statusColor = a.status === 'paid'
              ? { bg: COLORS.green3, color: '#085041' }
              : a.status === 'approved'
              ? { bg: COLORS.purple2, color: COLORS.purple3 }
              : { bg: COLORS.amber2, color: '#633806' }

            return (
              <div key={a.id} style={{ padding: '16px', borderBottom: `0.5px solid ${COLORS.border}` }}>
                {editingId === a.id ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '4px' }}>Commission amount</div>
                      <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                        style={{ ...inputStyle, width: '140px' }} />
                    </div>
                    <div style={{ flex: 2 }}>
                      <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '4px' }}>Notes</div>
                      <input value={editNotes} onChange={e => setEditNotes(e.target.value)}
                        style={{ ...inputStyle, width: '100%' }} placeholder="Adjustment note..." />
                    </div>
                    <button onClick={() => saveEdit(a.id)}
                      style={{ padding: '8px 14px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '7px', fontSize: '12px', cursor: 'pointer' }}>
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)}
                      style={{ padding: '8px 14px', background: COLORS.bg2, border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', fontSize: '12px', cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: COLORS.purple2, color: COLORS.purple3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600', flexShrink: 0 }}>
                      {a.rep?.full_name?.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark, marginBottom: '2px' }}>{a.rep?.full_name}</div>
                      <div style={{ fontSize: '11px', color: COLORS.text3 }}>
                        {a.period_start} — {a.period_end} · {a.total_orders} orders · ${Number(a.total_revenue).toFixed(2)} revenue · {a.commission_rate}% rate
                      </div>
                      {a.status === 'paid' && a.payment_method && (
                        <div style={{ fontSize: '11px', color: '#085041', marginTop: '2px' }}>
                          Paid via {a.payment_method}{a.payment_reference ? ` · Ref: ${a.payment_reference}` : ''}
                        </div>
                      )}
                      {a.notes && <div style={{ fontSize: '11px', color: COLORS.text3, marginTop: '2px', fontStyle: 'italic' }}>{a.notes}</div>}
                    </div>
                    <div style={{ textAlign: 'right', marginRight: '8px' }}>
                      <div style={{ fontSize: '17px', fontWeight: '600', color: COLORS.amber }}>${Number(a.commission_amount).toFixed(2)}</div>
                      <span style={{ background: statusColor.bg, color: statusColor.color, fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', textTransform: 'capitalize' }}>
                        {a.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      {a.status === 'pending' && (
                        <>
                          <button onClick={() => { setEditingId(a.id); setEditAmount(a.commission_amount); setEditNotes(a.notes || '') }}
                            style={{ padding: '6px 10px', background: COLORS.bg2, border: `0.5px solid ${COLORS.border}`, borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>
                            Edit
                          </button>
                          <button onClick={() => approve(a.id)}
                            style={{ padding: '6px 12px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            ✓ Approve
                          </button>
                        </>
                      )}
                      {a.status === 'approved' && (
                        <button onClick={() => setShowPayModal(a.id)}
                          style={{ padding: '6px 12px', background: COLORS.purple2, color: COLORS.purple3, border: `0.5px solid #C5C4F5`, borderRadius: '6px', fontSize: '11px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          Mark paid
                        </button>
                      )}
                      {a.status === 'paid' && (
                        <span style={{ fontSize: '11px', color: '#085041', padding: '6px 12px' }}>
                          ✓ {a.paid_at ? new Date(a.paid_at).toLocaleDateString() : 'Paid'}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showPayModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,26,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 700 }}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '420px', maxWidth: '90vw' }}>
            <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>Record payment</div>
            <div style={{ fontSize: '13px', color: COLORS.text2, marginBottom: '20px' }}>How was this commission paid?</div>

            <label style={{ fontSize: '11px', color: COLORS.text3, display: 'block', marginBottom: '5px' }}>Payment method</label>
            <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
              style={{ ...inputStyle, width: '100%', marginBottom: '12px', boxSizing: 'border-box' }}>
              <option value="ach">ACH / Bank transfer</option>
              <option value="check">Check</option>
              <option value="wire">Wire transfer</option>
              <option value="other">Other</option>
            </select>

            <label style={{ fontSize: '11px', color: COLORS.text3, display: 'block', marginBottom: '5px' }}>Reference number (optional)</label>
            <input style={{ ...inputStyle, width: '100%', marginBottom: '12px', boxSizing: 'border-box' }}
              placeholder="e.g. check #1234 or transaction ID"
              value={payReference} onChange={e => setPayReference(e.target.value)} />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button onClick={() => setShowPayModal(null)}
                style={{ padding: '10px 20px', border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', background: 'white', cursor: 'pointer', fontSize: '13px' }}>
                Cancel
              </button>
              <button onClick={confirmPayment}
                style={{ padding: '10px 20px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                ✓ Confirm payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function RepCommissionPanel({ repId }) {
  const [approvals, setApprovals] = useState([])
  const [filters, setFilters] = useState({ status: 'all' })
  const [disputeId, setDisputeId] = useState(null)
  const [disputeNote, setDisputeNote] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (repId) fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repId])

  const fetchData = async () => {
    const { data } = await supabase
      .from('commission_approvals')
      .select('*, supplier:profiles!commission_approvals_supplier_id_fkey(full_name, company_name)')
      .eq('rep_id', repId)
      .order('created_at', { ascending: false })
    setApprovals(data || [])
    setLoading(false)
  }

  const submitDispute = async (id) => {
    await supabase.from('commission_approvals').update({
      notes: `[DISPUTED] ${disputeNote}`
    }).eq('id', id)
    setDisputeId(null)
    setDisputeNote('')
    fetchData()
  }

  const filtered = approvals.filter(a => filters.status === 'all' || a.status === filters.status)

  const summary = {
    pending: approvals.filter(a => a.status === 'pending').reduce((s, a) => s + Number(a.commission_amount), 0),
    approved: approvals.filter(a => a.status === 'approved').reduce((s, a) => s + Number(a.commission_amount), 0),
    paid: approvals.filter(a => a.status === 'paid').reduce((s, a) => s + Number(a.commission_amount), 0)
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: COLORS.text3 }}>Loading commission records...</div>

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'Pending', value: `$${summary.pending.toFixed(2)}`, color: COLORS.amber, bg: COLORS.amber2 },
          { label: 'Approved — incoming', value: `$${summary.approved.toFixed(2)}`, color: COLORS.purple3, bg: COLORS.purple2 },
          { label: 'Total paid', value: `$${summary.paid.toFixed(2)}`, color: COLORS.green, bg: COLORS.green3 },
        ].map((m, i) => (
          <div key={i} style={{ background: m.bg, borderRadius: '9px', padding: '14px 16px', border: `0.5px solid ${COLORS.border}` }}>
            <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '5px' }}>{m.label}</div>
            <div style={{ fontSize: '20px', fontWeight: '600', color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          style={{ ...inputStyle }}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
        </select>
        <div style={{ fontSize: '12px', color: COLORS.text3 }}>
          {filtered.length} records · Total: ${filtered.reduce((s, a) => s + Number(a.commission_amount), 0).toFixed(2)}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '60px', textAlign: 'center', color: COLORS.text3 }}>
          No commission records yet — your supplier will generate these monthly
        </div>
      ) : (
        <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', overflow: 'hidden' }}>
          {filtered.map(a => {
            const isDisputed = a.notes?.startsWith('[DISPUTED]')
            const statusLabel = a.status === 'pending' ? '⏳ Pending approval'
              : a.status === 'approved' ? '✓ Approved — payment coming'
              : '✓ Paid'
            const statusColor = a.status === 'paid'
              ? { bg: COLORS.green3, color: '#085041' }
              : a.status === 'approved'
              ? { bg: COLORS.purple2, color: COLORS.purple3 }
              : { bg: COLORS.amber2, color: '#633806' }

            return (
              <div key={a.id} style={{ padding: '16px', borderBottom: `0.5px solid ${COLORS.border}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark }}>
                        {a.supplier?.company_name || a.supplier?.full_name}
                      </span>
                      {isDisputed && (
                        <span style={{ background: '#FCEBEB', color: '#791F1F', fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>
                          ⚠ Disputed
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '4px' }}>
                      {a.period_start} — {a.period_end} · {a.total_orders} orders · ${Number(a.total_revenue).toFixed(2)} revenue · {a.commission_rate}% rate
                    </div>
                    {a.status === 'paid' && a.payment_method && (
                      <div style={{ fontSize: '11px', color: '#085041' }}>
                        ✓ Paid via {a.payment_method}{a.payment_reference ? ` · Ref: ${a.payment_reference}` : ''} · {a.paid_at ? new Date(a.paid_at).toLocaleDateString() : ''}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '17px', fontWeight: '600', color: COLORS.amber, marginBottom: '4px' }}>${Number(a.commission_amount).toFixed(2)}</div>
                    <span style={{ background: statusColor.bg, color: statusColor.color, fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>
                      {statusLabel}
                    </span>
                  </div>
                </div>

                {disputeId === a.id ? (
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <input value={disputeNote} onChange={e => setDisputeNote(e.target.value)}
                      style={{ ...inputStyle, flex: 1 }} placeholder="Describe the issue..." />
                    <button onClick={() => submitDispute(a.id)}
                      style={{ padding: '8px 14px', background: COLORS.red, color: 'white', border: 'none', borderRadius: '7px', fontSize: '12px', cursor: 'pointer' }}>
                      Submit
                    </button>
                    <button onClick={() => { setDisputeId(null); setDisputeNote('') }}
                      style={{ padding: '8px 14px', background: COLORS.bg2, border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', fontSize: '12px', cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  !isDisputed && a.status !== 'paid' && (
                    <button onClick={() => setDisputeId(a.id)}
                      style={{ marginTop: '8px', padding: '5px 10px', background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '6px', fontSize: '11px', color: COLORS.text2, cursor: 'pointer' }}>
                      ⚠ Flag issue
                    </button>
                  )
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
