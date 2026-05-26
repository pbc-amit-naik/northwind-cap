const cds = require('@sap/cds')

const BASE = process.env.NORTHWIND_URL || 'https://services.odata.org/V4/Northwind/Northwind.svc'
const DIAGNOSTICS_PATH = '/odata/v4/northwind/diagnostics'

async function get(entity, query = '') {
  const url = `${BASE}/${entity}?${query}&$format=json`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (res.status === 404) throw { code: 404, message: `${entity} not found` }
    if (res.status === 400) throw { code: 400, message: `Invalid request to Northwind` }
    if (!res.ok) throw { code: 503, message: `Northwind error: ${res.status}` }
    const json = await res.json()
    return json.value ?? json
  } catch (err) {
    if (err.name === 'AbortError') throw { code: 503, message: 'Northwind service timed out after 5s' }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

function getQueryString(req) {
  return req._.req.url.split('?')[1] || ''
}

function parseExpand(query) {
  const match = query.match(/\$expand=([^&]+)/)
  return match ? match[1].split(',').map(e => e.trim()) : []
}

function removeExpand(query) {
  return query.replace(/[&?]?\$expand=[^&]+/, '')
}

function handleError(err, req) {
  if (err.code === 404) return req.error(404, err.message)
  if (err.code === 400) return req.error(400, err.message)
  return req.error(503, err.message || 'Northwind service is currently unreachable')
}

module.exports = class NorthwindService extends cds.ApplicationService {

  async init() {

    this.on('READ', 'Products', async req => {
      try {
        const query = getQueryString(req)
        const expands = parseExpand(query)
        const cleanQuery = removeExpand(query)
        const results = await get('Products', cleanQuery)

        for (const p of results) {
          if (p.UnitsInStock === 0) p.StockStatus = 'Out of Stock'
          else if (p.UnitsInStock <= 10) p.StockStatus = 'Low Stock'
          else p.StockStatus = 'In Stock'

          // Handle $expand=Category
          if (expands.includes('Category')) {
            const cats = await get('Categories', `$filter=CategoryID eq ${p.CategoryID}`)
            p.Category = cats[0] || null
          }

          // Handle $expand=Supplier
          if (expands.includes('Supplier')) {
            const sups = await get('Suppliers', `$filter=SupplierID eq ${p.SupplierID}`)
            p.Supplier = sups[0] || null
          }
        }
        return results
      } catch (err) { return handleError(err, req) }
    })

    this.on('READ', 'Orders', async req => {
      try {
        const query = getQueryString(req)
        const expands = parseExpand(query)
        const cleanQuery = removeExpand(query)
        const results = await get('Orders', cleanQuery)
        const today = new Date()

        for (const o of results) {
          if (o.ShippedDate) o.OrderStatus = 'Shipped'
          else if (o.RequiredDate && new Date(o.RequiredDate) < today) o.OrderStatus = 'Overdue'
          else o.OrderStatus = 'Open'

          // Handle $expand=Customer
          if (expands.includes('Customer')) {
            const custs = await get('Customers', `$filter=CustomerID eq '${o.CustomerID}'`)
            o.Customer = custs[0] || null
          }

          // Handle $expand=Order_Details
          if (expands.includes('Details')) {
            const lines = await get('Order_Details', `$filter=OrderID eq ${o.OrderID}`)
            for (const l of lines) {
              l.LineTotal = +(l.UnitPrice * l.Quantity * (1 - l.Discount)).toFixed(2)
            }
            o.Details = lines
          }
        }
        return results
      } catch (err) { return handleError(err, req) }
    })

    this.on('READ', 'Order_Details', async req => {
      try {
        const query = getQueryString(req)
        const expands = parseExpand(query)
        const cleanQuery = removeExpand(query)
        const results = await get('Order_Details', cleanQuery)

        for (const l of results) {
          l.LineTotal = +(l.UnitPrice * l.Quantity * (1 - l.Discount)).toFixed(2)

          // Handle $expand=Product
          if (expands.includes('Product')) {
            const prods = await get('Products', `$filter=ProductID eq ${l.ProductID}`)
            if (prods[0]) {
              const p = prods[0]
              if (p.UnitsInStock === 0) p.StockStatus = 'Out of Stock'
              else if (p.UnitsInStock <= 10) p.StockStatus = 'Low Stock'
              else p.StockStatus = 'In Stock'
              l.Product = p
            }
          }
        }
        return results
      } catch (err) { return handleError(err, req) }
    })

    this.on('READ', 'Categories', async req => {
      try {
        const query = getQueryString(req)
        const expands = parseExpand(query)
        const cleanQuery = removeExpand(query)
        const results = await get('Categories', cleanQuery)

        for (const c of results) {
          if (expands.includes('Products')) {
            const prods = await get('Products', `$filter=CategoryID eq ${c.CategoryID}`)
            for (const p of prods) {
              if (p.UnitsInStock === 0) p.StockStatus = 'Out of Stock'
              else if (p.UnitsInStock <= 10) p.StockStatus = 'Low Stock'
              else p.StockStatus = 'In Stock'
            }
            c.Products = prods
          }
        }
        return results
      } catch (err) { return handleError(err, req) }
    })

    this.on('READ', 'Customers', async req => {
      try { return await get('Customers', removeExpand(getQueryString(req))) }
      catch (err) { return handleError(err, req) }
    })

    this.on('READ', 'Suppliers', async req => {
      try {
        const query = getQueryString(req)
        const expands = parseExpand(query)
        const cleanQuery = removeExpand(query)
        const results = await get('Suppliers', cleanQuery)

        for (const s of results) {
          if (expands.includes('Products')) {
            const prods = await get('Products', `$filter=SupplierID eq ${s.SupplierID}`)
            for (const p of prods) {
              if (p.UnitsInStock === 0) p.StockStatus = 'Out of Stock'
              else if (p.UnitsInStock <= 10) p.StockStatus = 'Low Stock'
              else p.StockStatus = 'In Stock'
            }
            s.Products = prods
          }
        }
        return results
      } catch (err) { return handleError(err, req) }
    })

    // Diagnostics endpoint — NorthwindAdmin only
    this.on('READ', 'Diagnostics', async req => {
      return [{
        service: 'NorthwindService',
        version: '1.0.0',
        northwindUrl: BASE,
        timestamp: new Date().toISOString(),
        status: 'OK'
      }]
    })

    return super.init()
  }
}