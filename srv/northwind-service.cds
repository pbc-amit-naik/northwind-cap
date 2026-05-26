using { Northwind } from './external/Northwind';

@requires: 'northwind.view'
service NorthwindService @(path: '/odata/v4/northwind') {

  // Products — default page size 50
  @readonly
  @cds.query.limit.default: 50
  entity Products as projection on Northwind.Products {
    ProductID,
    ProductName,
    CategoryID,
    SupplierID,
    UnitPrice,
    UnitsInStock,
    Discontinued,
    virtual StockStatus : String
  }

  // Categories
  @readonly entity Categories as projection on Northwind.Categories {
    CategoryID,
    CategoryName,
    Description
  }

  // Customers — address fields excluded
  @readonly entity Customers as projection on Northwind.Customers {
    CustomerID,
    CompanyName,
    ContactName,
    Country,
    City,
    Phone
  }

  // Orders — default page size 50
  @readonly
  @cds.query.limit.default: 50
  entity Orders as projection on Northwind.Orders {
    OrderID,
    CustomerID,
    EmployeeID,
    OrderDate,
    RequiredDate,
    ShippedDate,
    ShipCountry,
    Freight,
    virtual OrderStatus : String
  }

  // Order Details
  @readonly entity Order_Details as projection on Northwind.Order_Details {
    OrderID,
    ProductID,
    UnitPrice,
    Quantity,
    Discount,
    virtual LineTotal : Decimal
  }

  // Suppliers — address fields excluded
  @readonly entity Suppliers as projection on Northwind.Suppliers {
    SupplierID,
    CompanyName,
    ContactName,
    Country,
    Phone
  }
}