import Link from 'next/link';

export default function TopNav() {
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-2">
          <Link
            href="/"
            className="text-sm sm:text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors whitespace-nowrap truncate"
          >
            Smith Family Recipes
          </Link>
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            <Link
              href="/meals"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 px-2 py-1 whitespace-nowrap"
            >
              My Meals
            </Link>
            <Link
              href="/add-recipe"
              className="text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            >
              Add Recipe
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
