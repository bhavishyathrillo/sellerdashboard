import urllib.request
import json

req = urllib.request.Request('http://localhost:3000/api/seller/tl-team?date=2026-07-04', method='GET')
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
        
        if len(data['data']) > 0:
            tl = data['data'][0]
            print(f"TL: {tl['l2_name']}")
            if len(tl['members']) > 0:
                member = tl['members'][0]
                print(f"Member: {member['seller_name']}")
                print(f"Attendance: {member.get('attendance')}")
                print(f"Daily LTA: {member.get('daily_lta')}")
except Exception as e:
    print(f'Error: {e}')
