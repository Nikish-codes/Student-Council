export type SupportDepartment = {
  id: string;
  name: string;
  shortName?: string;
  area: string;
  overview: string;
  responsibilities: string[];
  reachOutWhen: string;
  emails?: string[];
  website?: string;
  location?: string;
  keywords: string[];
  icon:
    | "campus"
    | "academic"
    | "career"
    | "research"
    | "leadership"
    | "startup"
    | "international"
    | "sustainability"
    | "wellness"
    | "library";
};

export type DepartmentSearchResult = {
  department: SupportDepartment;
  score: number;
};

export type GrievanceRecommendation = {
  strength: "recommended" | "available";
  title: string;
  reason: string;
};

export const SUPPORT_DEPARTMENTS: SupportDepartment[] = [
  {
    id: "gateway",
    name: "Gateway",
    area: "Hostel & Campus Operations",
    overview:
      "The single point of contact for non-academic campus life, residential needs, and day-to-day living concerns.",
    responsibilities: [
      "Hostel room allocations, stay arrangements, and room changes",
      "Maintenance involving electricity, plumbing, furniture, and accommodation",
      "Campus facilities and coordination with campus security",
    ],
    reachOutWhen:
      "Your room, hostel facilities, campus amenities, or general campus living needs attention.",
    emails: ["thegateway@woxsen.edu.in"],
    keywords: [
      "hostel",
      "room",
      "accommodation",
      "maintenance",
      "electricity",
      "plumbing",
      "furniture",
      "security",
      "facilities",
      "amenities",
      "campus living",
    ],
    icon: "campus",
  },
  {
    id: "bridge",
    name: "Bridge",
    area: "Academic Advisory & Support Desk",
    overview:
      "The connection to academic administration for academic queries, official documentation, and university academic systems.",
    responsibilities: [
      "ERP and MyCAMU login, attendance, timetable, enrolment, and exam-portal issues",
      "Course registrations, electives, curriculum, grading, and attendance guidance",
      "Official transcripts, grade sheets, and academic records",
    ],
    reachOutWhen:
      "MyCAMU or an academic portal has an error, you have a degree-requirement question, or you need official academic documentation.",
    emails: ["bridge@woxsen.edu.in"],
    keywords: [
      "mycamu",
      "erp",
      "login",
      "attendance",
      "timetable",
      "course",
      "enrolment",
      "registration",
      "elective",
      "curriculum",
      "exam",
      "grading",
      "marks",
      "transcript",
      "grade sheet",
      "academic record",
    ],
    icon: "academic",
  },
  {
    id: "cotd",
    name: "Center of Talent Development",
    shortName: "COTD",
    area: "Skills, Personality & Industry Readiness",
    overview:
      "Student skill enhancement, personality development, certification access, and preparation for industry.",
    responsibilities: [
      "Soft skills, business communication, and logical-reasoning training",
      "Global e-learning and certification platforms",
      "Corporate networking, mock interviews, and placement preparation",
    ],
    reachOutWhen:
      "You need a mandatory life-skills course, an industry certification, or preparation for internships and placements.",
    location: "Placement & Career Development Cell — COTD Division",
    keywords: [
      "soft skills",
      "communication",
      "logical reasoning",
      "certification",
      "e-learning",
      "mock interview",
      "personality development",
      "industry readiness",
      "life skills",
    ],
    icon: "career",
  },
  {
    id: "airc",
    name: "AI Research Centre",
    shortName: "AiRC",
    area: "Artificial Intelligence & Emerging Technology",
    overview:
      "Woxsen's innovation hub for interdisciplinary AI research, advanced technical learning, and applied product development.",
    responsibilities: [
      "Research in machine learning, data science, computer vision, and generative AI",
      "Technical workshops, training sessions, and coding bootcamps",
      "AI products, hackathons, prototypes, and research-paper publication",
    ],
    reachOutWhen:
      "You want to join an AI or technology research project, attend an advanced workshop, or build a hardware or software prototype.",
    website: "https://airc.woxsen.edu.in",
    keywords: [
      "ai",
      "artificial intelligence",
      "machine learning",
      "data science",
      "computer vision",
      "generative ai",
      "coding",
      "bootcamp",
      "hackathon",
      "prototype",
      "research paper",
      "hardware",
      "software",
    ],
    icon: "research",
  },
  {
    id: "clmc",
    name: "Centre for Leadership, Management & Communication",
    shortName: "CLMC",
    area: "Executive Education & Leadership",
    overview:
      "Executive development, corporate consulting, and advanced leadership and management learning.",
    responsibilities: [
      "Management Development Programs and executive-education modules",
      "Training in strategy, corporate communication, digital transformation, and leadership",
      "Corporate alignment and executive consulting initiatives",
    ],
    reachOutWhen:
      "You have a question about executive learning programs, industry masterclasses, or corporate leadership workshops.",
    keywords: [
      "leadership",
      "management",
      "communication",
      "executive education",
      "mdp",
      "corporate training",
      "strategy",
      "digital transformation",
      "masterclass",
      "consulting",
    ],
    icon: "leadership",
  },
  {
    id: "trade-tower",
    name: "Trade Tower",
    area: "Incubation & Acceleration Centre",
    overview:
      "Woxsen's startup hub for turning student ideas into scalable, market-ready ventures, with E-Cell supporting student-led startup culture.",
    responsibilities: [
      "Pre-incubation, co-working, prototype labs, and domain mentorship",
      "Seed-capital access, pitch sessions, and investor connections",
      "Product development, business models, IP or patents, and go-to-market support",
      "E-Cell ideation hackathons, pitch competitions, founder talks, and networking",
    ],
    reachOutWhen:
      "You have a startup idea, need a prototype, want to pitch for funding, or need launch and mentorship support.",
    emails: ["tt@woxsen.edu.in"],
    keywords: [
      "startup",
      "incubation",
      "accelerator",
      "entrepreneurship",
      "e-cell",
      "prototype",
      "seed funding",
      "venture fund",
      "investor",
      "pitch",
      "patent",
      "ip",
      "business model",
      "founder",
    ],
    icon: "startup",
  },
  {
    id: "international-relations",
    name: "Office of International Relations",
    shortName: "IR Office",
    area: "Global Mobility & International Partnerships",
    overview:
      "International strategy, academic mobility, global partnerships, and the Japan Centre's academic, cultural, and professional programs.",
    responsibilities: [
      "Student exchanges, dual degrees, study tours, and international delegations",
      "Joint research, faculty exchanges, guest lectures, global summits, and alliances",
      "Japan Centre language courses, JLPT preparation, exchanges, internships, and cultural programs",
    ],
    reachOutWhen:
      "You want to study abroad, explore a dual degree, join an international delegation, learn Japanese, prepare for JLPT, or explore Japan-focused opportunities.",
    emails: ["global@woxsen.edu.in", "internationaloffice@woxsen.edu.in"],
    keywords: [
      "international",
      "exchange",
      "study abroad",
      "dual degree",
      "study tour",
      "global mobility",
      "delegation",
      "japan centre",
      "japanese language",
      "jlpt",
      "kizuna matsuri",
      "international internship",
    ],
    icon: "international",
  },
  {
    id: "career-development-centre",
    name: "Career Development Centre",
    shortName: "CDC / Placement Cell",
    area: "Internships, Recruitment & Placements",
    overview:
      "Corporate relations, industry internships, career presentation, and final campus placements across Woxsen's schools.",
    responsibilities: [
      "Recruitment drives, summer internships, and executive placements",
      "Corporate networking, CXO sessions, and industry visits",
      "Resume building, LinkedIn alignment, and interview readiness",
    ],
    reachOutWhen:
      "You need guidance on internships, on-campus or off-campus recruitment, or final placement procedures.",
    emails: ["placements@woxsen.edu.in"],
    keywords: [
      "placement",
      "job",
      "recruitment",
      "internship",
      "resume",
      "cv",
      "linkedin",
      "interview",
      "corporate",
      "cxo",
      "industry visit",
    ],
    icon: "career",
  },
  {
    id: "ers",
    name: "Centre for Ethics, Responsibility & Sustainability",
    shortName: "ERS",
    area: "Sustainability, Ethics & Social Impact",
    overview:
      "Social-impact, ethical-leadership, environmental-sustainability, and UN Sustainable Development Goal initiatives.",
    responsibilities: [
      "Community outreach, social-impact projects, and regional development",
      "Sustainability and business ethics in campus and academic activity",
      "Mandatory social internships and SDG-aligned student research",
    ],
    reachOutWhen:
      "You want to launch a sustainability or social-impact initiative, complete social-internship documentation, or collaborate on an SDG project.",
    keywords: [
      "sustainability",
      "ethics",
      "social impact",
      "sdg",
      "community outreach",
      "environment",
      "social internship",
      "volunteering",
    ],
    icon: "sustainability",
  },
  {
    id: "health-wellness-sports",
    name: "Health, Wellness & Sports Department",
    shortName: "The League",
    area: "Medical Care, Mental Wellness & Athletics",
    overview:
      "Physical well-being, mental-health support, medical assistance, emergency care, and athletic facilities.",
    responsibilities: [
      "24/7 medical assistance, ambulance support, emergency care, and doctor consultations",
      "Sports arenas, court bookings, gym equipment, and tournaments",
      "Professional counselling, psychological support, and stress-management sessions",
    ],
    reachOutWhen:
      "You need medical or emergency support, a counselling appointment, sports-facility access, or information about university sports.",
    emails: ["healthcentre@woxsen.edu.in", "sports@woxsen.edu.in"],
    keywords: [
      "health",
      "medical",
      "doctor",
      "ambulance",
      "emergency",
      "mental health",
      "counselling",
      "counseling",
      "psychologist",
      "stress",
      "sports",
      "gym",
      "court",
      "tournament",
      "the league",
    ],
    icon: "wellness",
  },
  {
    id: "vithal-gandhi-centre",
    name: "Vithal Gandhi Centre",
    shortName: "Central Library",
    area: "Library & Learning Resources",
    overview:
      "The central hub for physical and digital knowledge resources supporting coursework, learning, and research.",
    responsibilities: [
      "Books, journals, e-books, research databases, IEEE, Scopus, and Bloomberg Terminals",
      "Quiet study areas, discussion rooms, printing, and scanning",
      "Memberships, book borrowing, and inter-library loans",
    ],
    reachOutWhen:
      "You need database access, want to borrow a book or reserve a room, or need help finding research literature.",
    emails: ["library@woxsen.edu.in"],
    keywords: [
      "library",
      "book",
      "journal",
      "e-book",
      "database",
      "ieee",
      "scopus",
      "bloomberg terminal",
      "study room",
      "discussion room",
      "printing",
      "scanning",
      "borrowing",
      "research literature",
    ],
    icon: "library",
  },
];

const SYNONYM_GROUPS = [
  ["ac", "electricity", "maintenance", "room", "hostel"],
  ["wifi", "internet", "campus", "facility"],
  ["marks", "grade", "grading", "academic", "exam"],
  ["portal", "mycamu", "erp", "login", "academic"],
  ["job", "placement", "career", "recruitment"],
  ["cv", "resume", "linkedin", "career"],
  ["startup", "business", "founder", "incubation", "entrepreneurship"],
  ["abroad", "international", "exchange", "global", "mobility"],
  ["therapy", "counselling", "counseling", "mental", "wellness"],
  ["gym", "sports", "court", "fitness", "league"],
  ["books", "book", "library", "journal", "database"],
  ["environment", "sustainability", "sdg", "social", "ethics"],
  ["ai", "artificial", "machine", "coding", "research", "technology"],
];

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "for",
  "help",
  "how",
  "i",
  "is",
  "it",
  "me",
  "my",
  "need",
  "of",
  "on",
  "the",
  "to",
  "want",
  "where",
  "with",
]);

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokens(value: string) {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function expandedTerms(token: string) {
  const group = SYNONYM_GROUPS.find((values) => values.includes(token));
  return group ? new Set([token, ...group]) : new Set([token]);
}

function containsTerm(field: string, term: string) {
  return term.length <= 2
    ? field.split(" ").includes(term)
    : field.includes(term);
}

function editDistance(a: string, b: string) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row;
    for (let column = 1; column <= b.length; column += 1) {
      const above = previous[column];
      previous[column] = Math.min(
        previous[column] + 1,
        previous[column - 1] + 1,
        diagonal + (a[row - 1] === b[column - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[b.length];
}

export function searchSupportDepartments(
  query: string,
  departments = SUPPORT_DEPARTMENTS,
): DepartmentSearchResult[] {
  const normalizedQuery = normalize(query);
  const queryTokens = tokens(query);
  if (!normalizedQuery || queryTokens.length === 0) {
    return departments.map((department) => ({ department, score: 0 }));
  }

  return departments
    .map((department) => {
      const name = normalize(
        [department.name, department.shortName, department.area]
          .filter(Boolean)
          .join(" "),
      );
      const keywords = normalize(department.keywords.join(" "));
      const reachOutWhen = normalize(department.reachOutWhen);
      const responsibilities = normalize(department.responsibilities.join(" "));
      const overview = normalize(department.overview);
      const contact = normalize(
        [department.location, department.website, ...(department.emails ?? [])]
          .filter(Boolean)
          .join(" "),
      );
      const allWords = new Set(
        [name, keywords, reachOutWhen, responsibilities, overview, contact]
          .join(" ")
          .split(" "),
      );

      let score = 0;
      if (name.includes(normalizedQuery)) score += 48;
      if (keywords.includes(normalizedQuery)) score += 36;
      if (reachOutWhen.includes(normalizedQuery)) score += 28;
      if (responsibilities.includes(normalizedQuery)) score += 20;

      for (const token of queryTokens) {
        let best = 0;
        for (const term of expandedTerms(token)) {
          if (containsTerm(name, term)) best = Math.max(best, 16);
          if (containsTerm(keywords, term)) best = Math.max(best, 12);
          if (containsTerm(reachOutWhen, term)) best = Math.max(best, 9);
          if (containsTerm(responsibilities, term)) best = Math.max(best, 7);
          if (containsTerm(overview, term)) best = Math.max(best, 5);
          if (containsTerm(contact, term)) best = Math.max(best, 3);
        }
        if (best === 0 && token.length >= 4) {
          const fuzzy = [...allWords].some(
            (word) =>
              Math.abs(word.length - token.length) <= 1 &&
              editDistance(word, token) <= 1,
          );
          if (fuzzy) best = 3;
        }
        score += best;
      }

      return { department, score };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function grievanceRecommendation(
  query: string,
): GrievanceRecommendation | null {
  const value = normalize(query);
  if (!normalize(query)) return null;

  const sensitive =
    /harass|discrimin|ragging|bully|assault|abuse|misconduct|retaliat|threat|unsafe|stalk/.test(
      value,
    );
  if (sensitive) {
    return {
      strength: "recommended",
      title: "We recommend recording this through the grievance form.",
      reason:
        "Your search describes a sensitive or safety-related concern. You can still use the department route, but the grievance form gives the concern a direct formal path.",
    };
  }

  const formalOrUnresolved =
    /grievance|formal complaint|complain|not resolved|unresolved|ignored|no response|no reply|still broken|repeated|escalat/.test(
      value,
    );
  if (formalOrUnresolved) {
    return {
      strength: "available",
      title: "You may also want to use the grievance form.",
      reason:
        "This sounds formal or unresolved. The department remains the practical route, while the grievance form can record the concern for review.",
    };
  }

  return null;
}
