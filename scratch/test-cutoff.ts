import { placeOrder } from '../src/app/order/checkout/actions';
import { formatDateIST, getISTDate } from '../src/lib/date-utils';

async function testCutoffValidation() {
  console.log('--- STARTING SERVER-SIDE CUTOFF VALIDATION TEST ---');
  
  // We construct a past date (yesterday) to guarantee the cutoff has passed
  const nowIST = getISTDate();
  const yesterday = new Date(nowIST.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = formatDateIST(yesterday);

  console.log(`Attempting to place order for a past date: ${yesterdayStr} (Morning 11:00 AM window)`);

  const mockOrderData = {
    name: 'Test Customer',
    phone: '9876543210',
    companyAndFloor: 'Test Office, 5th Floor',
    deliveryWindow: 'MORNING_11AM' as const,
    targetDate: yesterdayStr,
    paymentMethod: 'UPI_QR' as const,
    customRequest: 'Poha',
    items: [
      { menuItemId: 'samosa-id-placeholder', quantity: 1 }
    ]
  };

  try {
    const result = await placeOrder(mockOrderData);
    
    console.log('Result received:', result);

    if (result.success) {
      console.error('❌ TEST FAILED: The server accepted an order for a closed window!');
      process.exit(1);
    } else {
      const expectedError = 'Orders for 11:00 AM closed at 10:00 AM — the 4:00 PM window is open until 3:00 PM.';
      if (result.error === expectedError) {
        console.log('✅ TEST PASSED: Server rejected the order with the exact PRD message!');
        console.log(`Error received: "${result.error}"`);
        process.exit(0);
      } else {
        console.error(`❌ TEST FAILED: Server rejected but returned incorrect message.\nExpected: "${expectedError}"\nGot: "${result.error}"`);
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('❌ TEST FAILED with error during execution:', error);
    process.exit(1);
  }
}

testCutoffValidation();
