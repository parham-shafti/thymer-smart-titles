// Seed data for Smart Titles. Each collection has the properties currently
// "in title" (in order) and the pool of available properties to add.
// p(name, type) -> property object
const p = (name, type) => ({ name, type });

const SEED_COLLECTIONS = [
  {
    id: "tools",
    name: "Tools",
    separator: "–",
    inTitle: [p("Serves", "record"), p("Source", "record")],
    available: [
      p("Habitat", "record"), p("Supports", "record"), p("Capability", "record"),
      p("Branches", "record"), p("Related Company", "record"), p("Classification", "record"),
      p("URL", "url"), p("Description", "text"), p("Agents", "record"),
      p("Keyboard Shortcut", "record"), p("Modified", "datetime"), p("Created", "datetime"),
      p("Collection", "choice"),
    ],
  },
  {
    id: "movies",
    name: "Movies",
    separator: "–",
    inTitle: [p("Director", "record"), p("Year", "datetime"), p("Genre", "record"), p("Rating", "number")],
    available: [
      p("Poster", "image"), p("Action Status", "record"), p("Channel", "text"),
      p("Thematic Conflict", "text"), p("Plot Category", "record"), p("Producers", "record"),
      p("Director of Photography", "record"), p("Screenwriter", "record"), p("Film Editor", "record"),
      p("Country", "record"), p("Cast", "record"), p("IMDB", "text"),
      p("Synopsis", "text"), p("Log date", "datetime"), p("Modified", "datetime"),
      p("Created", "datetime"), p("Collection", "choice"),
    ],
  },
  {
    id: "person",
    name: "Person",
    separator: "·",
    inTitle: [p("Related Company", "record"), p("Habitat", "record")],
    available: [
      p("Contact Stage", "choice"), p("Function", "record"), p("Email", "text"),
      p("Phone", "text"), p("Known for", "text"), p("Modified", "datetime"),
      p("Created", "datetime"), p("URL", "url"), p("Related to", "record"),
      p("Collection", "choice"), p("Birthday", "text"),
    ],
  },
  {
    id: "books",
    name: "Books",
    separator: "–",
    inTitle: [p("Author", "record"), p("Year", "datetime"), p("Rating", "number")],
    available: [
      p("Cover", "image"), p("Habitat", "record"), p("Action Status", "record"),
      p("Modified", "datetime"), p("Created", "datetime"), p("Collection", "choice"),
      p("Classification", "record"), p("Genre", "record"),
    ],
  },
  {
    id: "recipes",
    name: "Recipes",
    separator: "·",
    inTitle: [p("Cuisine", "record"), p("Time", "number"), p("Servings", "number")],
    available: [
      p("Difficulty", "choice"), p("Course", "record"), p("Source", "url"),
      p("Ingredients", "record"), p("Calories", "number"), p("Diet", "choice"),
      p("Modified", "datetime"), p("Created", "datetime"), p("Collection", "choice"),
    ],
  },
  {
    id: "projects",
    name: "Projects",
    separator: "›",
    inTitle: [p("Status", "choice"), p("Owner", "record"), p("Due", "datetime")],
    available: [
      p("Priority", "choice"), p("Client", "record"), p("Budget", "number"),
      p("Progress", "number"), p("Team", "record"), p("Tags", "record"),
      p("Modified", "datetime"), p("Created", "datetime"), p("Collection", "choice"),
    ],
  },
  {
    id: "articles",
    name: "Articles",
    separator: "–",
    inTitle: [p("Author", "record"), p("Publication", "record")],
    available: [
      p("Status", "choice"), p("URL", "url"), p("Topic", "record"),
      p("Read time", "number"), p("Published", "datetime"), p("Highlights", "text"),
      p("Modified", "datetime"), p("Created", "datetime"), p("Collection", "choice"),
    ],
  },
  {
    id: "podcasts",
    name: "Podcasts",
    separator: "·",
    inTitle: [p("Host", "record"), p("Episode", "number")],
    available: [
      p("Show", "record"), p("Duration", "number"), p("Guests", "record"),
      p("Topic", "record"), p("URL", "url"), p("Published", "datetime"),
      p("Modified", "datetime"), p("Created", "datetime"), p("Collection", "choice"),
    ],
  },
];

window.SEED_COLLECTIONS = SEED_COLLECTIONS;

// Collections that EXIST in the workspace but haven't been configured for Smart
// Titles yet — these are what the "+ Add collection" picker offers.
const baseProps = () => [
  p("Status", "choice"), p("Tags", "record"), p("Related to", "record"),
  p("URL", "url"), p("Description", "text"), p("Modified", "datetime"),
  p("Created", "datetime"), p("Collection", "choice"),
];
const cat = (name, extra = []) => ({ name, separator: "–", inTitle: [], available: [...extra, ...baseProps()] });

window.COLLECTION_CATALOG = [
  cat("Action Status", [p("Stage", "choice"), p("Owner", "record")]),
  cat("Action Types"),
  cat("Agents", [p("Capability", "record"), p("Source", "record")]),
  cat("Anlet"),
  cat("Applications", [p("Platform", "choice"), p("Vendor", "record")]),
  cat("Archetypes", [p("Domain", "record")]),
  cat("Companies", [p("Industry", "record"), p("Location", "record")]),
  cat("Concepts", [p("Field", "record")]),
  cat("Habitats", [p("Region", "record")]),
  cat("Notes"),
  cat("Places", [p("Country", "record"), p("Kind", "choice")]),
  cat("Quotes", [p("Author", "record"), p("Source", "record")]),
  cat("Tasks", [p("Priority", "choice"), p("Due", "datetime")]),
  cat("Workflows", [p("Trigger", "choice")]),
].sort((a, b) => a.name.localeCompare(b.name));

