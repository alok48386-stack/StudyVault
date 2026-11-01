const fs = require('fs');
const path = require('path');
const db = require('./db');
const config = require('../config');

console.log('Seeding database and creating sample files...');

// Read and execute seed.sql
const seedSqlPath = path.join(__dirname, 'seed.sql');
const seedSql = fs.readFileSync(seedSqlPath, 'utf8');
db.exec(seedSql);

// Sample files definition
const sampleItems = [
  {
    fileName: 'calculus-1-complete-guide.pdf',
    previewName: 'calculus-1-preview.svg',
    title: 'Calculus I Complete Guide',
    subject: 'Mathematics',
    color1: '#4F46E5',
    color2: '#7C3AED',
    type: 'pdf'
  },
  {
    fileName: 'linear-algebra-master-summary.pdf',
    previewName: 'linear-algebra-preview.svg',
    title: 'Linear Algebra Summary',
    subject: 'Mathematics',
    color1: '#4338CA',
    color2: '#6366F1',
    type: 'pdf'
  },
  {
    fileName: 'classical-mechanics-exam-sheet.pdf',
    previewName: 'classical-mechanics-preview.svg',
    title: 'Classical Mechanics Sheet',
    subject: 'Physics',
    color1: '#0891B2',
    color2: '#06B6D4',
    type: 'pdf'
  },
  {
    fileName: 'electromagnetism-circuit-analysis.docx',
    previewName: 'electromagnetism-preview.svg',
    title: 'Electromagnetism Notes',
    subject: 'Physics',
    color1: '#0E7490',
    color2: '#22D3EE',
    type: 'docx'
  },
  {
    fileName: 'organic-chemistry-reaction-mechanisms.pdf',
    previewName: 'organic-chemistry-preview.svg',
    title: 'Organic Chemistry Reactions',
    subject: 'Chemistry',
    color1: '#059669',
    color2: '#10B981',
    type: 'pdf'
  },
  {
    fileName: 'inorganic-chemistry-coordination-compounds.pdf',
    previewName: 'inorganic-chemistry-preview.svg',
    title: 'Inorganic Chemistry Guide',
    subject: 'Chemistry',
    color1: '#047857',
    color2: '#34D399',
    type: 'pdf'
  },
  {
    fileName: 'dsa-quick-reference-cheatsheet.pdf',
    previewName: 'dsa-cheatsheet-preview.svg',
    title: 'DSA Quick Reference',
    subject: 'Computer Science',
    color1: '#DC2626',
    color2: '#F87171',
    type: 'pdf'
  },
  {
    fileName: 'operating-systems-concurrency-notes.pdf',
    previewName: 'operating-systems-preview.svg',
    title: 'Operating Systems Notes',
    subject: 'Computer Science',
    color1: '#B91C1C',
    color2: '#EF4444',
    type: 'pdf'
  },
  {
    fileName: 'academic-writing-literary-analysis.docx',
    previewName: 'academic-writing-preview.svg',
    title: 'Academic Writing Guide',
    subject: 'English',
    color1: '#D97706',
    color2: '#FBBF24',
    type: 'docx'
  },
  {
    fileName: 'financial-accounting-cash-flow-analysis.pdf',
    previewName: 'financial-accounting-preview.svg',
    title: 'Financial Accounting Notes',
    subject: 'Commerce',
    color1: '#7C2D12',
    color2: '#EA580C',
    type: 'pdf'
  }
];

// Helper to generate a minimal valid PDF file with visible text content
function createSamplePdf(title, subject) {
  const content = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 200 >> stream
BT
/F1 24 Tf
50 720 Td
(${title.replace(/[\(\)]/g, '')}) Tj
/F1 14 Tf
0 -36 Td
(Subject: ${subject} - Downloaded from StudyVault) Tj
0 -24 Td
(This is a verified educational resource note for academic revision.) Tj
0 -20 Td
(All rights reserved by original authors. Free educational sharing.) Tj
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000500 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
570
%%EOF`;
  return Buffer.from(content, 'utf8');
}

// Helper to generate a nice SVG thumbnail
function createSampleSvg(title, subject, color1, color2, type) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${color1}" />
      <stop offset="100%" stop-color="${color2}" />
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-opacity="0.25"/>
    </filter>
  </defs>
  
  <!-- Background gradient -->
  <rect width="600" height="400" fill="url(#grad)" rx="16"/>
  
  <!-- Subtle decorative patterns -->
  <circle cx="520" cy="80" r="140" fill="white" opacity="0.06"/>
  <circle cx="80" cy="340" r="100" fill="white" opacity="0.04"/>
  
  <!-- Note Document Card Preview -->
  <g filter="url(#shadow)">
    <rect x="70" y="50" width="460" height="300" rx="12" fill="#ffffff"/>
    
    <!-- Header band -->
    <rect x="70" y="50" width="460" height="54" rx="12" fill="#f8fafc"/>
    <path d="M 70 92 L 530 92" stroke="#e2e8f0" stroke-width="1.5"/>
    
    <!-- Subject badge inside header -->
    <rect x="95" y="65" width="130" height="26" rx="6" fill="${color1}" opacity="0.15"/>
    <text x="160" y="82" fill="${color1}" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" text-anchor="middle">
      ${subject.toUpperCase()}
    </text>
    
    <!-- File format badge -->
    <rect x="450" y="65" width="55" height="26" rx="6" fill="${color1}"/>
    <text x="477" y="82" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700" text-anchor="middle">
      ${type.toUpperCase()}
    </text>
    
    <!-- Title -->
    <text x="95" y="145" fill="#0f172a" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="800">
      ${title}
    </text>
    
    <!-- Simulated text lines -->
    <rect x="95" y="180" width="410" height="10" rx="5" fill="#e2e8f0"/>
    <rect x="95" y="202" width="370" height="10" rx="5" fill="#f1f5f9"/>
    <rect x="95" y="224" width="395" height="10" rx="5" fill="#f1f5f9"/>
    <rect x="95" y="246" width="320" height="10" rx="5" fill="#f1f5f9"/>
    <rect x="95" y="268" width="280" height="10" rx="5" fill="#f1f5f9"/>
    
    <!-- StudyVault verified footer tag -->
    <text x="95" y="322" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="500">
      Verified Academic Resource  •  Free Download
    </text>
  </g>
</svg>`;
}

// Create files on disk
sampleItems.forEach(item => {
  const filePath = path.join(config.storage.notesDir, item.fileName);
  const previewPath = path.join(config.storage.previewsDir, item.previewName);
  
  if (!fs.existsSync(filePath)) {
    if (item.type === 'pdf') {
      fs.writeFileSync(filePath, createSamplePdf(item.title, item.subject));
    } else {
      // Create readable mock file for docx / others
      const mockDoc = `STUDYVAULT ACADEMIC NOTES\nTitle: ${item.title}\nSubject: ${item.subject}\n\nThis is a verified educational document available for student download.\n`;
      fs.writeFileSync(filePath, mockDoc, 'utf8');
    }
  }
  
  if (!fs.existsSync(previewPath)) {
    fs.writeFileSync(previewPath, createSampleSvg(item.title, item.subject, item.color1, item.color2, item.type), 'utf8');
  }
});

// Also create a default placeholder preview in case uploads don't supply an image
const defaultPreviewPath = path.join(config.storage.previewsDir, 'default-preview.svg');
if (!fs.existsSync(defaultPreviewPath)) {
  fs.writeFileSync(
    defaultPreviewPath,
    createSampleSvg('Study Notes Document', 'General Notes', '#2563EB', '#3B82F6', 'PDF'),
    'utf8'
  );
}

console.log('Seeding completed successfully! 10 sample notes and previews are ready.');
