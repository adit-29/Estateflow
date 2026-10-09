'use client';

export default function SellerEnquiriesPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Enquiry status</h2>
      <p className="text-muted-foreground text-sm">Demo: enquiries appear here when buyers contact you.</p>
      <div className="rounded-2xl border border-dashed border-violet-200 bg-gradient-to-br from-violet-50 to-white p-8 text-center text-sm text-muted-foreground">
        No new enquiries in this demo session.
      </div>
    </div>
  );
}
