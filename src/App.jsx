import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Settings, MapPin, Volume2, VolumeX } from 'lucide-react'
import * as NominatimBrowser from 'nominatim-browser'
import 'leaflet/dist/leaflet.css'
import './App.css'

// Fix for default markers in react-leaflet
import L from 'leaflet'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.divIcon({
  html: `<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

L.Marker.prototype.options.icon = DefaultIcon

function App() {
  const [position, setPosition] = useState(null)
  const [currentCity, setCurrentCity] = useState(null)
  const [lastDetectedCity, setLastDetectedCity] = useState(null)
  const [showCityButton, setShowCityButton] = useState(false)
  const [story, setStory] = useState('')
  const [isGeneratingStory, setIsGeneratingStory] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showDebug, setShowDebug] = useState(false) // New state for debug UI
  const [storyPrompt, setStoryPrompt] = useState('Write a fascinating historical story about the city of {city}. Include interesting facts, notable events, and cultural significance. Keep it engaging and informative, suitable for a 2-3 minute audio narration.')
  const [error, setError] = useState('')
  const audioRef = useRef(null)
  const [nominatimApiUrl, setNominatimApiUrl] = useState('')
  const [nominatimApiResponse, setNominatimApiResponse] = useState('')

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          console.log('Geolocation position received:', pos); // Added log
          const newPosition = [pos.coords.latitude, pos.coords.longitude]
          setPosition(newPosition)
          detectCity(newPosition)
        },
        (err) => {
          setError('Unable to get your location. Please enable location services.')
          console.error('Geolocation error:', err)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0 // Set maximumAge to 0 to force fresh location updates
        }
      )

      return () => navigator.geolocation.clearWatch(watchId)
    } else {
      setError('Geolocation is not supported by this browser.')
    }
  }, [])

  // Detect city from coordinates
  const detectCity = async (coords) => {
    console.log('detectCity called with coordinates:', coords); // Added log
    if (!coords || coords.length !== 2) {
      console.log('Invalid coordinates provided to detectCity.');
      setNominatimApiUrl('N/A');
      setNominatimApiResponse('Invalid coordinates');
      return; // Exit if coordinates are invalid
    }
    try {
      const [lat, lon] = coords
      console.log(`Attempting to detect city for: ${lat}, ${lon}`)
      const request = NominatimBrowser.createNominatimRequest({
        lat,
        lon,
        format: 'json',
        zoom: 10,
        addressdetails: 1
      })
      
      setNominatimApiUrl(request.url)
      console.log(`Nominatim API URL: ${request.url}`)
      const response = await fetch(request.url)
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Nominatim API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json()
      setNominatimApiResponse(JSON.stringify(data, null, 2))
      console.log('Nominatim API response:', data)
      
      if (data && data.address) {
        console.log('Nominatim address:', data.address); // Debug output
        const city = data.address.city ||
                     data.address.town ||
                     data.address.village ||
                     data.address.municipality ||
                     data.address.county ||
                     data.address.state
        if (city && city !== lastDetectedCity) {
          setCurrentCity(city)
          setLastDetectedCity(city)
          setShowCityButton(true)
          setStory('')
          console.log(`New city detected: ${city}. Showing button.`)
        } else if (city && city === lastDetectedCity) {
          console.log(`Still in ${city}. Button remains hidden.`)
        }
      } else {
        console.log('No city found for current coordinates.');
        setCurrentCity('N/A');
      }
    } catch (err) {
      console.error('Error detecting city:', err);
      setNominatimApiResponse(`Error: ${err.message}`);
      setCurrentCity('N/A');
    }
  }

  // Generate story using OpenAI API
  const generateStory = async () => {
    if (!currentCity) return
    
    setIsGeneratingStory(true)
    setError('')
    
    try {
      const prompt = storyPrompt.replace('{city}', currentCity)
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate story')
      }

      const data = await response.json()
      const generatedStory = data.choices[0].message.content
      setStory(generatedStory)
      
      // Generate audio
      await generateAudio(generatedStory)
      
    } catch (err) {
      setError('Failed to generate story. Please check your API key.')
      console.error('Story generation error:', err)
    } finally {
      setIsGeneratingStory(false)
    }
  }

  // Generate audio using ElevenLabs API
  const generateAudio = async (text) => {
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': import.meta.env.VITE_ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate audio')
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl
        audioRef.current.play()
        setIsPlayingAudio(true)
      }
      
    } catch (err) {
      setError('Failed to generate audio. Please check your ElevenLabs API key.')
      console.error('Audio generation error:', err)
    }
  }

  const handleAudioEnd = () => {
    setIsPlayingAudio(false)
  }

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlayingAudio) {
        audioRef.current.pause()
        setIsPlayingAudio(false)
      } else {
        audioRef.current.play()
        setIsPlayingAudio(true)
      }
    }
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">City Story Explorer</h1>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDebug(!showDebug)} // Toggle debug UI
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            Debug
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="m-4">
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="block text-sm font-medium mb-2">
              Story Generation Prompt:
            </label>
            <textarea
              value={storyPrompt}
              onChange={(e) => setStoryPrompt(e.target.value)}
              className="w-full p-2 border rounded-md h-24 text-sm"
              placeholder="Enter your custom prompt here. Use {city} as a placeholder for the city name."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use {'{city}'} as a placeholder for the detected city name.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Debug UI */}
      {showDebug && (
        <Card className="m-4">
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p><strong>Latitude:</strong> {position ? position[0].toFixed(6) : 'N/A'}</p>
            <p><strong>Longitude:</strong> {position ? position[1].toFixed(6) : 'N/A'}</p>
            <p><strong>Current City (Nominatim):</strong> {currentCity || 'N/A'}</p>
            <p><strong>Last Detected City:</strong> {lastDetectedCity || 'N/A'}</p>
            <p><strong>Show City Button:</strong> {showCityButton ? 'True' : 'False'}</p>
            <p><strong>Nominatim API URL:</strong> {nominatimApiUrl || 'N/A'}</p>
            <p><strong>Nominatim API Response:</strong> {nominatimApiResponse || 'N/A'}</p>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-destructive text-destructive-foreground p-3 m-4 rounded-md">
          {error}
        </div>
      )}

      {/* Map Container */}
      <div className="flex-1 relative">
        {position ? (
          <MapContainer
            center={position}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={position}>
              <Popup>
                You are here!
                {currentCity && <br />}
                {currentCity && `Current city: ${currentCity}`}
              </Popup>
            </Marker>
          </MapContainer>
        ) : (
          <div className="h-full flex items-center justify-center bg-muted">
            <div className="text-center">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Getting your location...</p>
            </div>
          </div>
        )}

        {/* City Detection Button */}
        {showCityButton && currentCity && (
          <div className="absolute bottom-4 left-4 right-4 z-[1000]">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    You've arrived in
                  </p>
                  <h2 className="text-lg font-bold mb-3">{currentCity}</h2>
                  <Button
                    onClick={generateStory}
                    disabled={isGeneratingStory}
                    className="w-full"
                  >
                    {isGeneratingStory ? 'Generating Story...' : 'Tell me about this city'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Story Display */}
        {story && (
          <div className="absolute top-4 left-4 right-4 z-[1000]">
            <Card className="max-h-64 overflow-y-auto">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Story of {currentCity}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleAudio}
                    disabled={!audioRef.current?.src}
                  >
                    {isPlayingAudio ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{story}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnd}
        onPause={() => setIsPlayingAudio(false)}
        onPlay={() => setIsPlayingAudio(true)}
        style={{ display: 'none' }}
      />
    </div>
  )
}

export default App


