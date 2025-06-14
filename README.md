# Moodfade

**Feel the rhythm of your mood.**  
Moodfade is a mobile app built with React Native (Expo) that helps you generate mood-based Spotify playlists using your preferences and real-time mood selection. It's a minimalist, AI-assisted music companion that makes music work for your mind.

---

## Features

- Spotify Authentication (OAuth)
- Generate playlists based on today's mood
- Add your favorite artists
- Mix tracks from Firebase and Spotify
- Automatically create and update the *Moodfade* playlist in your Spotify account
- Feedback system to reflect how the music made you feel

---

## App Screenshots

### Splash & Login
<img src="./screenshots/1000003760.jpg" width="300"/>

### Spotify Auth
<img src="./screenshots/1000003761.jpg" width="300"/>

### Preferences
<img src="./screenshots/1000003762.jpg" width="300"/>

### Mood Selection
<img src="./screenshots/1000003769.jpg" width="300"/>

### Loading
<img src="./screenshots/1000003765.jpg" width="300"/>

### Playlist Ready
<img src="./screenshots/1000003766.jpg" width="300"/>

### Feedback
<img src="./screenshots/1000003768.jpg" width="300"/>

---

## Installation

1. Clone the repository:

```bash
git clone https://github.com/tadrochlinski/Moodfade.git
cd Moodfade
```

2. Install dependencies:

```bash
npm install
```

3. Run the app:

```bash
npx expo start
```

Scan the QR code using the Expo Go app on your phone.

---

## How It Works

1. You log in with your Spotify account.
2. You enter your name and favorite artists.
3. You pick a mood for today.
4. The app pulls:
   - 30 random tracks from Firebase based on the selected mood
   - 15 tracks from your favorite artists (via Spotify)
5. The app creates or updates a *Moodfade* playlist in your Spotify account.
6. You listen to the playlist directly in the Spotify app.
7. After the session, you rate your mood.

---

## Built With

- Expo + React Native
- Firebase Firestore
- Spotify Web API
- AsyncStorage & SecureStore
- React Navigation

---

## License

This project is in development and intended for educational and prototyping purposes. Not affiliated with Spotify.

---

## Author

Tomasz Drochliński
GitHub: [@tadrochlinski](https://github.com/tadrochlinski)
