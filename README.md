# Digital Wardrobe Organizer

**Digital Wardrobe Organizer** is a client-side progressive web app that helps users manage clothing, build outfits, and discover smart styling suggestions.

## Features

- User authentication with registration and login screens
- Personal wardrobe management with item details:
  - category, color, season, occasion, tags, images, notes
- Outfit builder with support for selecting wardrobe pieces by slot
- Smart suggestions based on weather and occasion
- Usage tracking and analytics:
  - total items, saved outfits, wear count, favorites
- IndexedDB storage for offline-first data persistence
- Progressive Web App support with `manifest.json` and `sw.js`

## Pages

- **Dashboard**: overview of stats, recent items, and recent outfits
- **My Wardrobe**: add, edit, filter, search, favorite, and remove wardrobe items
- **Outfits**: create, view, wear, and delete outfit combinations
- **Suggestions**: weather-based and occasion-based outfit/item recommendations
- **Analytics**: category, color, season breakdown and wear trends

## Tech Stack

- HTML, CSS, and JavaScript
- Client-side storage using IndexedDB
- Service worker for PWA caching
- Responsive UI for desktop and mobile

## Project Structure

- `index.html` – main application shell
- `manifest.json` – PWA metadata
- `sw.js` – service worker registration and caching logic
- `css/style.css` – app styling
- `js/app.js` – app initialization, navigation, and UI control
- `js/auth.js` – authentication and session management
- `js/db.js` – IndexedDB wrapper
- `js/wardrobe.js` – wardrobe item management
- `js/outfits.js` – outfit creation and outfit UI
- `js/suggestions.js` – weather and occasion suggestions
- `js/analytics.js` – usage analytics and reporting

## Getting Started

1. Clone or download the repository.
2. Open `index.html` in a browser.
3. Create an account and start adding wardrobe items.
4. Build outfits and review suggestions and analytics.

> Note: The app runs entirely in the browser and does not require a backend server.

## Development

To make changes:

1. Edit the files in `css/` and `js/`.
2. Refresh the browser to see updates.
3. If you update service worker behavior, clear browser cache or unregister the old service worker.

## Future Improvements

- multi-accessory support in outfit builder
- image upload enhancements and cropping
- better recommendation algorithms
- import/export wardrobe data
- calendar and packing list integration
