// Technologies shown in the Tech Stack section

export type StackGroup = 'ai' | 'backend' | 'frontend' | 'cloud' | 'design';

export type StackItem = {
  id: string;
  name: string;
  logo: string;
  group: StackGroup;
  use: string; // what we use it for
};

export const STACK: StackItem[] = [
  { id: 'openai', name: 'OpenAI', logo: '/logos/openai.svg', group: 'ai', use: 'LLM features, assistants and smart search' },
  { id: 'pytorch', name: 'PyTorch', logo: '/logos/pytorch.svg', group: 'ai', use: 'Training and fine-tuning custom models' },
  { id: 'tensorflow', name: 'TensorFlow', logo: '/logos/tensorflow.svg', group: 'ai', use: 'Vision and prediction models in production' },
  { id: 'python', name: 'Python', logo: '/logos/python.svg', group: 'backend', use: 'Django APIs, data pipelines and automation' },
  { id: 'node', name: 'Node.js', logo: '/logo/node.svg', group: 'backend', use: 'APIs, real-time services and tooling' },
  { id: 'react', name: 'React', logo: '/logo/React.svg', group: 'frontend', use: 'Interactive interfaces for web apps' },
  { id: 'next', name: 'Next.js', logo: '/next.svg', group: 'frontend', use: 'Fast, SEO-friendly websites and platforms' },
  { id: 'ts', name: 'TypeScript', logo: '/logo/typescript.svg', group: 'frontend', use: 'Type-safe code across the whole stack' },
  { id: 'tailwind', name: 'Tailwind', logo: '/logos/tailwind.svg', group: 'frontend', use: 'Consistent, responsive design systems' },
  { id: 'aws', name: 'AWS', logo: '/logos/aws.svg', group: 'cloud', use: 'Hosting, storage and scalable infrastructure' },
  { id: 'docker', name: 'Docker', logo: '/logos/docker.svg', group: 'cloud', use: 'Reproducible builds and deployments' },
  { id: 'figma', name: 'Figma', logo: '/logos/figma.svg', group: 'design', use: 'Wireframes, prototypes and UI design' },
];
