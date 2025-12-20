const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ihdoylhzekyluiiigxxc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZG95bGh6ZWt5bHVpaWlneHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MDg5OTIsImV4cCI6MjA4MDA4NDk5Mn0.BTBy31mZUYuxTP-FTU6BU2lu95K0YTxN5eaDRX3hn8o'
);

async function check() {
  // First try the RPC call
  console.log('=== Testing RPC: get_instance_by_channel ===');
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_instance_by_channel', {
    p_channel_name: 'ue5-local'
  });

  if (rpcError) {
    console.error('RPC Error:', rpcError);
  } else {
    console.log('RPC Result success:', rpcData?.success);
    if (rpcData?.data) {
      console.log('Channel:', rpcData.data.channel_name);
      console.log('Friendly name:', rpcData.data.friendly_name);
      console.log('Project type:', rpcData.data.project_type);
      const json = rpcData.data.set_manager_json;
      if (json) {
        const parsed = typeof json === 'string' ? JSON.parse(json) : json;
        console.log('Schema version:', parsed['$schema']);
        console.log('Has sections:', !!parsed.sections);
        console.log('Has actors:', !!parsed.actors);
        console.log('Sections count:', parsed.sections?.length);
        console.log('Section names:', parsed.sections?.map(s => s.name).slice(0, 10));
      } else {
        console.log('set_manager_json is NULL');
      }
    } else {
      console.log('No data returned, error:', rpcData?.error);
    }
  }

  // Also query directly
  console.log('\n=== Direct query to pulsar_connections ===');
  const { data: directData, error: directError } = await supabase
    .from('pulsar_connections')
    .select('id, channel_name, friendly_name, project_type, set_manager_json')
    .ilike('channel_name', 'ue5-local%')
    .limit(1);

  if (directError) {
    console.error('Direct query error:', directError);
  } else if (directData && directData.length > 0) {
    console.log('Found connection:', directData[0].channel_name);
    const json = directData[0].set_manager_json;
    if (json) {
      const parsed = typeof json === 'string' ? JSON.parse(json) : json;
      console.log('Schema version:', parsed['$schema']);
      console.log('Sections:', parsed.sections?.length);
    }
  } else {
    console.log('No connections found matching ue5-local');
  }
}

check().catch(console.error);
