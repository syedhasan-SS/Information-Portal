#!/usr/bin/env tsx
/**
 * Test ticket creation to identify the error
 */

import axios from 'axios';

async function testTicketCreation() {
  const ticketData = {
    vendorHandle: 'creed-vintage',
    subject: 'Test ticket',
    description: 'Testing ticket creation',
    department: 'Seller Support',
    issueType: 'Complaint',
    categoryId: '',  // Empty to test if this is the issue
    priorityTier: 'Medium',
    status: 'Open',
    fleekOrderIds: ['12345'],
    createdById: 'bdc7671f-f470-4016-a99d-b4db6693857d'  // Your user ID
  };

  try {
    console.log('🧪 Testing ticket creation...');
    console.log('📝 Ticket data:', JSON.stringify(ticketData, null, 2));

    const response = await axios.post('http://localhost:5000/api/tickets', ticketData);

    console.log('✅ Ticket created successfully!');
    console.log('📋 Response:', response.data);
  } catch (error: any) {
    console.error('❌ Ticket creation failed!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testTicketCreation();
