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
      "The single point of contact for all non-academic campus life across Woxsen's 200-acre residential campus — covering hostel accommodations, daily facilities, and maintenance coordination.",
    responsibilities: [
      "Hostel room allocations, check-in/check-out, stay arrangements, and room change requests across AC and non-AC blocks",
      "24/7 campus and hostel maintenance coordination — electrical, plumbing, carpentry, air conditioning, and furniture",
      "Campus shuttle service, daily living facilities, and liaison with campus security",
    ],
    reachOutWhen:
      "Your room, hostel block, campus shuttle, mess, or any day-to-day living facility needs attention or a maintenance request.",
    emails: ["thegateway@woxsen.edu.in"],
    location: "Gateway Student Support Desk, Residential & Hostel Blocks",
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
      "ac",
      "air conditioning",
      "shuttle",
      "mess",
      "food",
      "transport",
      "laundry",
      "housekeeping",
      "warden",
      "wifi",
      "internet",
    ],
    icon: "campus",
  },
  {
    id: "bridge",
    name: "Bridge",
    area: "Academic Advisory & Support Desk",
    overview:
      "The dedicated human-centric support desk for student academic queries — resolving CAMU/MyCAMU system issues, academic documentation, and serving as the intermediary between students, faculty advisors, and the Registrar.",
    responsibilities: [
      "CAMU / MyCAMU login credentials, timetable queries, attendance discrepancy resolution, and exam portal access",
      "Course enrolment, elective selections, curriculum guidelines, grading clarifications, and credit requirements",
      "Official academic documentation — transcripts, semester grade sheets, bonafide certificates, and official letters",
    ],
    reachOutWhen:
      "MyCAMU or an academic portal has an error, you need attendance corrected, have a degree-requirement question, or need official academic documentation.",
    emails: ["bridge@woxsen.edu.in"],
    location: "Academic Administration Wing, Central Student Affairs Office",
    keywords: [
      "mycamu",
      "camu",
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
      "bonafide",
      "certificate",
      "registrar",
      "faculty",
      "professor",
      "class",
    ],
    icon: "academic",
  },
  {
    id: "cotd",
    name: "Centre of Talent Development",
    shortName: "COTD",
    area: "Employability, Career Readiness & Soft Skills",
    overview:
      "Delivers the mandatory Essential Life Skills curriculum from year one, covering aptitude training, soft-skills grooming, placement conditioning, and global e-learning certifications via Coursera.",
    responsibilities: [
      "Quantitative aptitude, logical reasoning, data interpretation, and the Inside Track placement readiness program",
      "Business communication, public speaking, executive presentations, and professional email etiquette",
      "Resume building, video resume profiles, LinkedIn optimization, mock GDs, and personalized interview coaching",
      "Coursera credit-enhancement pathways and student initiatives like Awaaz (public speaking forum)",
    ],
    reachOutWhen:
      "You need help with the Essential Life Skills course, aptitude training, mock interviews, Coursera certifications, or general placement preparation.",
    location: "Placement & Career Development Cell — COTD Division",
    keywords: [
      "soft skills",
      "communication",
      "logical reasoning",
      "aptitude",
      "certification",
      "e-learning",
      "coursera",
      "mock interview",
      "personality development",
      "industry readiness",
      "life skills",
      "resume",
      "gd",
      "group discussion",
      "awaaz",
      "inside track",
      "public speaking",
    ],
    icon: "career",
  },
  {
    id: "airc",
    name: "AI Research Centre",
    shortName: "AiRC",
    area: "Artificial Intelligence & Emerging Technology",
    overview:
      "Woxsen's interdisciplinary applied-research hub covering Machine Learning, NLP, Computer Vision, Robotics, Blockchain, Cybersecurity, and Generative AI — open to student researchers from any discipline.",
    responsibilities: [
      "Applied research in ML, NLP, computer vision, robotics, blockchain, cybersecurity, and generative AI",
      "Commercial AI solutions — predictive analytics, real-time data engineering, and SaaS platforms",
      "Coding bootcamps, technical workshops, AI hackathons, and research-paper publication mentorship",
    ],
    reachOutWhen:
      "You want to join a research project, attend a technical workshop or bootcamp, build a prototype, or get mentorship for publishing a research paper.",
    emails: ["airesearchcentre@woxsen.edu.in"],
    website: "https://www.aircwou.in",
    location: "AI Research Centre, School of Technology & Sciences Wing",
    keywords: [
      "ai",
      "artificial intelligence",
      "machine learning",
      "data science",
      "computer vision",
      "generative ai",
      "nlp",
      "robotics",
      "blockchain",
      "cybersecurity",
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
    name: "Centre for Languages & Multicultural Communication",
    shortName: "CLMC",
    area: "Linguistic Diversity, Multicultural Communication & Executive Education",
    overview:
      "A Centre of Excellence for sociolinguistics, language revitalization, and multicultural communication — with partnerships including Linguapax International and the UNESCO Chair of World Linguistic Heritage. Executive leadership programs run through Woxsen Foresight / CEEC.",
    responsibilities: [
      "Cross-cultural training, language documentation research, and the Internationalisation Lab",
      "Academic symposiums, guest lectures, and Ph.D. guidance in corporate communication",
      "Management Development Programs, AI for business masterclasses, and corporate governance training via Woxsen Foresight",
    ],
    reachOutWhen:
      "You are researching language policy, need cross-cultural communication training, seek international research collaborations, or want information about executive masterclasses.",
    emails: ["clmc@woxsen.edu.in"],
    website: "https://woxsenforesight.com",
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
      "language",
      "multicultural",
      "linguistics",
    ],
    icon: "leadership",
  },
  {
    id: "trade-tower",
    name: "Trade Tower",
    area: "Incubation & Acceleration Centre",
    overview:
      "Woxsen's startup hub supporting founders from raw ideation to market-ready ventures through structured tracks — Pre-Incubation (12 months), Incubation (24 months), and Acceleration (4–6 months). E-Cell drives student-led entrepreneurship culture.",
    responsibilities: [
      "Pre-incubation idea validation, Maker Lab access, prototype development, and foundational mentorship",
      "Incubation for commercial-ready products — business modeling, regulatory guidance, and go-to-market execution",
      "Seed-capital support, investor pitch rounds, patent and IP filing assistance, and co-working spaces",
      "E-Cell flagship events like The Confluence, pitch competitions, hackathons, and founder fireside chats",
    ],
    reachOutWhen:
      "You have a startup idea, need Maker Lab or prototype access, want to pitch for seed funding, or need IP/patent guidance and mentorship.",
    emails: ["tt@woxsen.edu.in"],
    website: "https://tradetower.in",
    location: "Trade Tower Building & Maker Lab Complex",
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
      "maker lab",
      "the confluence",
      "saas",
      "fintech",
      "healthtech",
    ],
    icon: "startup",
  },
  {
    id: "international-relations",
    name: "Centre for International Relations",
    shortName: "IR Office",
    area: "Global Mobility & International Partnerships",
    overview:
      "Manages outgoing and incoming student exchanges across 100+ partner universities globally, dual degrees, study immersion tours, and full mobility assistance including visa documentation and credit equivalence. The Japan Centre offers JLPT preparation, cultural events, and Indo-Japanese academic collaborations.",
    responsibilities: [
      "Student exchanges, dual degrees, study immersion tours, and international academic delegations",
      "Visa documentation, foreign health insurance, course credit equivalence mapping, and pre-departure briefings",
      "Japan Centre — Japanese language instruction (JLPT N5), Kizuna Matsuri, and corporate delegations from Japan",
    ],
    reachOutWhen:
      "You want to study abroad, explore a dual degree, need visa or exchange documentation, learn Japanese, prepare for JLPT, or explore Japan-focused opportunities.",
    emails: ["global@woxsen.edu.in", "internationaloffice@woxsen.edu.in"],
    location: "International Relations Office, Central Administrative Complex",
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
      "visa",
      "semester abroad",
    ],
    icon: "international",
  },
  {
    id: "career-development-centre",
    name: "Career Development Centre",
    shortName: "CDC / Placement Cell",
    area: "Internships, Recruitment & Placements",
    overview:
      "Handles corporate relations, campus recruitment drives, industry internship pipelines, and final placements across all schools — managing 150+ CXO sessions and corporate partnerships each year.",
    responsibilities: [
      "Campus recruitment drives, industry hiring pipelines, and executive placement programs across MBA, B.Tech, B.Des, Law, and Architecture",
      "100% summer internships, live industry projects, and paid technical internships",
      "Corporate networking — 150+ CXO sessions, guest lectures, and industrial site visits",
    ],
    reachOutWhen:
      "You need guidance on internships, on-campus or off-campus recruitment, final placement procedures, or a corporate recruiter introduction.",
    emails: ["placements@woxsen.edu.in", "careerconnect@woxsen.edu.in"],
    location: "Corporate Relations & Placement Office, Administrative Wing",
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
      "career connect",
      "hiring",
      "campus drive",
    ],
    icon: "career",
  },
  {
    id: "ers",
    name: "Centre for Ethics, Responsibility & Sustainability",
    shortName: "ERS",
    area: "Sustainability, Ethics & Social Impact",
    overview:
      "Embeds UN PRME principles and SDG targets into the curriculum across all schools. Runs community outreach programs — Sow Grow & Glow (rural literacy), UDAAN (civic awareness), and STEM Stars (mentorship for rural schoolgirls) — and oversees mandatory social internships.",
    responsibilities: [
      "Community outreach — Sow Grow & Glow, UDAAN, and STEM Stars programs for underserved communities",
      "Mandatory social internships, NGO attachments, and SDG-aligned field projects",
      "Annual ERS Festival with national and international sustainability thought leaders",
      "Institutional sustainability policy advisory and green campus initiatives",
    ],
    reachOutWhen:
      "You want to launch a sustainability or social-impact initiative, complete social-internship documentation, or collaborate on an SDG or ethics research project.",
    website: "https://woxsen.edu.in/ers/",
    location: "Centre of Excellence Wing",
    keywords: [
      "sustainability",
      "ethics",
      "social impact",
      "sdg",
      "community outreach",
      "environment",
      "social internship",
      "volunteering",
      "prme",
      "ers festival",
      "ngo",
      "green campus",
    ],
    icon: "sustainability",
  },
  {
    id: "health-wellness-sports",
    name: "Health, Wellness & Sports Department",
    shortName: "The League",
    area: "Medical Care, Mental Wellness & Athletics",
    overview:
      "Three pillars: Care & Cure (24/7 on-campus health clinic with resident physicians, ICU beds, and a dedicated campus ambulance), the Student Wellness Cell (free confidential counselling), and world-class athletics — The League (4-acre outdoor arena), SportX (60,000 sq. ft. indoor complex), and R.A.C.E (track-and-field facility).",
    responsibilities: [
      "24/7 Care & Cure health clinic — resident physicians, nursing staff, dispensary, ICU observation rooms, and campus ambulance",
      "Confidential professional counselling, mental health awareness campaigns, and stress-management workshops via the Student Wellness Cell",
      "The League — FIFA-quality football pitch, ITF tennis courts, FIBA basketball court, ICC cricket ground, golf course, and more",
      "SportX — Life Fitness gym, cardio & spin studios, badminton, squash, table tennis, billiards, yoga, Zumba, and Pilates",
    ],
    reachOutWhen:
      "You need medical or emergency support, a confidential counselling appointment, gym or sports-facility access, or information about tournaments and athletics.",
    emails: [
      "student.wellness@woxsen.edu.in",
      "healthcentre@woxsen.edu.in",
      "sports@woxsen.edu.in",
    ],
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
      "sportx",
      "race",
      "fitness",
      "yoga",
      "football",
      "cricket",
      "basketball",
      "tennis",
      "badminton",
      "care and cure",
    ],
    icon: "wellness",
  },
  {
    id: "vithal-gandhi-centre",
    name: "Vithal Gandhi Centre",
    shortName: "Central Library",
    area: "Library & Learning Resources",
    overview:
      "A flagship 70,000 sq. ft. central library housing 10,000+ print volumes and access to 33,000+ electronic resources — including Bloomberg Finance Terminals, IEEE Xplore, Scopus, Web of Science, and EBSCO. Extended hours during exam schedules.",
    responsibilities: [
      "10,000+ print volumes, international journals, and 33,000+ e-books and subscription research databases",
      "Bloomberg Finance Terminals, IEEE Xplore, Scopus, Web of Science, and EBSCO access",
      "Quiet individual study halls, collaborative discussion rooms, digital research terminals, printing, and scanning",
      "Inter-library loans, research literature discovery assistance, and academic citation guides",
    ],
    reachOutWhen:
      "You need database or Bloomberg Terminal access, want to borrow a book, reserve a study or discussion room, or need help finding research literature.",
    emails: ["library@woxsen.edu.in"],
    location: "Vithal Gandhi Centre Building (central campus landmark)",
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
      "web of science",
      "ebsco",
    ],
    icon: "library",
  },
];

const SYNONYM_GROUPS = [
  ["ac", "electricity", "maintenance", "room", "hostel", "warden", "housekeeping"],
  ["wifi", "internet", "campus", "facility", "shuttle", "transport"],
  ["mess", "food", "canteen", "hostel"],
  ["marks", "grade", "grading", "academic", "exam", "attendance"],
  ["portal", "mycamu", "camu", "erp", "login", "academic"],
  ["job", "placement", "career", "recruitment", "hiring", "campus drive"],
  ["cv", "resume", "linkedin", "career", "interview"],
  ["startup", "business", "founder", "incubation", "entrepreneurship", "maker lab"],
  ["abroad", "international", "exchange", "global", "mobility", "visa", "semester abroad"],
  ["therapy", "counselling", "counseling", "mental", "wellness", "psychologist", "care and cure"],
  ["gym", "sports", "court", "fitness", "league", "sportx", "cricket", "football", "basketball"],
  ["books", "book", "library", "journal", "database", "bloomberg terminal"],
  ["environment", "sustainability", "sdg", "social", "ethics", "ngo", "prme"],
  ["ai", "artificial", "machine", "coding", "research", "technology", "robotics", "blockchain"],
  ["aptitude", "soft skills", "mock interview", "gd", "coursera", "cotd"],
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
