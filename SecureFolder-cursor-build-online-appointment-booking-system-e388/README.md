# 🗓️ Online Terminbuchung System

Ein modernes, mehrsprachiges Online-Terminbuchungssystem mit React-Frontend und Node.js-Backend.

## ✨ Features

- 📅 **Öffentlicher Kalender** für Terminbuchungen
- 🔐 **Admin-Bereich** für Terminverwaltung
- 👥 **Multi-Tenant-System** mit Subdomains
- 📱 **Responsive Design** für alle Geräte
- 🔔 **E-Mail-Benachrichtigungen** (optional)
- 📱 **SMS-Integration** mit Twilio (optional)
- 💳 **Zahlungsintegration** mit Stripe (optional)
- 📊 **Dashboard** mit Statistiken
- 🔍 **Audit-Logs** für alle Aktionen
- 💾 **Automatische Backups**

## 🚀 Schnellstart

### Voraussetzungen

- **Node.js** (Version 16 oder höher)
- **PostgreSQL** (Version 12 oder höher)
- **npm** oder **yarn**

### 1. Repository klonen

```bash
git clone <repository-url>
cd online-terminbuchung
```

### 2. Umgebungsvariablen einrichten

```bash
# .env-Datei kopieren und anpassen
cp .env.example .env

# Wichtige Werte anpassen:
# - DB_PASSWORD: Dein PostgreSQL-Passwort
# - JWT_SECRET: Ein sicherer Schlüssel für JWT
```

### 3. Datenbank einrichten

```bash
# PostgreSQL starten (falls nicht läuft)
sudo systemctl start postgresql  # Ubuntu/Debian
brew services start postgresql    # macOS

# Datenbank erstellen
createdb terminbuchung

# Tabellen und Beispieldaten einrichten
node scripts/setup-db.js
```

### 4. Dependencies installieren

```bash
# Backend-Dependencies
npm install

# Frontend-Dependencies
cd frontend && npm install && cd ..
```

### 5. System starten

```bash
# Einfach mit dem Start-Skript
./start-dev.sh

# Oder manuell:
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend
cd frontend && npm start
```

## 🌐 Zugang

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/api/health

## 🔑 Demo-Zugang

Nach dem Setup stehen folgende Testdaten zur Verfügung:

- **Demo-Praxis**: demo@praxis.de
- **Admin-User**: admin@demo.de / admin123

## 📁 Projektstruktur

```
├── frontend/                 # React-Frontend
│   ├── src/
│   │   ├── components/      # React-Komponenten
│   │   ├── contexts/        # React Contexts
│   │   ├── services/        # API-Services
│   │   └── utils/           # Hilfsfunktionen
│   ├── public/              # Statische Dateien
│   └── package.json
├── routes/                   # Express-Routes
├── services/                 # Backend-Services
├── middleware/               # Express-Middleware
├── config/                   # Konfigurationsdateien
├── scripts/                  # Setup- und Utility-Skripte
├── server.js                 # Hauptserver-Datei
└── package.json
```

## 🛠️ Entwicklung

### Backend-Entwicklung

```bash
# Entwicklungsserver starten
npm run dev

# Produktions-Build
npm run build

# Tests ausführen
npm test
```

### Frontend-Entwicklung

```bash
cd frontend

# Entwicklungsserver starten
npm start

# Produktions-Build
npm run build

# Tests ausführen
npm test
```

### Datenbank-Migrationen

```bash
# Neue Migration erstellen
npm run db:migrate

# Beispieldaten einfügen
npm run db:seed
```

## 🔧 Konfiguration

### Umgebungsvariablen

| Variable | Beschreibung | Standard |
|----------|--------------|----------|
| `PORT` | Server-Port | 5000 |
| `DB_HOST` | Datenbank-Host | localhost |
| `DB_NAME` | Datenbank-Name | terminbuchung |
| `JWT_SECRET` | JWT-Verschlüsselung | (erforderlich) |
| `FRONTEND_URL` | Frontend-URL | http://localhost:3001 |

### Datenbank-Schema

Das System erstellt automatisch folgende Tabellen:

- **customers**: Praxis-Informationen
- **users**: Benutzer und Admins
- **bookings**: Termine
- **time_slots**: Verfügbare Zeitslots
- **blocked_dates**: Gesperrte Termine
- **audit_logs**: Aktivitäts-Logs

## 📱 API-Endpunkte

### Authentifizierung
- `POST /api/auth/login` - Benutzer anmelden
- `POST /api/auth/logout` - Benutzer abmelden

### Termine
- `GET /api/bookings` - Alle Termine abrufen
- `POST /api/bookings` - Neuen Termin erstellen
- `PUT /api/bookings/:id` - Termin aktualisieren
- `DELETE /api/bookings/:id` - Termin löschen

### Zeitslots
- `GET /api/slots` - Verfügbare Zeitslots
- `POST /api/slots` - Neue Zeitslots erstellen

### Kunden
- `GET /api/customers` - Kunden-Informationen
- `PUT /api/customers/:id` - Kunden-Daten aktualisieren

## 🎨 Frontend-Komponenten

### Öffentliche Komponenten
- **Home**: Startseite mit Terminbuchung
- **PublicCalendar**: Öffentlicher Kalender
- **BookingModal**: Terminbuchungs-Formular

### Admin-Komponenten
- **AdminDashboard**: Übersicht und Statistiken
- **AdminCalendar**: Terminverwaltung
- **AdminBookings**: Terminliste
- **AdminSettings**: Systemeinstellungen

## 🚀 Deployment

### Produktionsumgebung

```bash
# Backend bauen
npm run build

# Frontend bauen
cd frontend && npm run build && cd ..

# PM2 für Prozess-Management
npm install -g pm2
pm2 start ecosystem.config.js
```

### Docker (optional)

```bash
# Docker-Image bauen
docker build -t terminbuchung .

# Container starten
docker run -p 5000:5000 terminbuchung
```

## 🧪 Testing

```bash
# Backend-Tests
npm test

# Frontend-Tests
cd frontend && npm test

# E2E-Tests
npm run test:e2e
```

## 📊 Monitoring

Das System bietet folgende Monitoring-Features:

- **Health Check**: `/api/health`
- **Audit-Logs**: Alle Benutzer-Aktionen
- **Performance-Metriken**: Response-Zeiten
- **Error-Tracking**: Automatische Fehlerprotokollierung

## 🔒 Sicherheit

- **JWT-Authentifizierung** für alle Admin-Routen
- **Rate Limiting** gegen DDoS-Angriffe
- **Input-Validierung** mit express-validator
- **SQL-Injection-Schutz** mit parametrisierten Queries
- **CORS-Konfiguration** für sichere Cross-Origin-Requests
- **Helmet.js** für HTTP-Security-Headers

## 🤝 Beitragen

1. Fork das Repository
2. Erstelle einen Feature-Branch
3. Committe deine Änderungen
4. Push zum Branch
5. Erstelle einen Pull Request

## 📄 Lizenz

Dieses Projekt steht unter der MIT-Lizenz.

## 🆘 Support

Bei Fragen oder Problemen:

1. Schaue in die [Issues](link-to-issues)
2. Erstelle einen neuen Issue
3. Kontaktiere das Entwicklungsteam

## 🔄 Updates

```bash
# Repository aktualisieren
git pull origin main

# Dependencies aktualisieren
npm update
cd frontend && npm update && cd ..

# Datenbank-Migrationen ausführen
npm run db:migrate
```

---

**Viel Spaß beim Entwickeln! 🎉**