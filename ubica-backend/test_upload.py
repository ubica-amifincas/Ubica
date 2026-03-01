import requests

url = "http://localhost:8000/api/upload-images"
file_path = "test_image.txt"

# Create a temporary dummy file to upload
with open(file_path, "w") as f:
    f.write("test content")

print("Uploading test file...")
with open(file_path, "rb") as f:
    files = {"files": (file_path, f, "text/plain")}
    response = requests.post(url, files=files)

print("Status Code:", response.status_code)
print("Response:", response.json())

# Check if the URL works
if response.status_code == 200:
    urls = response.json().get("urls", [])
    if urls:
        print(f"Fetching {urls[0]}...")
        r = requests.get(urls[0])
        print("Fetch Status:", r.status_code)
        print("Fetch Content:", r.text)
