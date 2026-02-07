export const siteConfig = {
  siteName: 'Connection Works',
  companyName: 'Connection Works Ltd',
  personName: 'Sumeet Adur',
  tagline: 'Web Development',
  location: 'UK (remote-friendly)',
  availabilityLine: 'Available for contracts',
  email: 'sumeet@connection.works',
  linkedInUrl: 'https://www.linkedin.com/in/sumeetadur',
  githubUrl: 'https://github.com/sumeetadur',
  primaryServices: [
    {
      title: 'Front-end delivery',
      description:
        'React and TypeScript delivery with clean & functional component architecture',
    },
    {
      title: 'Resilience and Quality',
      description:
        'Predictable state management, resilient UI patterns, and thoughtful edge-case handling',
    },
    {
      title: 'Performance',
      description:
        'Fast interfaces with careful JavaScript usage and excellent Core Web Vitals',
    },
  ],
  testimonials: [
    {
      quote:
        `Sumeet is one of the most dedicated persons I've ever worked with. On top of that, he was always ready to share the information and knowledge he had with anyone in-team that needed it.

It was truly a pleasure to work with him and he is one of the few core FE devs I met that really takes the time to understand the project and make it better.

I recommend him for any front-end / front-end adjacent role not only for his skills, but also for the kind of person he is.`,
      name: 'Victor Petrescu',
      role: 'Senior Software Engineer',
    },
    {
      quote:
        `I worked with Sumeet for over six years at Remote Tech, where he was the Senior Front-End Developer on the L8log platform.

Sumeet is truly one of the best front-end engineers I've had the pleasure of working with in my career. He combines strong technical expertise with a consistently positive, can-do attitude, always willing to get stuck in, delivering results quickly and thoroughly tested. This made him a real pleasure to work with across the many products and features we shipped during this time.

He is a huge asset to any organisation looking for a dedicated, professional, and highly capable team member, and I would happily work with him again.`,
      name: 'Barend Botha',
      role: 'Product Manager',
    },
    {
      quote:
        `I've had the pleasure of working closely with Sumeet, and I can confidently say he is an exceptional Senior Front-End Engineer.

Sumeet consistently demonstrated deep technical expertise, strong ownership, and a genuine commitment to delivering high-quality, user-focused solutions. He has an excellent track record of delivering customer requests in a timely manner, often under tight deadlines, while maintaining a high standard of quality. As a result, customer feedback has been consistently positive, and his work has played a key role in improving overall user satisfaction.

Beyond his technical skill, Sumeet is a fantastic colleague to work with. He is fun, clever, dependable, and always willing to support others, whether that's mentoring team members, contributing thoughtful ideas in discussions, or calmly solving problems under pressure. 

He sets a very high standard for front-end engineering and professionalism, and any team would be incredibly lucky to have him. I wouldn't hesitate to recommend him and would gladly work with him again in the future.`,
      name: 'Nino Nolan',
      role: 'Account Manager',
    },
  ],
  engagementProcess: [
    {
      title: 'Clarify scope',
      description:
        "We agree outcomes, constraints, and how we'll measure success before we start building",
    },
    {
      title: 'Ship in slices',
      description:
        'Iterate in small, reviewable changes with sensible defaults and clear trade-offs',
    },
    {
      title: 'Harden and hand over',
      description:
        'Polish, document, and leave the codebase in a state a future team can extend confidently',
    },
  ],
} as const
