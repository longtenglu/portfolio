// Lines that appear only on the resume (/resume and the PDF made from it).
// Experience and education come from copy.ts so the two never disagree.
// Contact is email-only on purpose: no phone number, no street address.

export const resume = {
  title: "Longteng Lu: resume",
  headline: "Programmes, video and AI workflows",
  location: "Singapore",
  pdfName: "Longteng-Lu-Resume.pdf",
  summary:
    "Psychology graduate who runs programmes and events, markets them, and shoots and edits the video. Builds AI tools that cut manual steps out of the work: captions and motion graphics rendered from code, a design-to-PowerPoint converter, and a research pipeline that checks its own sources. Builds with AI coding agents (Claude Code, Codex) and owns the design, testing and day-to-day use.",
  skills: [
    {
      title: "Marketing",
      text: "Meta Ads Manager (CBO/ABO, CPM, CTR); Meta Pixel; Google Ads and Google Analytics (certified); Shopify; LinkedIn and email campaigns (EDMs); direct-response copywriting; consumer psychology",
    },
    {
      title: "Video and content",
      text: "Shooting, directing and editing; CapCut; short-form and horizontal video; motion graphics rendered from code (Remotion, HyperFrames); Canva",
    },
    {
      title: "AI and automation",
      text: "AI workflows for content, research and video review; Claude, Codex and Gemini; local models (Ollama); Python and JavaScript automation; APIs; Git",
    },
  ],
  // The approximate Tax Academy numbers, worded for a resume.
  taStats:
    "Since joining: helped run or managed about 10 programmes and events; made about 70 videos, about 50 of them with an AI-assisted editing workflow.",
  projectsHeading: "AI and automation projects",
  projects: [
    {
      title: "Video and research automation",
      stack: "Python, LLM APIs",
      dates: "Jun 2026 - Present",
      points: [
        "Video review tool samples frames alongside the transcript so an AI model can critique both the visuals and the speech.",
        "Research pipeline runs five expert perspectives in parallel, maps where they disagree, then has a separate reviewer check key citations against primary sources.",
      ],
    },
    {
      title: "RoleCall, job-search app",
      stack: "Node.js, LLM APIs",
      dates: "Jun 2026 - Present",
      points: [
        "Pulls live listings from MyCareersFuture and Adzuna, removes reposts, scores fit, checks resume keywords against each listing and drafts research and cover letters; 96 automated tests.",
      ],
    },
    {
      title: "Longteng Studio, AI workspace",
      stack: "TypeScript, React",
      dates: "Sep 2026 - Present",
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
