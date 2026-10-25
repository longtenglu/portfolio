// The home page copy lives in this file, so it can be read and edited in one
// place. The resume page adds its own lines in resume.ts and reuses the
// experience and education below.
//
// House rules for this copy (from Voice Principles): no em dashes, no jargon,
// no invented numbers, point first, and it should sound like something I'd say
// out loud.

export const site = {
  name: "Longteng Lu",
  title: "Longteng Lu, programmes, video and marketing, Singapore",
  description:
    "Programme Executive at Tax Academy of Singapore. I run programmes, make the videos and build tools for the repetitive parts. Open to marketing, communications and programme roles in Singapore.",
  location: "Singapore",
  email: "prestonlult@gmail.com",
  github: "https://github.com/longtenglu",
  linkedin: "https://www.linkedin.com/in/longteng-l-b458971bb/",
  url: "https://longtenglu.vercel.app",
};

export const nav = [
  { label: "About", href: "#about" },
  { label: "Experience", href: "#experience" },
  { label: "Videos", href: "#videos" },
  { label: "Builds", href: "#builds" },
  { label: "Contact", href: "#contact" },
];

export const hero = {
  claim: "I run programmes, make the videos, and build tools for the repetitive parts.",
  role: "Programme Executive at Tax Academy of Singapore since March 2026.",
  available: "Open to marketing, communications and programme roles in Singapore.",
  scroll: "Scroll",
  reel: {
    title: "20th Anniversary Dinner Reception",
    label: "A film I shot and edited",
    action: "Play the full film with sound",
    watch: "Watch with sound",
    // The visible trigger while the reel is still closed.
    rest: "Watch the film",
  },
};

export const strip =
  "ABOUT 70 VIDEOS • ABOUT 10 PROGRAMMES AND EVENTS • ABOUT 50 MADE WITH AN AI-ASSISTED WORKFLOW • SINGAPORE";

export const about = {
  heading: "About",
  lead:
    "I'm Longteng. I run programmes and events at Tax Academy of Singapore, make the videos that promote them, and build tools for the parts that repeat.",
  body: [
    "I studied psychology, and it still shapes how I write and edit: who is watching, and what makes them care enough to stay.",
    "Most of what I can do, I learned by trying a new tool on a real deadline. Right now that tool is backend development, through Boot.dev.",
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
      text: "LinkedIn posts, email campaigns and ad copy, written for the person on the other end. I've also run Meta Ads for my own Shopify store.",
    },
    {
      title: "AI workflows",
      text: "I build small tools for the parts that repeat: captions, video review, research, and handover notes.",
    },
  ],
  brochure: {
    image: "brochure-spread",
    alt: "A two-page spread from a Tax Academy programme brochure, showing the programme structure for two days.",
    caption: "A spread from the IIVT programme brochure, published for the October 2026 run.",
  },
};

export type Role = {
  role: string;
  org: string;
  dates: string;
  points: string[];
};

export const experience: { heading: string; summary: string; roles: Role[] } = {
  heading: "Experience",
  summary:
    "About 10 programmes and events, about 70 videos, about 50 of them made with an AI-assisted editing workflow.",
  roles: [
    {
      role: "Programme Executive",
      org: "Tax Academy of Singapore",
      dates: "Mar 2026 - Present",
      points: [
        "Plan and coordinate tax programmes and events from preparation through delivery.",
        "Produce programme marketing across LinkedIn, email campaigns, short-form and horizontal video.",
        "Shot, directed and edited a three-part mascot travel series with branded motion graphics.",
        "Built tools that remove manual production steps: motion graphics rendered from code, speech-to-text captions, and a converter that turns HTML designs into editable PowerPoint.",
      ],
    },
    {
      role: "Independent e-commerce and marketing project",
      org: "My own Shopify store",
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
  credit: string;
  aiLabel?: string;
  films?: Film[];
};

export const videos = {
  heading: "Selected videos",
  intro: "Most of my day-job output is video. These are the ones I'd show first.",
  credit: "Produced at Tax Academy of Singapore.",
  hint: "Hover for a preview, click to watch with sound.",
  hintTouch: "Tap any film to watch it with sound.",
  play: "Play",
  close: "Close",
  seriesNote: "Three films",
  items: [
    {
      id: "anniversary-dinner",
      title: "20th Anniversary Dinner Reception",
      line: "An anniversary dinner recap cut to music: the speeches, the ribbon cutting, the band and a thank you card.",
      credit: "Shot, directed and edited.",
    },
    {
      id: "tax-is-networking",
      title: "Tax is Networking",
      line: "A masterclass day told through the connections people made, each one numbered and linked on screen.",
      credit: "Concept, motion graphics and edit.",
    },
    {
      id: "bear-series",
      title: "The TA Bear series",
      line: "The Academy's bear mascot travels to conferences in Amsterdam and Munich. Character-led travel stories in three films.",
      credit: "Shot, directed and edited.",
      films: [
        { id: "bear-amsterdam-pre", title: "Amsterdam, before the trip" },
        { id: "bear-amsterdam-during", title: "Amsterdam, during the trip" },
        { id: "bear-munich", title: "Bear to Munich" },
      ],
    },
    {
      id: "atp-promo",
      title: "Advanced Tax Programme promo",
      line: "A programme promo built from AI b-roll, motion graphics made in code and a scripted voiceover.",
      credit: "Direction, AI b-roll, motion design and edit.",
      aiLabel: "AI-generated footage and voiceover",
    },
    {
      id: "iivt-few-words",
      title: "IIVT, in a few words",
      line: "Four speakers answer one question, cut vertical with branded captions and lower thirds.",
      credit: "Interview selection, captions and lower thirds.",
    },
    {
      id: "china-trip",
      title: "China trip recap",
      line: "Five cities in fifteen days on a research and exchange study, assembled in code as an editorial recap.",
      credit: "Edit and information design, built in code.",
    },
  ] satisfies VideoCopy[] as VideoCopy[],
};

// The six steps behind the videos, each shown with a real production still.
export const workflow = {
  heading: "How a film gets made",
  intro: "Six steps, and a still from the work at each one.",
  steps: [
    {
      image: "proof-script",
      title: "Script",
      caption: "The voiceover is scripted before any footage is made.",
    },
    {
      image: "proof-broll",
      title: "AI b-roll",
      caption: "Google Flow and Veo make the cinematic scenes.",
    },
    {
      image: "proof-motion",
      title: "Motion in code",
      caption: "Every fact card and connection line is built in HyperFrames.",
    },
    {
      image: "proof-captions",
      title: "Captions",
      caption: "Caption boxes, timed to the voiceover.",
    },
    {
      image: "proof-review",
      title: "AI frame review",
      caption: "Frames sampled and checked against the transcript.",
    },
    {
      image: "proof-finish",
      title: "Finish",
      caption: "Titles, captions, sound and the end card, finished in CapCut.",
    },
  ],
};

export type Build = {
  title: string;
  text: string;
  link?: { label: string; href: string };
  /**
   * A screenshot under the text. Set it to an id from IMAGES in
   * scripts/media/videos.mjs (RoleCall gets one once the rebuild is done),
   * with `shotAlt` describing it.
   */
  shot?: string;
  shotAlt?: string;
};

export const builds: { heading: string; intro: string; items: Build[]; learning: string } = {
  heading: "Builds",
  intro: "Tools I built or set up for my own work. Where there is a public link, it is below.",
  items: [
    {
      title: "My AI OS",
      text:
        "A folder of notes, memory and agent instructions that every AI session I start reads first. It keeps context from one session to the next, so I'm not explaining myself every morning.",
    },
    {
      title: "A multi-agent setup",
      text:
        "I work with a crew of coding agents through Firstmate, an open-source tool I didn't build. One supervisor takes my brief and hands tasks to workers, each in its own copy of the code, and nothing lands without a review. This site was built that way: I wrote the brief, chose the look and edited every line of copy. Agents built it; I reviewed each section and fixed what was wrong.",
      link: { label: "Firstmate on GitHub", href: "https://github.com/kunchenguid/firstmate" },
    },
    {
      title: "HyperFrames video work",
      text:
        "HyperFrames is the video tool I use: you write a scene in HTML and it renders to video. I use it for motion graphics, titles and lower thirds, and it sits in the middle of the AI editing workflow behind about 50 of my videos.",
      link: { label: "HyperFrames", href: "https://hyperframes.dev" },
    },
    {
      title: "RoleCall",
      text:
        "A job-search app I built for myself: finds roles, checks fit against my resume, drafts tailored materials and preps me for interviews.",
    },
  ],
  learning: "Backend development on Boot.dev: Python, Linux, the TypeScript path.",
};

export const toolbox = {
  heading: "Toolbox",
  groups: [
    { title: "Video and design", tools: "CapCut, HyperFrames, Canva" },
    {
      title: "Marketing",
      tools:
        "Meta Ads Manager, Meta Pixel, Google Ads, Google Analytics, Shopify, LinkedIn, email campaigns",
    },
    { title: "AI", tools: "Claude, Claude Code, Codex, Ollama" },
    { title: "Code", tools: "Python, TypeScript, Git, GitHub, Linux" },
  ],
};

export const contact = {
  heading: "Contact",
  title: "Hiring for marketing, communications or a programme role? Email me.",
  lead: "Email is the fastest way to reach me.",
  availability: [
    "Open to marketing, communications and programme roles in Singapore.",
    "One month's notice. Singapore citizen.",
  ],
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
    "runs the programmes, makes the videos, builds tools for the repetitive parts",
    "open to marketing, communications and programme roles",
  ],
  projectsHeading: "projects:",
  contactHeading: "contact:",
  notFound: (cmd: string) => `command not found: ${cmd}. Try help.`,
};
