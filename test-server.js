const http = require('http');
const app = require('./server');
const db = require('./database/db');

// Start test server on dynamic port
const server = app.listen(0, async () => {
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`\nStarting full automated integration verification on ${baseUrl}...\n`);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  function fetchUrl(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = `${baseUrl}${path}`;
      const req = http.request(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        });
      });
      req.on('error', reject);
      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  }

  try {
    // 1. Home Page
    const home = await fetchUrl('/');
    assert(home.statusCode === 200, 'Home page returns 200 OK');
    assert(home.body.includes('Latest Notes'), 'Home page displays "Latest Notes" section');
    assert(home.body.includes('Popular Notes'), 'Home page displays "Popular Notes" section');
    assert(home.body.includes('All Notes'), 'Home page displays "All Notes" section');
    assert(home.body.includes('Calculus I'), 'Home page renders sample note cards');
    assert(home.body.includes('Mathematics'), 'Category filter chips present');

    // 2. Category Filter
    const catFilter = await fetchUrl('/?category=mathematics');
    assert(catFilter.statusCode === 200, 'Category filter returns 200 OK');
    assert(catFilter.body.includes('Showing notes for subject: <strong>Mathematics</strong>'), 'Category filter banner active');

    // 3. API Live Search
    const apiSearch = await fetchUrl('/api/search?q=calculus');
    assert(apiSearch.statusCode === 200, 'API live search returns 200 OK');
    const searchJson = JSON.parse(apiSearch.body);
    assert(Array.isArray(searchJson) && searchJson.length > 0, 'API live search returns matching array');
    assert(searchJson[0].title.includes('Calculus'), 'API search finds Calculus note');

    // 4. API Paginated Notes
    const apiNotes = await fetchUrl('/api/notes?page=1');
    assert(apiNotes.statusCode === 200, 'API notes returns 200 OK');
    const notesJson = JSON.parse(apiNotes.body);
    assert(notesJson.totalNotes === 10, 'API notes returns correct total count (10 notes)');

    // 5. Note Detail Page
    const noteSlug = 'calculus-1-comprehensive-limits-derivatives-integrals-guide';
    const notePage = await fetchUrl(`/note/${noteSlug}`);
    assert(notePage.statusCode === 200, 'Note detail page returns 200 OK');
    assert(notePage.body.includes('Calculus I: Comprehensive Limits'), 'Note detail page contains correct note title');
    assert(notePage.body.includes(`/download/${noteSlug}`), 'Note detail page contains link to download page');
    assert(notePage.body.includes('Related'), 'Note detail page renders related notes');

    // 6. Download Page with Loader
    const downloadPage = await fetchUrl(`/download/${noteSlug}`);
    assert(downloadPage.statusCode === 200, 'Download page returns 200 OK');
    assert(downloadPage.body.includes('Your download is starting...'), 'Download page contains countdown loader');
    assert(downloadPage.body.includes(`/file/${noteSlug}`), 'Download page contains direct file endpoint');
    assert(downloadPage.body.includes('More Suggested Notes'), 'Download page displays suggested notes');

    // 7. File Download & Count Increment
    const initialDownloads = db.prepare('SELECT download_count FROM notes WHERE slug = ?').get(noteSlug).download_count;
    const fileRes = await fetchUrl(`/file/${noteSlug}`);
    assert(fileRes.statusCode === 200, 'File download returns 200 OK');
    assert(fileRes.headers['content-disposition'].includes(noteSlug), 'File download sends proper attachment disposition');
    const updatedDownloads = db.prepare('SELECT download_count FROM notes WHERE slug = ?').get(noteSlug).download_count;
    assert(updatedDownloads === initialDownloads + 1, 'Download count increments by 1 in database');

    // 8. Public Full Search
    const searchPage = await fetchUrl('/search?q=mechanics');
    assert(searchPage.statusCode === 200, 'Search page returns 200 OK');
    assert(searchPage.body.includes('Classical Mechanics'), 'Search results page contains relevant result');

    // 9. Admin Login Page
    const adminLogin = await fetchUrl('/admin/login');
    assert(adminLogin.statusCode === 200, 'Admin login page returns 200 OK');
    assert(adminLogin.body.includes('Master Password'), 'Admin login form rendered');

    // 10. Admin Unauthenticated Protection
    const adminProtected = await fetchUrl('/admin');
    assert(adminProtected.statusCode === 302 && adminProtected.headers.location === '/admin/login', 'Admin dashboard redirects unauthenticated visitor to /admin/login');

    // 11. Admin Login Submission & Session
    const loginPost = await fetchUrl('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'password=admin123'
    });
    assert(loginPost.statusCode === 302, 'Correct admin password accepted with 302 redirect');
    const sessionCookie = (loginPost.headers['set-cookie'] || [])[0];
    assert(sessionCookie && sessionCookie.includes('connect.sid'), 'Admin session cookie issued');

    const cookieHeader = sessionCookie.split(';')[0];

    // 12. Authenticated Admin Dashboard
    const adminDashAuth = await fetchUrl('/admin', {
      headers: { Cookie: cookieHeader }
    });
    assert(adminDashAuth.statusCode === 200, 'Authenticated admin accesses dashboard');
    assert(adminDashAuth.body.includes('Dashboard Overview'), 'Dashboard content displayed');
    assert(adminDashAuth.body.includes('Total Notes'), 'Dashboard shows total notes stat');

    // 13. Authenticated Admin Notes Table
    const adminNotesAuth = await fetchUrl('/admin/notes', {
      headers: { Cookie: cookieHeader }
    });
    assert(adminNotesAuth.statusCode === 200, 'Admin notes library returns 200 OK');
    assert(adminNotesAuth.body.includes('Upload New Note'), 'Upload new note button visible');

    // 14. Authenticated Admin Categories
    const adminCatsAuth = await fetchUrl('/admin/categories', {
      headers: { Cookie: cookieHeader }
    });
    assert(adminCatsAuth.statusCode === 200, 'Admin categories management returns 200 OK');
    assert(adminCatsAuth.body.includes('Add New Subject'), 'Add subject form present');

    // 15. 404 Route
    const notFound = await fetchUrl('/non-existent-page-xyz');
    assert(notFound.statusCode === 404, 'Non-existent route returns 404 Not Found');

    console.log(`\n===================================================`);
    console.log(` Verification Completed: ${passed} Passed, ${failed} Failed`);
    console.log(`===================================================\n`);

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    server.close();
    process.exit(failed > 0 ? 1 : 0);
  }
});
