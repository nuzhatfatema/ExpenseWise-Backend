# ExpenseWise Backend API

A RESTful backend service for **ExpenseWise – Personal Budget Tracker with Analytics**, built using **Node.js**, **Express.js**, and **MongoDB (Mongoose)**. This API handles secure user authentication, expense and income management, custom categories, monthly budget tracking with threshold calculations, receipt uploads via Cloudinary, financial analytics aggregations, and report exports (PDF & CSV).

---

## Key Features

- **Authentication & Authorization**
  - User registration and login with signed JSON Web Tokens (JWT).
  - Password hashing and verification using `bcryptjs`.
  - Secure "Forgot Password" and "Reset Password" workflows with expiration tokens via `nodemailer`.
  - Protected route middleware (`authMiddleware`) verifying Bearer tokens.

- **Expense & Income Management**
  - Full CRUD operations for expenses (amount, category, date, optional note, receipt image URL).
  - Server-side search by note and category.
  - Custom date range filtering (`startDate` / `endDate`).
  - Server-side pagination (`page`, `limit`).
  - Full CRUD operations for income records with standard and custom sources.

- **Category Management**
  - Category creation and deletion with assigned indicator color schemes.

- **Monthly Budget Engine**
  - Set custom budget limits per month and year.
  - Computes remaining balance, utilization percentage, and dynamic "On Track" / "Over Budget" status.

- **Receipt Image Processing**
  - Handles multipart/form-data image uploads using `multer` (memory storage).
  - Direct upload stream to **Cloudinary** returning secure media URLs.

- **Financial Analytics & Aggregations**
  - Category-wise expense aggregations with total spending and percentage breakdown.
  - Monthly spending trends across all 12 months for any selected year.
  - Summary metrics: Active Period Budget, Amount Spent, Remaining Budget, Lifetime Income, Lifetime Expenses, and Net Savings.

- **Report Generation & Export**
  - Dynamic **CSV Export** using `json2csv`.
  - Formatted **PDF Expense Summary Report** generation using `pdfkit`.

---

## Tech Stack & Dependencies

| Dependency | Purpose |
| :--- | :--- |
| **Node.js** | Server-side JavaScript execution environment |
| **Express.js** (`^4.19.2`) | Web application framework for RESTful routing & controllers |
| **MongoDB & Mongoose** (`^8.3.4`) | NoSQL document database and schema modeling |
| **jsonwebtoken** (`^9.0.2`) | Token generation and authentication verification |
| **bcryptjs** (`^2.4.3`) | Password hashing and salt generation |
| **multer** (`^1.4.5-lts.1`) | Multipart form-data handling for file uploads |
| **cloudinary** (`^1.41.3`) | Cloud-based media storage and asset management |
| **dotenv** (`^16.4.5`) | Environment variable configuration |
| **cors** (`^2.8.5`) | Cross-Origin Resource Sharing enablement |
| **nodemailer** (`^9.1.0`) | SMTP email service for password reset emails |
| **pdfkit** (`^0.20.2`) | Server-side PDF document generation |
| **json2csv** (`^6.0.0-alpha.2`) | JSON to CSV data conversion for downloads |

---

## Project Structure

```
backend/
├── config/
│   ├── cloudinary.js          # Cloudinary configuration
│   ├── db.js                  # MongoDB database connection helper
│   └── nodemailer.js          # Nodemailer SMTP transporter
├── controllers/
│   ├── analyticsController.js # Aggregations (category totals, monthly trends, summaries)
│   ├── authController.js      # Register, login, forgot-password, reset-password handlers
│   ├── budgetController.js    # Budget creation and monthly status calculations
│   ├── categoryController.js  # Category CRUD handlers
│   ├── expenseController.js   # Expense CRUD, search, pagination, CSV & PDF exports
│   └── incomeController.js    # Income CRUD handlers
├── middleware/
│   ├── authMiddleware.js      # JWT authentication and user context attachment
│   ├── errorMiddleware.js     # Centralized error handler and 404 fallback
│   └── uploadMiddleware.js    # Multer memory storage configuration
├── models/
│   ├── Budget.js              # Mongoose Budget schema
│   ├── Category.js            # Mongoose Category schema
│   ├── Expense.js             # Mongoose Expense schema
│   ├── Income.js              # Mongoose Income schema
│   └── User.js                # Mongoose User schema
├── routes/
│   ├── analyticsRoutes.js     # /api/analytics endpoints
│   ├── authRoutes.js          # /api/auth endpoints
│   ├── budgetRoutes.js        # /api/budget endpoints
│   ├── categoryRoutes.js      # /api/categories endpoints
│   ├── expenseRoutes.js       # /api/expenses endpoints
│   └── incomeRoutes.js        # /api/income endpoints
├── server.js                  # Main server entry point
├── package.json               # Dependencies and scripts
├── .env.example               # Environment variables template
└── README.md                  # Backend documentation
```

---

## API Endpoints Reference

### 1. Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/register` | Register a new user | No |
| `POST` | `/api/auth/login` | Log in existing user and receive JWT | No |
| `POST` | `/api/auth/forgot-password` | Send password reset link to email | No |
| `POST` | `/api/auth/reset-password/:token` | Reset password using verified token | No |
| `GET` | `/api/auth/me` | Fetch currently authenticated user profile | Yes |

### 2. Expenses (`/api/expenses`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/expenses` | Get expenses with search (`?search=`), dates (`?startDate=`, `?endDate=`), & pagination (`?page=`, `?limit=`) | Yes |
| `POST` | `/api/expenses` | Create an expense (supports `receipt` file upload) | Yes |
| `GET` | `/api/expenses/:id` | Get single expense details | Yes |
| `PUT` | `/api/expenses/:id` | Update an expense (supports new receipt upload / removal) | Yes |
| `DELETE` | `/api/expenses/:id` | Delete an expense | Yes |
| `GET` | `/api/expenses/export/csv` | Download all user expenses in CSV format | Yes |
| `GET` | `/api/expenses/export/pdf` | Generate and download formatted PDF report | Yes |

### 3. Income (`/api/income`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/income` | Get all income entries for authenticated user | Yes |
| `POST` | `/api/income` | Create a new income record | Yes |
| `PUT` | `/api/income/:id` | Update an existing income record | Yes |
| `DELETE` | `/api/income/:id` | Delete an income record | Yes |

### 4. Categories (`/api/categories`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/categories` | Get user custom categories and default categories | Yes |
| `POST` | `/api/categories` | Create a new category | Yes |
| `DELETE` | `/api/categories/:id` | Delete a custom category | Yes |

### 5. Budget (`/api/budget`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/budget` | Set / update monthly budget limit for a month & year | Yes |
| `GET` | `/api/budget/status` | Get budget spending status (`?month=`, `?year=`) | Yes |

### 6. Analytics (`/api/analytics`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/analytics/categories` | Get expenses by category (`?period=this_month|last_month|this_year`) | Yes |
| `GET` | `/api/analytics/monthly` | Get monthly spending totals for a given year (`?year=`) | Yes |
| `GET` | `/api/analytics/summary` | Get financial metrics & lifetime stats (`?period=`) | Yes |

---

## Local Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v16.x or higher)
- [MongoDB](https://www.mongodb.com/) (Local installation or MongoDB Atlas URI)
- Cloudinary account credentials *(for receipt uploads)*

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Variables Configuration
Copy `.env.example` to create your `.env` file:
```bash
cp .env.example .env
```

Open `.env` and fill in your values:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/expensewise
JWT_SECRET=your_jwt_secret_key_here

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Email (Nodemailer Gmail SMTP)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

# Frontend Client URL (Local: http://localhost:5173 | Production: https://expense-wise-frontend-three.vercel.app)
CLIENT_URL=https://expense-wise-frontend-three.vercel.app
```

> [!WARNING]
> Never commit real secrets or private credentials to public version control.

### 3. Start the Server

**Development Mode (with auto-restart via nodemon):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

The server will start on `http://localhost:5000`.

---

## Deployment

The backend can be deployed to platforms such as **Render**, **Railway**, or **Vercel**:
1. Connect your repository to the hosting platform.
2. Set the build command to `npm install` and start command to `npm start` (or `node server.js`).
3. Configure all environment variables in the host settings dashboard.
4. Set up a free cloud database cluster on **MongoDB Atlas** and supply the connection string as `MONGO_URI`.

---

## Author & License

- **ExpenseWise Backend**
- Licensed under the [ISC License](LICENSE).
