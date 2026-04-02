# Ethan Laundry POS

Professional laundry point of sale system scaffold built with HTML, CSS, JavaScript, and a Node.js backend structure.

## Project Structure

- `client/` static frontend files
- `server/` backend API scaffold
- `server/db/schema.sql` MySQL database schema

## Frontend

Open `client/index.html` in a browser to preview the UI.

## Backend Setup

1. Install Node.js.
2. Open the project in IntelliJ IDEA.
3. Run `npm install`.
4. Import `server/db/schema.sql` into MySQL through XAMPP.
5. Start the backend with `npm start`.

## Default Login

- Username: `admin`
- Password: `admin123`

## M-Pesa STK Push

1. Copy `.env.example` to `.env`
2. Fill in your Daraja sandbox or production credentials
3. Set `MPESA_CALLBACK_URL` to a public HTTPS URL that points to `/api/payments/mpesa/callback`
4. If your app already has tables, run `server/db/mpesa_migration.sql`
5. Restart the server

When `Payment Method` is `Mobile`, creating an order will send an STK Push request and store the transaction as a pending M-Pesa payment.

## Railway Deployment

1. Push this project to GitHub
2. In Railway, create a new project from the GitHub repo
3. Add a MySQL service to the same Railway project
4. Railway will provide `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, and `MYSQLDATABASE`
5. Add app variables in Railway for:
   - `SESSION_SECRET`
   - `MPESA_ENV`
   - `MPESA_CONSUMER_KEY`
   - `MPESA_CONSUMER_SECRET`
   - `MPESA_SHORTCODE`
   - `MPESA_PASSKEY`
   - `MPESA_TRANSACTION_TYPE`
   - `MPESA_CALLBACK_URL`
6. Deploy and then import your SQL schema into the Railway MySQL database

This app now supports Railway's MySQL variable names automatically.

## Next Steps

- Connect the frontend forms to the API endpoints.
- Replace sample controller responses with real MySQL queries.
- Add password hashing and session-based authentication.
