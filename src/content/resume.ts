// Lines that appear only on the resume (/resume and the PDF made from it).
// Experience and education come from copy.ts so the two never disagree.
// Contact is email-only on purpose: no phone number, no street address.

export const resume = {
  title: "Longteng Lu: resume",
  headline: "Programmes, video and marketing",
  location: "Singapore",
  pdfName: "Longteng-Lu-Resume.pdf",
  availability:
    "Open to marketing, communications and programme roles in Singapore. One month's notice. Singapore citizen.",
  summary:
    "Programme Executive at Tax Academy of Singapore since March 2026. I run programmes and events, make the videos that promote them, and build the tools that remove manual steps from production. Psychology graduate with a background in marketing, video and client-facing work.",
  skills: [
    {
      title: "Marketing",
      text: "Meta Ads Manager (CBO/ABO, CPM, CTR); Meta Pixel; Google Ads and Google Analytics (certified 2025); Shopify; LinkedIn and email campaigns (EDMs); direct-response copywriting; consumer psychology",
    },
    {
      title: "Video and content",
      text: "Shooting, directing and editing; CapCut; short-form and horizontal video; motion graphics rendered from code (HyperFrames); Canva",
    },
    {
      title: "AI and automation",
      text: "AI workflows for content, research and video review; Claude and Codex; local models (Ollama); Python automation; APIs; Git",
    },
  ],
  // The approximate Tax Academy numbers, worded for a resume.
  taStats:
    "Since joining: about 10 programmes and events, about 70 videos, about 50 of them made with an AI-assisted editing workflow.",
  projectsHeading: "AI and automation projects",
  projects: [
    {
      title: "Video and research automation",
      stack: "Python, LLM APIs",
      dates: "2026",
      points: [
        "Video review tool samples frames alongside the transcript so an AI model can critique both the visuals and the speech.",
        "Research pipeline runs five expert perspectives in parallel, maps where they disagree, then has a separate reviewer check key citations against primary sources.",
      ],
    },
    {
      title: "RoleCall, a job-search app I built for myself",
      stack: "Node.js, LLM APIs",
      dates: "2026",
      points: [
        "Pulls live listings from MyCareersFuture and Adzuna, removes reposts, scores fit, checks resume keywords against each listing and drafts research and cover letters; 96 automated tests.",
      ],
    },
    {
      title: "Longteng Studio, AI workspace",
      stack: "TypeScript, React",
      dates: "2026",
      points: [
        "Routes tasks between AI agents with a review step before results are accepted; its video review room turns timestamped comments into revision tasks.",
      ],
    },
  ],
  learningHeading: "Learning",
  learning:
    "Boot.dev: completed Learn Python for beginners, Learn Linux and Build a Bookbot; now on the back-end developer path in TypeScript.",
  experienceHeading: "Experience",
  educationHeading: "Education",
  certificationsHeading: "Certifications",
  skillsHeading: "Skills",
  summaryHeading: "Summary",
  download: "Download PDF",
  back: "Back to the site",
  print: "Print",
};
