export const DEMO_AGENCY = 'EstateFlow Demo Realty';
export const DEMO_AREAS = 'Dwarka, Janakpuri, and nearby Delhi/NCR';

export const demoLeads = [
  { id: 'l1', name: 'Ananya Sharma', phone: '+91 98100 10001', source: 'Portal', status: 'New', locality: 'Dwarka', followUp: 'Today', summary: '3 BHK, park facing', budgetMax: 16000000, beds: 3, intent: 'Buy', timeline: '3 months' },
  { id: 'l2', name: 'Vikram Patel', phone: '+91 98100 10002', source: 'Referral', status: 'Qualified', locality: 'Janakpuri', followUp: 'Tomorrow', summary: '2 BHK near metro', budgetMax: 12000000, beds: 2, intent: 'Buy', timeline: '6 months' },
  { id: 'l3', name: 'Meera Iyer', phone: '+91 98100 10003', source: 'Walk-in', status: 'Visit scheduled', locality: 'Dwarka', followUp: 'Today', summary: '3 BHK, ready to move', budgetMax: 15000000, beds: 3, intent: 'Buy', timeline: '1 month' },
  { id: 'l4', name: 'Rahul Khanna', phone: '+91 98100 10004', source: 'Social', status: 'Negotiation', locality: 'Janakpuri', followUp: 'Overdue', summary: 'Builder floor, parking required', budgetMax: 22000000, beds: 4, intent: 'Buy', timeline: 'This month', views: 5, savedCount: 2, visitCount: 2, attendedCount: 2, repeatViews: 2, objection: 'Parking', journeys: [
    { property: 'Palam independent house', stages: ['Enquiry', 'Visit', 'Price objection'], stop: 'Lost' },
    { property: 'Janakpuri 4 BHK builder floor', stages: ['Enquiry', 'Visit', 'Parking objection'], stop: 'Negotiation' },
  ] },
  { id: 'l5', name: 'Neha Kapoor', phone: '+91 98100 10005', source: 'Portal', status: 'New', locality: 'Uttam Nagar', followUp: 'Next week', summary: 'Rent, family of three', budgetMax: 35000, beds: 2, intent: 'Rent', timeline: 'Immediate' },
  { id: 'l6', name: 'Arjun Malhotra', phone: '+91 98100 10006', source: 'Referral', status: 'Qualified', locality: 'Dwarka', followUp: 'Today', summary: 'Plot for construction', budgetMax: 28000000, beds: 0, intent: 'Buy', timeline: '1 year' },
  { id: 'l7', name: 'Pooja Nair', phone: '+91 98100 10007', source: 'Walk-in', status: 'Lost', locality: 'Palam', followUp: 'None', summary: 'Chose another locality', budgetMax: 9000000, beds: 2, intent: 'Buy', timeline: 'Closed' },
  { id: 'l8', name: 'Sanjay Gupta', phone: '+91 98100 10008', source: 'Builder tie-up', status: 'Visit scheduled', locality: 'Dwarka Sector 12', followUp: 'Tomorrow', summary: 'New project enquiry', budgetMax: 14000000, beds: 3, intent: 'Buy', timeline: '6 months' },
  { id: 'l9', name: 'Kavita Joshi', phone: '+91 98100 10009', source: 'Portal', status: 'Qualified', locality: 'Janakpuri', followUp: 'Overdue', summary: 'Ground floor preferred', budgetMax: 18000000, beds: 3, intent: 'Buy', timeline: '3 months' },
  { id: 'l10', name: 'Imran Qureshi', phone: '+91 98100 10010', source: 'Referral', status: 'New', locality: 'Najafgarh', followUp: 'Next week', summary: 'Independent house', budgetMax: 25000000, beds: 4, intent: 'Buy', timeline: 'Unknown' },
  { id: 'l11', name: 'Sneha Reddy', phone: '+91 98100 10011', source: 'Social', status: 'Visit scheduled', locality: 'Dwarka', followUp: 'Today', summary: 'Rent near sector 10', budgetMax: 42000, beds: 3, intent: 'Rent', timeline: 'This month' },
  { id: 'l12', name: 'Deepak Verma', phone: '+91 98100 10012', source: 'Walk-in', status: 'Negotiation', locality: 'Janakpuri', followUp: 'Today', summary: 'Offer recorded, not accepted', budgetMax: 11000000, beds: 2, intent: 'Buy', timeline: '2 weeks' },
  { id: 'l13', name: 'Aisha Khan', phone: '+91 98100 10013', source: 'Portal', status: 'New', locality: 'Dwarka', followUp: 'Tomorrow', summary: 'First home, loan note volunteered', budgetMax: 13000000, beds: 2, intent: 'Buy', timeline: '6 months' },
  { id: 'l14', name: 'Harpreet Singh', phone: '+91 98100 10014', source: 'Referral', status: 'Qualified', locality: 'Tilak Nagar', followUp: 'Next week', summary: 'Commercial shop', budgetMax: 19000000, beds: 0, intent: 'Buy', timeline: '3 months' },
  { id: 'l15', name: 'Ritu Bansal', phone: '+91 98100 10015', source: 'Portal', status: 'Visit scheduled', locality: 'Dwarka', followUp: 'Today', summary: 'School nearby requested', budgetMax: 15500000, beds: 3, intent: 'Buy', timeline: '2 months' },
  { id: 'l16', name: 'Mohit Agarwal', phone: '+91 98100 10016', source: 'Walk-in', status: 'New', locality: 'Janakpuri', followUp: 'None', summary: 'Incomplete phone follow-up', budgetMax: 8000000, beds: 1, intent: 'Rent', timeline: 'Unknown' },
];

export const demoProperties = [
  { id: 'p1', title: '3 BHK · Dwarka Sector 12', locality: 'Dwarka', price: 14500000, type: 'Flat', beds: 3, baths: 2, status: 'Active', lastConfirmed: '2026-09-10', source: 'My inventory' },
  { id: 'p2', title: '2 BHK · Janakpuri C Block', locality: 'Janakpuri', price: 9800000, type: 'Flat', beds: 2, baths: 2, status: 'Active', lastConfirmed: '2026-09-01', source: 'My inventory' },
  { id: 'p3', title: 'Plot · Najafgarh Road', locality: 'Najafgarh', price: 21000000, type: 'Plot', beds: null, status: 'Draft', lastConfirmed: null, source: 'My inventory' },
  { id: 'p4', title: '4 BHK builder floor · Janakpuri', locality: 'Janakpuri', price: 24000000, type: 'Builder floor', beds: 4, baths: 4, status: 'Active', lastConfirmed: '2026-08-20', source: 'My inventory' },
  { id: 'p5', title: '2 BHK rental · Dwarka Sector 10', locality: 'Dwarka', price: 32000, type: 'Flat', beds: 2, baths: 2, status: 'Active', lastConfirmed: '2026-09-18', source: 'My inventory' },
  { id: 'p6', title: '3 BHK · Dwarka Sector 7', locality: 'Dwarka', price: 15200000, type: 'Flat', beds: 3, baths: 2, status: 'Needs confirmation', lastConfirmed: '2026-03-01', source: 'My inventory' },
  { id: 'p7', title: '3 BHK · Dwarka Sector 12 copy', locality: 'Dwarka', price: 14600000, type: 'Flat', beds: 3, baths: 2, status: 'Active', lastConfirmed: '2026-09-10', source: 'My inventory' },
  { id: 'p8', title: '1 BHK · Uttam Nagar', locality: 'Uttam Nagar', price: 4200000, type: 'Flat', beds: 1, baths: 1, status: 'Active', lastConfirmed: '2026-07-15', source: 'My inventory' },
  { id: 'p9', title: 'Shop · Tilak Nagar', locality: 'Tilak Nagar', price: 17500000, type: 'Commercial', beds: null, status: 'Active', lastConfirmed: '2026-09-05', source: 'My inventory' },
  { id: 'p10', title: 'Independent house · Palam', locality: 'Palam', price: 26000000, type: 'Independent house', beds: 4, baths: 3, status: 'Paused', lastConfirmed: '2026-05-01', source: 'My inventory' },
  { id: 'p11', title: '2 BHK · Janakpuri B Block', locality: 'Janakpuri', price: 10200000, type: 'Flat', beds: 2, baths: 2, status: 'Active', lastConfirmed: '2026-09-12', source: 'Network' },
  { id: 'p12', title: '3 BHK · Dwarka Sector 19', locality: 'Dwarka', price: 13800000, type: 'Flat', beds: 3, baths: 2, status: 'Active', lastConfirmed: '2026-09-08', source: 'Network' },
  { id: 'p13', title: 'Plot · Chhawla', locality: 'Chhawla', price: 9000000, type: 'Plot', beds: null, status: 'Active', lastConfirmed: '2026-04-01', source: 'Network' },
  { id: 'p14', title: '3 BHK new project · Dwarka', locality: 'Dwarka', price: 13500000, type: 'Flat', beds: 3, baths: 2, status: 'Active', lastConfirmed: '2026-09-20', source: 'Builder' },
  { id: 'p15', title: '2 BHK new project · Dwarka', locality: 'Dwarka', price: 8900000, type: 'Flat', beds: 2, baths: 2, status: 'Active', lastConfirmed: '2026-09-20', source: 'Builder' },
  { id: 'p16', title: '4 BHK · Janakpuri west', locality: 'Janakpuri', price: 31000000, type: 'Builder floor', beds: 4, baths: 4, status: 'Needs confirmation', lastConfirmed: '2026-01-15', source: 'Network' },
  { id: 'p17', title: 'Studio · Dwarka Sector 21', locality: 'Dwarka', price: 5500000, type: 'Flat', beds: 1, baths: 1, status: 'Draft', lastConfirmed: null, source: 'My inventory' },
  { id: 'p18', title: '3 BHK rental · Janakpuri', locality: 'Janakpuri', price: 45000, type: 'Flat', beds: 3, baths: 2, status: 'Active', lastConfirmed: '2026-09-14', source: 'My inventory' },
];

export const demoVisits = [
  { id: 'v1', propertyTitle: '3 BHK · Dwarka Sector 12', buyerName: 'Ananya Sharma', when: 'Today 4:00 PM', status: 'Confirmed' },
  { id: 'v2', propertyTitle: '2 BHK · Janakpuri C Block', buyerName: 'Vikram Patel', when: 'Tomorrow 11:00 AM', status: 'Proposed' },
  { id: 'v3', propertyTitle: '4 BHK builder floor · Janakpuri', buyerName: 'Rahul Khanna', when: 'Yesterday 5:00 PM', status: 'Completed' },
  { id: 'v4', propertyTitle: '3 BHK · Dwarka Sector 7', buyerName: 'Meera Iyer', when: 'Friday 3:00 PM', status: 'Cancelled' },
  { id: 'v5', propertyTitle: '3 BHK new project · Dwarka', buyerName: 'Sanjay Gupta', when: 'Tomorrow 1:00 PM', status: 'Needs confirmation' },
  { id: 'v6', propertyTitle: '2 BHK rental · Dwarka Sector 10', buyerName: 'Sneha Reddy', when: 'Today 6:30 PM', status: 'Confirmed' },
];

export const demoDeals = [
  { id: 'd1', title: 'Ananya — Dwarka 12', stage: 'Negotiation', value: 14500000 },
  { id: 'd2', title: 'Vikram — Janakpuri', stage: 'Site visit', value: 9800000 },
  { id: 'd3', title: 'Rahul — builder floor', stage: 'Booking', value: 24000000 },
  { id: 'd4', title: 'Deepak — Janakpuri 2BHK', stage: 'Negotiation', value: 10200000 },
  { id: 'd5', title: 'Meera — Sector 7', stage: 'Qualified', value: 15200000 },
  { id: 'd6', title: 'Pooja — Palam', stage: 'Lost', value: 9000000 },
  { id: 'd7', title: 'Sanjay — new project', stage: 'New lead', value: 13500000 },
  { id: 'd8', title: 'Ritu — Dwarka 3BHK', stage: 'Site visit', value: 14500000 },
];

export const demoCommissions = [
  { id: 'c1', dealTitle: 'Ananya — Dwarka 12', amount: 145000, status: 'expected' },
  { id: 'c2', dealTitle: 'Rahul — builder floor', amount: 240000, status: 'pending' },
  { id: 'c3', dealTitle: 'Deepak — Janakpuri 2BHK', amount: 80000, status: 'partially paid' },
  { id: 'c4', dealTitle: 'Older Janakpuri close', amount: 90000, status: 'paid' },
  { id: 'c5', dealTitle: 'Vikram — Janakpuri', amount: null, status: 'not_recorded' },
];

export const demoNetwork = [
  { id: 'n1', name: 'Priya Sethi', agency: 'Sethi Homes Demo', areas: 'Dwarka', focus: 'Flats' },
  { id: 'n2', name: 'Aman Bhatia', agency: 'Bhatia Associates Demo', areas: 'Janakpuri', focus: 'Builder floors' },
  { id: 'n3', name: 'Farah Qureshi', agency: 'NCR Plots Demo', areas: 'Najafgarh', focus: 'Plots' },
  { id: 'n4', name: 'Demo Build Co', agency: 'Demo Build Co', areas: 'Dwarka', focus: 'New projects' },
];
