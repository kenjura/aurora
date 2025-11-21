#!/usr/bin/env node

// Simple test script to verify the environment setup for the build

require('dotenv').config({path: process.env.DOTENVFILE || '/etc/aurora.env'});

console.log('Testing Aurora build environment...');

// Check WIKIROOT
if (!process.env.WIKIROOT) {
  console.error('❌ WIKIROOT is not set. Please set it in your environment or in the .env file.');
  process.exit(1);
}

console.log(`✓ WIKIROOT: ${process.env.WIKIROOT}`);

const fs = require('fs');
const path = require('path');

// Check if WIKIROOT exists
if (!fs.existsSync(process.env.WIKIROOT)) {
  console.error(`❌ WIKIROOT ${process.env.WIKIROOT} does not exist on file system.`);
  process.exit(1);
}

console.log('✓ WIKIROOT directory exists');

// Try to read directory contents
try {
  const contents = fs.readdirSync(process.env.WIKIROOT);
  console.log(`✓ Found ${contents.length} items in WIKIROOT`);
  console.log('  Sample contents:', contents.slice(0, 5));
} catch (error) {
  console.error('❌ Cannot read WIKIROOT contents:', error.message);
  process.exit(1);
}

// Test model functionality
try {
  const model = require('./src/model/model');
  console.log('✓ Model loaded successfully');
  
  // Test building root path
  const rootData = model.build('/');
  if (rootData) {
    console.log('✓ Root path builds successfully');
    console.log('  Root content type:', typeof rootData.content);
  } else {
    console.log('⚠ Root path returned no data');
  }
} catch (error) {
  console.error('❌ Model test failed:', error.message);
  process.exit(1);
}

console.log('✅ Environment test completed successfully!');
console.log('You can now run: npm run build');
