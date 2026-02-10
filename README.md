# Kindred - Your Family Operating System

Kindred is a modern family communication and connection platform built with Next.js and Firebase. It bridges generational gaps through translation, family trees, activity planning, and shared moments.

## Features

 **Family Tree** - View and edit your interactive family tree with visual relationships

 **Translation Bridge** - Translate between generations and languages (Gen Z slang ↔ Elder English, Mandarin, Cantonese, Hokkien)

 **Open Jio** - Plan and coordinate family activities, meals, and errands with built-in calendar and RSVP system

 **Family Feed** - Share everyday moments, photos, and stories with your entire family

## Tech Stack

**Frontend:**
- [Next.js 16](https://nextjs.org) - React framework
- [TypeScript](https://www.typescriptlang.org) - Type-safe development
- [Tailwind CSS 4](https://tailwindcss.com) - Styling
- [Firebase](https://firebase.google.com) - Authentication & Realtime Database

**Backend:**
- [Flask](https://flask.palletsprojects.com) - Python API server
- [Google Generative AI](https://ai.google.dev) - Translation & AI features
- [OpenAI](https://openai.com) - Language models

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+
- Firebase project (credentials configured)
- API keys for Google Generative AI & OpenAI

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
OPENAI_API_KEY=your_key
GOOGLE_API_KEY=your_key
FLASK_ENV=development
```

5. Run the Flask server:
```bash
python app.py
```

The API will be available at [http://localhost:5000](http://localhost:5000).

## Project Structure

```
kindred/
├── app/                      # Next.js app directory
│   ├── api/                 # API routes
│   ├── components/          # Page components
│   │   ├── FamilyTreePage.tsx
│   │   ├── TranslationPage.tsx
│   │   ├── OpenJioPage.tsx
│   │   ├── FeedPage.tsx
│   │   └── Navigation.tsx
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home page
├── components/              # Shared components
│   ├── features/
│   ├── hooks/
│   ├── types/
│   └── ui/
├── context/                 # React context (Auth, etc)
├── library/                 # Firebase & external libs
├── backend/                 # Flask API server
│   ├── app.py              # Main app
│   ├── translation.py      # Translation service
│   └── requirements.txt    # Python dependencies
└── public/                  # Static assets
```

## Key Components

### OpenJioPage
- Calendar and list view for family activities
- Create, edit, and manage events
- RSVP system with participant tracking
- Category-based organization (meals, activities, errands)
- Family branch visibility controls

### TranslationPage
- Multi-language support (Gen Z, Elder English, Mandarin, Cantonese, Hokkien)
- Voice input for translations
- Language swap functionality
- Translation history

### FamilyTreePage
- Interactive visual family tree
- Relationship mapping
- Profile management

### FeedPage
- Share moments with family
- Real-time updates
- Family interaction space

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

## Environment Variables

### Frontend (.env.local)
- `NEXT_PUBLIC_FIREBASE_*` - Firebase configuration

### Backend (.env)
- `OPENAI_API_KEY` - OpenAI API key
- `GOOGLE_API_KEY` - Google Generative AI key
- `FLASK_ENV` - Environment (development/production)

## Deployment

### Frontend
Deploy to [Vercel](https://vercel.com):
```bash
vercel deploy
```

### Backend
Deploy to [Render](https://render.com), [Railway](https://railway.app), or any Python-hosting platform.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Author

Created with ❤️ by [Meghan Tan](https://github.com/meghantan)

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
