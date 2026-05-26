const cds = require('@sap/cds')

const BASE = 'https://services.odata.org/V4/Northwind/Northwind.svc'

async function get(entity, query = '') {
  const url = `${BASE}/${entity}?${query}&$format=json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Northwind error: ${res.status}`)
  const json = await res.json()
  return json.value ?? json
}

module.exports = class NorthwindService extends cds.ApplicationService {

  async init() {

    this.on('READ', 'Products', async req => {
      const results = await get('Products', req._.req.url.split('?')[1])
      for (const p of results) {
        if (p.UnitsInStock === 0)       p.StockStatus = 'Out of Stock'
        else if (p.UnitsInStock <= 10)  p.StockStatus = 'Low Stock'
        else                            p.StockStatus = 'In Stock'
      }
      return results
    })

    this.on('READ', 'Orders', async req => {
      const results = await get('Orders', req._.req.url.split('?')[1])
      const today = new Date()
      for (const o of results) {
        if (o.ShippedDate)                                           o.OrderStatus = 'Shipped'
        else if (o.RequiredDate && new Date(o.RequiredDate) < today) o.OrderStatus = 'Overdue'
        else                                                         o.OrderStatus = 'Open'
      }
      return results
    })

    this.on('READ', 'Order_Details', async req => {
      const results = await get('Order_Details', req._.req.url.split('?')[1])
      for (const l of results) {
        l.LineTotal = +(l.UnitPrice * l.Quantity * (1 - l.Discount)).toFixed(2)
      }
      return results
    })

    this.on('READ', 'Categories',    async req => get('Categories',    req._.req.url.split('?')[1]))
    this.on('READ', 'Customers',     async req => get('Customers',     req._.req.url.split('?')[1]))
    this.on('READ', 'Suppliers',     async req => get('Suppliers',     req._.req.url.split('?')[1]))

    return super.init()
  }
}