import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { cleanEmail } from '@/lib/hygiene-utils'

const PREMIUM_PRIZES = ['WFH Tomorrow','₹1000 Voucher','1 Day Off','2 Regularisation','2 WFH','Movie Tickets','Spin Again','Lunch with Manager']
const STANDARD_PRIZES = ['WFH Tomorrow','₹500 Voucher','1 Day Off','1 Regularisation','Movie Tickets','₹1000 Voucher','Better Luck','Upgrade to Premium']

export async function POST(req: Request) {
  try {
    const { email, spinType } = await req.json()

    if (!email || !spinType) {
      return NextResponse.json({ success: false, message: 'Email and spinType required' }, { status: 400 })
    }

    const trimmedEmail = cleanEmail(email)
    const isPremium = spinType === 'PREMIUM'
    const prizes = isPremium ? PREMIUM_PRIZES : STANDARD_PRIZES

    // Check if user has a rewards record
    let { data: user, error: userError } = await supabase
      .from('rewards')
      .select('*')
      .eq('seller_email', trimmedEmail)
      .single()

    // If no rewards record, create one
    if (userError && userError.code === 'PGRST116') {
      const { data: newUser, error: insertError } = await supabase
        .from('rewards')
        .insert({
          seller_email: trimmedEmail,
          premium_available: 0,
          standard_available: 0,
          is_premium: false,
          goal_done: false,
          pct: 0
        })
        .select()
        .single()

      if (insertError) {
        return NextResponse.json({ success: false, message: 'Failed to create rewards record' }, { status: 500 })
      }
      user = newUser
    } else if (userError) {
      return NextResponse.json({ success: false, message: 'Failed to fetch user data' }, { status: 500 })
    }

    // Check available spins
    const available = isPremium ? user.premium_available : user.standard_available
    if (available <= 0) {
      return NextResponse.json({ success: false, message: `No ${spinType} spins left` }, { status: 400 })
    }

    // Randomly select a prize
    const prizeIndex = Math.floor(Math.random() * prizes.length)
    const prize = prizes[prizeIndex]

    // Prepare update data
    let updateData: any = {}
    let updateMessage = ''

    if (isPremium) {
      // Premium spin
      if (prize === 'Spin Again') {
        // Don't deduct — they keep their spin
        updateMessage = `🔄 Spin Again! You get another spin!`
      } else {
        updateData.premium_available = (user.premium_available || 0) - 1
        updateMessage = `🎉 You won: ${prize}!`
      }
    } else {
      // Standard spin
      if (prize === 'Spin Again') {
        // Don't deduct — they keep their spin
        updateMessage = `🔄 Spin Again! You get another spin!`
      } else if (prize === 'Better Luck') {
        // Deduct the spin — bad luck
        updateData.standard_available = (user.standard_available || 0) - 1
        updateMessage = `😔 Better luck next time!`
      } else if (prize === 'Upgrade to Premium' || prize === 'Upgrade to Premium Spin') {
        // Deduct standard spin, add 1 premium spin
        updateData.standard_available = (user.standard_available || 0) - 1
        updateData.premium_available = (user.premium_available || 0) + 1
        updateData.is_premium = true
        updateMessage = `🎉 You got upgraded to Premium! You have 1 Premium spin now!`
      } else {
        // Normal prize — deduct the spin
        updateData.standard_available = (user.standard_available || 0) - 1
        updateMessage = `🎉 You won: ${prize}!`
      }
    }

    // Only update if there's data to update
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('rewards')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('seller_email', trimmedEmail)

      if (updateError) {
        return NextResponse.json({ success: false, message: 'Failed to update spins' }, { status: 500 })
      }
    }

    // Record the spin in spin_results table
    const { error: historyError } = await supabase
      .from('spin_results')
      .insert({
        email: trimmedEmail,
        spin_type: spinType,
        result: prize,
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      })

    if (historyError) {
      console.error('History error:', historyError)
    }

    return NextResponse.json({ 
      success: true, 
      result: prize,
      message: updateMessage
    })

  } catch (error: any) {
    console.error('Spin API Error:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}