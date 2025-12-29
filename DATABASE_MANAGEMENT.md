# Database Management Guide

Railway PostgreSQL database'inizi yönetmek için çeşitli yöntemler.

## Hızlı Başlangıç

### Railway CLI ile Database'e Bağlanma

```bash
# Railway CLI yükle (bir kere)
npm install -g @railway/cli

# Login
railway login

# Projeye bağlan
railway link

# PostgreSQL'e bağlan
railway connect postgres
```

## Kullanım Yöntemleri

### 1. Railway Dashboard (Web UI)

En kolay yöntem - GUI ile veri yönetimi:

1. Railway → PostgreSQL service seç
2. **Data** sekmesine tıkla
3. Tabloları görüntüle
4. SQL query çalıştır
5. Insert/Update/Delete yap

**Avantajlar:**
- GUI arayüz
- SQL bilgisi gerekmez
- Hızlı veri görüntüleme

### 2. psql (Terminal)

Komut satırından database işlemleri:

```bash
# Bağlan
railway connect postgres

# Sık kullanılan komutlar:
\dt                     # Tabloları listele
\dt kustay_*           # Kustay tablolarını listele
\d kustay_user         # User table yapısı
\q                      # Çıkış

# SQL queries:
SELECT * FROM kustay_user;
SELECT COUNT(*) FROM kustay_listing;
SELECT * FROM kustay_user WHERE is_staff=true;
```

### 3. Quick Check Script

Hızlı database kontrolleri için:

```bash
# Script'i çalıştır
./scripts/db_check.sh

# Menü seçenekleri:
# 1. psql'e bağlan
# 2. Tabloları göster
# 3. User sayısı
# 4. Listing sayısı
# 5. Son kullanıcılar
```

### 4. GUI Tools (pgAdmin/DBeaver)

**Connection bilgilerini al:**
```bash
# Railway'de
PostgreSQL service → Connect → Copy connection string

# Örnek:
postgresql://postgres:pass@monorail.proxy.rlwy.net:12345/railway
```

**pgAdmin ile bağlan:**
1. pgAdmin aç
2. Add New Server
3. Connection bilgilerini gir
4. SSL mode: `require`

**DBeaver ile bağlan:**
1. DBeaver aç
2. New Database Connection → PostgreSQL
3. Connection bilgilerini yapıştır
4. Test Connection → OK

### 5. Django Admin Panel

Web arayüzü ile model yönetimi:

```bash
# Superuser oluştur
railway run python manage.py createsuperuser

# Admin panele git
https://kustay-comp491-production.up.railway.app/admin/
```

**Avantajlar:**
- Django models üzerinden çalışır
- Foreign key ilişkileri otomatik
- CRUD işlemleri kolay

---

## Sık Kullanılan SQL Queries

### User Yönetimi

```sql
-- Tüm kullanıcılar
SELECT id, email, first_name, last_name, is_active, date_joined
FROM kustay_user
ORDER BY date_joined DESC;

-- Staff kullanıcılar
SELECT email, is_staff, is_superuser
FROM kustay_user
WHERE is_staff=true;

-- Aktif kullanıcı sayısı
SELECT COUNT(*) as active_users
FROM kustay_user
WHERE is_active=true;

-- Email verification durumu
SELECT email, is_email_verified
FROM kustay_user
WHERE is_email_verified=false;
```

### Listing Yönetimi

```sql
-- Tüm ilanlar
SELECT id, title, price, city, is_available
FROM kustay_listing
ORDER BY created_at DESC
LIMIT 20;

-- Şehre göre ilan sayısı
SELECT city, COUNT(*) as listing_count
FROM kustay_listing
GROUP BY city
ORDER BY listing_count DESC;

-- Müsait ilanlar
SELECT title, price, city
FROM kustay_listing
WHERE is_available=true;
```

### Match Yönetimi

```sql
-- Tüm match'ler
SELECT * FROM kustay_match
ORDER BY matched_at DESC
LIMIT 20;

-- User'ın match'leri
SELECT m.*, u1.email as user1_email, u2.email as user2_email
FROM kustay_match m
JOIN kustay_user u1 ON m.user1_id = u1.id
JOIN kustay_user u2 ON m.user2_id = u2.id
WHERE m.user1_id = 1 OR m.user2_id = 1;
```

---

## Database Backup

### Manuel Backup

```bash
# Backup al
railway run pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore et
railway run psql $DATABASE_URL < backup_20251225.sql
```

### Otomatik Backup

Railway otomatik olarak daily backup alır (7 gün tutulur).

**Restore işlemi:**
1. Railway → PostgreSQL service
2. **Backups** sekmesi
3. Backup seç → Restore

---

## Migration Yönetimi

### Yeni Migration Oluşturma

```bash
# Local'de model değiştir
# Sonra:
python manage.py makemigrations

# Railway'de uygula
railway run python manage.py migrate
```

### Migration Durumu

```bash
# Hangi migration'lar uygulandı?
railway run python manage.py showmigrations

# Son migration'ları göster
railway run python manage.py showmigrations kustay
```

### Migration Rollback

```bash
# Belirli bir migration'a geri dön
railway run python manage.py migrate kustay 0005

# Tüm migration'ları geri al
railway run python manage.py migrate kustay zero
```

---

## Database Temizleme

### Test Data Silme

```sql
-- Tüm match'leri sil
DELETE FROM kustay_match;

-- Test kullanıcılarını sil
DELETE FROM kustay_user WHERE email LIKE '%test%';

-- İlanları sil
DELETE FROM kustay_listing WHERE title LIKE '%test%';
```

### Table Reset

```bash
# Dikkatli kullanın!
railway run python manage.py flush
```

---

## Troubleshooting

### Connection Error

```bash
# Railway service çalışıyor mu?
railway status

# Database URL doğru mu?
railway variables | grep DATABASE_URL
```

### Slow Queries

```sql
-- Index'leri kontrol et
SELECT * FROM pg_indexes WHERE tablename LIKE 'kustay_%';

-- Yavaş query'leri bul (PostgreSQL 12+)
SELECT query, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Database Size

```sql
-- Database boyutu
SELECT pg_size_pretty(pg_database_size('railway'));

-- Table boyutları
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Production Best Practices

1. **Backup Önce**: Her büyük değişiklik öncesi backup alın
2. **Test Önce**: Önce staging'de test edin
3. **Transaction Kullan**: Kritik işlemler için SQL transaction
4. **Index Kullan**: Sık sorgulanan alanlara index ekleyin
5. **Monitor Et**: Railway metrics'i takip edin

---

## Yararlı Komutlar

```bash
# Database shell
railway run python manage.py dbshell

# Django shell (Python)
railway run python manage.py shell

# SQL dosyası çalıştır
railway run psql $DATABASE_URL -f script.sql

# Tek query çalıştır
railway run psql $DATABASE_URL -c "SELECT COUNT(*) FROM kustay_user;"
```

---

## Kaynaklar

- [Railway Docs - PostgreSQL](https://docs.railway.app/databases/postgresql)
- [Django Database API](https://docs.djangoproject.com/en/5.2/topics/db/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
