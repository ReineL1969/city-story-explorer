# City Story Explorer

A mobile-friendly web app that tracks your location on a map and generates fascinating historical stories about cities you visit, complete with AI-powered audio narration.

## Features

- **Real-time Location Tracking**: Uses your device's GPS to track your location on an interactive map
- **City Detection**: Automatically detects when you arrive in a new city using reverse geocoding
- **AI Story Generation**: Creates engaging historical stories about cities using OpenAI's GPT API
- **Audio Narration**: Converts stories to speech using ElevenLabs' text-to-speech API
- **Customizable Prompts**: Edit the story generation prompt in settings to customize the type of stories you receive
- **Mobile-Optimized**: Designed specifically for mobile devices with touch-friendly interface

## Setup Instructions

### 1. API Keys Required

You'll need to obtain API keys from:

- **OpenAI**: For story generation
  - Visit [OpenAI API](https://platform.openai.com/api-keys)
  - Create an account and generate an API key
  
- **ElevenLabs**: For audio narration
  - Visit [ElevenLabs](https://elevenlabs.io/)
  - Create an account and get your API key from the profile section

### 2. Environment Variables

Create a `.env` file in the project root with your API keys:

```
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

### 3. Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev --host

# Build for production
pnpm run build
```

### 4. Usage

1. Open the app in your mobile browser
2. Allow location access when prompted
3. The map will show your current location
4. When you arrive in a new city, a button will appear
5. Tap the button to generate and hear a story about the city
6. Use the settings (gear icon) to customize the story prompt

## Technical Details

- **Frontend**: React with Vite
- **Mapping**: Leaflet with OpenStreetMap tiles
- **Styling**: Tailwind CSS with shadcn/ui components
- **Location Services**: Browser Geolocation API
- **Reverse Geocoding**: Nominatim (OpenStreetMap)
- **AI Integration**: OpenAI GPT-3.5-turbo
- **Text-to-Speech**: ElevenLabs API

## Browser Compatibility

- Requires HTTPS for geolocation (except localhost)
- Modern browsers with geolocation support
- Mobile browsers recommended for best experience

## Privacy

- Location data is only used locally for city detection
- No location data is stored or transmitted except to geocoding services
- API calls are made directly from your browser to OpenAI and ElevenLabs

