// Direct fix for atta user - runs the fix via API endpoint
import fetch from 'node-fetch';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

async function fixAtta() {
  console.log('🔍 Step 1: Checking atta user current state...\n');

  try {
    // Get current state
    const currentResponse = await fetch(`${BASE_URL}/api/admin/user-by-email/atta`);
    const currentData = await currentResponse.json();

    console.log('Current atta data:');
    console.log('  Email:', currentData.email);
    console.log('  Role:', currentData.role);
    console.log('  Roles:', currentData.roles);
    console.log('  Department:', currentData.department);
    console.log('');

    // Force update to Admin
    console.log('🔧 Step 2: Force updating atta to Admin role...\n');

    const updateResponse = await fetch(`${BASE_URL}/api/admin/force-update-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'atta',
        role: 'Admin',
        roles: ['Admin', 'Associate']
      })
    });

    const updateResult = await updateResponse.json();
    console.log('Update result:', updateResult);
    console.log('');

    // Verify the fix
    console.log('✅ Step 3: Verifying the fix...\n');

    const verifyResponse = await fetch(`${BASE_URL}/api/admin/user-by-email/atta`);
    const verifyData = await verifyResponse.json();

    console.log('After fix:');
    console.log('  Email:', verifyData.email);
    console.log('  Role:', verifyData.role);
    console.log('  Roles:', verifyData.roles);
    console.log('');

    // Summary
    console.log('=== SUMMARY ===');
    console.log('Before:', currentData.role, '→', currentData.roles);
    console.log('After:', verifyData.role, '→', verifyData.roles);

    const success = verifyData.role === 'Admin' &&
                   JSON.stringify(verifyData.roles) === JSON.stringify(['Admin', 'Associate']);

    if (success) {
      console.log('\n🎉 SUCCESS! Atta user has been fixed!');
      console.log('👉 Ask atta to logout and login again to see the changes.');
    } else {
      console.log('\n⚠️  Something went wrong. The role was not updated correctly.');
      console.log('Please check the logs above for errors.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nMake sure:');
    console.error('1. The server is running');
    console.error('2. The BASE_URL is correct (default: http://localhost:5000)');
    console.error('3. You have the necessary permissions');
    process.exit(1);
  }
}

fixAtta();
