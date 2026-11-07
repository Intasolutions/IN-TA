import HeroSlider from '../components/Hero';
import Philosophy from '../components/Philosophy';
import Capabilities from '../components/Capabilities';
import TestimonialDeck from '../components/testimonials/TestimonialDeck';
import BlogSection from '../components/blog/BlogSection';
import Work from '../components/Work';
import { getSite } from '../site/server';
import { homeJsonLd, jsonLdHtml } from '../site/schema';

const Home = async () => {
  const site = await getSite();
  return (
    <main className="bg-canvas text-midnight">
      <HeroSlider />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(homeJsonLd(site)) }} />

      <Philosophy />
      <Capabilities />

      <Work />

      <TestimonialDeck />

      <BlogSection />
    </main>
  );
};


export default Home;
