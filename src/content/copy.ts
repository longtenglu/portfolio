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
  sub: "Programme Executive in Singapore. I make videos, run programmes and build AI workflows. Looking for marketing, communications or programme roles at tech companies.",
  scroll: "Scroll",
  // The film in the gap between the hands is one of the Selected videos: the
  // caption takes its title and credit from that entry.
  reel: {
    film: "china-trip",
    action: "Play the full film with sound",
    watch: "Watch with sound",
    // The visible trigger while the reel is still closed.
    rest: "Watch the film",
  },
};

export const strip = "DESIGN × CODE • VIDEO × AI • BUILDING WITH AGENTS • 70 VIDEOS AND COUNTING";

export const about = {
  heading: "About",
  lead:
    "I'm Longteng. In my current role I run programmes and events, make the videos that promote them, and build AI tools that take the repetitive parts off my plate.",
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

// A stat with a prefix is approximate ("about 10"); one without is a counted floor.
export type Stat = { value: string; label: string; prefix?: string };
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
      org: "",
      dates: "Mar 2026 - Present",
      stats: [
        { value: "10", prefix: "about", label: "programmes and events I've helped run or managed" },
        { value: "70", prefix: "about", label: "videos made since I joined" },
        { value: "100,000+", label: "impressions across our channels" },
      ],
      points: [
        "Plan and coordinate tax programmes and events from preparation through delivery.",
        "Produce programme marketing across LinkedIn, email campaigns, short-form and horizontal video.",
        "Directed and edited a three-film mascot travel series, using conference photos and motion graphics built in code.",
        "Built tools that remove manual production steps: motion graphics rendered from code, speech-to-text captions, and a converter that turns HTML designs into editable PowerPoint.",
      ],
    },
    {
      role: "Independent e-commerce and marketing project",
      org: "Personal project, part-time",
      dates: "Dec 2025 - Apr 2026",
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

export type Film = { id: string; title: string };
export type VideoCopy = {
  id: string;
  title: string;
  line: string;
  /** One short line of what I did on the film, in plain words. */
  credit: string;
  films?: Film[];
};

export const videos = {
  heading: "Selected videos",
  intro: "Most of my day-job output is video. These are the ones I'd show first.",
  hint: "Hover for a preview, click to watch with sound.",
  hintTouch: "Tap any film to watch it with sound.",
  play: "Play",
  close: "Close",
  items: [
    {
      id: "china-trip",
      title: "China trip recap",
      line: "Five cities in fifteen days on a research and exchange study, assembled in code as an editorial recap.",
      credit: "Story, information design and a code-built edit",
    },
    {
      id: "tax-is-networking",
      title: "Tax is Networking",
      line: "A masterclass day told through the connections people made, each one numbered and linked on screen.",
      credit: "Concept and edit, with motion graphics built in HyperFrames",
    },
    {
      id: "iivt-few-words",
      title: "IIVT, in a few words",
      line: "Four speakers answer one question, cut vertical with branded captions and lower thirds.",
      credit: "Picked the answers, cut and captioned in CapCut",
    },
    {
      id: "bear-series",
      title: "The bear mascot travel series",
      line: "A mascot travels to conferences in Amsterdam and Munich in three films I directed and edited.",
      credit: "Directed and edited, using conference photos and motion graphics built in code",
      films: [
        { id: "bear-amsterdam-pre", title: "Amsterdam, before the trip" },
        { id: "bear-amsterdam-during", title: "Amsterdam, during the trip" },
        { id: "bear-munich", title: "Bear to Munich" },
      ],
    },
  ] satisfies VideoCopy[] as VideoCopy[],
};

export type Step = { id: string; title: string; caption: string; film: string; alt: string };

// "How a film gets made": one real production still per step. The id of each
// step is the id of its still in src/data/media.json.
export const process: { heading: string; intro: string; from: string; steps: Step[] } = {
  heading: "How a film gets made",
  intro: "The steps behind most of my films, with a still from the work for each one.",
  from: "From",
  steps: [
    {
      id: "step-script",
      title: "Script",
      caption: "It starts as a beat sheet: what happens, in what order, in how many seconds.",
      film: "China trip recap",
      alt: "The beat sheet for the China trip recap: a table of beats with their times and material, and the first line of on-screen text.",
    },
    {
      id: "step-footage",
      title: "Footage and b-roll",
      caption: "Footage from the day, or AI b-roll when there is no shot to film.",
      film: "Bear to Munich",
      alt: "Looking up the spiral staircase of a conference venue, a photo from the shoot.",
    },
    {
      id: "step-motion",
      title: "Motion in code",
      caption: "Titles, maps and cards written in HTML and rendered to video with HyperFrames.",
      film: "Bear to Munich",
      alt: "An airport departures board with a boarding-pass style card reading SIN to MUC, a code-built title frame.",
    },
    {
      id: "step-captions",
      title: "Captions",
      caption: "Speech to text, timed to the cut, so the words land with the voice.",
      film: "IIVT, in a few words",
      alt: "A speaker holding a microphone, with the caption across IP, valuation and tax in a navy box.",
    },
    {
      id: "step-review",
      title: "Review",
      caption: "An AI pass reads the frames and the transcript together before I finish the cut.",
      film: "Bear to Munich",
      alt: "A contact sheet of four frames with their times: a bear at an airport, a bear by a window, a flight path and a title card.",
    },
    {
      id: "step-edit",
      title: "Final edit in CapCut",
      caption: "Pacing, sound and polish by hand, in CapCut.",
      film: "IIVT, in a few words",
      alt: "The timeline of the finished cut, with lanes for captions, name cards, speakers, speech, music and the end card.",
    },
  ],
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
        "I run a crew of coding agents on Firstmate, an open-source agent supervisor I set up for my own work. One supervisor takes my brief and hands tasks to workers, each in its own copy of the code. Nothing lands without a review: I decide what gets built and check what comes back.",
      examples: [
        "This site was built that way: I picked the look and approved the copy, the agents did the build",
        "Each task gets a written brief, an isolated workspace and a review step before it counts as done",
      ],
      link: { label: "Firstmate on GitHub", href: "https://github.com/kunchenguid/firstmate" },
    },
    {
      title: "RoleCall",
      kicker: "Built for my job search",
      text:
        "A local-first app I built for my own job hunt. It ranks the roles I save against my real experience, drafts tailored resume bullets and cover letters, and tracks every application to the follow-up.",
      examples: [
        "Every drafted line points to the evidence it came from, and a line without one is flagged",
        "A six-stage pipeline with follow-up reminders",
        "Its current rebuild was done with the same agent crew, on Firstmate",
        "Next up: wider job discovery and interview practice",
      ],
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
      link: { label: "HyperFrames", href: "https://hyperframes.studio" },
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
    "programme executive in singapore",
    "makes the videos, runs the programmes, builds the ai workflows",
    "learning backend on boot.dev, heading towards applied ai",
  ],
  projectsHeading: "projects:",
  contactHeading: "contact:",
  notFound: (cmd: string) => `command not found: ${cmd}. Try help.`,
};
