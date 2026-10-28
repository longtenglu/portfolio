// Lines that appear only on the resume (/resume and the PDF made from it).
// Experience and education come from copy.ts so the two never disagree.
// Contact is email-only on purpose: no phone number, no street address.

export const resume = {
  title: "Longteng Lu: resume",
  description:
    "Resume of Longteng Lu, a Programme Executive in Singapore: programmes and events, video, marketing and AI workflows.",
  headline: "Programmes, video and AI workflows",
  location: "Singapore",
  pdfName: "Longteng-Lu-Resume.pdf",
  summary:
    "Psychology graduate who runs programmes and events, markets them, and directs and edits the video. Builds AI tools that cut manual steps out of the work: captions and motion graphics rendered from code, a design-to-PowerPoint converter, and a research pipeline that checks its own sources. Builds with AI coding agents (Claude Code, Codex) and owns the design, testing and day-to-day use.",
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
  // The approximate current-role numbers, worded for a resume.
  roleStats:
    "In my current role: helped run or managed about 10 programmes and events; made about 70 videos; 100,000+ impressions across our channels.",
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
  ],
  learningHeading: "Learning",
  learning:
    "Boot.dev: completed Learn Python for beginners and Learn Linux; now on the back-end developer path in TypeScript.",
  experienceHeading: "Experience",
  educationHeading: "Education",
  certificationsHeading: "Certifications",
  skillsHeading: "Skills",
  summaryHeading: "Summary",
  download: "Download PDF",
  back: "Back to the site",
  print: "Print",
};
