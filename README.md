# GeoTrackerGV - Aplicație mobilă pentru partajarea P2P a locației în timp real

GeoTrackerGV este o aplicație nativă Android care urmărește locația GPS și o trimite direct către alți utilizatori. Nu folosește un server centralizat. Conexiunea se face P2P (Peer-to-Peer) prin WebRTC folosind librăria PeerJS, iar interfața este scrisă în HTML, CSS și JavaScript. Proiectul rulează pe telefon prin intermediul Capacitor.

## Structura sistemului

Codul este împărțit în trei părți:

1. **Logica (JavaScript)**
   * `app.js`: Pornește aplicația.
   * `config.js`: Reține variabilele, configurarea hărții și elementele din interfață.
   * `gps.js`: Citește datele de la senzorul GPS.
   * `peer.js`: Stabilește conexiunile pentru a trimite și primi coordonatele.
   * `friends.js`: Adaugă markerele pe hartă pentru ceilalți utilizatori.
   * `map.js`: Încarcă harta folosind Leaflet.
   * `timeline.js`, `timeline-ui.js`: Salvează traseul în baza de date locală (IndexedDB) și îl exportă ca fișier GPX.
   * `events.js`: Execută funcțiile la apăsarea butoanelor.

2. **Interfața (CSS, HTML)**
   * `index.html`: Pagina principală.
   * `css/`: Fișierele care definesc culorile și așezarea elementelor pe ecran.

3. **Sistemul Android (Capacitor)**
   * `android/`: Proiectul nativ Android generat de Capacitor. Conține codul Java și fișierele Gradle folosite pentru compilarea aplicației.

## Structura fișierelor

```text
GeoTrackerGV/
├── android/                         # Proiectul Android generat de Capacitor
├── www/                             # Fișierele sursă pentru interfață
│   ├── css/                         # Fișierele CSS
│   ├── js/                          # Fișierele JavaScript
│   ├── assets/                      # Imagini și iconițe
│   ├── index.html                   # Pagina principală
│   └── manifest.json, sw.js         # Fișierele pentru Service Worker
├── capacitor.config.json            # Fișierul de configurare pentru Capacitor
├── package.json                     # Lista de librării Node.js
├── .gitignore                       # Lista cu fișiere ignorate de Git
└── README.md                        # Acest fișier
```

## Instalare

1. Sistemul necesită instalarea Node.js și Android Studio pe Windows.
2. Deschide terminalul PowerShell în folderul proiectului. Rulează comenzile pentru a descărca pachetele și a sincroniza fișierele:

```powershell
# Instalează modulele Node.js
npm install

# Adaugă platforma Android în Capacitor
npx cap add android

# Sincronizează codul web (din folderul www) în proiectul Android
npx cap sync android
```

## Generarea fișierului APK

Există două metode pentru a compila codul într-un fișier APK.

### 1. Prin terminal

Rulează în PowerShell:

```powershell
cd android
.\gradlew assembleDebug
```

Fișierul va fi generat în `android/app/build/outputs/apk/debug/app-debug.apk`.

### 2. Din Android Studio

1. Rulează în PowerShell:

```powershell
npx cap open android
```

2. Programul Android Studio se va deschide.
3. Așteaptă ca procesul Gradle Sync să se termine.
4. Apasă pe meniul Build, selectează Build Bundle / APK, apoi Build APK(s).
5. Programul va afișa o notificare cu un buton Locate. Acel buton deschide folderul care conține fișierul APK.

## Instalarea pe telefon

1. Copiază fișierul `app-debug.apk` pe telefon.
2. Deschide fișierul. Dacă sistemul afișează un avertisment, selectează opțiunea pentru a permite instalarea din surse necunoscute.
3. Aplicația va apărea în lista de programe a telefonului.
