import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'

const COLORS = {
  green: '#0F6E56', teal: '#5DCAA5', dark: '#1C1C1A',
  border: '#E2E0D8', text2: '#5F5E5A', text3: '#A8A8A2',
  amber: '#EF9F27', amber2: '#FAEEDA', green3: '#E8F7F1',
  bg2: '#F0EDE6', red: '#E24B4A'
}

const CATEGORIES = ['GLP-1', 'Hormone', 'Dermatology', 'Peptide', 'Vitamin', 'Injectable', 'Other']

const TEMPLATE_DATA = [
  ['Name', 'Category', 'Description', 'Price Per Unit', 'Stock Quantity'],
  ['Semaglutide 1mg/mL', 'GLP-1', '10mL vial, compounded semaglutide', '129.99', '200'],
  ['Testosterone Cypionate 200mg', 'Hormone', '10mL vial, testosterone cypionate', '89.99', '150'],
  ['BPC-157 500mcg', 'Peptide', 'Lyophilized powder, 30 capsules', '149.99', '100'],
]

export default function CatalogUpload({ supplierId, onComplete }) {
  const [step, setStep] = useState('upload') // upload | preview | importing | done
  const [parsedRows, setParsedRows] = useState([])
  const [errors, setErrors] = useState([])
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const fileRef = useRef()

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(TEMPLATE_DATA)
    ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 40 }, { wch: 15 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Catalog Template')
    XLSX.writeFile(wb, 'rovi-catalog-template.xlsx')
  }

  const parseFile = (file) => {
    setFileName(file.name)
    setErrors([])
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })

        if (rows.length < 2) {
          setErrors(['File appears to be empty. Please add at least one product row.'])
          return
        }

        // Find header row — flexible matching
        const headerRow = rows[0].map(h => String(h || '').toLowerCase().trim())
        const nameIdx = headerRow.findIndex(h => h.includes('name') || h.includes('product'))
        const catIdx = headerRow.findIndex(h => h.includes('category') || h.includes('cat'))
        const descIdx = headerRow.findIndex(h => h.includes('desc'))
        const priceIdx = headerRow.findIndex(h => h.includes('price') || h.includes('cost') || h.includes('unit'))
        const stockIdx = headerRow.findIndex(h => h.includes('stock') || h.includes('qty') || h.includes('quantity') || h.includes('inventory'))

        if (nameIdx === -1 || priceIdx === -1) {
          setErrors(['Could not find required columns. Make sure your file has "Name" and "Price" columns. Download the template for reference.'])
          return
        }

        const parsed = []
        const rowErrors = []

        rows.slice(1).forEach((row, i) => {
          if (!row || row.every(cell => !cell)) return

          const name = String(row[nameIdx] || '').trim()
          const price = parseFloat(String(row[priceIdx] || '0').replace(/[$,]/g, ''))
          const stock = parseInt(String(row[stockIdx !== -1 ? stockIdx : 0] || '0').replace(/,/g, '')) || 0
          const category = catIdx !== -1 ? String(row[catIdx] || 'Other').trim() : 'Other'
          const description = descIdx !== -1 ? String(row[descIdx] || '').trim() : ''

          if (!name) { rowErrors.push(`Row ${i + 2}: Missing product name`); return }
          if (isNaN(price) || price <= 0) { rowErrors.push(`Row ${i + 2}: Invalid price for "${name}"`); return }

          const matchedCat = CATEGORIES.find(c => c.toLowerCase() === category.toLowerCase()) || 'Other'
          parsed.push({ name, category: matchedCat, description, price_per_unit: price, stock_quantity: stock })
        })

        if (rowErrors.length > 0) setErrors(rowErrors)
        if (parsed.length > 0) {
          setParsedRows(parsed)
          setStep('preview')
        } else {
          setErrors(prev => [...prev, 'No valid product rows found.'])
        }
      } catch (err) {
        setErrors(['Failed to parse file. Make sure it is a valid Excel or CSV file.'])
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) parseFile(file)
  }

  const handleImport = async () => {
    setImporting(true)
    setStep('importing')
    let count = 0

    for (const product of parsedRows) {
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('supplier_id', supplierId)
        .ilike('name', product.name)
        .single()

      if (existing) {
        await supabase.from('products').update({
          category: product.category,
          description: product.description,
          price_per_unit: product.price_per_unit,
          stock_quantity: product.stock_quantity,
          is_active: true,
        }).eq('id', existing.id)
      } else {
        await supabase.from('products').insert({
          ...product,
          supplier_id: supplierId,
          is_active: true,
        })
      }
      count++
      setImportedCount(count)
    }

    setImportedCount(count)
    setStep('done')
    setImporting(false)
  }

  const reset = () => {
    setStep('upload')
    setParsedRows([])
    setErrors([])
    setFileName('')
    setImportedCount(0)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>

      {/* UPLOAD STEP */}
      {step === 'upload' && (
        <>
          <div style={{ background: COLORS.bg2, border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark, marginBottom: '2px' }}>Download the template first</div>
              <div style={{ fontSize: '12px', color: COLORS.text3 }}>Fill in your products and upload the completed file below</div>
            </div>
            <button onClick={downloadTemplate}
              style={{ padding: '8px 16px', background: COLORS.dark, color: '#F0EDE6', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              ↓ Download template
            </button>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? COLORS.green : COLORS.border}`,
              borderRadius: '12px', padding: '48px 24px',
              textAlign: 'center', cursor: 'pointer',
              background: dragOver ? COLORS.green3 : 'white',
              transition: 'all 0.15s', marginBottom: '16px'
            }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>📂</div>
            <div style={{ fontSize: '15px', fontWeight: '500', color: COLORS.dark, marginBottom: '6px' }}>
              Drop your file here or click to browse
            </div>
            <div style={{ fontSize: '12px', color: COLORS.text3 }}>
              Supports Excel (.xlsx, .xls) and CSV (.csv) files
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} style={{ display: 'none' }} />
          </div>

          {errors.length > 0 && (
            <div style={{ background: '#FCEBEB', border: `0.5px solid #F5C2C2`, borderRadius: '8px', padding: '14px 16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#791F1F', marginBottom: '8px' }}>Please fix these issues:</div>
              {errors.map((e, i) => <div key={i} style={{ fontSize: '12px', color: '#791F1F', marginBottom: '4px' }}>• {e}</div>)}
            </div>
          )}

          <div style={{ marginTop: '16px', background: COLORS.bg2, borderRadius: '8px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: COLORS.text3, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>Expected columns</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '8px' }}>
              {[
                { col: 'Name', req: true, note: 'Product name' },
                { col: 'Category', req: false, note: 'GLP-1, Hormone, etc.' },
                { col: 'Description', req: false, note: 'Short description' },
                { col: 'Price Per Unit', req: true, note: 'Numeric, e.g. 129.99' },
                { col: 'Stock Quantity', req: false, note: 'Units available' },
              ].map((c, i) => (
                <div key={i} style={{ background: 'white', borderRadius: '6px', padding: '8px 10px', border: `0.5px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: COLORS.dark, marginBottom: '2px' }}>
                    {c.col} {c.req && <span style={{ color: COLORS.red }}>*</span>}
                  </div>
                  <div style={{ fontSize: '10px', color: COLORS.text3 }}>{c.note}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: '11px', color: COLORS.text3, marginTop: '8px' }}><span style={{ color: COLORS.red }}>*</span> Required columns</div>
          </div>
        </>
      )}

      {/* PREVIEW STEP */}
      {step === 'preview' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '500', color: COLORS.dark, marginBottom: '2px' }}>
                Preview — {parsedRows.length} products found
              </div>
              <div style={{ fontSize: '12px', color: COLORS.text3 }}>from {fileName}</div>
            </div>
            <button onClick={reset}
              style={{ padding: '7px 14px', background: COLORS.bg2, color: COLORS.text2, border: `0.5px solid ${COLORS.border}`, borderRadius: '7px', fontSize: '12px', cursor: 'pointer' }}>
              ← Upload different file
            </button>
          </div>

          {errors.length > 0 && (
            <div style={{ background: COLORS.amber2, border: `0.5px solid #FAC775`, borderRadius: '8px', padding: '12px 14px', marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#633806', marginBottom: '6px' }}>⚠ Some rows were skipped:</div>
              {errors.map((e, i) => <div key={i} style={{ fontSize: '12px', color: '#633806', marginBottom: '3px' }}>• {e}</div>)}
            </div>
          )}

          <div style={{ background: 'white', border: `0.5px solid ${COLORS.border}`, borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 1fr 1fr', gap: 0, background: COLORS.bg2, padding: '10px 16px', borderBottom: `0.5px solid ${COLORS.border}` }}>
              {['Name', 'Category', 'Description', 'Price', 'Stock'].map((h, i) => (
                <div key={i} style={{ fontSize: '11px', fontWeight: '600', color: COLORS.text3, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{h}</div>
              ))}
            </div>
            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {parsedRows.map((row, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 1fr 1fr', gap: 0, padding: '10px 16px', borderBottom: `0.5px solid ${COLORS.border}`, background: i % 2 === 0 ? 'white' : '#FAFAF8' }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark }}>{row.name}</div>
                  <div>
                    <span style={{ background: COLORS.green3, color: '#085041', fontSize: '10px', fontWeight: '500', padding: '2px 7px', borderRadius: '20px' }}>{row.category}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: COLORS.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.description || '—'}</div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark }}>${row.price_per_unit.toFixed(2)}</div>
                  <div style={{ fontSize: '13px', color: COLORS.text2 }}>{row.stock_quantity}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={reset}
              style={{ flex: 1, padding: '12px', border: `0.5px solid ${COLORS.border}`, borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', color: COLORS.text2 }}>
              Cancel
            </button>
            <button onClick={handleImport}
              style={{ flex: 2, padding: '12px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
              Import {parsedRows.length} product{parsedRows.length !== 1 ? 's' : ''} →
            </button>
          </div>
        </>
      )}

      {/* IMPORTING STEP */}
      {step === 'importing' && (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '16px' }}>⏳</div>
          <div style={{ fontSize: '16px', fontWeight: '500', color: COLORS.dark, marginBottom: '8px' }}>Importing your catalog...</div>
          <div style={{ fontSize: '13px', color: COLORS.text3, marginBottom: '20px' }}>{importedCount} of {parsedRows.length} products added</div>
          <div style={{ height: '6px', background: COLORS.border, borderRadius: '3px', overflow: 'hidden', maxWidth: '300px', margin: '0 auto' }}>
            <div style={{ width: `${(importedCount / parsedRows.length) * 100}%`, height: '100%', background: COLORS.green, borderRadius: '3px', transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {/* DONE STEP */}
      {step === 'done' && (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: COLORS.green3, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px' }}>✓</div>
          <div style={{ fontSize: '20px', fontWeight: '600', color: COLORS.dark, marginBottom: '8px' }}>
            {importedCount} product{importedCount !== 1 ? 's' : ''} imported!
          </div>
          <div style={{ fontSize: '13px', color: COLORS.text3, marginBottom: '28px' }}>
            Your catalog has been updated. Existing products were updated, new products were added. All changes are now visible to connected doctors and reps.
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={reset}
              style={{ padding: '10px 24px', background: COLORS.bg2, color: COLORS.text2, border: `0.5px solid ${COLORS.border}`, borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
              Upload another file
            </button>
            <button onClick={onComplete}
              style={{ padding: '10px 24px', background: COLORS.green, color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
              View catalog →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
