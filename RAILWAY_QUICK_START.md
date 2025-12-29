# Railway Quick Start Guide

Backend deployment başarılı! ✅ Şimdi frontend'i deploy edelim.

## Mevcut Durum

✅ **Backend**: Online ve çalışıyor
✅ **Database**: PostgreSQL aktif
⏳ **Frontend**: Henüz deploy edilmedi

---

## Frontend Deployment Adımları

### 1. Backend URL'inizi Alın

Railway Dashboard → Backend Service → **Settings** → **Networking**

Backend URL'inizi kopyalayın (örn: `https://kustay-backend-production.up.railway.app`)

### 2. Frontend Service Oluşturun

1. Aynı Railway projesinde **"New"** butonu
2. **"GitHub Repo"** seçin
3. Repository: `Metecanyavuz/KUstay-comp491`
4. Branch: `mete` seçin

### 3. Frontend Service Ayarları

**Settings → Source:**
- **Root Directory**: `/frontend`
- **Branch**: `mete`

**Settings → Deploy:**
- Builder: **DOCKERFILE** seçin (önemli!)
- Dockerfile Path: `Dockerfile`

### 4. Environment Variables Ekleyin

Frontend service → **Variables** sekmesi:

```env
BACKEND_URL=https://your-backend.railway.app
```

**ÖNEMLİ**: `BACKEND_URL` sonunda `/` olmamalı!

**Doğru**: `https://kustay-backend.railway.app`
**Yanlış**: `https://kustay-backend.railway.app/`

### 5. Deploy

Variables ekledikten sonra otomatik deploy başlayacak.

**Build Logs'da göreceğiniz:**
```
Building with Dockerfile
Step 1/12 : FROM node:20-alpine as build
...
npm install
npm run build
...
Successfully built
```

### 6. CORS Ayarlarını Güncelleyin

Frontend deploy olduktan sonra, backend'de CORS ayarlarını güncelleyin:

Railway → **Backend Service** → **Variables**

Frontend URL'ini ekleyin (örn: `https://kustay-frontend.railway.app`):

```env
ALLOWED_HOSTS=*.railway.app,your-frontend.railway.app
CSRF_TRUSTED_ORIGINS=https://your-frontend.railway.app,https://your-backend.railway.app
CORS_ALLOWED_ORIGINS=https://your-frontend.railway.app
```

**Redeploy** backend'i bu değişikliklerden sonra.

---

## Test Etme

### Frontend Test
```
https://your-frontend.railway.app
```
Ana sayfa görmelisiniz.

### API Test
Frontend'ten login yapmayı deneyin. Network tab'de:
- API çağrıları `/api/...` olarak gitmeli
- Nginx bunları backend'e proxy etmeli
- CORS hataları olmamalı

### Admin Panel Test
```
https://your-backend.railway.app/admin/
```
Django admin login sayfası.

---

## Sorun Giderme

### Frontend Build Failed
- **Logs kontrol**: "View Logs" → build error nedir?
- **Dockerfile**: Builder "DOCKERFILE" seçili mi?
- **Root Directory**: `/frontend` mi?

### 404 on API Calls
- `BACKEND_URL` environment variable set mi?
- Backend URL sonunda `/` var mı? (olmamalı)
- Nginx config doğru mu?

### CORS Errors
- Backend'de `CORS_ALLOWED_ORIGINS` frontend URL'i içeriyor mu?
- `CSRF_TRUSTED_ORIGINS` doğru mu?
- Backend redeploy edildi mi?

### Static Files 404
- React build başarılı mı?
- `/frontend/build` klasörü oluştu mu?
- Nginx config doğru mu?

---

## Deployment Yapısı

```
Railway Project
├── PostgreSQL Service
│   └── DATABASE_URL → otomatik
│
├── Backend Service (Django)
│   ├── Source: / (root)
│   ├── Branch: mete
│   ├── Builder: Dockerfile
│   └── Env Vars:
│       ├── DATABASE_URL (from PostgreSQL)
│       ├── SECRET_KEY
│       ├── DEBUG=True
│       ├── ALLOWED_HOSTS
│       ├── CSRF_TRUSTED_ORIGINS
│       └── CORS_ALLOWED_ORIGINS
│
└── Frontend Service (React + Nginx)
    ├── Source: /frontend
    ├── Branch: mete
    ├── Builder: Dockerfile
    └── Env Vars:
        └── BACKEND_URL
```

---

## Sonraki Adımlar

1. ✅ Frontend deploy et
2. ✅ CORS ayarlarını güncelle
3. ✅ Uygulamayı test et
4. ✅ Superuser oluştur (admin için)
5. ✅ Custom domain ekle (opsiyonel)

---

## Custom Domain (İlerisi İçin)

Frontend için:
```
kustay.com → Frontend Service
```

Backend için:
```
api.kustay.com → Backend Service
```

Railway → Service → **Settings** → **Networking** → **Custom Domain**

---

## Önemli Notlar

- **Staging**: `mete` branch kullanıyorsunuz
- **Production**: İleride `main` branch'e geçin
- **Costs**: Railway free tier $5 credit/ay
- **Logs**: Her zaman deployment logs'u kontrol edin
- **Redeploy**: Variables değiştirince redeploy gerekir

---

Herhangi bir sorunla karşılaşırsanız, logs'ları kontrol edin veya yardım isteyin!
