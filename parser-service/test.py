import requests

# Send sample pdf to FastAPI port 8000
url = "http://localhost:8000/parse"
file_path = r"c:\Users\suren\OneDrive\Documents\Examcell\uploads\Results of III B.Tech I Semester (R16R19R20R23) RegularSupplementary Examinations, Nov-2025.pdf"

with open(file_path, "rb") as f:
    files = {"file": (file_path, f, "application/pdf")}
    response = requests.post(url, files=files)

data = response.json()
print(f"Count: {data.get('count', 0)}")
if data.get('results'):
    for i in range(min(5, len(data['results']))):
        print(data['results'][i])
