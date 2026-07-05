import re

with open('components/pages/AdminLTAPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_lta_calc = """  const sumFinalLta = hierarchy.reduce((s: number, cat: any) =>
    s + (cat.tls || []).reduce((s2: number, tl: any) =>
      s2 + (tl.sellers || []).reduce((s3: number, seller: any) => {
        const r = (seller.monthly_lta_rows || []).find((x: any) => x.log_date === dateFrom)
        return s3 + (r ? Math.floor(r.final_lta || 0) : 0)
      }, 0)
    , 0)
  , 0)"""

new_lta_calc = """  const sumFinalLta = hierarchy.reduce((s: number, cat: any) =>
    s + (cat.tls || []).reduce((s2: number, tl: any) =>
      s2 + (tl.sellers || []).reduce((s3: number, seller: any) => {
        return s3 + (seller.ltaActual || 0)
      }, 0)
    , 0)
  , 0)"""

text = text.replace(old_lta_calc, new_lta_calc)

with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
