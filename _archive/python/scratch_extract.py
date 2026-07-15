import json
with open(r"C:\Users\sheor\.gemini\antigravity-ide\brain\f44fc881-c7d1-4142-9fc5-d6fd89f0ffbc\.system_generated\logs\transcript_full.jsonl", "r", encoding="utf-8") as f:
    for line in f:
        data = json.loads(line)
        if data.get("type") == "USER_INPUT" and "Module 3.10" in data.get("content", ""):
            content = data["content"]
            # Find all occurrences of Module 3.10
            start = content.rfind("Module 3.10")
            print(content[start-500:start+4000])
            break
