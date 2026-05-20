// Test script to verify room data loading
import { getRoomsWithPrices, getRoom } from '../src/data/room/rooms.js';

async function testRooms() {
  console.log('🧪 Testing room data loading...');
  
  try {
    // Test getting all rooms
    console.log('\n📋 Testing getRoomsWithPrices...');
    const rooms = await getRoomsWithPrices();
    console.log('Rooms loaded:', rooms.length);
    rooms.forEach(room => {
      console.log(`- ${room.id}: ${room.title} - ₹${room.price}`);
    });
    
    // Test getting individual rooms
    console.log('\n🏠 Testing getRoom...');
    const mediumSuite = await getRoom('medium-suite');
    const largeSuite = await getRoom('large-suite');
    
    console.log('Medium Suite:', mediumSuite ? `₹${mediumSuite.price}` : 'Not found');
    console.log('Large Suite:', largeSuite ? `₹${largeSuite.price}` : 'Not found');
    
    console.log('\n✅ Room data test completed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRooms();