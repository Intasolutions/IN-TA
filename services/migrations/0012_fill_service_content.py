"""Fills in what each service's page was missing, from what the admin already says about the service:

- "What we do" (capabilities): four blocks per service, written only from that service's own descriptions, its
  "Right for you if" lines, features and tools, and the real projects in the portfolio. Until now those pages showed
  the generic benefits there instead.
- Its projects: the real work in the portfolio that used the service, matched by the projects' own tags and summaries.
  Services with no matching project (AI, Mobile, Marketing, SEO, Media) get none.
- Its questions: three per service, answered from the same text, plus the home page questions that are about that
  service (shown on its page too, not copied).

Only what is empty is filled: a service that already has capabilities or projects, or a question that already exists,
is left exactly as it is. Everything here can be edited or removed in the admin afterwards.
"""

from django.db import migrations

CAPABILITIES = {
    'ai-integration-model-training': [
        ('AI Lead Assistant',
         'Replies to every enquiry from your ads on WhatsApp and your website within 30 seconds, asks the right '
         'questions, and books meetings straight into your calendar.',
         'Replies within 30 seconds\nWhatsApp and website enquiries\nBooks meetings into your calendar'),
        ('Smart Record Keeping',
         'Your staff send a voice note or a photo of a bill or receipt, and the details are entered into your system '
         'automatically, with no typing.',
         'Voice notes and photos\nBills and receipts\nNo typing'),
        ('Private Company AI',
         'A private AI trained on your own company documents, so your team gets instant answers without searching '
         'through files.',
         'Trained on your own documents\nInstant answers for your team\nSet up securely'),
        ('Chatbots and Smart Features',
         'Chatbots that answer customer questions 24/7, tools that read invoices and forms automatically, and smart '
         'features like recommendations and predictions inside the app or software you already use.',
         'Customer chatbots that answer 24/7\nInvoice and form reading\nRecommendations and predictions\nConnected to your existing systems\nMonitored after launch'),
    ],
    'web-development': [
        ('Business Websites',
         'Websites that load fast, look great on every phone and computer, and make it easy for visitors to contact '
         'you.',
         'Fast loading\nMobile-friendly design\nEasy for customers to reach you'),
        ('Online Stores',
         'Online stores that make it easy for customers to buy from you, with product listings, a shopping cart and '
         'a wishlist, built around your products.',
         'Product listings\nShopping cart and wishlist\nWorks on every device'),
        ('Booking Systems and Web Apps',
         'Booking systems, portals and web apps built around the way your business works, from demo-class bookings '
         'to full learning platforms.',
         'Bookings and portals\nWeb apps built with Next.js and React\nBuilt around your business'),
        ('Ready for Google, Easy to Update',
         'Every site is set up for Google from day one, and you can update its content yourself through an easy '
         'admin panel. After launch we stay available for updates, hosting support and improvements.',
         'Set up for Google from day one\nEasy admin panel\nUpdates and hosting support'),
    ],
    'software-development': [
        ('Billing and Inventory',
         'Billing and inventory systems that remove manual work, reduce errors and give you clear reports, built '
         'around your daily process.',
         'Less manual work\nFewer errors\nClear reports'),
        ('Hospital and Clinic Management',
         'Hospital and clinic software for patient records, appointment scheduling and administrative work, built '
         'as a secure, role-based web application for staff and administrators.',
         'Patient records\nAppointment scheduling\nRole-based access for staff'),
        ('School and Academy Portals',
         'Portals for schools, academies and training institutes, with secure, role-based logins for students and '
         'staff.',
         'Student portals\nRole-based logins\nBuilt for how you teach'),
        ('CRM, ERP and Internal Tools',
         'CRM, ERP and internal tools that replace spreadsheets, paper and WhatsApp, from production tracking and '
         'payroll to property management.',
         'Replaces Excel and paper\nProduction and payroll tracking\nThe software is yours\nStaff training and ongoing support'),
    ],
    'mobile-app': [
        ('Android and iOS Apps',
         'Android and iOS apps that are simple, fast and easy to use, built for your customers.',
         'Android and iOS\nSimple and fast\nWorks on a weak connection'),
        ('Bookings, Orders and Loyalty',
         'Apps that let your customers book, order and come back again, with loyalty programmes and notifications '
         'that keep your business in their pockets.',
         'Bookings and orders\nLoyalty programmes\nNotifications'),
        ('Staff Tools',
         'Apps your staff can use on the go, so work gets done away from the desk.',
         'Built for your team\nUse anywhere'),
        ('From Design to App Store',
         'We handle everything: design, development, testing and publishing on the Google Play Store and Apple App '
         'Store. After launch we help with updates, new features and support as your users grow.',
         'Design and development\nTesting\nPublishing on both stores\nUpdates and new features'),
    ],
    'Marketing': [
        ('Social Media',
         'We plan and run your social media and create content that gets people to call, message or visit.',
         'Planning and posting\nRegular content for your brand\nMore local reach'),
        ('Google and Meta Ads',
         'Google Ads and Meta ads on Facebook and Instagram that bring real enquiries, not just likes.',
         'Google Ads\nFacebook and Instagram ads\nAimed at the right customers'),
        ('Clear Goals and Reports',
         'Every campaign starts with clear goals and a fixed budget. We track results and share simple reports, so '
         "you always know what you're getting for your money.",
         'Clear goals\nFixed budget\nSimple reports'),
        ('Pages That Convert',
         'Because we also build websites and apps, we make sure your ads lead to pages that turn visitors into '
         'customers.',
         'Landing pages\nMore calls and messages'),
    ],
    'ui-ux-design': [
        ('User Research',
         'We study how your users behave and what your business needs, so the design solves real problems.',
         'User behaviour\nBusiness goals\nIndustry trends'),
        ('Wireframes and Prototypes',
         'Wireframes and clickable prototypes, tested with users, so you can see and try the design before it is '
         'built.',
         'Wireframing\nPrototyping\nUser testing'),
        ('Interface Design',
         'Clean layouts, easy navigation and visually balanced screens that reflect your brand identity.',
         'Clean layouts\nEasy navigation\nYour brand identity'),
        ('Responsive Design',
         'Modern designs that work on desktops, tablets and mobile phones, so every visitor gets a consistent, '
         'enjoyable experience.',
         'Desktop, tablet and mobile\nConsistent experience'),
    ],
    'seo-aeo-geo-services': [
        ('Search Engine Optimization',
         "Keyword optimization, technical SEO, content strategy and high-quality backlinks that improve your "
         "website's position on Google.",
         'Keyword research\nTechnical SEO\nContent strategy\nQuality backlinks'),
        ('Answer Engine Optimization',
         'Helps your business appear in featured snippets, voice search results and direct answers.',
         'Featured snippets\nVoice search\nDirect answers'),
        ('Generative Engine Optimization',
         'Optimizes your content so AI tools like ChatGPT can understand and recommend your business.',
         'Visible in AI search\nRecommended by AI tools'),
        ('Local SEO',
         'Helps your business rank in Google Maps, local listings and location-based searches in Wayanad and across '
         'Kerala, so nearby customers find you.',
         'Google Maps\nLocal listings\nNearby customers'),
    ],
    'media-production': [
        ('Brand Videos',
         'Brand, promotional and corporate videos that present your business and communicate your message clearly.',
         'Brand and company videos\nPromotional videos\nCorporate videos'),
        ('Product Shoots and Demos',
         'Product photography and product demonstration videos that show your quality.',
         'Product photography\nProduct demos'),
        ('Social Media Reels',
         'Reels and social media content designed to capture attention, for your website, social media and ads.',
         'Reels\nSocial media content\nMade for ads too'),
        ('From Script to Edit',
         'We handle the whole production: concept planning, script development, filming, photography and '
         'professional editing.',
         'Concept and script\nFilming and photography\nProfessional editing\n4K and drone footage'),
    ],
}

# The real work that used each service, matched by the projects' own tags and summaries (by their slugs)
PROJECTS = {
    'software-development': ['anova-medical-center', 'favourite-garments', 'iGen', 'solid-tracks-accademy'],
    'web-development': ['growmedlink', 'orchid-spellbee', 'aarohya-jewelry-store', 'quinte-malayalee-association', 'solid-tracks-accademy'],
    'ui-ux-design': ['solid-tracks-accademy', 'orchid-spellbee', 'quinte-malayalee-association'],
}

# New questions for each service's page (shown there only), answered from the service's own text
QUESTIONS = {
    'ai-integration-model-training': [
        ('Can AI reply to my WhatsApp enquiries automatically?',
         'Yes. Our AI Lead Assistant replies to every enquiry from your ads on WhatsApp and your website within 30 '
         'seconds, asks the right questions, and books meetings straight into your calendar. It is set up securely, '
         'connected to the systems you already use, and monitored after launch so it keeps giving accurate results.'),
        ('Can AI enter bills and receipts into our system?',
         'Yes. With Smart Record Keeping, your staff send a voice note or a photo of a bill or receipt, and the '
         'details are entered into your system automatically, with no typing. It is one of our two ready-to-use AI '
         'solutions, and it connects to the software you already use.'),
        ('Can you train an AI on our own company documents?',
         'Yes. We can build a private AI trained on your own company documents, so your team gets instant answers '
         'without searching through files. Where needed, we train AI models on your own data so the results fit '
         'your business, and everything is set up securely.'),
    ],
    'web-development': [
        ('Can I update my website content myself?',
         'Yes. Every website we build comes with an easy admin panel, so you can update content yourself. After '
         'launch we also stay available for updates, hosting support and improvements whenever you need them.'),
        ('Will my website work well on mobile phones?',
         'Yes. We design and build websites that load fast and look great on every phone and computer, and make it '
         'easy for visitors to contact you or buy from you. Mobile-friendly design is part of every site we build, '
         'not an extra.'),
        ('Do you build online stores and booking websites?',
         'Yes. Along with business websites, we build online stores, booking systems and web apps, each built around '
         'your business and set up for Google from day one. You can see examples on our Work page, such as the '
         'Aarohya jewellery store and the GrowMedLink learning platform.'),
    ],
    'software-development': [
        ('Can you build software for a hospital or clinic?',
         'Yes. We build hospital and clinic management software for patient records, appointment scheduling and '
         'administrative work, as a secure, role-based web application for staff and administrators. The system we '
         'built for Anova Medical Center is one example.'),
        ('Who owns the custom software you build?',
         'You do. The software we build is yours, and it grows with your business. We handle everything from '
         'planning to training your staff, and we provide ongoing support after launch.'),
        ('Can you replace our Excel sheets with a proper system?',
         'Yes. If you manage work in Excel, on paper or on WhatsApp, we build a system around the way your business '
         'works that removes manual work, reduces errors and gives you clear reports. We start by understanding your '
         'daily process, then design the system around it.'),
    ],
    'mobile-app': [
        ('Will you publish our app on the Play Store and App Store?',
         'Yes. We handle everything: design, development, testing and publishing on the Google Play Store and Apple '
         'App Store. After launch we help with updates, new features and support as your users grow.'),
        ('Will the app work on a slow internet connection?',
         'Yes. Our apps are built to be simple and fast, and to work well even on a weak internet connection, so '
         'your customers and staff can rely on them wherever they are.'),
        ('Can you build an app for bookings and orders?',
         'Yes. We build apps for bookings, orders, loyalty programmes and staff tools, so customers can book or order '
         'straight from their phones and you can reach them with notifications.'),
    ],
    'Marketing': [
        ('Do you run Google Ads and Facebook ads?',
         'Yes. Our team plans and runs Google Ads and Meta ads on Facebook and Instagram, along with social media and '
         'content that gets people to call, message or visit. Every campaign starts with clear goals and a fixed '
         'budget.'),
        ('How will I know if my ads are working?',
         "We track the results of every campaign and share simple reports, so you always know what you're getting "
         'for your money. Each campaign starts with clear goals and a fixed budget, so there is something clear to '
         'measure it against.'),
        ('Can you manage our social media?',
         'Yes. We plan and run social media for businesses and create regular content for your brand that gets '
         'people to call, message or visit. Because we also build websites, we make sure your posts and ads lead to '
         'pages that turn visitors into customers.'),
    ],
    'ui-ux-design': [
        ('What does UI/UX design do for my website?',
         'It makes your website or app easy and pleasant to use, so visitors understand it at first glance and '
         'complete orders or forms. We study user behaviour and your business goals, then design clean layouts and '
         'easy navigation that reflect your brand.'),
        ('What is your UI/UX design process?',
         'Our design process has four steps: research, wireframing, prototyping and user testing. It shows us what '
         'your users need before anything is built, and leads to clean layouts, easy navigation and screens that '
         'reflect your brand identity.'),
        ('Do your designs work on phones and tablets?',
         'Yes. We create modern, responsive designs that work across desktops, tablets and mobile phones, so every '
         'visitor gets a consistent and enjoyable experience on whatever device they use.'),
    ],
    'seo-aeo-geo-services': [
        ('What are AEO and GEO?',
         'AEO (Answer Engine Optimization) helps your business appear in featured snippets, voice search results and '
         'direct answers. GEO (Generative Engine Optimization) optimizes your content so AI tools like ChatGPT can '
         'understand and recommend it. Together with SEO, they keep your business visible as search changes.'),
        ('Can you help my business show up on Google Maps?',
         'Yes. Our local SEO helps businesses in Wayanad and across Kerala rank in Google Maps, local listings and '
         'location-based searches, so nearby customers find you first.'),
    ],
    'media-production': [
        ('What kind of videos do you make for businesses?',
         'We make brand videos, promotional and corporate videos, product demonstrations and social media reels, '
         'along with product and photo shoots. Every project is planned around your brand and business goals, and '
         'works across your website, social media and ads.'),
        ('Do you handle scripting, filming and editing?',
         'Yes. We handle the whole production, from concept planning and script development to filming, photography '
         'and professional editing, so you do not need to coordinate different people.'),
        ('Do you make reels for Instagram and other social media?',
         'Yes. We create reels and social media content designed to capture attention and communicate your message '
         'clearly. Because we also run digital marketing, the content can be made for the campaigns it will be used '
         'in.'),
    ],
}

# Home page questions that are about one service: shown on that service's page as well (not copied)
SHARED = {
    'ai-integration-model-training': 'Can you add AI or a chatbot to our website or software?',
    'mobile-app': 'Do you build mobile apps for Android and iOS?',
    'seo-aeo-geo-services': 'Can you help my business get found on Google?',
}


def fill(apps, schema_editor):
    Service = apps.get_model('services', 'Service')
    Capability = apps.get_model('services', 'ServiceCapability')
    Project = apps.get_model('portfolio', 'Project')
    Question = apps.get_model('home', 'Question')

    for service in Service.objects.all():
        slug = service.slug

        if slug in CAPABILITIES and not Capability.objects.filter(service=service).exists():
            for order, (title, description, points) in enumerate(CAPABILITIES[slug], start=1):
                Capability.objects.create(service=service, title=title, description=description, points=points, order=order)

        if slug in PROJECTS and not service.projects.exists():
            service.projects.add(*Project.objects.filter(slug__in=PROJECTS[slug]))

        shared = SHARED.get(slug)
        if shared:
            for q in Question.objects.filter(question=shared):
                q.services.add(service)

        for order, (question, answer) in enumerate(QUESTIONS.get(slug, []), start=10):
            if Question.objects.filter(question=question).exists():
                continue
            q = Question.objects.create(question=question, answer=answer, pages='', order=order, is_active=True)
            q.services.add(service)


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0011_service_page_headings'),
        ('portfolio', '0002_case_study'),
        ('home', '0008_seo_keyword_wording'),
    ]

    operations = [
        migrations.RunPython(fill, migrations.RunPython.noop),
    ]
