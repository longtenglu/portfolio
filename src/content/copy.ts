// The home page copy lives in this file, so it can be read and edited in one
// place. The resume page adds its own lines in resume.ts and reuses the
// experience and education below.
//
// House rules for this copy (from Voice Principles): no em dashes, no jargon,
// no invented numbers, point first, and it should sound like something I'd say
// out loud.

export const site = {
  name: "Longteng Lu",
  title: "Longteng Lu: programmes, video and AI workflows",
  description:
    "Portfolio of Longteng Lu, a Programme Executive in Singapore who makes videos, runs programmes and builds AI workflows.",
  location: "Based in Singapore",
  email: "prestonlult@gmail.com",
  github: "https://github.com/longtenglu",
  linkedin: "https://www.linkedin.com/in/longteng-l-b458971bb/",
  url: "https://longtenglu.vercel.app",
};

export const nav = [
  { label: "About", href: "#about" },
  { label: "Work", href: "#videos" },
  { label: "Builds", href: "#builds" },
  { label: "Contact", href: "#contact" },
];

export const hero = {
  claim: "I pick up new tools and put them to work.",
  sub: "Programme Executive in Singapore. I make videos, run programmes and build AI workflows.",
  scroll: "Scroll",
  reel: {
    label: "AI-generated footage and voiceover",
    action: "Play the full promo with sound",
    watch: "Watch with sound",
    // The visible trigger while the reel is still closed.
    rest: "Watch the promo",
  },
};

export const strip = "DESIGN × CODE • VIDEO × AI • BUILDING WITH AGENTS • ASPIRING AI ENGINEER";

export const about = {
  heading: "About",
  lead:
    "I'm Longteng. I run programmes and events at Tax Academy of Singapore, make the videos that promote them, and build AI tools that take the repetitive parts off my plate.",
  body: [
    "I studied psychology, and it still shapes how I write and edit: who is watching, and what makes them care enough to stay.",
    "Most of what I can do, I learned by trying a new tool on a real deadline. Right now that tool is backend development. I'm working through Boot.dev and heading towards applied AI work.",
  ],
  resumeView: "View resume",
  resumeDownload: "Download resume (PDF)",
  headshotAlt: "Black and white portrait of Longteng Lu in a dark t-shirt",
};

export const whatIDo = {
  heading: "What I do",
  rows: [
    {
      title: "Programmes and events",
      text: "I plan and coordinate tax programmes and events, from the first email to the day itself.",
    },
    {
      title: "Video and motion",
      text: "I shoot, direct and edit short-form and horizontal video, with motion graphics I build in code.",
    },
    {
      title: "Campaigns and copy",
      text: "LinkedIn posts, email campaigns and ad copy, written for the person on the other end. I've also run Meta Ads for my own store.",
    },
    {
      title: "AI workflows",
      text: "I build AI workflows that cut manual steps out of my work: captions, video review, research and handover files.",
    },
  ],
};

export type Stat = { value: string; label: string };
export type Role = {
  role: string;
  org: string;
  dates: string;
  stats?: Stat[];
  points: string[];
};

export const experience: { heading: string; intro: string; roles: Role[] } = {
  heading: "Experience",
  intro: "Where I've worked so far, newest first.",
  roles: [
    {
      role: "Programme Executive",
      org: "Tax Academy of Singapore",
      dates: "Mar 2026 - Present",
      stats: [
        { value: "10", label: "programmes and events I've helped run or managed" },
        { value: "70", label: "videos made since I joined" },
        { value: "50", label: "of those made with my AI editing workflow" },
      ],
      points: [
        "Plan and coordinate tax programmes and events from preparation through delivery.",
        "Produce programme marketing across LinkedIn, email campaigns, short-form and horizontal video.",
        "Shot, directed and edited a mascot travel series with branded motion graphics.",
        "Built tools that remove manual production steps: motion graphics rendered from code, speech-to-text captions, and a converter that turns HTML designs into editable PowerPoint.",
      ],
    },
    {
      role: "Independent e-commerce and marketing project",
      org: "Personal project",
      dates: "Dec 2025 - 2026",
      points: [
        "Launched a Shopify store with Meta Pixel tracking.",
        "Ran Meta Ads with CBO and ABO budget strategies and reviewed CPM and CTR.",
        "Wrote direct-response copy informed by consumer psychology.",
      ],
    },
    {
      role: "Clinic Associate",
      org: "Intellect",
      dates: "Jun 2024 - Sep 2025",
      points: [
        "Managed client enquiries and intake, worked out what each client needed and matched them with a suitable therapist.",
      ],
    },
    {
      role: "Research Assistant",
      org: "Singapore University of Social Sciences",
      dates: "Oct 2023 - Jul 2024",
      points: [
        "Supported neuroimaging data collection, preprocessing and scientific writing, and recruited research participants.",
      ],
    },
  ],
};

export const education = {
  heading: "Education",
  items: [
    {
      title: "Bachelor of Science in Psychology",
      org: "Singapore University of Social Sciences",
      dates: "2022 - 2025",
      note: "Coursework includes AI and Marketing, and Psychology of Consumer Behaviour.",
    },
    {
      title: "Diploma in Civil Engineering and Business",
      org: "Singapore Polytechnic",
      dates: "2017 - 2020",
    },
  ],
  certifications:
    "Google certifications, earned 2025: Digital Marketing and E-commerce Specialization; Google Ads Search, Display, AI-Powered Performance and Shopping; Google Analytics.",
};

// The about-the-numbers wording: every figure on the site is approximate.
export const statPrefix = "about";

export type Film = { id: string; title: string };
export type VideoCopy = {
  id: string;
  title: string;
  line: string;
  skills: string[];
  aiLabel?: string;
  films?: Film[];
};

export const videos = {
  heading: "Selected videos",
  intro: "Most of my day-job output is video. These are the ones I'd show first.",
  hint: "Hover for a preview, click to watch with sound.",
  hintTouch: "Tap any film to watch it with sound.",
  credit: "Produced at Tax Academy of Singapore",
  play: "Play",
  close: "Close",
  items: [
    {
      id: "atp-promo",
      title: "Advanced Tax Programme promo",
      line: "A programme promo built from AI b-roll, motion graphics made in code and a scripted voiceover.",
      skills: ["Direction", "AI b-roll", "Motion design", "Edit", "Script and voiceover"],
      aiLabel: "AI-generated footage and voiceover",
    },
    {
      id: "tax-is-networking",
      title: "Tax is Networking",
      line: "A masterclass day told through the connections people made, each one numbered and linked on screen.",
      skills: ["Concept", "Motion graphics", "HyperFrames", "Edit"],
    },
    {
      id: "anniversary-dinner",
      title: "20th Anniversary Dinner Reception",
      line: "An anniversary dinner recap cut to music: the speeches, the ribbon cutting, the band and a thank-you card.",
      skills: ["Event coverage", "Music-led edit", "Titles", "Sound"],
    },
    {
      id: "china-trip",
      title: "China trip recap",
      line: "Five cities in fifteen days on a research and exchange study, assembled in code as an editorial recap.",
      skills: ["Story structure", "Information design", "Code-built edit"],
    },
    {
      id: "iivt-few-words",
      title: "IIVT, in a few words",
      line: "Four speakers answer one question, cut vertical with branded captions and lower thirds.",
      skills: ["Interview selection", "Social cutdown", "Captions", "CapCut"],
    },
    {
      id: "bear-series",
      title: "The TA Bear series",
      line: "The Academy's bear mascot travels to conferences in Amsterdam and Munich. Character-led travel stories in three films.",
      skills: ["Concept", "Shooting", "Character storytelling", "Edit", "Motion graphics"],
      films: [
        { id: "bear-amsterdam-pre", title: "Amsterdam, before the trip" },
        { id: "bear-amsterdam-during", title: "Amsterdam, during the trip" },
        { id: "bear-munich", title: "Bear to Munich" },
      ],
    },
  ] satisfies VideoCopy[] as VideoCopy[],
};

export type Build = {
  title: string;
  kicker: string;
  text: string;
  examples: string[];
  link?: { label: string; href: string };
};

export const builds: { heading: string; intro: string; items: Build[] } = {
  heading: "Builds",
  intro:
    "Things I've built or set up so I can do my work better. The real systems hold work material, so I describe them here instead of showing them.",
  items: [
    {
      title: "My AI OS",
      kicker: "Personal system",
      text:
        "A folder of notes, memory and agent instructions that every AI session I start reads first. It keeps context from one session to the next, so I'm not explaining myself every morning.",
      examples: [
        "A morning brief that gathers what changed overnight",
        "A research routine that runs five expert viewpoints side by side, maps where they disagree, then checks key citations against the original sources",
        "A memory log that each session adds what it learned to",
        "A library of packaged playbooks any agent can pick up",
      ],
    },
    {
      title: "A multi-agent setup",
      kicker: "Runs on Firstmate",
      text:
        "I work with a crew of coding agents through Firstmate, an open-source tool I didn't build. One supervisor takes my brief and hands tasks to workers, each in its own copy of the code, and nothing lands without a review. I set it up for my own work, decide what gets built and check what comes back.",
      examples: [
        "This site was built that way: I picked the look and approved the copy, the agents did the build",
        "Each task gets a written brief, an isolated workspace and a review step before it counts as done",
      ],
      link: { label: "Firstmate on GitHub", href: "https://github.com/kunchenguid/firstmate" },
    },
    {
      title: "HyperFrames video work",
      kicker: "Video in code",
      text:
        "HyperFrames is the video tool I use: you write a scene in HTML and it renders to video. I use it for motion graphics, titles and lower thirds, and it sits in the middle of the AI editing workflow behind about 50 of my videos.",
      examples: [
        "Speech-to-text for captions, timed to the cut",
        "Titles and motion graphics rendered from code instead of keyframed by hand",
        "An AI review pass that looks at frames and the transcript together before I finish in CapCut",
      ],
      link: { label: "HyperFrames", href: "https://hyperframes.dev" },
    },
    {
      title: "Boot.dev projects",
      kicker: "Learning in public",
      text:
        "Small projects from the backend course. The first is Bookbot, a Python program that reads a book and reports its word and character counts. More will land here as the course goes on.",
      examples: ["Bookbot, in Python", "Next up: projects from the TypeScript backend path"],
    },
  ],
};

export const toolbox = {
  heading: "Toolbox",
  intro: "The tools I use on real work right now.",
  groups: [
    { title: "Video and design", tools: ["CapCut", "HyperFrames", "Canva"] },
    {
      title: "Marketing",
      tools: ["Meta Ads Manager", "Meta Pixel", "Google Ads", "Google Analytics", "Shopify", "LinkedIn", "Email campaigns"],
    },
    { title: "AI", tools: ["Claude Code", "Claude", "Codex", "Ollama"] },
    { title: "Code", tools: ["Python", "TypeScript", "Git", "GitHub", "Linux"] },
  ],
};

export const learning = {
  heading: "Learning log",
  intro: "I'm learning backend development on Boot.dev, one course at a time.",
  link: { label: "Boot.dev", href: "https://www.boot.dev" },
  done: "done",
  now: "now",
  items: [
    { title: "Learn Python for beginners", status: "done" },
    { title: "Learn Linux", status: "done" },
    { title: "Build a Bookbot", status: "done" },
    { title: "Back-end developer path, in TypeScript", status: "now" },
  ] as { title: string; status: "done" | "now" }[],
};

export const contact = {
  heading: "Contact",
  title: "Got a role in mind? Let's talk.",
  lead: "Email is the fastest way to reach me.",
  copy: "Copy email",
  copied: "Copied",
  copiedStatus: "Email address copied",
  clockLabel: "Local time in Singapore",
  clockZone: "SGT, UTC+8",
  links: [
    { label: "GitHub", href: "https://github.com/longtenglu" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/longteng-l-b458971bb/" },
  ],
};

export const footer = {
  credit: "Hands after Michelangelo's The Creation of Adam (public domain).",
  terminalHint: { before: "Psst: press", key: "`", after: "for a terminal." },
  terminalButton: "Open terminal",
};

// The hidden terminal. Commands print these lines.
export const terminal = {
  title: "Terminal",
  prompt: "guest@longtenglu:~$",
  welcome: ["Hi. This is a small terminal.", "Type help to see what it can do. Esc closes it."],
  help: [
    "help      list commands",
    "whoami    who I am, in one breath",
    "projects  things I've built and set up",
    "contact   how to reach me",
    "clear     clear the screen",
    "exit      close the terminal",
  ],
  whoami: [
    "longteng lu, singapore",
    "programme executive at tax academy of singapore",
    "makes the videos, runs the programmes, builds the ai workflows",
    "learning backend on boot.dev, heading towards applied ai",
  ],
  projectsHeading: "projects:",
  contactHeading: "contact:",
  notFound: (cmd: string) => `command not found: ${cmd}. Try help.`,
};
