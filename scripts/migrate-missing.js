const { createClient } = require('@supabase/supabase-js');

const gfxClient = createClient(
  'https://ihdoylhzekyluiiigxxc.supabase.co',
  process.env.GFX_SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const novaClient = createClient(
  'https://bgkjcngrslxyqjitksim.supabase.co',
  process.env.NOVA_SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // Build org mapping
  const { data: gfxOrgs } = await gfxClient.from('organizations').select('id, name, slug');
  const { data: novaOrgs } = await novaClient.from('u_organizations').select('id, name, slug');

  const orgIdMap = new Map();
  const emergentOrg = novaOrgs.find(o => o.slug === 'emergent');

  for (const gfxOrg of gfxOrgs) {
    // Map Nova Development to Emergent
    if (gfxOrg.id === '00000000-0000-0000-0000-000000000001' || gfxOrg.name === 'Nova Development') {
      orgIdMap.set(gfxOrg.id, emergentOrg.id);
      continue;
    }
    // Map "Emergent Organization" to Emergent
    if (gfxOrg.id === '6f1e0ed4-4994-4de5-9a22-e450457155c5' || gfxOrg.name === 'Emergent Organization') {
      orgIdMap.set(gfxOrg.id, emergentOrg.id);
      continue;
    }
    const novaOrg = novaOrgs.find(o => o.slug === gfxOrg.slug || o.name === gfxOrg.name);
    if (novaOrg) orgIdMap.set(gfxOrg.id, novaOrg.id);
  }

  // Build user mapping
  const { data: gfxUsers } = await gfxClient.from('users').select('id, email');
  const { data: novaUsers } = await novaClient.from('u_users').select('id, email');

  const userIdMap = new Map();
  for (const gfxUser of gfxUsers) {
    const novaUser = novaUsers.find(u => u.email.toLowerCase() === gfxUser.email.toLowerCase());
    if (novaUser) userIdMap.set(gfxUser.id, novaUser.id);
  }

  console.log('Org mappings:', orgIdMap.size);
  console.log('User mappings:', userIdMap.size);

  // Migrate gfx_chat_messages
  console.log('\nMigrating gfx_chat_messages...');
  const { data: chatMsgs } = await gfxClient.from('gfx_chat_messages').select('*');
  console.log('  Found:', chatMsgs?.length || 0);

  let chatSuccess = 0;
  for (const row of chatMsgs || []) {
    const mapped = { ...row };
    if (mapped.user_id) {
      mapped.user_id = userIdMap.get(mapped.user_id) || null;
    }
    const { error } = await novaClient.from('gfx_chat_messages').upsert([mapped], { onConflict: 'id' });
    if (!error) chatSuccess++;
    else console.log('  Skip:', row.id, error.message);
  }
  console.log('  Migrated:', chatSuccess);

  // Migrate gfx_support_tickets
  console.log('\nMigrating gfx_support_tickets...');
  const { data: tickets } = await gfxClient.from('gfx_support_tickets').select('*');
  console.log('  Found:', tickets?.length || 0);

  let ticketSuccess = 0;
  for (const row of tickets || []) {
    const mapped = { ...row };
    if (mapped.organization_id) {
      const newOrg = orgIdMap.get(mapped.organization_id);
      if (!newOrg) { console.log('  Skip (no org):', row.id); continue; }
      mapped.organization_id = newOrg;
    }
    if (mapped.user_id) mapped.user_id = userIdMap.get(mapped.user_id) || null;
    const { error } = await novaClient.from('gfx_support_tickets').upsert([mapped], { onConflict: 'id' });
    if (!error) ticketSuccess++;
    else console.log('  Skip:', row.id, error.message);
  }
  console.log('  Migrated:', ticketSuccess);

  // Migrate pulsar_playout_log
  console.log('\nMigrating pulsar_playout_log...');
  const { data: playout } = await gfxClient.from('pulsar_playout_log').select('*');
  console.log('  Found:', playout?.length || 0);

  let playoutSuccess = 0;
  for (const row of playout || []) {
    const mapped = { ...row };
    if (mapped.organization_id) {
      const newOrg = orgIdMap.get(mapped.organization_id);
      if (!newOrg) { continue; }
      mapped.organization_id = newOrg;
    }
    if (mapped.triggered_by) mapped.triggered_by = userIdMap.get(mapped.triggered_by) || null;
    if (mapped.operator_id) mapped.operator_id = userIdMap.get(mapped.operator_id) || null;
    const { error } = await novaClient.from('pulsar_playout_log').upsert([mapped], { onConflict: 'id' });
    if (!error) playoutSuccess++;
    else console.log('  Skip:', row.id, error.message);
  }
  console.log('  Migrated:', playoutSuccess);

  console.log('\nDone!');
}

main().catch(console.error);
