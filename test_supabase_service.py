import requests
import json

url = 'https://ralnsebcwdqelikykxic.supabase.co/rest/v1/service?select=*&limit=1'
headers = {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhbG5zZWJjd2RxZWxpa3lreGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MjU4ODIsImV4cCI6MjA5ODUwMTg4Mn0.mWT7MhkNCA_ICJr2-ggapFrE4Tknpg_ycDTjjRdQDT4',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhbG5zZWJjd2RxZWxpa3lreGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MjU4ODIsImV4cCI6MjA5ODUwMTg4Mn0.mWT7MhkNCA_ICJr2-ggapFrE4Tknpg_ycDTjjRdQDT4'
}

response = requests.get(url, headers=headers)
print("Status Code:", response.status_code)
if response.status_code == 200:
    print("Table exists!")
    print(response.json())
else:
    print("Error or table does not exist:")
    print(response.text)
