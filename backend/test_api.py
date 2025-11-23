import requests
import uuid

BASE_URL = 'http://localhost:5000'
SESSION = requests.Session()

def test_signup():
    username = f"user_{uuid.uuid4().hex[:6]}"
    password = "password123"
    email = f"{username}@example.com"
    
    res = SESSION.post(f'{BASE_URL}/auth/signup', json={
        'username': username,
        'password': password,
        'email': email
    })
    if res.status_code == 200:
        print(f"[SUCCESS] Signup: {username}")
        return True
    else:
        print(f"[FAIL] Signup: {res.text}")
        return False

def test_create_form():
    res = SESSION.post(f'{BASE_URL}/forms', json={
        'title': 'Test Form',
        'description': 'Test Description',
        'opensAt': None,
        'closesAt': None,
        'constraints': {'minSizeBytes': 100}
    })
    if res.status_code == 200:
        form = res.json()
        print(f"[SUCCESS] Create Form: {form['id']} (Code: {form['code']})")
        return form['code']
    else:
        print(f"[FAIL] Create Form: {res.text}")
        return None

def test_submit(code):
    # Create a dummy file
    files = {'file': ('test.txt', b'Hello World' * 100, 'text/plain')}
    res = SESSION.post(f'{BASE_URL}/submit/{code}', files=files)
    
    # Note: This might fail if constraints reject .txt or size, but we just check API response
    if res.status_code == 200:
        print(f"[SUCCESS] Submit File: {res.json()}")
    elif res.status_code == 400 or res.status_code == 200: 
        # 200 with ok:False is also possible
        print(f"[CHECK] Submit Response: {res.json()}")
    else:
        print(f"[FAIL] Submit: {res.text}")

if __name__ == '__main__':
    print("Testing API...")
    if test_signup():
        code = test_create_form()
        if code:
            test_submit(code)
