/**
 * Philosophical Quotes Collection
 * 
 * A curated collection of inspiring quotes from famous philosophers
 * organized by categories for use in the welcome page and other UI elements.
 */

export interface PhilosophicalQuote {
  quote: string;
  author: string;
  category: 'motivation' | 'life' | 'wisdom' | 'success' | 'growth';
}

export const PHILOSOPHICAL_QUOTES: PhilosophicalQuote[] = [
  // MOTIVATION (4 quotes)
  {
    quote: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
    category: "motivation"
  },
  {
    quote: "It is during our darkest moments that we must focus to see the light.",
    author: "Aristotle",
    category: "motivation"
  },
  {
    quote: "The cave you fear to enter holds the treasure you seek.",
    author: "Joseph Campbell",
    category: "motivation"
  },
  {
    quote: "What lies behind us and what lies before us are tiny matters compared to what lies within us.",
    author: "Ralph Waldo Emerson",
    category: "motivation"
  },

  // LIFE (4 quotes)
  {
    quote: "The unexamined life is not worth living.",
    author: "Socrates",
    category: "life"
  },
  {
    quote: "Life must be understood backward. But it must be lived forward.",
    author: "Søren Kierkegaard",
    category: "life"
  },
  {
    quote: "The purpose of life is not to be happy. It is to be useful, to be honorable, to be compassionate.",
    author: "Ralph Waldo Emerson",
    category: "life"
  },
  {
    quote: "In the end, we will remember not the words of our enemies, but the silence of our friends.",
    author: "Martin Luther King Jr.",
    category: "life"
  },

  // WISDOM (4 quotes)
  {
    quote: "The only true wisdom is in knowing you know nothing.",
    author: "Socrates",
    category: "wisdom"
  },
  {
    quote: "Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself.",
    author: "Rumi",
    category: "wisdom"
  },
  {
    quote: "The fool doth think he is wise, but the wise man knows himself to be a fool.",
    author: "William Shakespeare",
    category: "wisdom"
  },
  {
    quote: "Knowing yourself is the beginning of all wisdom.",
    author: "Aristotle",
    category: "wisdom"
  },

  // SUCCESS (4 quotes)
  {
    quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    author: "Winston Churchill",
    category: "success"
  },
  {
    quote: "The way to get started is to quit talking and begin doing.",
    author: "Walt Disney",
    category: "success"
  },
  {
    quote: "Don't be afraid to give up the good to go for the great.",
    author: "John D. Rockefeller",
    category: "success"
  },
  {
    quote: "Innovation distinguishes between a leader and a follower.",
    author: "Steve Jobs",
    category: "success"
  },

  // GROWTH (4 quotes)
  {
    quote: "Be yourself; everyone else is already taken.",
    author: "Oscar Wilde",
    category: "growth"
  },
  {
    quote: "The only impossible journey is the one you never begin.",
    author: "Tony Robbins",
    category: "growth"
  },
  {
    quote: "What we plant in the soil of contemplation, we shall reap in the harvest of action.",
    author: "Meister Eckhart",
    category: "growth"
  },
  {
    quote: "The mind is everything. What you think you become.",
    author: "Buddha",
    category: "growth"
  }
];

/**
 * Get a random quote from all categories
 */
export function getRandomQuote(): PhilosophicalQuote {
  const randomIndex = Math.floor(Math.random() * PHILOSOPHICAL_QUOTES.length);
  return PHILOSOPHICAL_QUOTES[randomIndex];
}

/**
 * Get a random quote from a specific category
 */
export function getRandomQuoteByCategory(category: PhilosophicalQuote['category']): PhilosophicalQuote {
  const categoryQuotes = PHILOSOPHICAL_QUOTES.filter(quote => quote.category === category);
  const randomIndex = Math.floor(Math.random() * categoryQuotes.length);
  return categoryQuotes[randomIndex];
}

/**
 * Get all quotes from a specific category
 */
export function getQuotesByCategory(category: PhilosophicalQuote['category']): PhilosophicalQuote[] {
  return PHILOSOPHICAL_QUOTES.filter(quote => quote.category === category);
}

/**
 * Get all available categories
 */
export function getQuoteCategories(): PhilosophicalQuote['category'][] {
  return ['motivation', 'life', 'wisdom', 'success', 'growth'];
}