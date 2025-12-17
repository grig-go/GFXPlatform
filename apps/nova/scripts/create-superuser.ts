#!/usr/bin/env npx ts-node --esm

/**
 * Create Superuser Script
 *
 * Creates or replaces the superuser account for Nova/Pulsar applications.
 * The superuser has full access to all features and cannot be modified through the UI.
 *
 * Usage: npm run create-superuser
 */

import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables (check both app-local and root .env)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Load root .env first, then app-local .env (app-local takes precedence)
dotenv.config({ path: join(__dirname, '..', '..', '..', '.env') });
dotenv.config({ path: join(__dirname, '..', '.env') });

// Supabase configuration - require environment variables (app-specific with fallback)
const SUPABASE_URL = process.env.VITE_NOVA_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: VITE_SUPABASE_URL (or VITE_NOVA_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
  console.error('Make sure your .env file is configured with:');
  console.error('  VITE_SUPABASE_URL=http://localhost:54321  (or VITE_NOVA_SUPABASE_URL for Nova-specific)');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>');
  process.exit(1);
}

// Create Supabase client with service role (admin access)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Readline interface for prompts
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

function promptPassword(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);

    // Disable echo for password input
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    let password = '';

    const onData = (char: Buffer) => {
      const c = char.toString();

      if (c === '\n' || c === '\r') {
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        process.stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(password);
      } else if (c === '\u0003') {
        // Ctrl+C
        process.exit(1);
      } else if (c === '\u007F' || c === '\b') {
        // Backspace
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        password += c;
        process.stdout.write('*');
      }
    };

    process.stdin.resume();
    process.stdin.on('data', onData);
  });
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  return { valid: true };
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                 CREATE / REPLACE SUPERUSER                     ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log('║ This script creates or replaces the superuser account.         ║');
  console.log('║ The superuser has full access to all features and cannot       ║');
  console.log('║ be modified through the UI.                                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // Check if superuser already exists
    const { data: existingSuperuser, error: checkError } = await supabase
      .from('u_users')
      .select('id, email, auth_user_id')
      .eq('is_superuser', true)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine
      console.error('Error checking for existing superuser:', checkError.message);
      process.exit(1);
    }

    if (existingSuperuser) {
      console.log(`⚠️  Existing superuser found: ${existingSuperuser.email}`);
      const confirm = await prompt('Replace existing superuser? (y/N): ');
      if (confirm.toLowerCase() !== 'y') {
        console.log('Aborted.');
        process.exit(0);
      }
    }

    // Get email
    let email = '';
    while (!validateEmail(email)) {
      email = await prompt('Enter superuser email: ');
      if (!validateEmail(email)) {
        console.log('Invalid email format. Please try again.');
      }
    }

    // Get password
    let password = '';
    let passwordConfirm = '';
    while (true) {
      password = await promptPassword('Enter password: ');
      const validation = validatePassword(password);
      if (!validation.valid) {
        console.log(validation.message);
        continue;
      }

      passwordConfirm = await promptPassword('Confirm password: ');
      if (password !== passwordConfirm) {
        console.log('Passwords do not match. Please try again.');
        continue;
      }
      break;
    }

    // Get full name
    const fullName = await prompt('Enter full name (optional, press Enter to use email): ') || email.split('@')[0];

    console.log('\n⚠️  Warning: This will replace any existing superuser account.');
    const finalConfirm = await prompt('Continue? (y/N): ');
    if (finalConfirm.toLowerCase() !== 'y') {
      console.log('Aborted.');
      process.exit(0);
    }

    console.log('\nCreating superuser...\n');

    // Step 1: Delete existing superuser if exists
    if (existingSuperuser) {
      console.log('  → Removing existing superuser...');

      // Delete from u_users first (this will cascade, but be explicit)
      await supabase
        .from('u_users')
        .delete()
        .eq('is_superuser', true);

      // Delete from auth.users
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(
        existingSuperuser.auth_user_id
      );

      if (deleteAuthError) {
        console.log(`    Warning: Could not delete auth user: ${deleteAuthError.message}`);
      } else {
        console.log('  ✓ Existing superuser removed');
      }
    }

    // Step 2: Create or update auth user
    console.log('  → Creating auth user...');
    let authUserId: string;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        is_superuser: true
      }
    });

    if (authError) {
      // Check if user already exists
      if (authError.message.includes('already been registered')) {
        console.log('  → Auth user exists, updating password...');

        // Find the existing user
        const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
          console.error(`\n❌ Error listing users: ${listError.message}`);
          process.exit(1);
        }

        const existingUser = existingUsers.users.find(u => u.email === email);
        if (!existingUser) {
          console.error(`\n❌ Error: Could not find existing user with email ${email}`);
          process.exit(1);
        }

        authUserId = existingUser.id;

        // Update the user's password
        const { error: updateError } = await supabase.auth.admin.updateUserById(authUserId, {
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            is_superuser: true
          }
        });

        if (updateError) {
          console.error(`\n❌ Error updating auth user: ${updateError.message}`);
          process.exit(1);
        }

        console.log('  ✓ Auth user password updated');
      } else {
        console.error(`\n❌ Error creating auth user: ${authError.message}`);
        process.exit(1);
      }
    } else {
      if (!authData.user) {
        console.error('\n❌ Error: No user returned from auth creation');
        process.exit(1);
      }
      authUserId = authData.user.id;
      console.log('  ✓ Auth user created');
    }

    // Step 3: Create or update u_users record
    console.log('  → Creating app user record...');

    // Check if u_users record already exists
    const { data: existingAppUser } = await supabase
      .from('u_users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single();

    if (existingAppUser) {
      // Update existing record
      const { error: updateUserError } = await supabase
        .from('u_users')
        .update({
          email: email,
          full_name: fullName,
          status: 'active',
          is_superuser: true,
          updated_at: new Date().toISOString()
        })
        .eq('auth_user_id', authUserId);

      if (updateUserError) {
        console.error(`\n❌ Error updating app user: ${updateUserError.message}`);
        process.exit(1);
      }
      console.log('  ✓ App user record updated');
    } else {
      // Create new record
      const { error: userError } = await supabase
        .from('u_users')
        .insert({
          auth_user_id: authUserId,
          email: email,
          full_name: fullName,
          status: 'active',
          is_superuser: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (userError) {
        console.error(`\n❌ Error creating app user: ${userError.message}`);
        process.exit(1);
      }
      console.log('  ✓ App user record created');
    }

    // Step 4: Add audit log entry
    console.log('  → Adding audit log entry...');
    await supabase
      .from('u_audit_log')
      .insert({
        user_id: authUserId,
        user_email: email,
        app_key: 'system',
        action: 'create',
        resource_type: 'superuser',
        resource_id: authUserId,
        resource_name: fullName,
        new_values: { email, full_name: fullName, is_superuser: true }
      });

    console.log('  ✓ Audit log entry added');

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║ Superuser created successfully!                                ║');
    console.log(`║ Email: ${email.padEnd(53)}║`);
    console.log('║ You can now log in to Nova or Pulsar.                         ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
