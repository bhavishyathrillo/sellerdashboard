import { NextRequest, NextResponse } from 'next/server'
import { GET as getOverview } from '@/app/api/seller/overview/route'
import { GET as getSellerView } from '@/app/api/seller/seller-view/route'
import { GET as getPriority } from '@/app/api/priority-leads/route'
import { GET as getLeaderboard } from '@/app/api/seller/leaderboard/route'
import { GET as getMHL } from '@/app/api/mhl/route'
import { GET as getPipeline } from '@/app/api/pipeline/route'
import { GET as getAvatars } from '@/app/api/seller/avatars/route'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')
  const date = searchParams.get('date')
  const role = searchParams.get('role')

  if (!email || !date || !role) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  const p1 = new URLSearchParams({ email, role, view: 'my' })
  const pLeaderboard = new URLSearchParams({ email })

  const urls = [
    `/api/seller/overview?email=${encodeURIComponent(email)}`,
    `/api/seller/seller-view?email=${encodeURIComponent(email)}&date=${date}`,
    `/api/priority-leads?${p1.toString()}`,
    `/api/seller/leaderboard?${pLeaderboard.toString()}`,
    `/api/mhl?${p1.toString()}`,
    `/api/pipeline?${p1.toString()}`,
    `/api/seller/avatars`
  ]

  const baseUrl = new URL(req.url).origin
  const requests = urls.map(url => new NextRequest(new URL(url, baseUrl)))

  try {
    const responses = await Promise.allSettled([
      getOverview(requests[0]),
      getSellerView(requests[1]),
      getPriority(requests[2]),
      getLeaderboard(requests[3]),
      getMHL(requests[4]),
      getPipeline(requests[5]),
      getAvatars(requests[6])
    ])

    const jsonResults = await Promise.all(responses.map(async (res) => {
      if (res.status === 'fulfilled' && res.value.ok) {
        try {
          return await res.value.json()
        } catch (e) {
          return { error: 'Failed to parse JSON' }
        }
      }
      return { error: res.status === 'rejected' ? res.reason : 'Request failed' }
    }))

    const responseMap: Record<string, any> = {}
    urls.forEach((url, i) => {
      responseMap[url] = jsonResults[i]
    })

    return NextResponse.json(responseMap, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=59'
      }
    })
  } catch (err) {
    console.error('Error in dashboard-all', err)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}