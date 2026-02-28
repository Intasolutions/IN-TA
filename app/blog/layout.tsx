import Header from '../components/Header';
import Footer from '../components/Footer';

export const metadata = {
    title: 'Blog | IN-TA Solutions',
    description: 'Read our latest insights, case studies and deep-dive articles.',
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Header />
            {children}
            <Footer />
        </>
    );
}
