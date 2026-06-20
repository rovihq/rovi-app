import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const COLORS = {
  green: '#0F6E56', teal: '#5DCAA5', dark: '#1C1C1A',
  dark2: '#2C2C2A', bg2: '#F0EDE6', border: '#E2E0D8',
  text2: '#5F5E5A', text3: '#A8A8A2', amber: '#EF9F27',
  amber2: '#FAEEDA', red: '#E24B4A', green3: '#E8F7F1',
  purple2: '#EEEDFE', purple3: '#3C3489'
}

export default function EnterprisePanel({ profile }) {
  const [activeTab, setActiveTab] = useState('reps')
  const [reps, setReps] = useState([])
  const [approvals, setApprovals] = useState([])
  const [allRepsPool, setAllRepsPool] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddRep, setShowAddRep] = useState(false)
  const [showCreateRep, setShowCreateRep] = useState(false)
  const [newRep, setNewRep] = useState({ full_name: '', email: '', company_name: '', territory: '', commission_rate: 8 })
  const [showPayModal, setShowPayModal] = useState(null)
  const [payMethod, setPayMethod] = useState('ach')
  const [payReference, setPayReference] = useState('')
  const [payNotes, setPayNotes] = useState('')
  const [creating, setCreating] = useState(false)
  const [createMsg, setCreateMsg] = useState('')
  const [generatingApprovals, setGeneratingApprovals] = useState(false)

  useEffect(() => {
    if (profile?.id) fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  const fetchAll = async () => {
    const { data: connections } = await supabase
      .from('rep_supplier_connections')
      .select('*, rep:profiles!rep_supplier_connections_rep_id_fkey(id, full_name, company_name, territory, commission_rate, phone)')
      .eq('supplier_id', profile.id)
      .eq('status', 'active')

    const repsWithData = await Promise.all((connections || []).map(async (conn) => {
      const { data: orders } = await supabase
        .from('orders')
        .select('total_price, order_date, status')
        .eq('credited_rep_id', conn.rep_id)
        .eq('supplier_id', profile.id)

      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const mtdOrders = (orders || []).filter(o => new Date(o.order_date) >= monthStart)
      const totalRevenue = (orders || []).reduce((s, o) => s + Number(o.total_price), 0)
      const mtdRevenue = mtdOrders.reduce((s, o) => s + Number(o.total_price), 0)
      const commRate = conn.rep?.commission_rate || 8

      return {
        ...conn.rep,
        connectionId: conn.id,
        totalOrders: orders?.length || 0,
        totalRevenue,
        mtdRevenue,
        mtdOrders: mtdOrders.length,
        commission: totalRevenue * (commRate / 100),
        mtdCommission: mtdRevenue * (commRate / 100),
        commissionRate: commRate
      }
    }))

    setReps(repsWithData)

    const { data: approvalsData } = await supabase
      .from('commission_approvals')
      .select('*, rep:profiles!commission_approvals_rep_id_fkey(full_name, company_name)')
      .eq('supplier_id', profile.id)
      .order('created_at', { ascending: false })

    setApprovals(approvalsData || [])

    const connectedIds = (connections || []).map(c => c.rep_id)
    const { data: allReps } = await supabase
      .from('profiles')
      .select('id, full_name, company_name, territory')
      .eq('role', 'rep')
    setAllRepsPool((allReps || []).filter(r => !connectedIds.includes(r.id)))

    setLoading(false)
  }

  const updateCommissionRate = async (repId, rate) => {
    await supabase.from('profiles').update({ commission_rate: parseFloat(rate) }).eq('id', repId)
    fetchAll()
  }

  const removeRep = async (connectionId) => {
    await supabase.from('rep_supplier_connections').update({ status: 'removed', removed_at: new Date().toISOString() }).eq('id', connectionId)
    fetchAll()
  }

  const connectExistingRep = async (repId) => {
    await supabase.from('rep_supplier_connections').upsert({
      rep_id: repId, supplier_id: profile.id, status: 'active', connected_at: new Date().toISOString()
    }, { onConflict: 'rep_id,supplier_id' })
    fetchAll()
    setShowAddRep(false)
  }

  const createNewRep = async () => {
    if (!newRep.email || !newRep.full_name) return
    setCreating(true)
    setCreateMsg('')

    const { error: signUpError } = await supabase.auth.signUp({
      email: newRep.email,
      password: 'TempPass123!',
      options: {
        data: {
          full_name: newRep.full_name,
          company_name: newRep.company_name,
          role: 'rep'
        }
      }
    })

    if (signUpError) { setCreateMsg('Error: ' + signUpError.message); setCreating(false); return }

    setTimeout(async () => {
      const { data: repProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('full_name', newRep.full_name)
        .eq('role', 'rep')
        .single()

      if (repProfile) {
        await supabase.from('profiles').update({
          territory: newRep.territory,
          commission_rate: parseFloat(newRep.commission_rate),
          assigned_supplier_id: profile.id
        }).eq('id', repProfile.id)

        await supabase.from('rep_supplier_connections').upsert({
          rep_id: repProfile.id,
          supplier_id: profile.id,
          status: 'active',
          connected_at: new Date().toISOString()
        }, { onConflict: 'rep_id,supplier_id' })
      }

      setCreateMsg('Rep created and connected!')
      fetchAll()
      setTimeout(() => {
        setShowCreateRep(false)
        setCreateMsg('')
        setNewRep({ full_name: '', email: '', company_name: '', territory: '', commission_rate: 8 })
        setCreating(false)
      }, 1500)
    }, 1500)
  }

  const generateMonthlyApprovals = async () => {
    setGeneratingApprovals(true)
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]

    for (const rep of reps) {
      const { data: existing } = await supabase
        .from('commission_approvals')
        .select('id')
        .eq('supplier_id', profile.id)
        .eq('rep_id', rep.id)
        .eq('period_start', periodStart)
        .single()

      if (!existing) {
        await supabase.from('commission_approvals').insert({
          supplier_id: profile.id,
          rep_id: rep.id,
          period_start: periodStart,
          period_end: periodEnd,
          total_orders: rep.totalOrders,
          total_revenue: rep.totalRevenue,
          commission_rate: rep.commissionRate,
          commission_amount: rep.commission,
          status: 'pending'
        })
      }
    }

    fetchAll()
    setGeneratingApprovals(false)
  }

  const approveCommission = async (approvalId) => {
    await supabase.from('commission_approvals').update({
      status: 'approved',
      approved_at: new Date().toISOString()
    }).eq('id', approvalId)
    fetchAll()
  }

  const markPaid = (approvalId) => {
    setShowPayModal(approvalId)
  }

  const confirmPayment = async () => {
    if (!showPayModal) return
    await supabase.from('commission_approvals').update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_method: payMethod,
      payment_reference: payReference,
      payment_notes: payNotes
    }).eq('id', showPayModal)
    setShowPayModal(null)
    setPayMethod('ach')
    setPayReference('')
    setPayNotes('')
    fetchAll()
  }

  const exportCSV = () => {
    const headers = ['Rep Name', 'Company', 'Territory', 'Total Orders', 'Total Revenue', 'Commission Rate', 'Commission Owed', 'MTD Revenue', 'MTD Commission']
    const rows = reps.map(r => [
      r.full_name, r.company_name, r.territory || '',
      r.totalOrders, r.totalRevenue.toFixed(2),
      `${r.commissionRate}%`, r.commission.toFixed(2),
      r.mtdRevenue.toFixed(2), r.mtdCommission.toFixed(2)
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rovi-rep-performance-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportCommissionCSV = () => {
    const headers = ['Rep Name', 'Period', 'Total Orders', 'Total Revenue', 'Commission Rate', 'Commission Amount', 'Status', 'Approved At', 'Paid At']
    const rows = approvals.map(a => [
      a.rep?.full_name, `${a.period_start} to ${a.period_end}`,
      a.total_orders, Number(a.total_revenue).toFixed(2),
      `${a.commission_rate}%`, Number(a.commission_amount).toFixed(2),
      a.status, a.approved_at ? new Date(a.approved_at).toLocaleDateString() : '',
      a.paid_at ? new Date(a.paid_at).toLocaleDateString() : ''
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rovi-commission-approvals-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const inputStyle = { width: '100%', padding: '10px 12px', border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', fontSize: '13px', marginBottom: '10px', outline: 'none', background: 'white', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }

  const tabs = [
    { id: 'reps', label: '👥 Rep Management' },
    { id: 'commissions', label: '💰 Commission Approvals' },
    { id: 'exports', label: '📊 Exports' },
  ]

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: COLORS.text3 }}>Loading enterprise data...</div>

  return (
    <div>
      {/* Enterprise badge */}
      <div style={{ background: COLORS.dark, borderRadius: '10px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ background: COLORS.teal, color: COLORS.dark, fontSize: '10px', fontWeight: '600', padding: '2px 10px', borderRadius: '20px' }}>⭐ ENTERPRISE</span>
            <div style={{ fontSize: '15px', fontWeight: '500', color: '#F0EDE6' }}>Enterprise Management</div>
          </div>
          <div style={{ fontSize: '12px', color: '#5F5E5A' }}>Full rep network, commission payroll and export suite</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '22px', fontWeight: '600', color: COLORS.teal }}>{reps.length}</div>
          <div style={{ fontSize: '11px', color: '#5F5E5A' }}>Active reps</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: COLORS.bg2, borderRadius: '8px', padding: '4px' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ flex: 1, padding: '9px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: activeTab === tab.id ? '500' : '400', background: activeTab === tab.id ? 'white' : 'transparent', color: activeTab === tab.id ? COLORS.dark : COLORS.text3, fontFamily: 'DM Sans, sans-serif', boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* REP MANAGEMENT */}
      {activeTab === 'reps' && (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button onClick={() => setShowCreateRep(true)}
              style={{ padding: '9px 16px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
              + Create new rep
            </button>
            <button onClick={() => setShowAddRep(!showAddRep)}
              style={{ padding: '9px 16px', background: COLORS.bg2, color: COLORS.text2, border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', fontSize: '13px', cursor: 'pointer' }}>
              + Add existing rep
            </button>
          </div>

          {showAddRep && allRepsPool.length > 0 && (
            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '12px' }}>Available reps on Rovi</div>
              {allRepsPool.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: `0.5px solid ${COLORS.border}` }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: COLORS.purple2, color: COLORS.purple3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600' }}>{r.full_name?.charAt(0)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark }}>{r.full_name}</div>
                    <div style={{ fontSize: '11px', color: COLORS.text3 }}>{r.company_name} · {r.territory || 'No territory'}</div>
                  </div>
                  <button onClick={() => connectExistingRep(r.id)}
                    style={{ padding: '6px 14px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                    Connect
                  </button>
                </div>
              ))}
              {allRepsPool.length === 0 && <div style={{ color: COLORS.text3, fontSize: '13px', textAlign: 'center', padding: '20px' }}>No available reps to connect</div>}
            </div>
          )}

          {reps.length === 0 ? (
            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '60px', textAlign: 'center', color: COLORS.text3 }}>
              No reps connected yet. Create or add your first rep above.
            </div>
          ) : reps.map(rep => (
            <div key={rep.id} style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '20px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: COLORS.purple2, color: COLORS.purple3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '600', flexShrink: 0 }}>
                  {rep.full_name?.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: '500', color: COLORS.dark, marginBottom: '2px' }}>{rep.full_name}</div>
                  <div style={{ fontSize: '12px', color: COLORS.text3 }}>{rep.company_name} · {rep.territory || 'No territory'}</div>
                </div>
                <button onClick={() => removeRep(rep.connectionId)}
                  style={{ padding: '6px 12px', background: '#FCEBEB', color: '#791F1F', border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>
                  Remove
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '14px' }}>
                {[
                  { label: 'Total orders', value: rep.totalOrders },
                  { label: 'Total revenue', value: `$${rep.totalRevenue.toFixed(2)}` },
                  { label: 'MTD revenue', value: `$${rep.mtdRevenue.toFixed(2)}` },
                  { label: 'Commission owed', value: `$${rep.commission.toFixed(2)}`, highlight: true },
                ].map((m, i) => (
                  <div key={i} style={{ background: m.highlight ? '#FFF9F0' : COLORS.bg2, borderRadius: '8px', padding: '10px 12px', border: m.highlight ? `0.5px solid #FAC775` : 'none' }}>
                    <div style={{ fontSize: '10px', color: COLORS.text3, marginBottom: '4px' }}>{m.label}</div>
                    <div style={{ fontSize: '15px', fontWeight: '500', color: m.highlight ? COLORS.amber : COLORS.dark }}>{m.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: '#FFF9F0', border: `0.5px solid #FAC775`, borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#633806', flex: 1 }}>Commission rate for {rep.full_name?.split(' ')[0]}</div>
                <input type="number" defaultValue={rep.commissionRate} min="0" max="100" step="0.5"
                  onBlur={e => updateCommissionRate(rep.id, e.target.value)}
                  style={{ width: '60px', padding: '5px 8px', border: `0.5px solid #FAC775`, borderRadius: '5px', fontSize: '13px', fontWeight: '500', textAlign: 'center', outline: 'none', background: 'white' }} />
                <span style={{ fontSize: '13px', color: '#633806', fontWeight: '500' }}>%</span>
              </div>
            </div>
          ))}
        </>
      )}

      {/* COMMISSION APPROVALS */}
      {activeTab === 'commissions' && (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
            <button onClick={generateMonthlyApprovals} disabled={generatingApprovals || reps.length === 0}
              style={{ padding: '9px 16px', background: COLORS.amber, color: 'white', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', opacity: reps.length === 0 ? 0.5 : 1 }}>
              {generatingApprovals ? 'Generating...' : '⚡ Generate last month'}
            </button>
            <div style={{ fontSize: '12px', color: COLORS.text3 }}>Creates approval records for all reps based on last month's orders</div>
          </div>

          {approvals.length === 0 ? (
            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '60px', textAlign: 'center', color: COLORS.text3 }}>
              No commission approvals yet. Click "Generate last month" to create approval records.
            </div>
          ) : (
            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', overflow: 'hidden' }}>
              {approvals.map(a => {
                const statusColor = a.status === 'paid' ? { bg: COLORS.green3, color: '#085041' } : a.status === 'approved' ? { bg: COLORS.purple2, color: COLORS.purple3 } : { bg: COLORS.amber2, color: '#633806' }
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', borderBottom: `0.5px solid ${COLORS.border}` }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: COLORS.purple2, color: COLORS.purple3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600', flexShrink: 0 }}>
                      {a.rep?.full_name?.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark, marginBottom: '2px' }}>{a.rep?.full_name}</div>
                      <div style={{ fontSize: '11px', color: COLORS.text3 }}>{a.period_start} → {a.period_end} · {a.total_orders} orders · ${Number(a.total_revenue).toFixed(2)} revenue</div>
                    </div>
                    <div style={{ textAlign: 'right', marginRight: '8px' }}>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: COLORS.amber }}>${Number(a.commission_amount).toFixed(2)}</div>
                      <div style={{ fontSize: '10px', color: COLORS.text3 }}>{a.commission_rate}% rate</div>
                    </div>
                    <span style={{ background: statusColor.bg, color: statusColor.color, fontSize: '10px', fontWeight: '600', padding: '3px 9px', borderRadius: '20px', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                      {a.status}
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {a.status === 'pending' && (
                        <button onClick={() => approveCommission(a.id)}
                          style={{ padding: '6px 12px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          ✓ Approve
                        </button>
                      )}
                      {a.status === 'approved' && (
                        <button onClick={() => markPaid(a.id)}
                          style={{ padding: '6px 12px', background: COLORS.purple2, color: COLORS.purple3, border: `0.5px solid #C5C4F5`, borderRadius: '6px', fontSize: '11px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          Mark paid
                        </button>
                      )}
                      {a.status === 'paid' && (
                        <span style={{ fontSize: '11px', color: '#085041', padding: '6px 12px' }}>✓ Paid {a.paid_at ? new Date(a.paid_at).toLocaleDateString() : ''}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {approvals.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginTop: '16px' }}>
              {[
                { label: 'Pending approval', value: `$${approvals.filter(a => a.status === 'pending').reduce((s, a) => s + Number(a.commission_amount), 0).toFixed(2)}`, color: COLORS.amber },
                { label: 'Approved — to pay', value: `$${approvals.filter(a => a.status === 'approved').reduce((s, a) => s + Number(a.commission_amount), 0).toFixed(2)}`, color: COLORS.purple3 },
                { label: 'Total paid', value: `$${approvals.filter(a => a.status === 'paid').reduce((s, a) => s + Number(a.commission_amount), 0).toFixed(2)}`, color: COLORS.green },
              ].map((m, i) => (
                <div key={i} style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '9px', padding: '14px' }}>
                  <div style={{ fontSize: '11px', color: COLORS.text3, marginBottom: '5px' }}>{m.label}</div>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: m.color }}>{m.value}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* EXPORTS */}
      {activeTab === 'exports' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '24px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
              <div style={{ fontSize: '15px', fontWeight: '500', color: COLORS.dark, marginBottom: '6px' }}>Rep Performance Report</div>
              <div style={{ fontSize: '12px', color: COLORS.text3, marginBottom: '20px', lineHeight: '1.6' }}>
                Full rep performance data including total orders, revenue, commission rate and commission owed for all connected reps.
              </div>
              <button onClick={exportCSV}
                style={{ width: '100%', padding: '10px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                ↓ Download CSV
              </button>
            </div>

            <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '24px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>💰</div>
              <div style={{ fontSize: '15px', fontWeight: '500', color: COLORS.dark, marginBottom: '6px' }}>Commission Approvals Report</div>
              <div style={{ fontSize: '12px', color: COLORS.text3, marginBottom: '20px', lineHeight: '1.6' }}>
                Full commission approval history including amounts, dates, approval status and payment dates for all reps.
              </div>
              <button onClick={exportCommissionCSV}
                style={{ width: '100%', padding: '10px', background: COLORS.amber, color: 'white', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                ↓ Download CSV
              </button>
            </div>
          </div>

          <div style={{ background: COLORS.bg2, border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark, marginBottom: '8px' }}>Coming soon</div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {['PDF commission statements per rep', '1099 export for contractors', 'YTD revenue summary', 'Territory performance report'].map((item, i) => (
                <span key={i} style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '20px', padding: '5px 12px', fontSize: '12px', color: COLORS.text3 }}>
                  🔜 {item}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {/* CREATE REP MODAL */}
      {showCreateRep && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,26,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 700 }}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '460px', maxWidth: '90vw' }}>
            <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>Create new rep</div>
            <div style={{ fontSize: '13px', color: COLORS.text2, marginBottom: '20px' }}>They'll receive login credentials and be linked to your account automatically.</div>
            {createMsg && <div style={{ padding: '10px 12px', background: createMsg.includes('Error') ? '#FCEBEB' : COLORS.green3, color: createMsg.includes('Error') ? '#791F1F' : '#085041', borderRadius: '7px', fontSize: '13px', marginBottom: '12px' }}>{createMsg}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '11px', color: COLORS.text3, display: 'block', marginBottom: '4px' }}>Full name *</label>
                <input style={inputStyle} value={newRep.full_name} onChange={e => setNewRep({...newRep, full_name: e.target.value})} placeholder="Jake Martinez" />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: COLORS.text3, display: 'block', marginBottom: '4px' }}>Email *</label>
                <input style={inputStyle} type="email" value={newRep.email} onChange={e => setNewRep({...newRep, email: e.target.value})} placeholder="jake@example.com" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '11px', color: COLORS.text3, display: 'block', marginBottom: '4px' }}>Company</label>
                <input style={inputStyle} value={newRep.company_name} onChange={e => setNewRep({...newRep, company_name: e.target.value})} placeholder="Southwest Pharma Reps" />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: COLORS.text3, display: 'block', marginBottom: '4px' }}>Territory</label>
                <input style={inputStyle} value={newRep.territory} onChange={e => setNewRep({...newRep, territory: e.target.value})} placeholder="Dallas, Houston..." />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: COLORS.text3, display: 'block', marginBottom: '4px' }}>Commission rate (%)</label>
              <input style={inputStyle} type="number" value={newRep.commission_rate} onChange={e => setNewRep({...newRep, commission_rate: e.target.value})} min="0" max="100" step="0.5" />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button onClick={() => setShowCreateRep(false)} style={{ padding: '10px 20px', border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', background: 'white', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={createNewRep} disabled={creating || !newRep.email || !newRep.full_name}
                style={{ padding: '10px 20px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                {creating ? 'Creating...' : 'Create rep'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAY MODAL */}
      {showPayModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,26,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 700 }}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '420px', maxWidth: '90vw' }}>
            <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>Record payment</div>
            <div style={{ fontSize: '13px', color: COLORS.text2, marginBottom: '20px' }}>How was this commission paid?</div>

            <label style={{ fontSize: '11px', color: COLORS.text3, display: 'block', marginBottom: '5px' }}>Payment method</label>
            <select value={payMethod} onChange={e => setPayMethod(e.target.value)} style={{ ...inputStyle, marginBottom: '12px' }}>
              <option value="ach">ACH / Bank transfer</option>
              <option value="check">Check</option>
              <option value="wire">Wire transfer</option>
              <option value="other">Other</option>
            </select>

            <label style={{ fontSize: '11px', color: COLORS.text3, display: 'block', marginBottom: '5px' }}>Reference number (optional)</label>
            <input style={inputStyle} placeholder="e.g. check #1234 or transaction ID" value={payReference} onChange={e => setPayReference(e.target.value)} />

            <label style={{ fontSize: '11px', color: COLORS.text3, display: 'block', marginBottom: '5px' }}>Notes (optional)</label>
            <input style={inputStyle} placeholder="Any additional payment notes" value={payNotes} onChange={e => setPayNotes(e.target.value)} />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button onClick={() => setShowPayModal(null)} style={{ padding: '10px 20px', border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', background: 'white', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={confirmPayment} style={{ padding: '10px 20px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                ✓ Confirm payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
