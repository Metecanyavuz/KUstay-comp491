# KUstay-comp491
Comp491 KUstay Project.

## Setup Instructions

1. Clone the repository
2. Create virtual environment: `python -m venv venv`
3. Activate venv: `source venv/bin/activate` (Mac/Linux) or `venv\Scripts\activate` (Windows)
4. Install dependencies: `pip install -r requirements.txt`
5. Create `.env` file with database credentials
6. Run migrations: `python manage.py migrate`
7. Create superuser: `python manage.py createsuperuser`
8. Run server: `python manage.py runserver`

## Database Setup

Option A: Use Docker
\`\`\`bash
docker run -d --name kustay-postgres -e POSTGRES_USER=kustay_user -e POSTGRES_PASSWORD=kustay_password -e POSTGRES_DB=kustay_db -p 5433:5432 postgres:16
\`\`\`

Option B: Use local PostgreSQL (see setup instructions above)
```
# Connect to PostgreSQL
psql -U postgres

# Create user and database
CREATE USER kustay_user WITH PASSWORD 'kustay_password';
CREATE DATABASE kustay_db OWNER kustay_user;
GRANT ALL PRIVILEGES ON DATABASE kustay_db TO kustay_user;
\q
```

Then update their `.env`:
```
DATABASE_URL=postgres://kustay_user:kustay_password@127.0.0.1:5432/kustay_db


### **4. Create `.env.example`**
```
DATABASE_URL=postgres://kustay_user:kustay_password@127.0.0.1:5433/kustay_db
SECRET_KEY=your-secret-key-here
DEBUG=True