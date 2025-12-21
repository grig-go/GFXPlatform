const { createClient } = require('@supabase/supabase-js');

const novaClient = createClient(
  'https://bgkjcngrslxyqjitksim.supabase.co',
  process.env.NOVA_SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const OLD_HOST = 'ihdoylhzekyluiiigxxc.supabase.co';
const NEW_HOST = 'bgkjcngrslxyqjitksim.supabase.co';

async function main() {
  console.log('Checking URLs that need updating...\n');

  // Check counts first
  const { data: templates } = await novaClient.from('gfx_templates').select('id, thumbnail_url').not('thumbnail_url', 'is', null);
  const { data: projects } = await novaClient.from('gfx_projects').select('id, thumbnail_url').not('thumbnail_url', 'is', null);
  const { data: textures } = await novaClient.from('organization_textures').select('id, file_url, thumbnail_url');
  const { data: presets } = await novaClient.from('gfx_animation_presets').select('id, preview_url').not('preview_url', 'is', null);

  const templatesNeedUpdate = templates?.filter(t => t.thumbnail_url?.includes(OLD_HOST)) || [];
  const projectsNeedUpdate = projects?.filter(p => p.thumbnail_url?.includes(OLD_HOST)) || [];
  const texturesFileNeedUpdate = textures?.filter(t => t.file_url?.includes(OLD_HOST)) || [];
  const texturesThumbNeedUpdate = textures?.filter(t => t.thumbnail_url?.includes(OLD_HOST)) || [];
  const presetsNeedUpdate = presets?.filter(p => p.preview_url?.includes(OLD_HOST)) || [];

  console.log('URLs needing update:');
  console.log(`  gfx_templates.thumbnail_url: ${templatesNeedUpdate.length}`);
  console.log(`  gfx_projects.thumbnail_url: ${projectsNeedUpdate.length}`);
  console.log(`  organization_textures.file_url: ${texturesFileNeedUpdate.length}`);
  console.log(`  organization_textures.thumbnail_url: ${texturesThumbNeedUpdate.length}`);
  console.log(`  gfx_animation_presets.preview_url: ${presetsNeedUpdate.length}`);

  // Update gfx_templates
  if (templatesNeedUpdate.length > 0) {
    console.log('\nUpdating gfx_templates...');
    for (const row of templatesNeedUpdate) {
      const newUrl = row.thumbnail_url.replace(OLD_HOST, NEW_HOST);
      const { error } = await novaClient.from('gfx_templates').update({ thumbnail_url: newUrl }).eq('id', row.id);
      if (error) console.log(`  Error ${row.id}: ${error.message}`);
    }
    console.log(`  Updated ${templatesNeedUpdate.length} rows`);
  }

  // Update gfx_projects
  if (projectsNeedUpdate.length > 0) {
    console.log('\nUpdating gfx_projects...');
    for (const row of projectsNeedUpdate) {
      const newUrl = row.thumbnail_url.replace(OLD_HOST, NEW_HOST);
      const { error } = await novaClient.from('gfx_projects').update({ thumbnail_url: newUrl }).eq('id', row.id);
      if (error) console.log(`  Error ${row.id}: ${error.message}`);
    }
    console.log(`  Updated ${projectsNeedUpdate.length} rows`);
  }

  // Update organization_textures.file_url
  if (texturesFileNeedUpdate.length > 0) {
    console.log('\nUpdating organization_textures.file_url...');
    for (const row of texturesFileNeedUpdate) {
      const newUrl = row.file_url.replace(OLD_HOST, NEW_HOST);
      const { error } = await novaClient.from('organization_textures').update({ file_url: newUrl }).eq('id', row.id);
      if (error) console.log(`  Error ${row.id}: ${error.message}`);
    }
    console.log(`  Updated ${texturesFileNeedUpdate.length} rows`);
  }

  // Update organization_textures.thumbnail_url
  if (texturesThumbNeedUpdate.length > 0) {
    console.log('\nUpdating organization_textures.thumbnail_url...');
    for (const row of texturesThumbNeedUpdate) {
      const newUrl = row.thumbnail_url.replace(OLD_HOST, NEW_HOST);
      const { error } = await novaClient.from('organization_textures').update({ thumbnail_url: newUrl }).eq('id', row.id);
      if (error) console.log(`  Error ${row.id}: ${error.message}`);
    }
    console.log(`  Updated ${texturesThumbNeedUpdate.length} rows`);
  }

  // Update gfx_animation_presets
  if (presetsNeedUpdate.length > 0) {
    console.log('\nUpdating gfx_animation_presets...');
    for (const row of presetsNeedUpdate) {
      const newUrl = row.preview_url.replace(OLD_HOST, NEW_HOST);
      const { error } = await novaClient.from('gfx_animation_presets').update({ preview_url: newUrl }).eq('id', row.id);
      if (error) console.log(`  Error ${row.id}: ${error.message}`);
    }
    console.log(`  Updated ${presetsNeedUpdate.length} rows`);
  }

  console.log('\nDone!');
}

main().catch(console.error);
