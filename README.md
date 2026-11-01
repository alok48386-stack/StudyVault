# StudyVault - Student Notes Sharing Website

A modern, fast, and responsive website where students can browse, search, and download verified study notes and formula sheets for free with zero sign-up friction. Only the site owner uses a lightweight password-protected admin panel to upload and manage notes.

Built according to the Product Requirement Document (PRD) with **Node.js**, **Express**, **SQLite** (`better-sqlite3`), and **EJS**.

---

## Features

- **⚡ Fast Student Journey:** Home &rarr; Note &rarr; Download in under 30 seconds. No user registration or login required.
- **🔍 Live Search with Autocomplete:** As-you-type live suggestions (max 5) with keyboard navigation (`↑`, `↓`, `Enter`, `Esc`) and full results page.
- **🏷️ Subject Filtering:** Interactive category chips (Mathematics, Physics, Chemistry, Computer Science, English, Commerce) filtering all note sections.
- **📚 Curated Sections:**
  - **Latest Notes:** Most recently uploaded study guides.
  - **Popular Notes:** Sorted by real download counts.
  - **All Notes:** Paginated view (12 per page) with Previous/Next controls.
- **⏱️ 5-Second Download Loader:** Smooth countdown progress bar with automatic file trigger and manual fallback button.
- **💡 Smart Discovery:** "Related Notes" row on note detail page and "More Suggested Notes" on download page.
- **🔒 Single-Password Admin Panel (`/admin`):**
  - **Dashboard:** Live metrics (Total Notes, Total Downloads, Total Categories) and recently published notes.
  - **Notes Library:** Searchable data table with Edit and Delete capabilities.
  - **Upload & Edit Forms:** Automatic file size & file format detection (supports PDF, DOC, DOCX, PPT, PPTX, ZIP up to 25 MB; Images up to 2 MB).
  - **Category Management:** Create, rename, and delete subjects (with safety lock preventing deletion if notes exist).
- **💰 Adsterra Popunder Monetization:** Pre-configured partial loaded strictly on detail and download pages, capped to 1 per session and disabled on admin pages.
- **📱 Clean, Modern & Mobile-First Design:** Fully responsive layout with custom SVG iconography and Plus Jakarta Sans typography.

---

## Folder Structure

```
website/
├── server.js               # Main Express application entry point
├── config.js               # Centralized configuration and limits
├── package.json            # Scripts and dependencies
├── .env                    # Environment variables (secrets)
├── .env.example            # Environment variables template
├── PRD.md                  # Complete product requirements specification
├── README.md               # Setup and deployment documentation
├── routes/
│   ├── public.js           # Public views (/, /category/:slug, /note/:slug, /download/:slug, /file/:slug, /search)
│   ├── api.js              # Live search suggestions and paginated API
│   └── admin.js            # Admin dashboard, notes CRUD, and category management
├── middleware/
│   ├── adminAuth.js        # Single-password session protection
│   └── upload.js           # Multer configuration with extension and size validation
├── views/
│   ├── home.ejs            # Homepage with chips and sections
│   ├── note.ejs            # Note detail view with large preview and related notes
│   ├── download.ejs        # Download view with 5s progress loader
│   ├── search.ejs          # Search results and empty state
│   ├── 404.ejs             # Friendly 404 error page
│   ├── partials/
│   │   ├── header.ejs      # Header with sticky live search bar
│   │   ├── footer.ejs      # Footer with legal, DMCA, and disclaimer
│   │   ├── note-card.ejs   # Note card component with badges
│   │   └── ad-script.ejs   # Adsterra popunder monetization container
│   └── admin/
│       ├── layout-header.ejs # Admin navigation bar & flash alert handler
│       ├── layout-footer.ejs # Admin footer
│       ├── login.ejs         # Admin password login
│       ├── dashboard.ejs     # Stat counters & recent notes
│       ├── notes.ejs         # Note library management table
│       ├── note-form.ejs     # Add / Edit note form
│       └── categories.ejs    # Subject management & rename modal
├── public/
│   ├── css/
│   │   └── style.css       # Clean, modern, responsive stylesheet
│   ├── js/
│   │   └── main.js         # Live search debouncing & UI handlers
│   └── images/
│       └── logo.svg        # Brand logo
├── storage/
│   ├── notes/              # Uploaded note documents (PDF, DOCX, etc.)
│   └── previews/           # Uploaded and generated preview thumbnails
└── database/
    ├── database.sqlite     # SQLite database
    ├── schema.sql          # SQL table definitions and indexes
    ├── seed.sql            # 10 sample notes across 6 subjects
    └── seed.js             # Automated database seeding & file generator
```

---

## Getting Started Locally

### 1. Prerequisites
- **Node.js** (v18, v20, or v22 LTS recommended)
- **npm** (comes with Node.js)

### 2. Install Dependencies
Open your terminal in the project directory:
```bash
npm install
```

### 3. Initialize & Seed Database (10 Sample Notes)
Run the built-in seeder to create tables, populate the 6 standard subjects, and insert 10 complete sample notes with real PDF/document files and preview images:
```bash
npm run seed
```

### 4. Start the Application
```bash
npm start
```
The server will start on port `3000`:
- **Public Website:** [http://localhost:3000](http://localhost:3000)
- **Admin Panel:** [http://localhost:3000/admin](http://localhost:3000/admin)

*(For development with auto-reload, you can also run: `npm run dev`)*

---

## Admin Panel Access

- **URL:** [http://localhost:3000/admin](http://localhost:3000/admin)
- **Default Master Password:** `admin123`

You can change this password at any time by updating `ADMIN_PASSWORD` in your `.env` file:
```env
ADMIN_PASSWORD=your_secure_password_here
```

---

## Running Verification Tests

An automated test suite tests all public pages, search endpoints, download flows, file counters, and admin session security:
```bash
npm test
```

---

## Environment Variables Configuration

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `PORT` | `3000` | Port for the Express server (dynamically bound in cPanel) |
| `ADMIN_PASSWORD` | `admin123` | Password used to log in to `/admin` |
| `SESSION_SECRET` | `supersecret...` | Secret key used to sign the admin session cookie |
| `MAX_FILE_SIZE_MB` | `25` | Maximum upload size for note documents (in Megabytes) |
| `SITE_NAME` | `StudyVault` | Site title shown in header, footer, and metadata |
| `CONTACT_EMAIL` | `support@studyvault.local` | Email address shown in the footer for inquiries |
| `DMCA_EMAIL` | `dmca@studyvault.local` | Email address shown in footer for DMCA removal requests |
| `ADSTERRA_ENABLED` | `true` | Enables or disables Adsterra popunder monetization |
| `ADSTERRA_SCRIPT` | `<!-- placeholder -->` | Your production Adsterra popunder code/script tag |

---

## cPanel Deployment Guide

Follow these steps to deploy on cPanel (Node.js App / CloudLinux Passenger):

1. **Setup Node.js App in cPanel:**
   - In cPanel, click **Setup Node.js App**.
   - Select a Node LTS version (Node 18.x, 20.x, or 22.x).
   - Set **Application root** to your folder (e.g., `public_html` or `studyvault`).
   - Set **Application startup file** to `server.js`.
   - Click **Create**.

2. **Upload Files:**
   - Upload the project files using cPanel File Manager or Git.
   - Do **not** upload `node_modules` (these should be installed on the server).
   - Ensure the `/storage` and `/database` folders have write permissions (`0755` or `0775`).

3. **Install Dependencies in cPanel:**
   - In the cPanel Node.js App screen, click **Run NPM Install**.

4. **Set Environment Variables:**
   - In the Node.js App screen under **Environment Variables**, add:
     - `ADMIN_PASSWORD` = `<your-chosen-password>`
     - `SESSION_SECRET` = `<a-random-long-secret-key>`
     - `MAX_FILE_SIZE_MB` = `25`
     - `FORCE_HTTPS` = `true`

5. **Seed the Starter Database:**
   - Enter the virtual environment in terminal or run:
     ```bash
     npm run seed
     ```

6. **Restart Application:**
   - Click **Restart** in the Node.js App panel in cPanel.
   - Visit your domain in the browser to confirm the site is live!
