#!/usr/bin/env node
/**
 * Test User Registration & Account Data Isolation
 * Tests that different users see their own data, not shared data
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:8081/api';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(status, message) {
  const icon = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    test: '🧪',
  }[status] || '📌';
  
  console.log(`${icon} ${message}`);
}

async function testUserRegistration() {
  console.log(`\n${colors.cyan}🧪 Testing User Registration & Data Isolation${colors.reset}\n`);

  const timestamp = Date.now();
  
  const testUsers = [
    {
      name: `Farmer Test ${timestamp}`,
      email: `farmer.${timestamp}@test.com`,
      role: 'farmer',
      password: 'Farmer@12345',
    },
    {
      name: `Customer Test ${timestamp}`,
      email: `customer.${timestamp}@test.com`,
      role: 'customer',
      password: 'Customer@12345',
    },
  ];

  const registeredUsers = [];

  // Step 1: Register test users
  console.log(`\n${colors.blue}Step 1: Registering Test Users${colors.reset}`);
  
  for (const user of testUsers) {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...user,
          country: 'India',
          state: 'Andhra Pradesh',
          district: 'Chittoor',
          mandal: 'Tirupati',
          doorNo: '123-A',
          pincode: '517501',
          locationText: 'Tirupati, Chittoor, Andhra Pradesh, India',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        log('success', `Registered ${user.role}: ${user.email}`);
        registeredUsers.push({
          ...user,
          userId: data.user.id,
        });
      } else {
        log('error', `Registration failed for ${user.email}: ${data.message}`);
      }
    } catch (err) {
      log('error', `Registration error for ${user.email}: ${err.message}`);
    }
  }

  if (registeredUsers.length < testUsers.length) {
    log('error', 'Failed to register all users. Aborting test.');
    return;
  }

  // Step 2: Login and get tokens
  console.log(`\n${colors.blue}Step 2: Logging In & Getting Tokens${colors.reset}`);
  
  const userTokens = {};

  for (const user of registeredUsers) {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          password: user.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        userTokens[user.email] = data.accessToken;
        log('success', `Logged in as ${user.role}: ${user.email}`);
      } else {
        log('error', `Login failed for ${user.email}: ${data.message}`);
      }
    } catch (err) {
      log('error', `Login error for ${user.email}: ${err.message}`);
    }
  }

  // Step 3: Fetch user profiles
  console.log(`\n${colors.blue}Step 3: Fetching User Profiles${colors.reset}`);
  
  for (const user of registeredUsers) {
    try {
      const token = userTokens[user.email];
      const response = await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (response.ok) {
        const fetchedUser = data.user;
        
        // Verify the data matches the registered user
        if (fetchedUser.name === user.name && fetchedUser.email === user.email) {
          log('success', `✓ ${user.role} sees their own data:`);
          console.log(`    Name: ${fetchedUser.name}`);
          console.log(`    Email: ${fetchedUser.email}`);
          console.log(`    Role: ${fetchedUser.role}`);
        } else {
          log('error', `✗ ${user.role} sees WRONG data:`);
          console.log(`    Expected Name: ${user.name}`);
          console.log(`    Got Name: ${fetchedUser.name}`);
          console.log(`    Expected Email: ${user.email}`);
          console.log(`    Got Email: ${fetchedUser.email}`);
        }
      } else {
        log('error', `Failed to fetch profile for ${user.email}: ${data.message}`);
      }
    } catch (err) {
      log('error', `Profile fetch error for ${user.email}: ${err.message}`);
    }
  }

  // Step 4: Verify data isolation
  console.log(`\n${colors.blue}Step 4: Verifying Data Isolation${colors.reset}`);
  
  let allCorrect = true;
  
  for (const user of registeredUsers) {
    try {
      const token = userTokens[user.email];
      const response = await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      const fetchedUser = data.user;

      // Check if this user's token returns someone else's data
      for (const otherUser of registeredUsers) {
        if (fetchedUser.email === otherUser.email && otherUser.email !== user.email) {
          log('error', `⚠️ ${user.role} token returned ${otherUser.role} data!`);
          allCorrect = false;
        }
      }
    } catch (err) {
      log('error', `Isolation check error: ${err.message}`);
      allCorrect = false;
    }
  }

  if (allCorrect) {
    log('success', `${colors.green}Data isolation verified! Each user sees only their own data.${colors.reset}`);
  } else {
    log('error', `${colors.red}Data isolation FAILED! Users are seeing shared data.${colors.reset}`);
  }

  console.log(`\n${colors.cyan}Test Complete${colors.reset}\n`);
}

// Run the test
testUserRegistration().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
