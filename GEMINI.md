# GEMINI.md - AI Context & Guidelines

## Projekt: Felix Student 2026
Detta är en React-baserad webbapplikation (PWA) byggd för Felix studentmottagning den 29 Maj.

### Arkitektur & Stack
- **Frontend**: React (Vite, TypeScript).
- **Styling**: Vanilla CSS (`src/index.css`) med studenttema (blått, gult, glassmorphism). Undvik Tailwind om inte användaren specifikt ber om det.
- **Ikoner**: `lucide-react`.
- **Backend/Databas**: Firebase Firestore används för tipspromenaden (`src/firebase.ts`).
- **Infrastruktur**: Containeriserad med Docker (Nginx serverar Vite build). Tänkt att köras på Google Cloud Run.

### Nyckelfunktioner
1. **PWA (Progressive Web App)**: Appen använder `vite-plugin-pwa` så den kan installeras på hemskärmen (iOS/Android).
2. **Tipspromenad**: Ett formulär för att samla in lagens svar (1, X, 2) på 10 frågor. Dessa sparas direkt i Firebase Firestore kollektionen `quizwalk_answers`.
3. **Information**: Vyer för Schema och Meny.

### AI Assistans Riktlinjer
- Vid ändringar i stil, bevara "premium-känslan" och det svenska studenttemat.
- Firebase config hanteras via miljövariabler (`.env.local`). Skriv aldrig hårdkodade nycklar i kodfilerna.
- Vid nya beroenden, kom ihåg att använda `--legacy-peer-deps` vid `npm install` på grund av PWA-plugin beroendekonflikt med Vite 8+.
