#!/bin/bash
# Database Quick Check Script for Railway

echo "=== KUstay Database Quick Check ==="
echo ""

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not installed"
    echo "Install: npm install -g @railway/cli"
    exit 1
fi

echo "✅ Railway CLI installed"
echo ""

# Link to project if not linked
echo "📡 Connecting to Railway project..."
railway link || echo "Already linked"

echo ""
echo "Select what you want to do:"
echo "1. Connect to PostgreSQL (psql)"
echo "2. Show all tables"
echo "3. Count users"
echo "4. Count listings"
echo "5. Show recent users"
echo ""
read -p "Enter choice (1-5): " choice

case $choice in
    1)
        echo "Connecting to PostgreSQL..."
        railway connect postgres
        ;;
    2)
        echo "Fetching table list..."
        railway run psql $DATABASE_URL -c "\dt"
        ;;
    3)
        echo "Counting users..."
        railway run psql $DATABASE_URL -c "SELECT COUNT(*) as total_users FROM kustay_user;"
        ;;
    4)
        echo "Counting listings..."
        railway run psql $DATABASE_URL -c "SELECT COUNT(*) as total_listings FROM kustay_listing;"
        ;;
    5)
        echo "Recent users..."
        railway run psql $DATABASE_URL -c "SELECT id, email, date_joined FROM kustay_user ORDER BY date_joined DESC LIMIT 10;"
        ;;
    *)
        echo "Invalid choice"
        ;;
esac
