import re

with open('components/pages/L1SellerViewPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Fix individual seller MHE calculation (mAvg)
old_mhe_seller_logic = """                                        let mSum = 0; let mDays = 0;
                                        ; (m.monthly_lta_rows || []).forEach((r: any) => {
                                          if (typeof r.mishandled_pct === 'number') { mSum += r.mishandled_pct * 100; mDays++; }
                                        })
                                        const mAvg = mDays > 0 ? parseFloat((mSum / mDays).toFixed(1)) : 0"""

new_mhe_seller_logic = """                                        const validRows = (m.monthly_lta_rows || []).filter((r: any) => typeof r.mishandled_pct === 'number');
                                        validRows.sort((a: any, b: any) => a.log_date.localeCompare(b.log_date));
                                        const latestRow = validRows[validRows.length - 1];
                                        const mAvg = latestRow ? parseFloat((latestRow.mishandled_pct * 100).toFixed(1)) : 0;"""
text = text.replace(old_mhe_seller_logic, new_mhe_seller_logic)

# 2. Fix individual seller Goal vs SHB calculation (mGoalAvg, mShbAvg)
old_goal_seller_logic = """                                      let mGoalSum = 0; let mShbSum = 0; let mDays = 0;
                                      ; (m.monthly_goal_shb || []).forEach((r: any) => {
                                        mGoalSum += typeof r.goal_completion === 'number' ? r.goal_completion * 100 : 0
                                        mShbSum += typeof r.shb_percent === 'number' ? r.shb_percent * 100 : 0
                                        mDays++;
                                      })
                                      const mGoalAvg = mDays > 0 ? parseFloat((mGoalSum / mDays).toFixed(0)) : 0
                                      const mShbAvg = mDays > 0 ? parseFloat((mShbSum / mDays).toFixed(0)) : 0"""

new_goal_seller_logic = """                                      const validRows = (m.monthly_goal_shb || []).filter((r: any) => typeof r.goal_completion === 'number' && typeof r.shb_percent === 'number');
                                      validRows.sort((a: any, b: any) => a.date.localeCompare(b.date));
                                      const latestRow = validRows[validRows.length - 1];
                                      const mGoalAvg = latestRow ? parseFloat((latestRow.goal_completion * 100).toFixed(0)) : 0;
                                      const mShbAvg = latestRow ? parseFloat((latestRow.shb_percent * 100).toFixed(0)) : 0;"""
text = text.replace(old_goal_seller_logic, new_goal_seller_logic)

with open('components/pages/L1SellerViewPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Updated seller MHE and Goal logic for latest day!")
