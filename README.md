# Felix Student App 2026

En React-baserad PWA (Progressive Web App) byggd för Felix studentmottagning den 29 Maj.

## Funktioner
- **PWA**: Appen kan installeras på hemskärmen (iOS/Android).
- **Tipspromenad**: Formulär för att samla in lagens svar (1, X, 2) på 10 frågor. Svaren sparas direkt i Firebase Firestore under kollektionen `quizwalk_answers`.
- **Information**: Vyer för Schema och Meny.

## Arkitektur & Stack
- **Frontend**: React (Vite, TypeScript).
- **Styling**: Vanilla CSS (`src/index.css`) med studenttema (blått, gult, glassmorphism). Tailwind används inte.
- **Ikoner**: `lucide-react`.
- **Backend/Databas**: Firebase Firestore.
- **Infrastruktur**: Containeriserad med Docker (Nginx serverar Vite build). Tänkt att köras på Google Cloud Run.

## Kom igång lokalt

1. Skapa en fil som heter `.env.local` i rooten (bredvid `package.json`).
2. Fyll i dina Firebase-uppgifter i `.env.local` enligt nedan (hårdkoda aldrig dessa i kodfilerna):
   ```env
   VITE_FIREBASE_API_KEY="din_api_key"
   VITE_FIREBASE_AUTH_DOMAIN="din_auth_domain"
   VITE_FIREBASE_PROJECT_ID="ditt_project_id"
   VITE_FIREBASE_STORAGE_BUCKET="din_storage_bucket"
   VITE_FIREBASE_MESSAGING_SENDER_ID="din_messaging_sender_id"
   VITE_FIREBASE_APP_ID="ditt_app_id"
   ```
3. Installera beroenden:
   ```bash
   npm install --legacy-peer-deps
   ```
   *(Viktigt att använda `--legacy-peer-deps` på grund av vite-plugin-pwa beroendekonflikter med Vite 8+).*
4. Starta utvecklingsservern:
   ```bash
   npm run dev
   ```
5. Öppna [http://localhost:5173/](http://localhost:5173/) i din webbläsare för att se hur den ser ut.

## Skapa Firebase Projekt
1. Gå till [Firebase Console](https://console.firebase.google.com/).
2. Klicka på **Add project** och namnge det (t.ex. "felix-student").
3. Gå till **Build -> Firestore Database** och skapa databasen i "Test mode" (kom ihåg att stänga reglerna senare om ni vill ha det säkert, eller lägg till inloggning).
4. Gå till **Project Overview -> Project settings** (Kugghjulet).
5. Scrolla ner till "Your apps" och klicka på webbikonen (`</>`) för att lägga till en app.
6. Kopiera `firebaseConfig`-objektet och lägg in i din `.env.local` fil som i exemplet ovan.

## Bygga för Google Cloud Run
Appen är containeriserad med Docker och Nginx.

1. Bygg image:
   ```bash
   docker build -t felix-student .
   ```
2. Kör lokalt för att testa bygget:
   ```bash
   docker run -p 8080:8080 felix-student
   ```
3. För att publicera på Cloud Run behöver du pusha din image till Google Artifact Registry eller Container Registry och sedan deploya den via Cloud Console eller gcloud CLI.
