# Kindred - Your Family Operating System

Kindred is a modern family communication and connection platform built with Next.js and Firebase. It bridges generational gaps through AI-powered translation, family trees, activity planning, hobby matching, and shared moments.

## Features

 **Family Tree** - View and edit your interactive family tree with visual relationships

 **Translation Bridge** - Translate between generations and languages (Gen Z slang ↔ Elder English, Mandarin, Cantonese, Hokkien) with voice transcription support

 **Open Jio** - Plan and coordinate family activities, meals, and errands with built-in calendar and RSVP system. AI-powered hobby matching suggests family members based on interests

 **Family Feed** - Share everyday moments, photos, and stories with your entire family. Automatic interest extraction from posts

## Tech Stack

**Frontend:**
- [Next.js 16](https://nextjs.org) - React framework with App Router
- [TypeScript](https://www.typescriptlang.org) - Type-safe development
- [Tailwind CSS 4](https://tailwindcss.com) - Utility-first styling
- [Firebase 12.9](https://firebase.google.com) - Authentication, Firestore database, Realtime updates

**Backend:**
- [Flask](https://flask.palletsprojects.com) - Lightweight Python API server
- [Google Generative AI](https://ai.google.dev) - Translation, text generation, and AI features
- [OpenAI](https://openai.com) - Audio transcription (Whisper) and advanced language models
- [Python-dotenv](https://github.com/theskumar/python-dotenv) - Environment variable management

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+
- Firebase project (credentials configured)
- API keys:
  - Google Generative AI (Gemini): [Get key](https://aistudio.google.com/apikey)
  - OpenAI: [Get key](https://platform.openai.com/api-keys)

### Frontend Setup

1. Clone the repository:
```bash
git clone https://github.com/meghantan/kindred.git
cd kindred
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables in `.env.local`:
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/Scripts/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables in `.env`:
```
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
FLASK_ENV=development
```

5. Run the Flask server:
```bash
python app.py
```

The API will be available at [http://localhost:5001](http://localhost:5001).

## Project Structure

```
kindred/
├── app/                           # Next.js app directory
│   ├── api/                      # API routes
│   ├── components/               # Page components
│   │   ├── FamilyTreePage.tsx
│   │   ├── ChatPage.tsx
│   │   ├── OpenJioPage.tsx
│   │   ├── FeedPage.tsx
│   │   ├── Navigation.tsx
│   │   └── Dashboard.tsx
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home/Dashboard page
├── components/                    # Shared UI components
│   ├── features/
│   ├── hooks/
│   ├── types/
│   └── ui/
├── context/                       # React context (Auth, etc)
├── library/                       # Firebase config & utilities
├── backend/                       # Flask API server
│   ├── app.py                    # Main Flask app with routes
│   ├── translation.py            # Translation & transcription service
│   ├── hobby.py                  # Interest extraction & hobby matching
│   └── requirements.txt          # Python dependencies
├── public/                        # Static assets
├── firestore.indexes.json        # Firestore composite indexes
└── README.md
```

## API Endpoints

### Translation & Transcription
- `POST /translate` - Translate text between languages
  - Body: `{ text, fromLang, toLang }`
  - Response: `{ translated }`

- `POST /transcribe` - Transcribe audio and optionally translate
  - Body: `{ audio, toLang, shouldTranslate }`
  - Response: `{ text }`

### Hobby Matching
- `POST /analyze-post` - Extract interests from feed post content
  - Body: `{ content }`
  - Response: `{ interests }`

- `POST /suggest-jio-matches` - Suggest family members for a Jio based on interests
  - Body: `{ title, description, members }`
  - Response: `{ suggestions }`

### Health Check
- `GET /health` - Check API server status
  - Response: `{ ok }`

## Key Components

### OpenJioPage
- Calendar and list view for family activities
- Create, edit, and manage events with modal form
- RSVP system with participant tracking
- AI-powered hobby matching for suggestions
- Category-based organization (meals, activities, errands)
- Family branch visibility controls

### TranslationPage
- Multi-language support (Gen Z, Elder English, Mandarin, Cantonese, Hokkien)
- Voice input with audio transcription
- Real-time translation display
- Language swap functionality
- Translation history

### FeedPage
- Post creation with image uploads
- Automatic interest extraction using Gemini
- Real-time family feed updates
- User engagement (likes, comments)

### Dashboard
- Welcome greeting and family stats
- Photo carousel from recent posts
- My Jios (upcoming personal events)
- Family activity log
- Family member count & upcoming events

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

## Environment Variables

### Frontend (.env.local)
- `NEXT_PUBLIC_FIREBASE_*` - Firebase configuration (all required)

### Backend (.env)
- `GEMINI_API_KEY` - Google Generative AI key for translation and text generation
- `OPENAI_API_KEY` - OpenAI key for audio transcription and language models
- `FLASK_ENV` - Environment (development/production)

## Firestore Schema

### Collections
- `users` - User profiles and authentication data
- `jios` - Family activities and events
- `posts` - Feed posts with images and captions
- `families` - Family group information

### Firestore Indexes
Composite indexes are managed in `firestore.indexes.json`. Deploy with:
```bash
firebase deploy --only firestore:indexes
```

## Deployment

### Frontend
Deploy to [Vercel](https://vercel.com):
```bash
vercel deploy
```

Or use GitHub Actions for automatic deployments on push.

### Backend
Deploy to [Render](https://render.com), [Railway](https://railway.app), [Heroku](https://heroku.com), or any Python-hosting platform.

Update CORS settings in `app.py` and API URLs in frontend for production.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Known Issues & Notes

- Firestore indexes are required for complex queries (see `firestore.indexes.json`)
- CORS is configured for all origins in development; update for production
- Audio transcription (Whisper) requires OpenAI API credits
- Backend port: 5001 (update in frontend API calls if changed)
- Google Generative AI key required for translation and interest extraction

## License

This project is private and proprietary.

## Author

Created by [Meghan Tan](https://github.com/meghantan)
