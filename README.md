# 🚀 Setup Paravibe Backend

## 1️⃣ Clone Project

```bash
git clone https://github.com/LuanDHV/paravibe-be.git
cd paravibe-be
```

## 2️⃣ Install Dependencies

```bash
npm install
```

## 3️⃣ Setup Environment

Copy file `.env.example` thành `.env.local`:

```bash
cp .env.example .env.local
```

## 4️⃣ Start Database

```bash
docker-compose up -d mysql
```

Chờ 10 giây để MySQL khởi động.

## 5️⃣ Run Migrations

```bash
npm run typeorm:run
```

## 6️⃣ Start Backend

```bash
npm run start:dev
```

✅ Server chạy tại: http://localhost:8080

## 7️⃣ Test API

Mở browser:

```
http://localhost:8080/swagger
```

---

## ⚡ Quick Commands

```bash
# Start dev (with hot reload)
npm run start:dev

# Build production
npm run build

# Run migrations
npm run typeorm:run

# View logs
docker-compose logs -f mysql

# Stop database
docker-compose down
```

---

## ✅ Ready!

Backend sẵn sàng. Các APIs đã khả dụng tại `/api/v1/`
