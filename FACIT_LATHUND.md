# Lathund för Facit (Tipspromenaden)

När du har skapat frågorna på papper och bestämt de rätta svaren, gör du så här för att lägga in dem i systemet så att topplistan aktiveras.

## Steg 1: Skriv ner dina svar här (för din egen skull)
1. [ ] (1, X, 2)
2. [ ] (1, X, 2)
3. [ ] (1, X, 2)
4. [ ] (1, X, 2)
5. [ ] (1, X, 2)
6. [ ] (1, X, 2)
7. [ ] (1, X, 2)
8. [ ] (1, X, 2)
9. [ ] (1, X, 2)
10. [ ] (1, X, 2)

## Steg 2: Lägg in i databasen

Eftersom vi tog bort gränssnittet för detta är det enklaste sättet att lägga in facit direkt via Firebase-konsolen:

1. Gå till [Firebase Console](https://console.firebase.google.com/)
2. Öppna ditt projekt (Felix Student)
3. Klicka på **Firestore Database** i vänstermenyn.
4. Klicka på samlingen (collection) `quizwalk_config` (skapa den om den inte finns).
5. Klicka på dokumentet `correct_answers` (skapa dokument-ID:t exakt så om det inte finns).
6. Lägg till ett fält:
   - Fältnamn: `answers`
   - Typ: `map`
7. Lägg till 10 fält under `answers`:
   - Fält 1: namn `1`, värde `"X"` (typ: string)
   - Fält 2: namn `2`, värde `"1"` (typ: string)
   - ...och så vidare för alla 10.

Så fort du klickar på Spara kommer din Admin-sidas Prisutdelning att börja fungera!
