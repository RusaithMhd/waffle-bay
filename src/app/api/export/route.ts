import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import * as XLSX from 'xlsx'

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v)
}

function fmtDate(v: unknown, tz?: string): string {
  if (!v) return ''
  try { 
    const d = new Date(String(v))
    if (tz) {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      }).format(d)
    }
    return d.toLocaleString() 
  } catch { return String(v) }
}

function fmtNum(v: unknown): number {
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

/**
 * Build a worksheet with a styled title block then column headers,
 * then data rows.
 */
function buildSheet(
  wb: XLSX.WorkBook,
  sheetName: string,
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][],
  tz?: string
): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {}
  let rowIdx = 0

  // Row 0: store title
  XLSX.utils.sheet_add_aoa(ws, [[title]], { origin: { r: rowIdx, c: 0 } })
  rowIdx++

  // Row 1: subtitle / period
  XLSX.utils.sheet_add_aoa(ws, [[subtitle]], { origin: { r: rowIdx, c: 0 } })
  rowIdx++

  // Row 2: generated timestamp
  const genStr = tz 
    ? new Intl.DateTimeFormat('en-GB', { timeZone: tz, dateStyle: 'medium', timeStyle: 'long' }).format(new Date()) 
    : new Date().toLocaleString()
  XLSX.utils.sheet_add_aoa(ws,
    [[`Generated: ${genStr}`]],
    { origin: { r: rowIdx, c: 0 } }
  )
  rowIdx++

  // Row 3: blank separator
  rowIdx++

  // Row 4: column headers
  XLSX.utils.sheet_add_aoa(ws, [headers], { origin: { r: rowIdx, c: 0 } })
  rowIdx++

  // Data rows
  XLSX.utils.sheet_add_aoa(ws, rows, { origin: { r: rowIdx, c: 0 } })
  rowIdx += rows.length

  // Set column widths automatically (approx 20 chars each)
  ws['!cols'] = headers.map(() => ({ wch: 20 }))

  // Merge title across all columns
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: headers.length - 1 } },
  ]

  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  return ws
}

// ─── route ────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const user = await getCurrentUserWithRole()
  if (!user || (
    !hasPermission(user.role, 'accounting') &&
    !hasPermission(user.role, 'sales') &&
    !hasPermission(user.role, 'products.view')
  )) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? 'sales'   // 'sales' | 'ledger' | 'z-reports' | 'all'
  const period = searchParams.get('period') ?? 'all'
  const specificDate = searchParams.get('date') ?? null

  const supabase = await createClient()

  // ── Settings (store name + currency) ────────────────────────────────────────
  const { data: settings } = await supabase
    .from('store_settings')
    .select('store_name, currency_symbol, timezone')
    .eq('id', 1)
    .single()

  const storeName = settings?.store_name ?? 'Waffle Bay'
  const currency = settings?.currency_symbol ?? 'Rs.'
  const timezone = settings?.timezone ?? 'UTC'

  // ── Date range helpers ───────────────────────────────────────────────────────
  function getDateRange(): { start?: string; end?: string } {
    if (period === 'custom' && specificDate) {
      const [y, m, d] = specificDate.split('-').map(Number)
      return {
        start: new Date(y, m - 1, d, 0, 0, 0, 0).toISOString(),
        end: new Date(y, m - 1, d, 23, 59, 59, 999).toISOString()
      }
    }
    if (period === 'daily') return { start: new Date(new Date().setHours(0, 0, 0, 0)).toISOString() }
    if (period === 'weekly') { const d = new Date(); d.setDate(d.getDate() - 7); return { start: d.toISOString() } }
    if (period === 'monthly') { const d = new Date(); d.setMonth(d.getMonth() - 1); return { start: d.toISOString() } }
    if (period === 'yearly') { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return { start: d.toISOString() } }
    return {}
  }

  function applyRange(q: any, col: string) {
    const { start, end } = getDateRange()
    if (start) q = q.gte(col, start)
    if (end) q = q.lte(col, end)
    return q
  }

  const periodLabel = specificDate
    ? `Date: ${specificDate}`
    : period === 'daily' ? `Daily – ${new Date().toLocaleDateString()}`
      : period === 'weekly' ? 'Last 7 Days'
        : period === 'monthly' ? 'Last 30 Days'
          : period === 'yearly' ? 'Last 12 Months'
            : 'All Time'

  // ─────────────────────────────────────────────────────────────────────────────
  // Build the Excel workbook
  // ─────────────────────────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new()

  // ── Profiles lookup (for cashier names) ─────────────────────────────────────
  const { data: profiles } = await supabase.from('profiles').select('id, first_name')
  const profileMap: Record<string, string> = Object.fromEntries(
    (profiles ?? []).map(p => [p.id, p.first_name ?? 'Unknown'])
  )

  // ════════════════════════════════════════════════════════════════════════════
  // SALES REPORT
  // ════════════════════════════════════════════════════════════════════════════
  if (type === 'sales' || type === 'all' || type === 'backup') {
    let q = supabase
      .from('orders')
      .select(`
        id, order_number, kot_number, business_date, status, order_type,
        subtotal, tax, discount, total, created_at,
        cashier_id,
        payments ( method, amount ),
        order_items ( product_name_snapshot, quantity, unit_price_snapshot, subtotal )
      `)
      .order('created_at', { ascending: false })

    q = applyRange(q, 'created_at')

    const { data: orders, error } = await q
    if (error) return new NextResponse('Error: ' + error.message, { status: 500 })

    const salesHeaders = [
      'Invoice', 'KOT #', 'Business Date', 'Date & Time',
      'Order Type', 'Status', 'Cashier',
      `Subtotal (${currency})`, `Tax (${currency})`, `Discount (${currency})`, `Total (${currency})`,
      'Payment Methods', 'Items Ordered'
    ]

    const salesRows: (string | number)[][] = (orders ?? []).map(o => {
      const payments = (o.payments ?? []).map((p: any) => `${p.method}: ${currency} ${fmtNum(p.amount).toFixed(2)}`).join('; ')
      const items = (o.order_items ?? []).map((i: any) => `${i.quantity}x ${i.product_name_snapshot}`).join('; ')
      return [
        `INV-${String(o.order_number).padStart(6, '0')}`,
        o.kot_number ? `KOT-${String(o.kot_number).padStart(3, '0')}` : '',
        fmt(o.business_date),
        fmtDate(o.created_at, timezone),
        o.order_type === 'TAKEAWAY' ? 'Takeaway' : 'Dine In',
        fmt(o.status),
        profileMap[o.cashier_id] ?? 'System',
        fmtNum(o.subtotal),
        fmtNum(o.tax),
        fmtNum(o.discount),
        fmtNum(o.total),
        payments,
        items
      ]
    })

    // Totals row
    const totalSales = (orders ?? []).reduce((s, o) => s + fmtNum(o.total), 0)
    const totalTax = (orders ?? []).reduce((s, o) => s + fmtNum(o.tax), 0)
    salesRows.push([])
    salesRows.push(['', '', '', '', '', '', 'TOTAL', '', fmtNum(totalTax), '', fmtNum(totalSales), '', ''])

    buildSheet(wb, 'Sales Report', `${storeName} – Sales Report`, periodLabel, salesHeaders, salesRows, timezone)
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRODUCTS CATALOGUE
  // ════════════════════════════════════════════════════════════════════════════
  if (type === 'products' || type === 'backup') {
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('name, description, base_price, sku, is_active, sort_order, category:categories(name)')
      .order('name')

    if (prodError) return new NextResponse('Error: ' + prodError.message, { status: 500 })

    const prodHeaders = [
      '#',
      'Product Name',
      'Category',
      `Base Price (${currency})`,
      'SKU',
      'Status',
      'Description',
    ]

    const prodRows: (string | number)[][] = (products ?? []).map((p, i) => [
      i + 1,
      fmt(p.name),
      fmt((p.category as any)?.name ?? 'Uncategorized'),
      fmtNum(p.base_price),
      fmt(p.sku ?? ''),
      p.is_active ? 'Active' : 'Inactive',
      fmt(p.description ?? ''),
    ])

    // Summary totals row
    const totalActive   = (products ?? []).filter(p => p.is_active).length
    const totalInactive = (products ?? []).length - totalActive
    prodRows.push([])
    prodRows.push(['', 'TOTAL PRODUCTS', String((products ?? []).length), '', '', `Active: ${totalActive}  |  Inactive: ${totalInactive}`, ''])

    buildSheet(
      wb,
      'Products',
      `${storeName} – Products Catalogue`,
      `Exported on ${new Date().toLocaleDateString()}`,
      prodHeaders,
      prodRows,
      timezone
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // LEDGER REPORT
  // ════════════════════════════════════════════════════════════════════════════
  if (type === 'ledger' || type === 'all' || type === 'backup') {
    let q = supabase
      .from('accounting_ledger')
      .select('id, created_at, transaction_type, description, reference_id, debit, credit, payment_method, cashier_id')
      .order('created_at', { ascending: false })

    q = applyRange(q, 'created_at')

    const { data: ledger, error: ledgerError } = await q
    if (ledgerError) return new NextResponse('Error: ' + ledgerError.message, { status: 500 })

    const ledgerHeaders = [
      'Date & Time', 'Type', 'Description', 'Reference ID',
      'Payment Method', 'Cashier',
      `Debit / In (${currency})`, `Credit / Out (${currency})`
    ]

    const ledgerRows: (string | number)[][] = (ledger ?? []).map(e => [
      fmtDate(e.created_at, timezone),
      fmt(e.transaction_type),
      fmt(e.description),
      fmt(e.reference_id),
      fmt(e.payment_method ?? '').toLowerCase(),
      profileMap[e.cashier_id] ?? 'System',
      fmtNum(e.debit),
      fmtNum(e.credit)
    ])

    // Totals row
    const totalDebit = (ledger ?? []).reduce((s, e) => s + fmtNum(e.debit), 0)
    const totalCredit = (ledger ?? []).reduce((s, e) => s + fmtNum(e.credit), 0)
    ledgerRows.push([])
    ledgerRows.push(['', '', '', '', '', 'TOTAL', fmtNum(totalDebit), fmtNum(totalCredit)])

    buildSheet(wb, 'Ledger', `${storeName} – Accounting Ledger`, periodLabel, ledgerHeaders, ledgerRows, timezone)
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Z-REPORTS
  // ════════════════════════════════════════════════════════════════════════════
  if (type === 'z-reports' || type === 'all' || type === 'backup') {
    let q = supabase
      .from('z_reports_view')
      .select('*')
      .order('opened_at', { ascending: false })

    q = applyRange(q, 'opened_at')

    const { data: zReports, error: zError } = await q
    if (zError) return new NextResponse('Error: ' + zError.message, { status: 500 })

    const zHeaders = [
      'Status', 'Cashier',
      'Opened At', 'Closed At',
      `Opening Cash (${currency})`,
      `Cash Received (${currency})`,
      `Card Received (${currency})`,
      `Expenses / Cash Out (${currency})`,
      `Expected Cash (${currency})`,
      `Actual Cash (${currency})`,
      `Variance (${currency})`,
      `Total Sales (${currency})`,
      'Total Orders'
    ]

    const zRows: (string | number)[][] = (zReports ?? []).map(r => {
      const isActive = !r.closed_at
      return [
        isActive ? 'Active' : 'Closed',
        profileMap[r.cashier_id] ?? 'Unknown',
        fmtDate(r.opened_at, timezone),
        r.closed_at ? fmtDate(r.closed_at, timezone) : 'Still Open',
        fmtNum(r.starting_cash),
        fmtNum(r.total_cash_received),
        fmtNum(r.total_card_received),
        fmtNum(r.total_expenses),
        isActive ? fmtNum(r.expected_cash_live) : fmtNum(r.expected_cash),
        isActive ? 0 : fmtNum(r.actual_cash),
        isActive ? 0 : fmtNum(r.variance),
        fmtNum(r.total_sales),
        fmtNum(r.total_orders)
      ]
    })

    // Summary totals row
    const totalSales = (zReports ?? []).reduce((s, r) => s + fmtNum(r.total_sales), 0)
    const totalOrders = (zReports ?? []).reduce((s, r) => s + fmtNum(r.total_orders), 0)
    zRows.push([])
    zRows.push(['', 'TOTAL', '', '', '', '', '', '', '', '', '', fmtNum(totalSales), fmtNum(totalOrders)])

    buildSheet(wb, 'Z-Reports', `${storeName} – Z-Reports & Cash Flow`, periodLabel, zHeaders, zRows, timezone)
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SYSTEM & KOT AUDIT LOGS (For Backup)
  // ════════════════════════════════════════════════════════════════════════════
  if (type === 'backup') {
    // Audit Logs
    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })

    const auditHeaders = ['Log ID', 'Date & Time', 'Action', 'Entity Type', 'Entity ID', 'User ID', 'Details']
    const auditRows: (string | number)[][] = (auditLogs ?? []).map(l => [
      fmt(l.id),
      fmtDate(l.created_at, timezone),
      fmt(l.action),
      fmt(l.entity_type),
      fmt(l.entity_id),
      fmt(l.user_id),
      JSON.stringify(l.details ?? {})
    ])
    buildSheet(wb, 'System Logs', `${storeName} – System Audit Logs`, periodLabel, auditHeaders, auditRows, timezone)

    // KOT Audit Logs
    const { data: kotLogs } = await supabase
      .from('kot_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })

    const kotHeaders = ['Log ID', 'Date & Time', 'Action', 'Old Number', 'New Number', 'Reason', 'Business Date', 'Cashier ID']
    const kotRows: (string | number)[][] = (kotLogs ?? []).map(l => [
      fmt(l.id),
      fmtDate(l.created_at, timezone),
      fmt(l.action),
      fmt(l.old_number),
      fmt(l.new_number),
      fmt(l.reason),
      fmt(l.business_date),
      fmt(l.cashier_id)
    ])
    buildSheet(wb, 'KOT Logs', `${storeName} – KOT Audit Logs`, periodLabel, kotHeaders, kotRows, timezone)
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Serialize workbook → buffer
  // ────────────────────────────────────────────────────────────────────────────
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  const safeDate = specificDate ?? new Date().toISOString().split('T')[0]
  const fileName = `${storeName.replace(/\s+/g, '_')}_${type}_${period}_${safeDate}.xlsx`

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`
    }
  })
}
