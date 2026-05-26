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
    virtual StockStatus : String,
    Category : Association to Categories on Category.CategoryID = CategoryID,
    Supplier : Association to Suppliers   on Supplier.SupplierID = SupplierID
  }

  // Categories
  @readonly entity Categories as projection on Northwind.Categories {
    CategoryID,
    CategoryName,
    Description,
    Products : Association to many Products on Products.CategoryID = CategoryID
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
    EmployeeID,  // FK to Employees — navigation not exposed
    OrderDate,
    RequiredDate,
    ShippedDate,
    ShipCountry,
    Freight,
    virtual OrderStatus : String,
    Customer : Association to Customers on Customer.CustomerID = CustomerID,
    Details  : Association to many Order_Details on Details.OrderID = OrderID
  }

  // Order Details
  @readonly entity Order_Details as projection on Northwind.Order_Details {
    OrderID,
    ProductID,
    UnitPrice,
    Quantity,
    Discount,
    virtual LineTotal : Decimal,
    Product : Association to Products on Product.ProductID = ProductID
  }

  // Suppliers — address fields excluded
  @readonly entity Suppliers as projection on Northwind.Suppliers {
    SupplierID,
    CompanyName,
    ContactName,
    Country,
    Phone,
    Products : Association to many Products on Products.SupplierID = SupplierID
  }

// Diagnostics — NorthwindAdmin only
  @requires: 'northwind.admin'
  @readonly entity Diagnostics {
    key service     : String;
        version     : String;
        northwindUrl: String;
        timestamp   : String;
        status      : String;
  }

// Employees — intentionally not exposed in v1
  //   entity Employees as projection on Northwind.Employees {
  //     EmployeeID, FirstName, LastName, Title, City, Country
  //   }
}