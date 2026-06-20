'use client';

import PriorityLeads from '../components/PriorityLeads';

export default function PriorityLeadsPage() {
  // Replace with actual seller email from your auth system
  const sellerEmail = 'seller@example.com';

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '20px',
      background: '#0D0D0D',
      minHeight: '100vh'
    }}>
      <PriorityLeads sellerEmail={sellerEmail} />
    </div>
  );
}