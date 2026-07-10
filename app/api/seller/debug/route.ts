import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
        db: {
            schema: 'seller_day_to_day'
        }
    }
)

export async function GET(request: NextRequest) {
    const results: any = {
        timestamp: new Date().toISOString(),
        schema: 'seller_day_to_day',
        tests: {}
    }

    try {
        // Test 1: Check if we can connect at all
        const { data: countData, error: countError } = await supabase
            .from('daily_allotment_summary')
            .select('*', { count: 'exact', head: true })

        results.tests.connection = {
            success: !countError,
            error: countError ? countError.message : null
        }

        // Test 2: Get ALL data for this email (any date)
        const { data: allData, error: allError } = await supabase
            .from('daily_allotment_summary')
            .select('*')
            .eq('seller_email', 'smritis@thrillophilia.com')

        results.tests.all_smritis_data = {
            success: !allError,
            count: allData?.length || 0,
            data: allData,
            error: allError ? allError.message : null
        }

        // Test 3: Get data for June 27
        const { data: dateData, error: dateError } = await supabase
            .from('daily_allotment_summary')
            .select('*')
            .eq('seller_email', 'smritis@thrillophilia.com')
            .eq('allotment_date', '2026-06-27')

        results.tests.june27_data = {
            success: !dateError,
            count: dateData?.length || 0,
            data: dateData,
            error: dateError ? dateError.message : null
        }

        // Test 4: Check attendance
        const { data: attData, error: attError } = await supabase
            .from('seller_attendance')
            .select('*')
            .eq('email', 'smritis@thrillophilia.com')
            .eq('work_date', '2026-06-27')

        results.tests.attendance = {
            success: !attError,
            count: attData?.length || 0,
            data: attData,
            error: attError ? attError.message : null
        }

        // Test 5: Check hourly
        const { data: hourlyData, error: hourlyError } = await supabase
            .from('seller_hourly_allotment')
            .select('*')
            .eq('seller_email', 'smritis@thrillophilia.com')
            .eq('allotment_date', '2026-06-27')

        results.tests.hourly = {
            success: !hourlyError,
            count: hourlyData?.length || 0,
            data: hourlyData,
            error: hourlyError ? hourlyError.message : null
        }

        return NextResponse.json(results)
    } catch (error) {
        return NextResponse.json({
            error: 'CRASH',
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : null
        }, { status: 500 })
    }
}