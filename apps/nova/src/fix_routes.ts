// Temporary script to fix all sports_dashboard routes
// This file can be deleted after running

import * as fs from 'fs';

const filePath = './supabase/functions/sports_dashboard/index.ts';
let content = fs.readFileSync(filePath, 'utf-8');

// Replace all app.get('/sports_dashboard/ with app.get('/
content = content.replace(/app\.get\('\/sports_dashboard\//g, "app.get('/");

// Replace all app.post('/sports_dashboard/ with app.post('/
content = content.replace(/app\.post\('\/sports_dashboard\//g, "app.post('/");

// Replace all app.delete('/sports_dashboard/ with app.delete('/
content = content.replace(/app\.delete\('\/sports_dashboard\//g, "app.delete('/");

// Replace all app.put('/sports_dashboard/ with app.put('/
content = content.replace(/app\.put\('\/sports_dashboard\//g, "app.put('/");

fs.writeFileSync(filePath, content, 'utf-8');

console.log('✅ Fixed all sports_dashboard routes!');
