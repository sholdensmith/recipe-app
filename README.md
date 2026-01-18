# Family Recipe Collection

A modern web app for managing and organizing your family recipes with AI-powered recipe parsing.

## Features

- **AI Recipe Parsing**: Paste recipes in any format and let Claude AI automatically extract and structure them
- **Smart Search**: Search recipes by ingredient, name, or content using full-text search
- **Advanced Filtering**: Filter by cuisine type (Italian, Mexican, Thai, etc.) and meal category (dessert, main, appetizer, etc.)
- **Schema.org Compliant**: Uses standard Recipe schema format for structured data
- **Family Sharing**: Easy to deploy and share with family members
- **SQLite Database**: Lightweight, file-based database with no setup required

## Getting Started

### Prerequisites

- Node.js 18+ installed
- An Anthropic API key (get one at [console.anthropic.com](https://console.anthropic.com/))

### Installation

1. Clone or navigate to the project directory:
```bash
cd recipe-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up your environment variables:
```bash
cp .env.example .env.local
```

4. Edit `.env.local` and add your Anthropic API key:
```
ANTHROPIC_API_KEY=your_api_key_here
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Adding Recipes

1. Click "Add Recipe" button on the home page
2. Paste your recipe in any format (from a website, email, handwritten note, etc.)
3. Click "Parse & Save Recipe"
4. The AI will automatically extract:
   - Recipe name and description
   - Ingredients list
   - Step-by-step instructions
   - Prep time, cook time, total time
   - Servings
   - Cuisine type and meal category
   - Any additional notes

### Searching and Filtering

- **Ingredient Search**: Type an ingredient name (e.g., "chicken", "tomato") to find all recipes containing it
- **Category Filter**: Filter by meal type (dessert, main, appetizer, side, veggie, etc.)
- **Cuisine Filter**: Filter by cuisine (Italian, Mexican, Thai, American, etc.)
- **Combine Filters**: Use multiple filters together for precise results

### Recipe Display

Each recipe shows:
- Full ingredient list with measurements
- Step-by-step instructions
- Timing information (prep, cook, total)
- Serving size
- Categories and cuisine tags
- Optional notes and tips

## Technology Stack

- **Frontend**: Next.js 15 with React and TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite with better-sqlite3
- **AI**: Claude API (Anthropic) for recipe parsing
- **Search**: SQLite FTS5 (Full-Text Search)

## Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com/new)
3. Add your `ANTHROPIC_API_KEY` environment variable in Vercel settings
4. Deploy!

Note: The SQLite database will be stored in Vercel's `/tmp` directory, which is ephemeral. For production use, consider:
- Vercel Postgres
- PlanetScale
- Supabase
- Or any other persistent database

### Alternative Deployment Options

- **Railway**: Supports persistent storage for SQLite
- **Fly.io**: Good for SQLite with volumes
- **Self-hosted**: Deploy on any server with Node.js

## Database Schema

The app uses a SQLite database with the following structure:

- **recipes table**: Main recipe data following Schema.org Recipe standard
- **recipes_fts table**: Full-text search index for fast ingredient/name searches
- Automatic triggers to keep search index in sync

## Recipe Data Format

Recipes are stored in Schema.org-compliant JSON format:

```json
{
  "name": "Recipe Name",
  "description": "Optional description",
  "prep_time": 15,
  "cook_time": 30,
  "total_time": 45,
  "servings": "4 servings",
  "recipe_category": "main",
  "recipe_cuisine": "Italian",
  "ingredients": ["ingredient 1", "ingredient 2"],
  "instructions": ["Step 1", "Step 2"],
  "notes": "Optional notes"
}
```

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Contributing

This is a personal family project, but feel free to fork and customize for your own use!

## License

MIT

## Support

For issues or questions, please check the [Next.js documentation](https://nextjs.org/docs) or [Anthropic API documentation](https://docs.anthropic.com/).
