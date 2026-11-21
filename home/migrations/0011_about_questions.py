"""Questions & answers for the About page (2026-11-21).

The About page shows a question section only once it has questions, and it had none, so the page was mostly a
scroll-through map with little readable text at first. These four answer what people ask about the company itself,
and search engines get them as the About page's FAQ. None repeats a home page question.

Every fact comes from what the site already says: the About page's own story (Page wording "about_origin_text"), the
reach and in-house lines, the Technologies shown on the About page, and the home page's answers.

Each one is only added if no question with the same wording exists, so running this twice adds nothing, and the
admin can edit, reorder or hide them like any other question.
"""

from django.db import migrations

QUESTIONS = [
    (
        'Who founded IN-TA Solutions?',
        'IN-TA Solutions was co-founded in 2023 by Akash A, Vijay P N, Arun Rag and Christin Johny in Thonichal, '
        'Mananthavady, Wayanad. They started it with one simple belief: every business, big or small, deserves software '
        'made for the way it works. The company is registered as IN-TA Solutions Pvt Ltd.',
    ),
    (
        'What kind of businesses does IN-TA Solutions work with?',
        'Businesses that want software built around the way they work. Our clients include hospitals, retailers, schools, '
        'property firms and community groups, in Kerala and across India as well as in Canada, Georgia and the UAE. '
        'Meetings, demos and updates all happen online, so where you are is never a problem.',
    ),
    (
        'Does IN-TA Solutions build everything in-house?',
        'Yes. Everything is designed and built in-house by our own team: the design, the website or app, the custom '
        'software behind it and any AI features. One team covers all eight of our services, from AI integration and web '
        'development to digital marketing and media production, so you work with the same people from start to finish.',
    ),
    (
        'What technology does IN-TA Solutions use?',
        'Proven, modern tools chosen to make software fast, secure and easy to grow. We build websites and web apps with '
        'React, Next.js, TypeScript and Tailwind, back ends and automation with Python (Django) and Node.js, and AI '
        'features with OpenAI, PyTorch and TensorFlow. Designs start in Figma, and we host and deploy with AWS and Docker.',
    ),
]


def add(apps, schema_editor):
    Question = apps.get_model('home', 'Question')
    for order, (question, answer) in enumerate(QUESTIONS, start=1):
        if not Question.objects.filter(question=question).exists():
            Question.objects.create(question=question, answer=answer, pages='about', order=order * 10)


def remove(apps, schema_editor):
    Question = apps.get_model('home', 'Question')
    Question.objects.filter(question__in=[q for q, _ in QUESTIONS], pages='about').delete()


class Migration(migrations.Migration):
    dependencies = [('home', '0010_home_title_keywords')]
    operations = [migrations.RunPython(add, remove)]
