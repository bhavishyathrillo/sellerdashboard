import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { data: sellers, error } = await supabase
    .from('test_sellers')
    .select('*')

  if (error) {
    return <div>Error: {error.message}</div>
  }

  return (
    <main style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>Seller Dashboard — Test</h1>
      <p>{sellers?.length} sellers found</p>
      <table border={1} cellPadding={10} style={{ borderCollapse: 'collapse', marginTop: '20px' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Region</th>
            <th>Haul</th>
            <th>Goal</th>
            <th>Achieved</th>
            <th>% Done</th>
            <th>Flag</th>
          </tr>
        </thead>
        <tbody>
          {sellers?.map((seller) => (
            <tr key={seller.id}>
              <td>{seller.seller_name}</td>
              <td>{seller.region}</td>
              <td>{seller.haul}</td>
              <td>₹{seller.goal?.toLocaleString()}</td>
              <td>₹{seller.achieved?.toLocaleString()}</td>
              <td>{seller.pct_achieved}%</td>
              <td>{seller.seller_flag}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}