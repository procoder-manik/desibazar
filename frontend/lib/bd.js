// The 64 districts of Bangladesh by division, and the delivery zone each one usually falls in.
export const DIVISIONS = {
  Dhaka: ['Dhaka', 'Gazipur', 'Narayanganj', 'Narsingdi', 'Manikganj', 'Munshiganj', 'Tangail', 'Kishoreganj', 'Faridpur', 'Gopalganj', 'Madaripur', 'Rajbari', 'Shariatpur'],
  Chattogram: ['Chattogram', "Cox's Bazar", 'Cumilla', 'Feni', 'Noakhali', 'Lakshmipur', 'Chandpur', 'Brahmanbaria', 'Rangamati', 'Khagrachhari', 'Bandarban'],
  Rajshahi: ['Rajshahi', 'Bogura', 'Pabna', 'Sirajganj', 'Natore', 'Naogaon', 'Chapainawabganj', 'Joypurhat'],
  Khulna: ['Khulna', 'Jashore', 'Satkhira', 'Bagerhat', 'Kushtia', 'Jhenaidah', 'Magura', 'Narail', 'Chuadanga', 'Meherpur'],
  Barishal: ['Barishal', 'Patuakhali', 'Bhola', 'Pirojpur', 'Barguna', 'Jhalokati'],
  Sylhet: ['Sylhet', 'Moulvibazar', 'Habiganj', 'Sunamganj'],
  Rangpur: ['Rangpur', 'Dinajpur', 'Kurigram', 'Gaibandha', 'Nilphamari', 'Lalmonirhat', 'Thakurgaon', 'Panchagarh'],
  Mymensingh: ['Mymensingh', 'Jamalpur', 'Netrokona', 'Sherpur'],
};

const SUBURB = ['Gazipur', 'Narayanganj'];
export const zoneFor = (district) => (district === 'Dhaka' ? 'dhaka' : SUBURB.includes(district) ? 'suburb' : 'outside');
export const validPhone = (p) => /^01[3-9]\d{8}$/.test(String(p || '').replace(/[\s-]/g, '').replace(/^\+?88/, ''));

export const PAY_LABELS = {
  cod: 'Cash on delivery',
  sslcommerz: 'Card / Mobile banking (SSLCommerz)',
  bkash: 'bKash',
  manual_bkash: 'bKash Send Money',
  manual_nagad: 'Nagad Send Money',
  manual_rocket: 'Rocket Send Money',
};
