import HeroSlider from '../components/Hero';
import Philosophy from '../components/Philosophy';
import Capabilities from '../components/Capabilities';
import TestimonialDeck from '../components/testimonials/TestimonialDeck';
import BlogSection from '../components/blog/BlogSection';
import Work from '../components/Work';
import FaqSection from '../components/FaqSection';
import { getSite } from '../site/server';
import { getHomeLists } from '../site/homeLists';
import { homeJsonLd, jsonLdHtml } from '../site/schema';

const Home = async () => {
  const [site, lists] = await Promise.all([getSite(), getHomeLists()]);
  return (
    <main className="bg-canvas text-midnight">
      <HeroSlider />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(homeJsonLd(site)) }} />

      <Philosophy />
      <Capabilities />

      <Work initial={lists.projects} />

      <TestimonialDeck initial={lists.testimonials} />

      <FaqSection page="home" />

      <BlogSection initial={lists.posts} />
    </main>
  );
};


export default Home;
