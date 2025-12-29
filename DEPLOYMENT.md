# KUstay Deployment Guide

Bu dokümantasyon KUstay projesini Railway üzerinde staging ve production ortamlarına deploy etmek için adım adım rehberdir.

## İçindekiler
1. [Ön Hazırlıklar](#ön-hazırlıklar)
2. [Railway Setup](#railway-setup)
3. [Staging Deployment](#staging-deployment)
4. [Production Deployment](#production-deployment)
5. [Environment Variables](#environment-variables)
6. [Troubleshooting](#troubleshooting)

---

## Ön Hazırlıklar

### 1. Railway Hesabı Oluşturma
1. [railway.app](https://railway.app) adresine gidin
2. GitHub hesabınızla login olun
3. Ücretsiz tier otomatik olarak aktif olacak ($5 credit/ay)

### 2. GitHub Repository Hazırlığı
```bash
# Tüm değişiklikleri commit edin
git add .
git commit -m "Add deployment configuration"
git push origin Dev
```

### 3. Local Test
```bash
# Backend için yeni dependencies'leri yükleyin
pip install -r requirements.txt

# Static files test
python manage.py collectstatic --noinput

# Development server test
python manage.py runserver
```

---

## Railway Setup

### Backend Deployment

#### 1. Yeni Proje Oluştur
1. Railway dashboard → "New Project"
2. "Deploy from GitHub repo" seçin
3. `KUstay-comp491` repository'sini seçin

#### 2. PostgreSQL Ekle
1. Proje içinde "New" → "Database" → "PostgreSQL"
2. Railway otomatik olarak `DATABASE_URL` environment variable'ını oluşturacak

#### 3. Backend Service Oluştur
1. "New" → "GitHub Repo" → branch seçin (Dev for staging)
2. Service Settings:
   - **Root Directory**: `/` (ana dizin)
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`

#### 4. Environment Variables Ayarla
Settings → Variables sekmesinde:

```env
SECRET_KEY=<GENERATE-RANDOM-SECRET-KEY>
DEBUG=False
DJANGO_SETTINGS_MODULE=config.settings
ALLOWED_HOSTS=<your-service>.railway.app
CSRF_TRUSTED_ORIGINS=https://<your-service>.railway.app,https://<frontend-service>.railway.app
CORS_ALLOWED_ORIGINS=https://<frontend-service>.railway.app
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@kustay.com
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
```

**SECRET_KEY Generate:**
```python
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

#### 5. Deploy
- Railway otomatik olarak deploy edecek
- Logs'u kontrol edin: "View Logs"
- Migration'lar otomatik çalışacak (Procfile sayesinde)

### Frontend Deployment

#### 1. Frontend Service Oluştur
1. Aynı projede "New" → "GitHub Repo"
2. Service Settings:
   - **Root Directory**: `/frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx serve -s build -l $PORT`

#### 2. Environment Variables
```env
REACT_APP_API_URL=https://<backend-service>.railway.app
REACT_APP_ENV=production
```

#### 3. package.json'a Serve Ekleyin
Frontend klasöründe:
```bash
cd frontend
npm install --save serve
```

Veya `package.json` scripts'e ekleyin:
```json
"scripts": {
  "start": "react-scripts start",
  "build": "react-scripts build",
  "serve": "serve -s build -l $PORT"
}
```

---

## Staging vs Production Setup

### Staging Environment
- **Branch**: `Dev`
- **Purpose**: Ekip testleri, ortak development
- **Database**: Shared staging PostgreSQL
- **DEBUG**: `True` (hata mesajları görmek için)
- **Domain**: `kustay-staging.railway.app`

### Production Environment
- **Branch**: `main`
- **Purpose**: Canlı kullanıcılar
- **Database**: Ayrı production PostgreSQL
- **DEBUG**: `False`
- **Domain**: Custom domain veya `kustay.railway.app`

**İki Ayrı Railway Projesi Oluşturun:**
1. `KUstay-Staging` → Dev branch
2. `KUstay-Production` → main branch

---

## Environment Variables

### Backend Gerekli Variables

| Variable | Development | Staging | Production |
|----------|-------------|---------|------------|
| SECRET_KEY | Default | Random | Random (farklı) |
| DEBUG | True | True | False |
| ALLOWED_HOSTS | localhost | railway.app | custom-domain.com |
| DATABASE_URL | Local | Railway | Railway |
| SECURE_SSL_REDIRECT | False | True | True |
| SESSION_COOKIE_SECURE | False | True | True |

### Frontend Gerekli Variables

| Variable | Development | Staging | Production |
|----------|-------------|---------|------------|
| REACT_APP_API_URL | http://localhost:8000 | https://staging-backend.railway.app | https://api.kustay.com |
| REACT_APP_ENV | development | staging | production |

---

## Deployment Workflow

### Staging'e Deploy
```bash
# Dev branch'e push
git checkout Dev
git add .
git commit -m "Feature: new functionality"
git push origin Dev

# Railway otomatik deploy eder
# Staging URL: https://kustay-staging.railway.app
```

### Production'a Deploy
```bash
# Dev'den main'e merge
git checkout main
git merge Dev
git push origin main

# Railway production otomatik deploy eder
```

---

## Database Migration Stratejisi

### İlk Deployment
```bash
# Railway'de otomatik çalışır (Procfile)
python manage.py migrate

# Admin user oluşturmak için Railway CLI:
railway run python manage.py createsuperuser
```

### Sonraki Deployment'lar
- Migration'lar otomatik çalışır
- Veri kaybı riski varsa önce backup alın

### Staging → Production Veri Transferi
```bash
# Staging'den dump
railway run pg_dump $DATABASE_URL > staging_dump.sql

# Production'a restore
railway run psql $DATABASE_URL < staging_dump.sql
```

---

## Custom Domain Ekleme

### Railway'de Domain Setup
1. Service Settings → "Networking" → "Custom Domain"
2. Domain ekleyin: `api.kustay.com` (backend), `kustay.com` (frontend)
3. DNS ayarlarını yapın (CNAME record)

### SSL Certificate
- Railway otomatik SSL sertifikası sağlar (Let's Encrypt)
- HTTPS otomatik aktif olur

---

## Monitoring & Logs

### Railway Logs
```bash
# Real-time logs
railway logs --follow

# Specific service
railway logs --service backend
```

### Health Check
Backend'e healthcheck endpoint ekleyin:

```python
# config/urls.py
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({"status": "healthy"})

urlpatterns = [
    path('health/', health_check),
    # ... diğer paths
]
```

---

## Troubleshooting

### Backend Deploy Edilmiyor
1. **Logs kontrol**: Railway dashboard → View Logs
2. **Common issues**:
   - `requirements.txt` eksik
   - `DATABASE_URL` set edilmemiş
   - Port binding hatası → `0.0.0.0:$PORT` kullanın

### Frontend Build Fail
1. **Node version**: Railway Node 20 kullanıyor
2. **Environment variables**: Build time'da gerekli
3. **Memory issue**: Build process için memory artırın

### CORS Errors
```python
# settings.py - CORS origins kontrol edin
CORS_ALLOWED_ORIGINS = [
    'https://your-frontend.railway.app',
]
```

### Static Files 404
```bash
# WhiteNoise düzgün kurulu mu?
# settings.py kontrol:
MIDDLEWARE = [
    'whitenoise.middleware.WhiteNoiseMiddleware',  # SecurityMiddleware'dan sonra
]
```

### Database Connection Error
- `DATABASE_URL` environment variable set mi?
- Railway PostgreSQL service çalışıyor mu?
- Connection string doğru mu?

---

## Costs & Limits

### Railway Free Tier
- **$5 credit/ay**
- **500 saat execution time**
- **100GB egress bandwidth**
- **Shared CPU & Memory**

### Usage Tips
- Staging'i sadece test sırasında çalıştırın
- Production'da sleep mode kullanın (az trafikte)
- Log retention'ı azaltın

---

## Backup Stratejisi

### Automated Backups
Railway otomatik PostgreSQL backup yapar (7 gün)

### Manual Backup
```bash
# Database backup
railway run pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Media files backup
railway run tar -czf media_backup.tar.gz media/
```

---

## Next Steps

1. ✅ Railway hesabı oluştur
2. ✅ Staging environment deploy et
3. ✅ Ekip ile staging'de test yap
4. ✅ Production environment hazırla
5. ✅ Custom domain ekle (opsiyonel)
6. ✅ Monitoring setup yap
7. ✅ Backup stratejisi aktive et

---

## Yararlı Komutlar

```bash
# Railway CLI Install
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Run commands
railway run python manage.py migrate
railway run python manage.py createsuperuser

# Environment variables
railway variables

# Logs
railway logs --follow

# Deploy
railway up
```

---

## Destek ve Kaynaklar

- **Railway Docs**: https://docs.railway.app
- **Django Deployment**: https://docs.djangoproject.com/en/5.2/howto/deployment/
- **WhiteNoise**: http://whitenoise.evans.io/
- **Gunicorn**: https://docs.gunicorn.org/

---

**Not**: Bu döküman sürekli güncellenecektir. Sorularınız için ekip ile iletişime geçin.
