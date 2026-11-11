# Muzik

A free music and audiobook player for iPhone that plays your own files. Muzik is a web app (PWA): you install it from Safari, so you don't need a Mac or an Apple Developer account.

## Features
- **Music:** songs, playlists, albums and artists, search, play all, shuffle, repeat
- **Audiobooks:** remembers where you stopped in every book, speed from 0.75× to 3×, skip back 15s and forward 30s, a sleep timer, chapters inside M4B files, and books made of many MP3 parts
- **Edit tags:** title, artist, album, genre, year, track number and your own album art. For MP3 files the tags are written into the file too.
- Lock screen, headphone and car controls
- Works offline once it's installed

## Put it online with GitHub Pages (free)
1. Sign in to github.com as **ClaudiusCoder79** and create a new **public** repository called `muzik`.
2. Click **Add file → Upload files**, then drag in everything from this folder: `index.html`, `app.js`, `styles.css`, `sw.js`, `manifest.webmanifest`, and the `icons` and `vendor` folders. Click **Commit changes**.
3. Open **Settings → Pages**. Under "Branch" choose **main** and **/(root)**, then click **Save**.
4. After about a minute the app is live at **https://claudiuscoder79.github.io/muzik/**

## Install it on the iPhone
1. Open that link in **Safari**. It has to be Safari.
2. Tap **Share**, then **Add to Home Screen**, then **Add**.
3. Open Muzik from the home screen, go to **Add files** and pick your music.

Add your files from the home screen app, not from the Safari tab. Each one keeps its own library.

## Updating the app later
Upload the changed files to GitHub. Then, in `sw.js`, raise the number in `muzik-v2` (v3 the next time, and so on) so phones download the new version. Close and reopen Muzik twice to pick up the update.

## Good to know
- Your music is stored inside Muzik on the phone. If you delete the Muzik icon from the home screen, its library is deleted too.
- Libraries used: jsmediatags (reads tags) and browser-id3-writer (writes MP3 tags). Both are MIT licensed and included in `vendor/`.
