# Northwind OData + SAP CAP Node.js Service

A SAP CAP Node.js service that connects to the public Northwind OData v4 service
and re-exposes a curated set of entities through a clean, authenticated API layer.

## Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Framework | SAP CAP (cds) 9.x |
| Remote Service | Northwind OData v4 |
| Auth | SAP XSUAA (BTP) / dummy (local) |
| Deployment | SAP BTP Cloud Foundry |

## Project Structure
northwind-cap/
├── app/                        # UI5 / Fiori app (empty — phase 2)
├── db/                         # No local DB in v1
├── srv/
│   ├── external/
│   │   └── Northwind.cds       # Imported Northwind metadata
│   ├── northwind-service.cds   # Service definition
│   └── northwind-service.js    # Handlers + computed fields
├── xs-security.json            # XSUAA scopes and roles
├── mta.yaml                    # BTP deployment descriptor
└── package.json                # cds.requires config

## Local Development

### Prerequisites
- Node.js 18+
- SAP CAP DK: `npm install -g @sap/cds-dk`

### Setup
```bash
npm install
```

### Run locally
```bash
cds watch
```

Server starts at `http://localhost:4004`

### Re-import Northwind metadata
```powershell
Invoke-WebRequest -Uri "https://services.odata.org/V4/Northwind/Northwind.svc/$metadata" -OutFile "Northwind.xml"
cds import Northwind.xml --edmx --as cds
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| NORTHWIND_URL | https://services.odata.org/V4/Northwind/Northwind.svc | Northwind base URL |
| NODE_ENV | development | Runtime environment |
| CDS_FEATURES_ASSERT_INTEGRITY | false | Disable local DB integrity checks |

## API Endpoints

Base path: `/odata/v4/northwind`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /Products | JWT | List products |
| GET | /Products(1) | JWT | Single product |
| GET | /Products?$expand=Category | JWT | Product with category |
| GET | /Categories | JWT | List categories |
| GET | /Categories(1)/Products | JWT | Products in category |
| GET | /Customers | JWT | List customers |
| GET | /Customers('ALFKI') | JWT | Single customer |
| GET | /Orders | JWT | List orders |
| GET | /Orders(10248) | JWT | Single order |
| GET | /Orders?$expand=Details | JWT | Order with line items |
| GET | /Order_Details | JWT | All order lines |
| GET | /Suppliers | JWT | List suppliers |
| GET | /$metadata | None | OData metadata |

## OData Query Parameters

| Parameter | Example | Supported |
|---|---|---|
| $filter | ProductName eq 'Chai' | ✅ |
| $select | $select=ProductID,ProductName | ✅ |
| $expand | $expand=Category,Supplier | ✅ |
| $orderby | $orderby=UnitPrice desc | ✅ |
| $top / $skip | $top=20&$skip=40 | ✅ |
| $count | $count=true | ✅ |
| $search | — | ❌ Not supported in v1 |

## Computed Fields

| Entity | Field | Logic |
|---|---|---|
| Products | StockStatus | 0 → Out of Stock, ≤10 → Low Stock, else → In Stock |
| Orders | OrderStatus | ShippedDate set → Shipped, Overdue → Overdue, else → Open |
| Order_Details | LineTotal | UnitPrice × Quantity × (1 − Discount) |

## Authentication

### Local
Uses `dummy` auth — no token required.

### BTP Production
SAP XSUAA JWT bearer token required on all endpoints except `$metadata`.

| Role | Scope | Access |
|---|---|---|
| NorthwindViewer | northwind.view | Read all entities |
| NorthwindAdmin | northwind.admin | Read + metadata + diagnostics |

## BTP Deployment

### Prerequisites
- Cloud Foundry CLI installed
- MTA Build Tool: `npm install -g mbt`
- Logged into BTP: `cf login`

### Build and deploy
```bash
mbt build
cf deploy mta_archives/*.mtar
```

## Constraints

- Northwind is read-only — no POST, PATCH, DELETE
- $search not supported — use $filter instead
- 5-second timeout on all Northwind requests
- Not for production data — Northwind is a demo service

## Phase 2 — Planned

- Add Employees entity
- Add caching layer to reduce Northwind calls
- Add SAP UI5 front-end in app/ folder
- Register in Fiori Launchpad
- Add retry logic for Northwind failures