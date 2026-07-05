import QRCode from 'qrcode';

/**
 * Generates a base64 QR code Data URL from a UPI payment deep link.
 * Link format:
 * upi://pay?pa={BUSINESS_UPI_VPA}&pn={BUSINESS_UPI_PAYEE_NAME}&am={amount}&tn=ParkBite Order {orderId}&cu=INR
 */
export async function generateUPIQRCode(amount: number, orderId: string): Promise<string> {
  const vpa = process.env.BUSINESS_UPI_VPA || 'placeholder@upi';
  const payee = process.env.BUSINESS_UPI_PAYEE_NAME || 'ParkBite Express';

  // Construct UPI deep-link URI
  const upiLink = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payee)}&am=${amount.toFixed(2)}&tn=${encodeURIComponent(`ParkBite Order ${orderId}`)}&cu=INR`;

  try {
    // Generate QR code Data URL (Base64 PNG)
    const qrDataUrl = await QRCode.toDataURL(upiLink, {
      width: 256,
      margin: 1,
      color: {
        dark: '#2B1B12', // --ink
        light: '#FBF4E9', // --bg-warm
      },
    });
    return qrDataUrl;
  } catch (error) {
    console.error('Failed to generate UPI QR code:', error);
    throw new Error('QR code generation failed');
  }
}
