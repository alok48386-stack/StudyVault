# PRD: Student Notes Sharing Website

**Version:** 1.0
**Type:** Basic website (no visitor authentication)
**Stack:** Node.js + Express + SQLite
**Hosting:** cPanel (Node.js App)

---

## 1. Overview

A simple website where students can find and download study notes for free. Visitors do not sign up or log in. They search or browse, open a note, and download it. Only the site owner uses an admin panel to upload and manage notes.

### Goals
- Let a student find the right notes in under 30 seconds.
- Keep the download journey short: Home -> Note -> Download.
- Keep the project simple to build, host, and maintain.
- Earn revenue with Adsterra Popunder ads without hurting the experience.

### Non-Goals
- No user accounts, comments, ratings, or uploads by visitors.
- No payment system.
- No mobile app.

---

## 2. Target Users

| User | Description | Main Need |
|------|-------------|-----------|
| Student (visitor) | School or college student, mostly on mobile | Find and download notes quickly |
| Admin (site owner) | One person managing the content | Add, edit, and delete notes easily |

---

## 3. Pages and Features

### 3.1 Home Page (`/`)

**Elements**
- **Header:** logo/site name, search bar.
- **Search bar:** searches note title, subject, and description. Shows results as the user types (live suggestions, max 5), and a full results list on Enter.
- **Subject/category filter:** row of chips or a dropdown (for example Mathematics, Physics, Chemistry, Computer Science, English, Commerce). Includes an "All" option.
- **Sections (list view):**
  1. **Latest Notes:** most recently added, minimum 8 shown.
  2. **Popular Notes:** sorted by download count, minimum 8 shown.
  3. **All Notes:** paginated list, 12 per page, with Next/Previous.
- **Note card (list item):** preview thumbnail, title, subject tag, uploader name, file size, download count.
- **Footer:** about, contact, disclaimer.

**Behavior**
- Selecting a category filters all sections on the page.
- Empty search results show a friendly "No notes found" message with a suggestion to browse categories.

### 3.2 Note Detail Page (`/note/:id`)

**Elements**
- Preview image (large).
- Title.
- Subject/category tag.
- Description.
- Uploader name.
- File size and file type (PDF, DOCX, and so on).
- Upload date and download count.
- **Download button** (large, clearly visible).
- "Related notes" row (same subject, 4 items).
- Breadcrumb: Home > Subject > Note title.

**Behavior**
- Clicking Download redirects to `/download/:id`.

### 3.3 Download Page (`/download/:id`)

**Elements**
- Message: "Your download is starting..."
- **Downloading loader:** progress bar or spinner, about 5 seconds.
- Automatic file download after the loader finishes.
- Fallback link: "Download not starting? Click here."
- **"More suggested notes" section:** 6 to 8 notes, same subject first, then popular notes.
- "Back to note" and "Back to home" links.

**Behavior**
- The download count increases by 1 when the download starts.
- If the note does not exist, show a 404 page with a link home.

### 3.4 Admin Panel (`/admin`)

**Access:** protected by a single admin password stored in an environment variable (not a user account system). Visitors never see a login.

**Features**
- **Dashboard:** total notes, total downloads, latest 5 notes.
- **Notes list:** table with title, subject, downloads, date, Edit and Delete buttons, plus search.
- **Add note form:** title, subject (select), description, uploader name, note file upload, preview image upload.
- **Edit note form:** same fields, with current file and image shown.
- **Delete note:** confirmation popup, then remove the database entry and the files.
- **Manage categories:** add, rename, and delete subjects.
- File size and type are detected automatically on upload.

**Validation**
- Allowed note files: PDF, DOC, DOCX, PPT, PPTX, ZIP. Max 25 MB (configurable).
- Allowed images: JPG, PNG, WEBP. Max 2 MB.

---

## 4. User Flow

1. Student lands on Home.
2. Searches or picks a subject.
3. Opens a note detail page.
4. Clicks Download.
5. Sees the download page with the loader.
6. The file downloads automatically.
7. The student browses suggested notes and continues.

---

## 5. User Experience Strategy

- **Fast:** lightweight pages, lazy-loaded images, compressed assets.
- **Mobile first:** responsive layout, large tap targets, sticky search bar.
- **Clean design:** simple colors, readable fonts, clear Download button.
- **Zero friction:** no sign-up, no forced steps beyond the short loader.
- **Smart discovery:** related notes on the detail page and suggested notes on the download page keep users browsing.
- **Clear feedback:** loading states, empty states, and friendly error messages.
- **Accessibility:** alt text on images, good color contrast, keyboard-friendly forms.
- **SEO basics:** a unique title and meta description per note page, clean URLs, sitemap.xml, robots.txt.

---

## 6. Monetization: Adsterra Popunder

- **Ad network:** Adsterra.
- **Ad format:** Popunder (one script added once in the site layout).
- **Placement:** the script loads on the Note Detail and Download pages, where intent is highest.
- **UX protections:**
  - Do not run the ad on the admin panel.
  - Limit to 1 popunder per visitor session (use the network's frequency cap and a session cookie).
  - Never block or delay the actual file download because of the ad.
- **Configuration:** the ad script is stored in a single config setting or partial file so the admin can replace it without editing multiple pages.
- Add a short note in the footer that the site is supported by ads.

---

## 7. Data Model (SQLite)

### Table: `categories`
| Field | Type | Notes |
|-------|------|-------|
| id | INTEGER | Primary key, auto increment |
| name | TEXT | Unique, for example "Physics" |
| slug | TEXT | Unique, URL friendly |

### Table: `notes`
| Field | Type | Notes |
|-------|------|-------|
| id | INTEGER | Primary key, auto increment |
| title | TEXT | Required |
| slug | TEXT | Unique, URL friendly |
| description | TEXT | Required |
| category_id | INTEGER | Foreign key to categories.id |
| uploader_name | TEXT | Defaults to "Admin" |
| file_path | TEXT | Path to the stored note file |
| file_type | TEXT | pdf, docx, and so on |
| file_size | INTEGER | In bytes, displayed as KB/MB |
| preview_image | TEXT | Path to the preview image |
| download_count | INTEGER | Default 0 |
| created_at | DATETIME | Default current time |
| updated_at | DATETIME | Updated on edit |

**Relationship:** one category has many notes.

---

## 8. Routes

### Public
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/` | Home page |
| GET | `/category/:slug` | Notes filtered by subject |
| GET | `/search?q=` | Search results |
| GET | `/note/:slug` | Note detail page |
| GET | `/download/:slug` | Download page with loader |
| GET | `/file/:slug` | Sends the file and increments the count |

### API (used by live search and pagination)
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/search?q=` | Live search suggestions |
| GET | `/api/notes?page=&category=` | Paginated list |

### Admin (password protected)
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/admin` | Dashboard |
| GET | `/admin/notes` | Notes list |
| GET/POST | `/admin/notes/new` | Add note |
| GET/POST | `/admin/notes/:id/edit` | Edit note |
| POST | `/admin/notes/:id/delete` | Delete note |
| GET/POST | `/admin/categories` | Manage categories |

---

## 9. Tech Stack

| Layer | Choice |
|-------|--------|
| Backend | Node.js + Express |
| Database | SQLite (`better-sqlite3`) |
| Templates | EJS (server-rendered pages) |
| Frontend | HTML, CSS, vanilla JavaScript |
| File upload | Multer |
| Sessions (admin only) | express-session |
| Config | dotenv |

**Environment variables:** `PORT`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `MAX_FILE_SIZE_MB`.
